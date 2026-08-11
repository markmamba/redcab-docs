---
title: "PR-02 — IAM correctness and security fixes"
sidebar_label: PR-02 — Security fixes
sidebar_position: 3
description: Restore inverted token-validity logic, block archived-account login, fix the lockout counter, revoke sessions on password reset, and close the OAuth linking hole.
---

## TL;DR

- Two `ref: cleanup` commits inverted boolean logic in the token confirmation managers. Password reset is **broken for real users and replayable by stale tokens**.
- Archived accounts can log in and silently un-archive themselves.
- After one lockout, a single wrong password re-locks the account forever.
- A password reset leaves every existing session alive.
- Google identities link to existing accounts without the IdP asserting a verified email.
- **Phase 0. No API contract change.**

**Fixes:** IAM-01 (Critical), IAM-03 (Critical), IAM-04 (High), IAM-06 (High), IAM-07 (High), IAM-08 (High), IAM-09 (High), IAM-16 (Medium), IAM-22 (Medium).

**Depends on:** [PR-01](/docs/roadmap/notes/pr-01-restore-account-current-route) (needs a runnable suite).

---

## 1. Password reset token validity is inverted (IAM-01, Critical)

### Evidence

```ruby title="red-cab-api/app/domains/identities/password_resets/confirm_manager.rb:40-43"
        is_password_reset_token_valid = password_reset_token.used_at.nil? || password_reset_token.expires_at >= Time.current
        if is_password_reset_token_valid
          raise_invalid_token(request: request)
        end
```

Commit `669689f` ("ref: cleanup logic in password reset") replaced this:

```ruby
if password_reset_token.used_at.present? || password_reset_token.expires_at <= Time.current
  raise_invalid_token(request: request)
end
```

The rewrite negated each operand but kept both the `||` and the `if`. Two mistakes cancel into one very wrong condition.

### Behaviour

| Token state | `used_at.nil?` | `expires_at >= now` | Guard | Result |
| --- | --- | --- | --- | --- |
| Fresh, unused, unexpired | true | true | true | **Rejected** — legitimate reset always fails |
| Used, unexpired | false | true | true | Rejected (correct, by accident) |
| Unused, expired | true | false | true | Rejected (correct, by accident) |
| **Used and expired** | false | false | false | **Accepted — password is reset** |

The last row is the security hole. `PASSWORD_RESET_TOKEN_TTL` is one hour, and tokens are append-only with no cleanup job, so every reset link a user has ever clicked becomes a permanent password-reset credential one hour later. Anyone with access to an old reset email — a shared mailbox, a leaked archive, a forwarded message — can take over the account at any point in the future.

### Fix

```ruby
is_password_reset_token_used    = password_reset_token.used_at.present?
is_password_reset_token_expired = password_reset_token.expires_at <= Time.current

if is_password_reset_token_used || is_password_reset_token_expired
  raise_invalid_token(request: request)
end
```

Two named predicates, no negation to get wrong. The generic `INVALID_TOKEN_MESSAGE` already covers both cases without leaking which one applied — keep that.

---

## 2. Email verification tokens never expire (IAM-04, High)

### Evidence

```ruby title="red-cab-api/app/domains/identities/email_verifications/confirm_manager.rb:41-42"
        is_email_verification_token_valid = email_verification_token.verified_at.nil? || email_verification_token.expires_at >= Time.current
        return raise_invalid_token(request: request) unless is_email_verification_token_valid
```

Commit `dee3c10` rewrote `verified_at.present? || expires_at <= now` (raise) into a validity predicate. The correct negation of `A || B` is `!A && !B`; this used `||`. The `unless` is right here, so the damage is smaller than IAM-01 — but any unused token passes regardless of `expires_at`, and `VERIFICATION_TOKEN_TTL` (24 hours) is not enforced at all.

### Fix

```ruby
is_email_verification_token_valid =
  email_verification_token.verified_at.nil? &&
  email_verification_token.expires_at >= Time.current

return raise_invalid_token(request: request) unless is_email_verification_token_valid
```

### Guardrail

Both regressions came from the same class of "cleanup" edit. Add a comment on neither manager — comments do not catch this. Instead, add the table-driven test cases in § 8 so the next inversion fails loudly.

---

## 3. Archived accounts can log in and resurrect themselves (IAM-03, Critical)

### Evidence

```ruby title="red-cab-api/app/domains/identities/sessions/create_manager.rb:32-48"
        is_account_locked = identities_account.locked?
        return raise_invalid_credentials(request: request) if is_account_locked

        if identities_account.password_digest.blank? ||
          !identities_account.authenticate(request.password)
          record_failed_login(identities_account: identities_account)
          raise_invalid_credentials(request: request)
        end

        ActiveRecord::Base.transaction do
          identities_account.update!(
            failed_login_count: 0,
            status:             Identities::Account.statuses[:active],
            locked_until:       nil,
            last_login_at:      Time.current
          )
        end
```

Only `locked?` is checked. `Identities::Account` has three statuses — `active`, `locked`, `archived` — and per the soft-delete convention, `archived` **is** deletion. An archived account with a known password authenticates successfully, and then line 44 writes `status: active`, undoing the deletion.

The admin path gets this right:

```ruby title="red-cab-api/app/domains/identities/admins/sessions/create_manager.rb:33-34"
          is_admin_active = identities_admin.status_active? && !identities_admin.locked?
          return raise_invalid_credentials(request: request) unless is_admin_active
```

### Fix

Mirror the admin check, and stop writing `active` blindly. The `status: active` write exists to clear an expired lock, so scope it to exactly that.

```ruby
is_account_locked = identities_account.locked?
return raise_invalid_credentials(request: request) if is_account_locked
return raise_invalid_credentials(request: request) if identities_account.status_archived?
```

and in the success transaction:

```ruby
ActiveRecord::Base.transaction do
  identities_account.update!(
    failed_login_count: 0,
    status:             Identities::Account.statuses[:active],
    locked_until:       nil,
    last_login_at:      Time.current
  )
end
```

stays as written — it is now only reachable for `active` accounts and for `locked` accounts whose window lapsed, where promoting to `active` is correct.

---

## 4. Lockout is one-strike after the first lockout (IAM-07, High)

### Evidence

`failed_login_count` is zeroed only on a successful login (line 43-48 above). `locked?` returns false once `locked_until` passes, so the account can attempt login again — but with `failed_login_count` still sitting at 5.

```ruby title="red-cab-api/app/domains/identities/sessions/create_manager.rb:68-83"
          def record_failed_login(identities_account:)
            new_failed_login_count = identities_account.failed_login_count + 1

            ActiveRecord::Base.transaction do
              if new_failed_login_count >= Identities::Account::MAX_FAILED_ATTEMPTS
```

The next single failure computes 6, trips `>= 5`, and re-locks for another 15 minutes. Forever. A user who mistypes their password five times once is thereafter locked out by any single typo — and because the response is deliberately generic, they get no explanation.

This contradicts OPR-1 ("5 attempts / 15 minutes") as written in `.ai/instructions.md`.

### Fix

Reset the counter when the lock window has lapsed, before evaluating the password.

```ruby
is_account_locked = identities_account.locked?
return raise_invalid_credentials(request: request) if is_account_locked

if identities_account.status_locked? && identities_account.failed_login_count.positive?
  identities_account.update!(
    failed_login_count: 0,
    locked_until:       nil,
    status:             Identities::Account.statuses[:active]
  )
end
```

Reaching this line with `status_locked?` true means `locked?` returned false, which means the window expired. Clearing the counter there gives every user a fresh five attempts per lockout window, which is what OPR-1 describes.

---

## 5. Password reset does not revoke sessions (IAM-06, High)

### Evidence

`PasswordResets::ConfirmManager` updates the digest and marks the token used. No JWT session is flushed. The canonical "I think someone is in my account" remediation therefore does not remediate anything: the attacker's `rc_access` / `rc_refresh` pair stays valid, and their client keeps silently refreshing it via `PATCH /identities/sessions/current`.

### Fix

Session storage is per-account-namespaced (`identities_account:<uuid>`), so a single namespace flush revokes every device. `jwt_sessions` exposes this without any HTTP context, so it belongs in a Service, not the controller.

New file `app/domains/identities/sessions/revoke_all_service.rb`:

```ruby
# typed: true

module Identities
  module Sessions
    class RevokeAllService

      extend T::Sig

      NAMESPACE_PREFIX = 'identities_account'

      sig { params(identities_account: Identities::Account).void }
      def self.execute(identities_account:)
        JWTSessions::Session.new(
          namespace: "#{NAMESPACE_PREFIX}:#{identities_account.uuid}"
        ).flush_namespaced
      end

    end
  end
end
```

Call it from `ConfirmManager` **after** the transaction commits — it is an external (Redis) side effect, and per the Manager rules non-transactional side effects go after the transaction:

```ruby
ActiveRecord::Base.transaction do
  # … existing password + token writes …
end

Identities::Sessions::RevokeAllService.execute(
  identities_account: identities_account
)
```

### Namespace constant duplication

`NAMESPACE_PREFIX` now exists in both `SessionCookieManager` (`USER_NAMESPACE_PREFIX`) and this service. [PR-03](/docs/roadmap/notes/pr-03-session-cookie-manager-thread-safety) introduces a shared `SessionPrincipal` descriptor that owns it; until then, duplicating one string is the smaller evil versus making a domain Service depend on a controller concern. Leave a note in the PR body so PR-03 collapses it.

### Open question

IAM-Q6 asks whether the requesting device should survive. It cannot with a namespace flush, and preserving it would require issuing a fresh session from an unauthenticated endpoint. Revoke everything; the user logs in again with the password they just chose.

---

## 6. OAuth links to an existing account without a verified email (IAM-08, High)

### Evidence

```ruby title="red-cab-api/app/domains/identities/oauth/google/callback_manager.rb:75-88"
                  identities_account = Identities::Account.find_by(
                    email: google_profile.email
                  )

                  if identities_account.nil?
                    is_new_account     = true
                    identities_account = create_oauth_account(google_profile: google_profile)
                  else
                    link_google_identity(
                      identities_account: identities_account,
                      google_profile:     google_profile
                    )
                  end
```

`link_google_identity` checks only that no *different* Google uid is already linked. It never consults `google_profile.is_email_verified` — which the code clearly knows about, since `create_oauth_account` uses it (line 124) and `google_profile_attributes_for_account` uses it (line 171).

An account created with an email and password is therefore takeable over by anyone who can get a federated IdP to assert that address without verifying it. Consumer Gmail always verifies, so the practical exposure is Workspace and custom-domain tenants — a real population for a B2B corporate portal.

### Fix

Refuse to link when the IdP has not verified the address:

```ruby
sig do
  params(
    identities_account: Identities::Account,
    google_profile:     Identities::GoogleOauth::Profile
  ).void
end
def link_google_identity(identities_account:, google_profile:)
  raise_oauth_callback_failed unless google_profile.is_email_verified

  existing_google_identity = identities_account.oauth_identities.find_by(
    provider: Identities::OauthIdentity.providers[:google]
  )
  # … unchanged …
end
```

The existing generic failure message ("Google sign-in could not be completed. Please try again.") is the right response — it does not disclose that an account exists for that address.

### Related, intentionally not changed

`create_oauth_account` sets `is_email_verified` from the profile and permits creating an unverified OAuth account. That is fine: a brand-new account owned by whoever completed the OAuth flow takes nothing over. Only *linking* to a pre-existing account needs the gate.

---

## 7. Authenticated requests never re-check account state (IAM-09, High)

### Evidence

```ruby title="red-cab-api/app/controllers/identities/users/authenticated_controller.rb:11-26"
        def authenticate_identities_user!
          authorize_account_session!

          identities_account = Identities::Account.find_by(
            uuid: payload['identities_account_uuid']
          )

          if identities_account.nil?
            raise Errors::UnauthorizedError.new(
```

Existence is checked; state is not. Lock an abusive account or archive a departing user and their live session keeps working until the access token expires — and their client keeps extending it through refresh. This is the direct cost of the (correct) decision to keep claims out of the JWT: the per-request reload is only worth its cost if the reloaded state is actually consulted.

### Fix

```ruby
if identities_account.nil? || !identities_account.status_active?
  raise Errors::UnauthorizedError.new(
    title:       'You must be signed in to continue.',
    skip_sentry: true
  )
end
```

Apply the same check in `Team::AuthenticatedController#authenticate_identities_admin!` against `Identities::Admin#status_active?`.

`Marketplace::BaseController` is deliberately excluded — it already rescues to `nil`, and treating a locked account as an anonymous marketplace visitor is the correct degradation for optional auth. Add the status check there too, resolving to `nil`:

```ruby
identities_account = Identities::Account.find_by(
  uuid: payload['identities_account_uuid']
)

CurrentRequest.identities_user = identities_account&.status_active? ? identities_account : nil
```

### Interaction with the refresh endpoint

`Identities::SessionsController#update` skips `authenticate_identities_user!` (it must, to accept expired access tokens) and looks the account up itself at lines 22-31. Add the same `status_active?` guard there, or a locked account can keep minting fresh tokens indefinitely.

---

## 8. Smaller items in the same blast radius

### Admin lockout constants (IAM-16, Medium)

```ruby title="red-cab-api/app/domains/identities/admins/sessions/create_manager.rb:75-78"
                if new_failed_login_count >= Identities::Account::MAX_FAILED_ATTEMPTS
                  identities_admin.update!(
                    failed_login_count: new_failed_login_count,
                    locked_until:       Time.current + Identities::Account::LOCKOUT_DURATION
```

The internal principal reads the external principal's policy constants. Beyond the coupling, it silently means "team lockout policy = customer lockout policy", which is a decision nobody made. Define the same values on `Identities::Admin` and reference those:

```ruby
module Identities
  class Admin < ApplicationRecord

    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION    = 15.minutes
```

Admin lockout also publishes no event and sends no notification, unlike `AccountLocked`. That is a genuine gap but it needs a Notifications consumer and a product decision about who gets told — out of scope here. Note it in the PR body as follow-up.

### `Identities::Admin` model validations (IAM-22, Medium)

```ruby title="red-cab-api/app/domains/identities/admin.rb:6"
    has_secure_password
```

Bare `has_secure_password` installs presence and confirmation validations on the model. `.ai/instructions.md` forbids model-level validations, and `Identities::Account` correctly opts out with `validations: false`. Match it:

```ruby
has_secure_password validations: false
```

Admin records are seeded, not user-created, so no Validator is displaced. Confirm the seed/rake path still produces a usable digest.

---

## 9. Tests

The existing `confirm_manager_test.rb` files already assert the *correct* behaviour for §§ 1–2, so those cases should flip from red to green with no test edits. The new cases below cover the gaps that let the regressions ship.

**`test/domains/identities/password_resets/confirm_manager_test.rb`**

- [x] Existing four token cases go green
- [x] **New:** a token that is both used **and** expired is rejected — the exact hole IAM-01 opened
- [x] **New:** after a successful reset, a previously issued session no longer authorizes (IAM-06)

**`test/domains/identities/email_verifications/confirm_manager_test.rb`**

- [x] **New:** an unused but expired token is rejected (IAM-04)
- [x] **New:** an unused, unexpired token succeeds

**`test/domains/identities/sessions/create_manager_test.rb`**

- [x] **New:** archived account with the correct password is rejected and stays `archived` (IAM-03)
- [x] **New:** after a lockout window lapses, the account gets a full five attempts before re-locking (IAM-07)
- [x] **New:** the generic message is returned for archived, locked, unknown-email, and wrong-password alike

**`test/domains/identities/oauth/google/callback_manager_test.rb`**

- [x] **New:** an unverified Google profile matching an existing account's email is refused and creates no `identities_oauth_identities` row (IAM-08)
- [x] **New:** a verified profile still links correctly

**New: `test/integration/identities/sessions/create_integration_test.rb`**

There is no HTTP-level login test today (IAM-29). Add one covering: 201 plus both cookies on success; 422 with the generic message on failure; no `rc_team_access` cookie is ever set.

**`test/controllers/team/identities/admins/sessions_controller_test.rb`**

- [x] **New:** an archived admin cannot log in
- [x] **New:** an admin archived *after* login gets 401 on the next request (IAM-09)

## 10. New vs deleted classes

| Change | File |
| --- | --- |
| **New** | `app/domains/identities/sessions/revoke_all_service.rb` |
| Modified | `identities/password_resets/confirm_manager.rb`, `identities/email_verifications/confirm_manager.rb`, `identities/sessions/create_manager.rb`, `identities/oauth/google/callback_manager.rb`, `identities/admin.rb`, `identities/admins/sessions/create_manager.rb` |
| Modified | `identities/users/authenticated_controller.rb`, `team/authenticated_controller.rb`, `marketplace/base_controller.rb`, `identities/sessions_controller.rb` |
| Deleted | none |

## 11. Serializer contract

**Unchanged.** No serializer is touched and no response body changes shape. The only observable differences are status codes for inputs that should always have been rejected:

| Request | Before | After |
| --- | --- | --- |
| Password reset with a fresh valid token | 422 invalid token | **200** |
| Password reset with a used + expired token | 200 (password reset!) | **422** |
| Email verification with an expired token | 200 | **422** |
| Login as an archived account | 201 + session | **422** generic |
| Any request on a session whose account was locked | 200 | **401** |

## 12. Frontend impact

None required. `red-cab-web` already handles 422 from both token confirm flows (`identities-password-reset-confirm-form.jsx`, `verify-email-page.jsx`) and 401 from authenticated requests.

One behavioural note worth telling the web team: after PR-02, a password reset invalidates the current session, so a user who resets while logged in on another tab will be bounced to `/login` on their next request. That is the intent.

## 13. Migration risk and rollback

**Data risk: none.** No migration, no backfill, no destructive write. All changes are conditional logic and one Redis flush.

**Behavioural risk — accounts currently in a bad state.** Because IAM-07 has been live, some accounts may sit at `failed_login_count >= 5` with `status: locked` and an expired `locked_until`. After this PR they self-heal on their next login attempt (§ 4 resets the counter). No backfill needed, but expect a small drop in "cannot log in" support contacts, not a spike.

**Behavioural risk — archived accounts with live sessions.** Any account archived while a session existed keeps working today and will start receiving 401 immediately. That is the fix, but if the team has been using `archived` as a soft-suspend with an expectation that the user finishes their session, communicate the change.

**Rollback:** each of the seven fixes is an independent hunk. If one causes an incident, revert that hunk alone. Do **not** revert §§ 1–2 under any circumstances — the pre-PR state is a replayable password reset.

**Ordering:** ship §§ 1–4 first if the PR needs splitting for review. §§ 5–7 are equally correct but touch more files.

## 14. Reviewer checklist

- [x] Every boolean guard is expressed as a positive predicate with a name, not a negation of a compound condition — this is the exact shape that produced IAM-01 and IAM-04
- [x] `RevokeAllService` runs after the transaction commits, not inside it
- [x] `status_active?` guards land in all four entry points: authenticated controller, team authenticated controller, marketplace optional auth, and session refresh
- [x] The generic credential message is unchanged for archived accounts — no new enumeration signal
- [x] Baseline failures recorded in [PR-01](/docs/roadmap/notes/pr-01-restore-account-current-route) are now green, and no new failures appeared
