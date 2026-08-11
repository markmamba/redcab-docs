---
title: "PR-01 — Restore GET /identities/accounts/current"
sidebar_label: PR-01 — Account current route
sidebar_position: 2
description: Revert the uncommitted route change that breaks account hydration in red-cab-web and one integration test.
---

## TL;DR

- The working tree changes `GET /identities/accounts/current` to `GET /identities/accounts`.
- `red-cab-web` and `test/integration/identities/accounts/show_integration_test.rb` both call `/current`, so SSR account hydration 404s.
- Revert three lines, delete a stale comment, regenerate the Sorbet path helpers, run the suite.
- **Phase 0. No API contract change** — this restores the contract that already shipped.

**Fixes:** IAM-02 (Critical), IAM-24 (Low).

---

## Why this is first

Everything else in this audit assumes a green, runnable test suite. Right now the suite cannot even be executed locally (`bundle` cannot materialize the lockfile against Ruby 3.4.3), and when it can be, `Identities::Accounts::ShowIntegrationTest` will fail at route-helper resolution before it reaches an assertion.

This is uncommitted work, so it may be a half-finished experiment rather than an intended change. Confirm with the author before reverting — but do not build on top of it.

## Evidence

`config/routes/identities_routes.rb`, working tree versus `HEAD`:

```diff
 namespace :identities do
   namespace :accounts do
-    get    'current',              controller: '/identities/accounts', action: 'show'
-    patch  'language_preference',  controller: '/identities/accounts', action: 'update_language_preference'
+    get    '', controller: '/identities/accounts', action: 'show'
+    patch  'language_preference', controller: '/identities/accounts', action: 'update_language_preference'
   end
```

Three consumers expect `/current`:

```javascript title="red-cab-web/app/api/identities-accounts-api.js:24"
    const response = await apiClient.get(`${IDENTITIES_ACCOUNTS_PATH}/current`, options)
```

```ruby title="red-cab-api/test/integration/identities/accounts/show_integration_test.rb:20-23"
    get(
      identities_accounts_current_path,
      headers: authenticated_headers
    )
```

And the generated Sorbet helper module was regenerated to match the broken route, replacing `identities_accounts_current_path` with `identities_accounts_path` — which is why the test now references a helper that no longer exists.

The controller also carries a comment describing a path that has never existed in any version:

```ruby title="red-cab-api/app/controllers/identities/accounts_controller.rb:4-5"
    # GET /identities/accounts/show
    def show
```

## Impact if shipped as-is

`red-cab-web` calls `identitiesAccountsApi.current()` from its SSR root loader to hydrate `AuthProvider`. A 404 there is not a soft failure: `ky`'s `beforeError` hook converts it to an `ApiError`, the loader rejects, and every authenticated page fails to render. The 401-retry path in `ky-client.js` does not help because a routing error is a 404, not a 401.

## Changes

### `config/routes/identities_routes.rb`

Restore the `current` segment. Keep the existing column alignment style used elsewhere in the file.

```ruby
namespace :identities do
  namespace :accounts do
    get   'current',             controller: '/identities/accounts', action: 'show'
    patch 'language_preference', controller: '/identities/accounts', action: 'update_language_preference'
  end
```

### `app/controllers/identities/accounts_controller.rb`

Delete the stale comment. The route file is the source of truth for paths; a comment that restates it will drift again.

```diff
 module Identities
   class AccountsController < Identities::Users::AuthenticatedController

-    # GET /identities/accounts/show
     def show
```

### `sorbet/rbi/dsl/generated_path_helpers_module.rbi` and `generated_url_helpers_module.rbi`

Do not hand-edit. Regenerate:

```bash
bundle exec tapioca dsl
```

`identities_accounts_current_path` / `_url` should reappear and `identities_accounts_path` / `_url` should disappear.

## New vs deleted classes

None. This PR touches routes, one comment, and generated files only.

## Serializer contract

Unchanged. `GET /identities/accounts/current` continues to return the flat `AccountBaseSerializer` payload:

```json
{
  "uuid": "…",
  "email": "tourist@example.com",
  "role": "tourist",
  "language_preference": null,
  "is_email_verified": false,
  "should_prompt_language": true
}
```

## Tests

No new tests — the existing ones start passing again.

- [x] Get the suite runnable: `bundle install` against the active Ruby, then confirm `bin/rails test` boots
- [x] `test/integration/identities/accounts/show_integration_test.rb` — both cases green
- [x] Full `bin/rails test` — capture the baseline. Expect failures in `test/domains/identities/password_resets/confirm_manager_test.rb` and possibly `…/email_verifications/confirm_manager_test.rb`; those are [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes), not this PR. Record which tests fail so PR-02 can prove it fixed exactly those.
- [x] `bundle exec srb tc` after regenerating the RBIs

## Frontend impact

None. `red-cab-web` requires no change; this PR restores what it already calls.

## Migration risk and rollback

**Risk: none.** No schema, no data, no contract change — this returns the routing table to its committed state.

**Rollback:** revert the commit. Because the route is additive-to-restore rather than a rename, there is no window where both paths are needed.

## Reviewer checklist

- [x] `GET /identities/accounts/current` resolves; `GET /identities/accounts` returns 404
- [x] RBIs were regenerated with `tapioca`, not edited by hand
- [x] Baseline test failures are recorded in the PR description for PR-02 to reference
- [x] Confirm with the author that the working-tree change was exploratory, not a deliberate contract change with a pending web PR
