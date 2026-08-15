---
title: "PR-08 — Remove deprecated IAM routes and rename serializers"
sidebar_label: PR-08 — Deprecations
sidebar_position: 9
description: The breaking cleanup — drop the column-specific and duplicate routes, remove the nested-params branch, and align serializer names with the naming convention.
---

## TL;DR

- Removes `PATCH /identities/accounts/language_preference`, `DELETE /identities/sessions`, and `GET /team/identities/admins/sessions/current`.
- Removes the `session`-nested params branch from admin login.
- Renames both IAM serializers to match `{Domain}::{Actor}{Model}{Base…}Serializer`.
- **Phase 3. Breaking.** Every removal here requires a `red-cab-web` release to have shipped **and deployed** first.

**Fixes:** IAM-18 (Medium), IAM-19 (Medium, completion), IAM-20 (Medium).

**Depends on:** [PR-04](/docs/roadmap/notes/pr-04-account-current-patch), [PR-06](/docs/roadmap/notes/pr-06-session-surface-symmetry), and their web follow-ups.

---

## 1. Preconditions — verify before opening this PR

Do not open this PR on a schedule. Open it when every box below is checked against **deployed production**, not against `main`.

- [x] `red-cab-web` calls `PATCH /identities/accounts/current` with the **full account payload** (`first_name`, `last_name`, `email`, optional `language_preference`), not `…/language_preference`, in `identities-accounts-api.js` and language UI components
- [x] `red-cab-web` calls `DELETE /identities/sessions/current`, not the bare path. Already true today — `identities-sessions-api.js:27` uses `/current` — so this one is free
- [x] `red-cab-web` calls `GET /team/identities/admins/current` in `team-sessions-api.js`
- [x] `red-cab-web` sends **flat** params to `POST /team/identities/admins/sessions`
- [x] `teamApiClient`'s `refreshPath` still points at `PATCH team/identities/admins/sessions/current` — that endpoint is **not** being removed and must not be changed
- [x] Access logs show zero hits on each removed path over a window longer than the longest cached client session

That last check is the one that catches mobile web views, bookmarked tabs, and any integration nobody remembered. A week of zero traffic is a reasonable bar.

If any box is unchecked, ship the checked subset and leave the rest. These removals are independent; there is no reason to couple them.

---

## 2. Route removals

### `PATCH /identities/accounts/language_preference` (IAM-10 completion)

```diff
 namespace :identities do
   namespace :accounts do
     get   'current', controller: '/identities/accounts', action: 'show'
     patch 'current', controller: '/identities/accounts', action: 'update'
-    patch 'language_preference', controller: '/identities/accounts', action: 'update_language_preference'
   end
```

Also delete:

- `patch 'language_preference'` route line from `config/routes/identities_routes.rb`
- `test/integration/identities/accounts/update_language_preference_integration_test.rb` (or repoint legacy-path case to `/current` only)

`UpdateLanguagePreference{Request,Validator,Manager}` and `Identities::AccountsController#update_language_preference` were already removed in [PR-04](/docs/roadmap/notes/pr-04-account-current-patch). PR-08 only removes the stale route line that still 404s.

Before deleting the integration test file, confirm every case has an equivalent in `update_manager_test.rb` and `update_integration_test.rb`. Email-change verification reset and full-payload validation are the cases most likely to be dropped by accident.

### `DELETE /identities/sessions` (IAM-18)

```diff
   namespace :sessions do
     post   '',        controller: '/identities/sessions', action: 'create'
     patch  'current', controller: '/identities/sessions', action: 'update'
     delete 'current', controller: '/identities/sessions', action: 'destroy'
-    delete '',        controller: '/identities/sessions', action: 'destroy'
   end
```

Two paths, one action, no difference in behaviour. `/current` is the one the web app uses and the one that matches team logout.

Remove the corresponding cases from `test/integration/identities/sessions/destroy_integration_test.rb` — `'destroys session for authenticated account'` and `'returns unauthorized without session'` both target the bare path. Keep the `/current` equivalents.

### `GET /team/identities/admins/sessions/current` (IAM-30 completion)

```diff
       namespace :sessions do
         post   '',        controller: '/team/identities/admins/sessions', action: 'create'
-        get    'current', controller: '/team/identities/admins/sessions', action: 'show'
         patch  'current', controller: '/team/identities/admins/sessions', action: 'update'
         delete 'current', controller: '/team/identities/admins/sessions', action: 'destroy'
       end
```

Delete `Team::Identities::Admins::SessionsController#show`. Keep `PATCH` and `DELETE` — **only the `GET` moves.** Anyone skimming this diff will read "removing the sessions current route" and worry about refresh; say so in the PR description before they ask.

Move the four `show` test cases from `test/controllers/team/identities/admins/sessions_controller_test.rb` to a new `test/controllers/team/identities/admins_controller_test.rb`, if [PR-06](/docs/roadmap/notes/pr-06-session-surface-symmetry) has not already created it.

---

## 3. Remove the nested-params branch (IAM-19)

```diff
         def initialize(params:)
-          source_params = if params[:session].present?
-            params[:session]
-          else
-            params
-          end
-
-          permitted_params = source_params.permit(
+          permitted_params = params.permit(
             :email,
             :password
           )
```

`Identities::Admins::Sessions::CreateRequest` now matches `Identities::Sessions::CreateRequest` exactly — flat, top-level, like every other Request in the codebase.

Delete the `'creates admin session with nested session params'` test.

**This is the highest-risk item in the PR.** If the web deploy has not landed, team login breaks completely — not degraded, broken. Verify against deployed production, not against a merged web PR. Consider shipping this hunk as its own commit so it can be reverted alone.

---

## 4. Serializer renames (IAM-20)

The convention is `{Domain}::{Actor}{Model}{Base|Detail|List|Embedded}Serializer`, with a file at `app/domains/{domain}/{actor}_{model}_{type}_serializer.rb`. Neither IAM serializer follows it, and `AdminSessionSerializer` is actively misleading — it names a session and serializes an admin.

| Current | Target | File |
| --- | --- | --- |
| `Identities::AccountBaseSerializer` | `Identities::UsersAccountBaseSerializer` | `users_account_base_serializer.rb` |
| `Identities::AdminSessionSerializer` | `Identities::TeamAdminBaseSerializer` | `team_admin_base_serializer.rb` |

`Users` is the actor prefix already used by `Identities::Users::AuthenticatedController`, so it is consistent with the namespace that owns the account principal rather than a new invention.

Nine call sites for the account serializer (three actor signup controllers, sessions create and update, accounts show and update, email verifications confirm, and the OAuth callback response serializer) and three for the admin one. A mechanical rename — `git grep` and replace — but touching every IAM controller in one commit.

### Consider deferring

This is the only cosmetic change in the audit, and it produces the largest diff in this PR. If the reviewer would rather not mix a rename with three behavioural removals, split it into its own PR. The audit's preference is to bundle it: both are "clean up after the migration", both need the same regression sweep, and a standalone rename PR tends to sit unreviewed. Either choice is fine — just do not leave it half-applied.

**Attributes do not change**, only class and file names. Verify by diffing a captured response body before and after.

---

## 5. New vs deleted classes

| Change | File |
| --- | --- |
| Deleted | `identities/accounts/update_language_preference_{request,validator,manager}.rb` |
| Deleted | `Identities::AccountsController#update_language_preference` |
| Deleted | `Team::Identities::Admins::SessionsController#show` |
| Deleted | 2 test files, ~6 individual test cases |
| Renamed | both IAM serializers |
| Modified | `config/routes/identities_routes.rb`, `config/routes/team_routes.rb` |
| Modified | `identities/admins/sessions/create_request.rb` |
| Modified | 12 serializer call sites |

Net: **−3 routes, −4 classes, −2 test files.**

## 6. Serializer contract

**Response bodies are unchanged.** Class names change; attribute lists do not.

**Removed endpoints:**

| Endpoint | Before | After |
| --- | --- | --- |
| `PATCH /identities/accounts/language_preference` | 200 + account | **404** |
| `DELETE /identities/sessions` | 200 + message | **404** |
| `GET /team/identities/admins/sessions/current` | 200 + admin | **404** |
| `POST /team/identities/admins/sessions` with `{ session: {…} }` | 201 | **422** — email and password read as blank |

That last row is worth stating precisely in the PR description. It is not a clean 404; it is a validation error that looks like wrong credentials, which is the hardest kind of breakage to diagnose from the outside.

## 7. Tests

- [x] Every removed route returns 404 — one explicit test each, so the removal is asserted rather than assumed
- [x] `PATCH /identities/accounts/current` still covers full-payload update, email verification reset, and `LanguagePreferenceChanged` publish conditions
- [x] `DELETE /identities/sessions/current` still logs out and still 401s without CSRF
- [x] `GET /team/identities/admins/current` covers all four cases moved from the sessions controller test
- [x] `PATCH` and `DELETE /team/identities/admins/sessions/current` still work — the regression this PR is most likely to cause
- [x] Admin login works with flat params; the nested-params test is gone
- [x] `git grep 'AccountBaseSerializer\|AdminSessionSerializer'` returns nothing
- [x] Full suite green; `bundle exec srb tc` clean after regenerating RBIs with `bundle exec tapioca dsl`

## 8. Frontend impact

**Breaking. `red-cab-web` must be deployed first.** See § 1.

No further web work is required *by* this PR — it only removes what the web app has already stopped calling. If any web change is still outstanding, this PR is not ready.

## 9. Migration risk and rollback

**Risk: medium-high.** Not because the changes are complex — they are deletions — but because the failure mode is silent until a user hits the removed path, and one of them (§ 3) breaks the team portal entirely.

Ordering, if splitting:

1. `DELETE /identities/sessions` — zero risk, web already uses `/current`
2. Serializer renames — zero external risk
3. `PATCH …/language_preference` — needs the web language-form deploy
4. `GET …/admins/sessions/current` — needs the web team-session deploy
5. Nested params — needs the web team-login deploy, and breaks login if wrong

**Rollback:** restoring a route is trivial (revert), but the window between breakage and revert is user-visible on a login path. Deploy during low team-portal traffic and watch 404 and 422 rates on `/team/identities/admins/*` for the first hour.

**Rollback caveat:** if the serializer renames are bundled, a revert pulls back the route removals too. That is another argument for splitting the rename out — noted in § 4, decide in review.

## 10. Reviewer checklist

- [ ] Every box in § 1 is checked against **deployed** production, with the verification date in the PR description
- [x] Access-log evidence of zero traffic on each removed path is pasted in
- [x] `PATCH` and `DELETE /team/identities/admins/sessions/current` are demonstrably still routed — paste `bin/rails routes | grep admins`
- [x] `teamApiClient`'s `refreshPath` is untouched
- [x] Deleted test cases have named equivalents in their new homes, listed one by one in the PR description
- [x] Response bodies before and after the serializer rename are byte-identical
