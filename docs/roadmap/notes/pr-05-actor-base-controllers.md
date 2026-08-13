---
title: "PR-05 — Actor base controllers and a complete CurrentRequest"
sidebar_label: PR-05 — Actor authorization
sidebar_position: 6
description: Implement the missing tourist and corporate base controllers, complete CurrentRequest, and make profile presence the single portal gate.
---

## TL;DR

- `Tourists::BaseController` and `Corporate::BaseController` are documented in the inheritance chain and do not exist.
- `CurrentRequest` is missing `tourist_profile` and `corporate_profile`, so no downstream Manager can be handed a tourist or corporate context.
- Provider gating checks role **and** profile with two different messages; the documented rule is profile presence.
- Standardize: authentication answers *who*, the actor base controller answers *which portal*, and the gate is profile presence.
- **Phase 1. Additive** — no existing route changes behaviour.

**Fixes:** IAM-12 (Medium), IAM-13 (Medium), IAM-14 (Medium), IAM-28 (Low).

**Depends on:** [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes) — the `status_active?` guard belongs in the authentication layer before portal gates are layered on top.

**Blocks:** Phase 1 Booking and Catalog work. Every tourist-facing endpoint needs `CurrentRequest.tourist_profile`, and bookings reference `tourists_profiles.id` per the Phase 1 FK conventions.

---

## 1. What is missing

`.ai/instructions.md` documents this chain:

```
ApplicationController
  +-- Identities::Users::AuthenticatedController
  |     +-- Tourists::BaseController
  |     +-- Corporate::BaseController
  |     +-- Providers::BaseController
```

Only `Providers::BaseController` exists. The full contents of `app/controllers/` confirm there is no `tourists/base_controller.rb` and no `corporate/base_controller.rb`.

Likewise, `CurrentRequest` documents five attributes and declares three:

```ruby title="red-cab-api/app/models/current_request.rb:1-7"
class CurrentRequest < ActiveSupport::CurrentAttributes

  attribute :identities_user
  attribute :identities_admin
  attribute :provider_profile

end
```

This has not hurt yet because tourist and corporate routes only contain unauthenticated signup. It becomes blocking the moment Phase 1 booking endpoints land, and the cost of writing it now is an hour versus retrofitting it across a dozen controllers later.

---

## 2. The gate: profile presence, not role

### What the docs say

```text title="red-cab-api/docs/db/identities.dbml:25"
    - Portal authorization prefers matching role profile presence over role alone
```

And the roadmap repeats it: *"Gate portal endpoints on the matching profile (+ status where required), not role enum alone."*

### What the code does

```ruby title="red-cab-api/app/controllers/providers/base_controller.rb:10-46"
      def authorize_provider_account
        unless CurrentRequest.identities_user.role_provider?
          raise Errors::UnauthorizedError.new(
            title:       'You must be signed in as a provider to continue.',
```

Role is checked first with one message, then profile presence with a different message, and a third method checks approval but is never invoked (IAM-28).

### Why role must not be the gate

`role` is a denormalized convenience column. `docs/db/identities.dbml:71` states the invariant "role = tourist|corporate|provider **iff** matching profile exists" — and nothing enforces it. There is no constraint, no validation, and no test. The two can diverge through any of:

- Provider signup, which creates an account with `role: provider` and **no** profile (by design — `Providers::Profile` is created later by `POST /providers/profiles`)
- The OAuth callback, which hardcodes `role: tourist` and creates a `Tourists::Profile` for new accounts but leaves both untouched for accounts it links to
- Any future admin tool that corrects a role

Authorizing on `role` means authorizing on a cached copy of a fact whose source of truth is another table. Authorize on the source of truth. Role stays for what it is genuinely good at: the frontend's post-login redirect (`red-cab-web/app/utils/identities-auth-utils.js` maps role to a home path), which is a routing hint, not a security boundary.

### The one place role is still checked

Provider signup creates an account with no profile, so `Providers::BaseController` must let a profile-less provider through to exactly one endpoint — `POST /providers/profiles`. That is already handled correctly:

```ruby title="red-cab-api/app/controllers/providers/profiles_controller.rb:4"
    skip_before_action :require_provider_profile!, only: [ :create ]
```

For that single endpoint, role is the only available signal, so the role check stays there rather than in the shared base filter. Everywhere else, profile presence subsumes it.

---

## 3. Changes

### `app/models/current_request.rb`

```ruby
class CurrentRequest < ActiveSupport::CurrentAttributes

  attribute :identities_user
  attribute :identities_admin
  attribute :tourist_profile
  attribute :corporate_profile
  attribute :provider_profile

end
```

| Attribute | Set by | Nilable |
| --- | --- | --- |
| `identities_user` | `Identities::Users::AuthenticatedController`, or `Marketplace::BaseController` | Yes on marketplace only |
| `identities_admin` | `Team::AuthenticatedController` | No |
| `tourist_profile` | `Tourists::BaseController` | No |
| `corporate_profile` | `Corporate::BaseController` | No |
| `provider_profile` | `Providers::BaseController` | No |

Rule to state in the PR body: **each attribute is set by exactly one controller and is non-nil for the duration of any action beneath it.** Managers still receive these as keyword arguments and never read `CurrentRequest` themselves.

### New: `app/controllers/tourists/base_controller.rb`

```ruby
module Tourists
  class BaseController < ::Identities::Users::AuthenticatedController

    before_action :load_tourist_profile
    before_action :require_tourist_profile!

    private

      def load_tourist_profile
        CurrentRequest.tourist_profile = CurrentRequest.identities_user.tourist_profile
      end

      def require_tourist_profile!
        return if CurrentRequest.tourist_profile.present?

        raise Errors::UnauthorizedError.new(
          title:       'This area is for tourist accounts. Please sign in with a tourist account to continue.',
          skip_sentry: true
        )
      end

  end
end
```

### New: `app/controllers/corporate/base_controller.rb`

Identical shape against `corporate_profile`, with a message naming corporate accounts.

Both associations already exist on the model (`app/domains/identities/account.rb:29-41`), so no model change is needed. Each is a `has_one` by `identities_account_id` with a unique index, so the lookup is a single indexed read.

### `app/controllers/providers/base_controller.rb`

Drop the role check from the shared filter chain — profile presence is strictly stronger, since a profile can only exist for an account that had `role: provider` at signup. Keep approval as an opt-in filter and actually make it usable:

```ruby
module Providers
  class BaseController < ::Identities::Users::AuthenticatedController

    before_action :load_provider_profile
    before_action :require_provider_profile!

    private

      def load_provider_profile
        CurrentRequest.provider_profile = CurrentRequest.identities_user.provider_profile
      end

      def require_provider_profile!
        return if CurrentRequest.provider_profile.present?

        raise Errors::UnauthorizedError.new(
          title:       'Please complete provider registration before continuing.',
          skip_sentry: true
        )
      end

      def require_approved_provider_profile!
        return if CurrentRequest.provider_profile.status_approved?

        raise Errors::UnauthorizedError.new(
          title:       'Your provider account must be approved before you can do this.',
          skip_sentry: true
        )
      end

  end
end
```

`authorize_approved_provider_profile` is renamed to `require_approved_provider_profile!` for consistency with the other filters, and its now-redundant nil branch is removed — `require_provider_profile!` already guarantees presence, and having the nil check in two places is how they drift apart.

**It must actually be wired up.** `ProfilesController#create` needs the role check it loses from the base chain:

```ruby
module Providers
  class ProfilesController < Providers::BaseController

    skip_before_action :require_provider_profile!, only: [ :create ]
    before_action :authorize_provider_role!, only: [ :create ]
```

with a small private method checking `role_provider?`. This is the one surviving role check in the codebase, and it deserves a comment explaining why: the profile that would normally be the gate is the thing being created.

Then audit every provider endpoint and decide explicitly whether it needs approval. Phase 1 says listing create requires an approved provider (`INV-12`, `LC-12`). Catalog controllers do not exist yet, so this PR ships the filter and the Catalog PR uses it — but say so in the PR body so it does not sit unused for a second time.

### Blank route files

`config/routes/tourists_routes.rb` and `corporate_routes.rb` currently contain only signup, which is unauthenticated and correctly inherits `ApplicationController`. This PR adds no routes. That is deliberate: base controllers with no subclasses are dead code, so the PR must land together with at least one authenticated endpoint per portal, or immediately before the Phase 1 PR that adds them. Do not merge this in isolation more than a sprint ahead of its first consumer.

---

## 4. Status codes

Every gate above raises `Errors::UnauthorizedError` (401), matching what exists today. This is wrong in principle — the caller *is* authenticated, they are just in the wrong portal — and it has a concrete cost: `red-cab-web`'s `ky` client treats 401 as "refresh and retry", so every denied request burns a pointless token refresh round-trip.

```javascript title="red-cab-web/app/api/ky-client.js:164-178"
        async ({ request, options, response }) => {
          if (response.status === 401 && !options._retry) {
            const refreshSuccess = await attemptTokenRefresh(request)
```

The correct fix is an `Errors::ForbiddenError` (403) and a web client that does not retry it. That is a coordinated two-repo change affecting error handling everywhere, not just IAM, so it is tracked as open question **IAM-Q2** rather than folded in here. Using 401 keeps this PR consistent with the rest of the codebase; changing it should be one deliberate PR across all contexts.

---

## 5. New vs deleted classes

| Change | File |
| --- | --- |
| **New** | `app/controllers/tourists/base_controller.rb` |
| **New** | `app/controllers/corporate/base_controller.rb` |
| Modified | `app/models/current_request.rb` — two attributes |
| Modified | `app/controllers/providers/base_controller.rb` — drop role filter, rename and simplify the approval filter |
| Modified | `app/controllers/providers/profiles_controller.rb` — explicit role check on `create` |
| Deleted | `Providers::BaseController#authorize_provider_account` |

No domain classes, no models, no serializers, no migration.

## 6. Serializer contract

**Unchanged.** No response body changes. The only observable difference is that a provider account whose profile was deleted out from under it now gets the "complete provider registration" message instead of the "sign in as a provider" one — both 401, both generic.

## 7. Tests

**New: `test/controllers/tourists/base_controller_test.rb`** — via an anonymous test controller, or against the first real tourist endpoint if this ships alongside one:

- [x] A tourist account with a profile reaches the action and `CurrentRequest.tourist_profile` is populated
- [x] A corporate account is rejected with 401
- [x] A tourist account whose profile row is missing is rejected with 401
- [x] No session at all is rejected with 401

**New: `test/controllers/corporate/base_controller_test.rb`** — the mirror image.

**Modify existing provider tests:**

- [x] `POST /providers/profiles` still works for a provider account with no profile
- [x] `POST /providers/profiles` is rejected for a tourist account — this is the case that would silently open up if the role check were dropped without being re-added to the controller
- [x] An account with `role: tourist` that somehow has a `Providers::Profile` now **passes** the gate. Add this as an explicit test with a comment: it documents the deliberate shift from role to profile presence, and it is the behaviour change a reviewer is most likely to question

**New: `test/models/current_request_test.rb`** — assert all five attributes reset between requests. `ActiveSupport::CurrentAttributes` resets per request, but a leaked profile across requests is a cross-tenant data leak, so it is worth one cheap explicit test.

## 8. Frontend impact

**None.** No route, response shape, or status code changes.

Worth telling the web team once the tourist portal exists: the API will enforce the portal gate server-side, so the client-side HOCs (`with-tourist-auth.jsx`, `with-corporate-auth.jsx`, `with-provider-auth.jsx`) become UX affordances rather than the security boundary they currently imply. They check `identitiesAccount?.role`, which is exactly the client-side role check that must never be the real gate.

## 9. Migration risk and rollback

**Risk: low-medium.** The new controllers have no callers, so their risk is zero until Phase 1 endpoints use them. The real risk is the provider change.

**The one thing that could go wrong:** removing `authorize_provider_account` from the base chain widens access for any account that has a `Providers::Profile` but not `role: provider`. Query production before merging:

```sql
SELECT COUNT(*)
FROM providers_profiles pp
JOIN identities_accounts ia ON ia.id = pp.identities_account_id
WHERE ia.role <> 'provider';
```

Expect zero. If it is not zero, the data disagrees with the DBML invariant and that needs explaining before this ships — it is exactly the divergence § 2 warns about.

**Rollback:** revert. Nothing depends on the new controllers yet, and the provider change is one filter.

## 10. Reviewer checklist

- [ ] The production query in § 9 returned zero, and the result is pasted in the PR description *(run before merge — not verifiable from local dev)*
- [x] `POST /providers/profiles` still rejects non-provider accounts — verify by test, not by reading
- [x] `git grep 'role_provider?\|role_tourist?\|role_corporate?'` in `app/controllers/` returns exactly one hit: the provider profile create guard
- [x] Every new `CurrentRequest` attribute has exactly one writer
- [x] `require_approved_provider_profile!` is either wired to an endpoint in this PR or explicitly named in the PR body as reserved for the Catalog PR, with a date *(reserved for Catalog PR — not wired in this PR)*
