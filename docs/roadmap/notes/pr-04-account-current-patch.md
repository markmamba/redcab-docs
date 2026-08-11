---
title: "PR-04 — Consolidate account updates on PATCH /identities/accounts/current"
sidebar_label: PR-04 — Account current PATCH
sidebar_position: 5
description: Replace the column-specific language_preference route with one account update endpoint for profile fields on identities_accounts.
---

## TL;DR

- **Shipped:** `PATCH /identities/accounts/current` is the single account-mutation endpoint. `Identities::Accounts::Update{Request,Validator,Manager}` replace the deleted `UpdateLanguagePreference*` stack.
- **Full-update contract:** clients send `first_name`, `last_name`, and `email` on every patch; `language_preference` is optional. This is simpler than partial PATCH — no `_provided` flags, no `assignable_attributes`, no dismiss branch.
- **Email is mutable:** changing `email` clears `is_email_verified` and `email_verified_at`. Uniqueness is validated in `UpdateValidator`.
- **Names are serialized and updatable:** `first_name` and `last_name` are on `Identities::AccountBaseSerializer`.
- **Legacy route:** `PATCH /identities/accounts/language_preference` still appears in `identities_routes.rb` but has **no controller action** (404). [PR-08](/docs/roadmap/notes/pr-08-deprecations) removes the route; web must call `/current`.

**Fixes:** IAM-10 (Medium).

**Depends on:** [PR-01](/docs/roadmap/notes/pr-01-restore-account-current-route) — `GET …/current` must exist for `PATCH …/current` to sit beside it.

---

## 1. Why consolidate

### The problem (before)

```ruby title="red-cab-api/config/routes/identities_routes.rb (before PR-04)"
namespace :identities do
  namespace :accounts do
    get   'current', controller: '/identities/accounts', action: 'show'
    patch 'language_preference', controller: '/identities/accounts', action: 'update_language_preference'
  end
```

Three problems:

1. **`language_preference` is a verb-ish path, not a resource.** The URL names a column instead of the thing being modified. Sessions already do this correctly with `PATCH /identities/sessions/current`.
2. **It does not scale.** Every new account field would add a route and a Request/Validator/Manager trio.
3. **`first_name` and `last_name` were stranded.** Written at signup (or left `null` by OAuth), not serialized, and not updatable.

### Why `PATCH …/current` and not `PATCH …/:uuid`

The caller can only ever modify their own account — the account comes from `CurrentRequest.identities_user`, never from a path parameter. `current` makes the constraint structural and matches session routes.

---

## 2. Design decisions (vs. original plan)

The original PR note proposed partial PATCH, an `is_dismissed` branch (FR-IAM-011), and a delegating `update_language_preference` action. **What shipped differs:**

| Topic | Original plan | Shipped |
| --- | --- | --- |
| Patch semantics | Partial — only supplied fields written | **Full update** — `first_name`, `last_name`, `email` required every request |
| `is_dismissed` | Dismiss language prompt without persisting | **Removed** — `should_prompt_language` remains `language_preference.nil?` in the serializer |
| Email | Out of scope | **In scope** — mutable; verification reset on change |
| RVM shape | `assignable_attributes`, dismiss helpers | **Simple** — Request permits; Validator validates; Manager `assign_attributes` + `save!` |
| Legacy route | Delegates to `#update` | **No delegator** — `UpdateLanguagePreference*` deleted; legacy path 404s until [PR-08](/docs/roadmap/notes/pr-08-deprecations) removes the route line |
| Blank names | Clear to `null` | **Validation error** — profile update requires names (OAuth may still create with `null`) |

Reference implementation: `red-cab-api/app/domains/identities/accounts/update_{request,validator,manager}.rb`.

---

## 3. Target contract

```
PATCH /identities/accounts/current
```

Authenticated (`Identities::Users::AuthenticatedController`). Principal from session, not path.

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `first_name` | Yes | string | Stripped; blank → validation error |
| `last_name` | Yes | string | Same |
| `email` | Yes | string | Normalized `strip.downcase` in Request; format + uniqueness in Validator; change clears verification |
| `language_preference` | No | `"en"` \| `"ja"` | When present, must be a permitted enum value; publishes `LanguagePreferenceChanged` only when value actually changes |

**Never permitted:** `role`, `status`, `is_email_verified`, lockout fields, `password_digest`, `uuid`.

**Client contract:** read current account via `GET /identities/accounts/current`, then send all four permitted fields on every update (reuse current values for unchanged columns).

Response: `200` with `Identities::AccountBaseSerializer` payload.

### Validation rules

- `first_name` / `last_name` — presence; max 255 characters
- `email` — presence; `URI::MailTo::EMAIL_REGEXP`; unique among accounts (excluding self)
- `language_preference` — when present, must be `en` or `ja`

### Side effects (manager)

1. `assign_attributes(first_name:, last_name:, email:, language_preference:)` with explicit kwargs from request
2. If email changed: `is_email_verified = false`, `email_verified_at = nil`
3. After transaction commit: `LanguagePreferenceChanged.publish` only when `language_preference` changed

---

## 4. Implementation

### Routes

```ruby title="red-cab-api/config/routes/identities_routes.rb"
namespace :identities do
  namespace :accounts do
    get   'current',             controller: '/identities/accounts', action: 'show'
    patch 'current',             controller: '/identities/accounts', action: 'update'
    patch 'language_preference', controller: '/identities/accounts', action: 'update_language_preference' # stale — 404 until PR-08
  end
```

### Controller

```ruby title="red-cab-api/app/controllers/identities/accounts_controller.rb"
module Identities
  class AccountsController < Identities::Users::AuthenticatedController

    def show
      render(
        json:   ::Identities::AccountBaseSerializer.new.serialize_to_json(CurrentRequest.identities_user),
        status: :ok
      )
    end

    def update
      request            = ::Identities::Accounts::UpdateRequest.new(params: params)
      identities_account = ::Identities::Accounts::UpdateManager.execute(
        request:            request,
        identities_account: CurrentRequest.identities_user
      )

      render(
        json:   ::Identities::AccountBaseSerializer.new.serialize_to_json(identities_account),
        status: :ok
      )
    end

  end
end
```

### Request → Validator → Manager

**Request** — permit and assign only:

```ruby
permitted_params = params.permit(:first_name, :last_name, :email, :language_preference)
@first_name          = permitted_params[:first_name]&.strip
@last_name           = permitted_params[:last_name]&.strip
@email               = permitted_params[:email].to_s.strip.downcase.presence
@language_preference = permitted_params[:language_preference]
```

**Validator** — `initialize(identities_account:, request:)`; copy fields; all rules in ActiveModel validations.

**Manager** — validate → `assign_attributes` → `save!` in transaction → events after commit. No private attribute builders.

### Serializer

```ruby title="red-cab-api/app/domains/identities/account_base_serializer.rb"
attributes(
  :uuid,
  :email,
  :first_name,
  :last_name,
  :role,
  :language_preference,
  :is_email_verified,
  :should_prompt_language
)

def should_prompt_language
  object.language_preference.nil?
end
```

### Deleted

- `app/domains/identities/accounts/update_language_preference_{request,validator,manager}.rb`
- `test/domains/identities/accounts/update_language_preference_manager_test.rb`
- `Identities::AccountsController#update_language_preference`

---

## 5. Serializer contract: before and after

**Before** — names absent from payload:

```json
{
  "uuid": "8f14e45f-ceea-467a-9dfd-2c9d1e2b8a41",
  "email": "tourist@example.com",
  "role": "tourist",
  "language_preference": null,
  "is_email_verified": false,
  "should_prompt_language": true
}
```

**After** — `first_name` and `last_name` included:

```json
{
  "uuid": "8f14e45f-ceea-467a-9dfd-2c9d1e2b8a41",
  "email": "tourist@example.com",
  "first_name": "Hana",
  "last_name": "Sato",
  "role": "tourist",
  "language_preference": "ja",
  "is_email_verified": false,
  "should_prompt_language": false
}
```

**Additive for existing keys.** New keys: `first_name`, `last_name`. No existing key changes name, type, or nullability.

---

## 6. Tests

**`test/domains/identities/accounts/update_manager_test.rb`**

- [x] Updates names without changing language preference
- [x] Updates language preference without changing names
- [x] Updates email and clears email verification
- [x] Name-only update does not publish `LanguagePreferenceChanged`
- [x] Combined name + language update publishes once
- [x] Same `language_preference` again publishes nothing
- [x] Blank `first_name` / `last_name` / `email` → validation error
- [x] Invalid `language_preference` → validation error
- [x] Name too long → validation error
- [x] Duplicate email → validation error
- [x] Unpermitted `role`, `status`, `is_email_verified` ignored (security)

**`test/integration/identities/accounts/update_integration_test.rb`**

- [x] 200 and full serializer payload on success
- [x] 401 without session
- [x] 401 without CSRF header
- [x] Sending `role: "provider"` does not change role

**`test/integration/identities/accounts/update_language_preference_integration_test.rb`**

- [x] Updates language via `PATCH …/current` with full payload
- [ ] Legacy `PATCH …/language_preference` — **fails (404)** until route removed in PR-08 or a temporary delegator is added; web must not rely on it

**`test/integration/identities/accounts/show_integration_test.rb`** — asserts `first_name` and `last_name` keys present.

---

## 7. Frontend impact

**Breaking for language-only callers.** Any client that PATCHes only `language_preference` must send the full payload:

```js
// red-cab-web — replace updateLanguagePreference with:
update: (accountData) => {
  return apiClient.patch(`${IDENTITIES_ACCOUNTS_PATH}/current`, { json: accountData }).json()
}

// Language form — send current account values + new language:
update({
  first_name: account.first_name,
  last_name: account.last_name,
  email: account.email,
  language_preference: 'ja',
})
```

**Language prompt dismiss:** there is no `is_dismissed` param. Dismissing the modal is a UI-only action until the user selects a language (or the prompt stays via `should_prompt_language: true`).

**Account settings:** exposed `first_name` / `last_name` unblock profile display and name correction.

Migrate off `PATCH …/language_preference` before [PR-08](/docs/roadmap/notes/pr-08-deprecations).

---

## 8. Deliberately out of scope

- **Password changes** — requires current password and session revocation ([PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes) `RevokeAllService`).
- **Profile fields on other tables** — `organization_name` (`Corporate::Profile`), `business_name` (`Providers::Profile`). This endpoint touches `identities_accounts` only.
- **Re-verification email dispatch on email change** — verification reset is persisted; notification flow may follow in a separate PR.

---

## 9. Deprecation path

| Release | `PATCH …/language_preference` | `PATCH …/current` |
| --- | --- | --- |
| PR-04 (shipped) | Route line remains; **404** (no action) | **Works** — canonical |
| Next web release | Unused | Full payload from web |
| [PR-08](/docs/roadmap/notes/pr-08-deprecations) | Route line **removed** | Works |

---

## 10. PR description (as shipped)

> **`feat: add PATCH /identities/accounts/current for account updates`**
>
> Consolidates account mutation onto one RESTful endpoint. Replaces `UpdateLanguagePreference*` with `Identities::Accounts::Update{Request,Validator,Manager}`.
>
> **Added**
> - `PATCH /identities/accounts/current` → `Identities::AccountsController#update`
> - `Identities::Accounts::Update{Request,Validator,Manager}`
> - `first_name` and `last_name` on `Identities::AccountBaseSerializer`
>
> **Changed**
> - Full-update contract: `first_name`, `last_name`, `email` required; `language_preference` optional
> - Mutable `email` with verification reset on change
> - Simple Request → Validator → Manager (no partial-patch or dismiss machinery)
>
> **Removed**
> - `UpdateLanguagePreference{Request,Validator,Manager}` and manager unit tests
> - `is_dismissed` dismiss branch (FR-IAM-011 server-side dismiss)
>
> **Not changed**
> - No schema migration
> - `role`, `status`, and verification flags are not permitted parameters
>
> **Testing**
> - `update_manager_test.rb` (13 cases) and `update_integration_test.rb` (4 cases)
> - `LanguagePreferenceChanged` fires only on actual language change
> - Unpermitted attributes ignored, not applied
>
> **Frontend**
> - Must migrate to `PATCH …/current` with full account payload. Legacy `language_preference` path is not supported.
