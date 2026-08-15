---
title: "PR-07 — One account provisioning path for password and OAuth signup"
sidebar_label: PR-07 — OAuth provisioning
sidebar_position: 8
description: Stop the OAuth callback from building accounts and tourist profiles inline; route both credential kinds through one provisioning service.
---

## TL;DR

- `CallbackManager` creates an account, a `Tourists::Profile`, and an OAuth identity inline, bypassing `Identities::Accounts::CreateService`.
- Tourist signup logic now exists in two places that must be kept in step by hand.
- The federated role is hardcoded to `tourist` inside the OAuth manager, where nobody will look for it.
- Introduce `Identities::Accounts::ProvisionService` taking a `credential_kind`, and have both paths call it.
- **Phase 2. No API contract change.**

**Fixes:** IAM-15 (Medium).

**Depends on:** [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes) — the OAuth linking gate must land first; this PR moves code around it and would make that fix harder to review if the order were reversed.

---

## 1. The duplication

### Password signup

`Tourists::Identities::Accounts::CreateManager` does five things in a documented order: validate, check duplicate email, provision credentials through `Identities::Accounts::CreateService`, create the role profile, publish `AccountRegistered`.

```ruby title="red-cab-api/app/domains/tourists/identities/accounts/create_manager.rb:43-71"
          identities_account = ActiveRecord::Base.transaction do
            account     = ::Identities::Account.new(
              email:                 request.email,
              password:              request.password,
              password_confirmation: request.password_confirmation,
              first_name:            request.first_name,
              last_name:             request.last_name,
              uuid:                  SecureRandom.uuid,
              role:                  ::Identities::Account.roles[:tourist]
            )

            account             = ::Identities::Accounts::CreateService.execute(
              identities_account:     account,
              raw_verification_token: raw_verification_token
            )

            Tourists::Profile.create!(
              uuid:               SecureRandom.uuid,
              identities_account: account,
              status:             Tourists::Profile.statuses[:active]
            )
```

### OAuth signup

`CallbackManager` does the same thing, differently, in a private method:

```ruby title="red-cab-api/app/domains/identities/oauth/google/callback_manager.rb:123-150"
            def create_oauth_account(google_profile:)
              verified_at = google_profile.is_email_verified ? Time.current : nil

              identities_account = Identities::Account.create!(
                uuid:              SecureRandom.uuid,
                email:             google_profile.email,
                first_name:        google_profile.first_name,
                last_name:         google_profile.last_name,
                role:              Identities::Account.roles[:tourist],
                status:            Identities::Account.statuses[:active],
                is_email_verified: google_profile.is_email_verified,
                email_verified_at: verified_at
              )

              Tourists::Profile.create!(
                uuid:               SecureRandom.uuid,
                identities_account: identities_account,
                status:             Tourists::Profile.statuses[:active]
              )
```

### Why it matters

The two paths differ in ways that are individually defensible and collectively unmanaged:

| Concern | Password signup | OAuth signup |
| --- | --- | --- |
| Persistence | `CreateService` | inline `create!` |
| Verification token | issued | none — correct, Google already verified |
| `status` | column default (`active`) | explicit `active` |
| Email verification state | default `false` | from the Google profile |
| Tourist profile | created by the actor manager | created inside the OAuth manager |
| `AccountRegistered` payload | with `raw_verification_token` | with `nil` |
| Duplicate email | explicit check, 422 | resolved by linking |

Nothing here is *wrong* today. The problem is maintenance: adding a column to `identities_accounts`, or a step to tourist onboarding (a welcome record, a default notification preference, an analytics identity), requires remembering that a second creation path exists in a file named `callback_manager.rb`. That is precisely the kind of "keep two things in sync by hand" arrangement that produced the inverted conditions in [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes).

The hardcoded `role: tourist` is the same problem in miniature. Open question **IAM-Q5** asks whether federated signup should ever produce a provider or corporate account; today the answer is buried at line 131 of an OAuth manager rather than expressed where signup policy lives.

---

## 2. Design

Rename and widen `Identities::Accounts::CreateService` into `Identities::Accounts::ProvisionService`, taking the credential kind explicitly.

**`app/domains/identities/accounts/provision_service.rb`**

```ruby
# typed: true

module Identities
  module Accounts
    class ProvisionService

      extend T::Sig

      VERIFICATION_TOKEN_TTL  = 24.hours
      DUPLICATE_EMAIL_MESSAGE = 'An account with this email address already exists.'

      CREDENTIAL_KIND_PASSWORD = :password
      CREDENTIAL_KIND_OAUTH    = :oauth

      sig do
        params(
          identities_account:     Identities::Account,
          credential_kind:        Symbol,
          raw_verification_token: T.nilable(String)
        ).returns(Identities::Account)
      end
      def self.execute(identities_account:, credential_kind:, raw_verification_token: nil)
        identities_account.save!

        return identities_account if credential_kind == CREDENTIAL_KIND_OAUTH

        sent_at = Time.current

        Identities::EmailVerificationToken.create!(
          identities_account: identities_account,
          token_digest:       Digest::SHA256.hexdigest(T.must(raw_verification_token)),
          sent_at:            sent_at,
          expires_at:         sent_at + VERIFICATION_TOKEN_TTL
        )

        identities_account
      end

    end
  end
end
```

It stays a Service by the conventions' definition: it receives models and primitives (never a Request), owns no transaction, raises no `Errors::*`, and carries no actor prefix. `DUPLICATE_EMAIL_MESSAGE` lands here as the shared constant [PR-06](/docs/roadmap/notes/pr-06-session-surface-symmetry) asks for.

### Tourist profile creation

Extract the second duplicated block too:

**`app/domains/tourists/profiles/create_service.rb`**

```ruby
# typed: true

module Tourists
  module Profiles
    class CreateService

      extend T::Sig

      sig { params(identities_account: ::Identities::Account).returns(Tourists::Profile) }
      def self.execute(identities_account:)
        Tourists::Profile.create!(
          uuid:               SecureRandom.uuid,
          identities_account: identities_account,
          status:             Tourists::Profile.statuses[:active]
        )
      end

    end
  end
end
```

This lives in the **Tourists** domain, not IAM. `CallbackManager` calling it is a cross-domain write from the consuming context, which is exactly the documented pattern — and it is honest about what the OAuth callback already does today.

### Rewritten `create_oauth_account`

```ruby
def create_oauth_account(google_profile:)
  verified_at = google_profile.is_email_verified ? Time.current : nil

  identities_account = Identities::Account.new(
    uuid:              SecureRandom.uuid,
    email:             google_profile.email,
    first_name:        google_profile.first_name,
    last_name:         google_profile.last_name,
    role:              Identities::Account.roles[:tourist],
    status:            Identities::Account.statuses[:active],
    is_email_verified: google_profile.is_email_verified,
    email_verified_at: verified_at
  )

  Identities::Accounts::ProvisionService.execute(
    identities_account: identities_account,
    credential_kind:    Identities::Accounts::ProvisionService::CREDENTIAL_KIND_OAUTH
  )

  Tourists::Profiles::CreateService.execute(
    identities_account: identities_account
  )

  Identities::OauthIdentity.create!(
    identities_account: identities_account,
    provider:           Identities::OauthIdentity.providers[:google],
    provider_uid:       google_profile.provider_uid
  )

  identities_account
end
```

The `role: tourist` line stays but is now visibly one of several attributes an actor-signup path sets, adjacent to a Service call that any future provider-OAuth flow would reuse. Resolving IAM-Q5 becomes a change to which profile service is called, not an archaeology exercise.

### Actor managers

All three drop to:

```ruby
account = ::Identities::Accounts::ProvisionService.execute(
  identities_account:     account,
  credential_kind:        ::Identities::Accounts::ProvisionService::CREDENTIAL_KIND_PASSWORD,
  raw_verification_token: raw_verification_token
)
```

and tourists additionally swaps its inline `Tourists::Profile.create!` for `Tourists::Profiles::CreateService.execute`.

**Do not extract a shared actor-signup manager.** The three managers differ in the profile they create and in the portal fields they validate, and collapsing them would reintroduce the actor-agnostic Manager the conventions explicitly forbid. Sharing the *Services* is the right granularity; sharing the *Manager* is not.

---

## 3. Naming: rename or keep

`CreateService` → `ProvisionService` is a judgment call.

**For the rename:** the class no longer only creates — it conditionally issues a verification token based on credential kind. "Provision" describes credential setup for a principal regardless of how those credentials were obtained. It also breaks the `Accounts::CreateService` / `Accounts::CreateManager` near-collision that makes the two easy to confuse at a call site.

**Against:** `{Domain}::{Models}::Shared::CreateService` is a documented convention shape, and this is a rename with no behavioural payload.

The audit recommends the rename because the class gains a genuinely new responsibility in this PR. If the reviewer disagrees, keeping `CreateService` and only adding the `credential_kind` parameter is a perfectly good outcome — the duplication is the finding, not the name. Decide in review and do not relitigate later.

## 4. New vs deleted classes

| Change | File |
| --- | --- |
| **New** | `app/domains/tourists/profiles/create_service.rb` |
| Renamed | `identities/accounts/create_service.rb` → `provision_service.rb`, plus the `credential_kind` parameter |
| Modified | `identities/oauth/google/callback_manager.rb` — `create_oauth_account` |
| Modified | all three actor `create_manager.rb` files |
| Deleted | inline `Tourists::Profile.create!` in two places; `DUPLICATE_EMAIL_MESSAGE` in three places |

**Also rename the test:** `test/domains/identities/accounts/create_service_test.rb` → `provision_service_test.rb`.

## 5. Serializer contract

**Unchanged.** No response body, status code, or event payload changes. `AccountRegistered` keeps its exact signature, including `raw_verification_token: nil` from OAuth.

This is a pure internal refactor. Any observable difference means it is wrong.

## 6. Tests

**`test/domains/identities/accounts/provision_service_test.rb`** (renamed):

- [x] `credential_kind: :password` saves the account **and** creates one `EmailVerificationToken` with a SHA256 digest — never the raw token
- [x] `credential_kind: :oauth` saves the account and creates **no** token row
- [x] `credential_kind: :password` with a nil `raw_verification_token` raises rather than persisting a half-provisioned account

**New: `test/domains/tourists/profiles/create_service_test.rb`**

- [x] Creates an active profile with a uuid, linked to the account
- [x] Two calls for the same account violate the unique index — documents that the caller owns idempotency

**`test/domains/identities/oauth/google/callback_manager_test.rb`**

- [x] Every existing case passes **unmodified**. This is the acceptance criterion for the whole PR
- [x] **New:** a new OAuth account creates exactly zero `identities_email_verification_tokens` rows — the behaviour that would silently regress if `credential_kind` were threaded through wrong

**Actor signup manager tests** — all three pass unmodified.

## 7. Frontend impact

**None.** No route, response, or status code changes.

## 8. Migration risk and rollback

**Risk: low.** No schema change, no contract change, and the existing test coverage for all four signup paths is reasonable.

The one failure mode worth naming: passing the wrong `credential_kind` from a call site. A password signup marked `:oauth` would create an account with **no verification token**, so the user could never verify their email and `AccountRegistered` would carry a token the Notifications consumer emails but nothing can redeem. The tests in § 6 cover both directions; make sure they run before merge rather than trusting the diff.

**Rollback:** revert. It is a self-contained refactor with no data or contract dependency.

## 9. Reviewer checklist

- [x] `git grep 'Tourists::Profile.create!'` returns only `tourists/profiles/create_service.rb`
- [x] `git grep 'EmailVerificationToken.create!'` returns only `provision_service.rb`
- [x] `git grep 'An account with this email address already exists'` returns only the one constant definition
- [x] Every `ProvisionService.execute` call site passes an explicit `credential_kind` — no default
- [x] All existing OAuth and signup tests pass with **no edits**; if any needed changing, the refactor changed behaviour
- [x] The rename decision (§ 3) is recorded in the PR description either way
