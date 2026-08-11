---
title: "PR-06 — Session surface symmetry and contract normalization"
sidebar_label: PR-06 — Session symmetry
sidebar_position: 7
description: Move the admin principal read off the session resource, and normalize request param shapes and error payloads across IAM.
---

## TL;DR

- Accounts read their principal at `GET /identities/accounts/current`; admins read theirs at `GET /team/identities/admins/sessions/current`. Same concept, two different rules.
- Admin login accepts `session`-nested params; account login does not — and `red-cab-web` sends a different shape to each.
- Four managers pass a JSON *string* as the error `request:` payload where the convention is a parsed hash.
- Two signup managers emit a bare string where the error envelope requires an array.
- **Phase 1. Additive** — the old admin route stays until [PR-08](/docs/roadmap/notes/pr-08-deprecations).

**Fixes:** IAM-17 (Medium), IAM-19 (Medium), IAM-23 (Medium), IAM-30 (Low).

**Depends on:** [PR-04](/docs/roadmap/notes/pr-04-account-current-patch) — establishes `current` on the principal resource as the pattern this generalizes.

---

## 1. The rule

> A **session** resource owns lifecycle: `POST` to create, `PATCH current` to refresh, `DELETE current` to end.
>
> "Who am I" is a read on the **principal** resource.

Accounts already follow this. The team side does not — `GET /team/identities/admins/sessions/current` returns an *admin*, serialized by `AdminSessionSerializer`, from a *sessions* controller. The class name gives the confusion away: it names a session and serializes a principal.

### Current versus target

| Concept | Account (today) | Admin (today) | Admin (target) |
| --- | --- | --- | --- |
| Log in | `POST /identities/sessions` | `POST /team/identities/admins/sessions` | unchanged |
| Refresh | `PATCH /identities/sessions/current` | `PATCH /team/identities/admins/sessions/current` | unchanged |
| Log out | `DELETE /identities/sessions/current` | `DELETE /team/identities/admins/sessions/current` | unchanged |
| Read principal | `GET /identities/accounts/current` | `GET /team/identities/admins/sessions/current` | `GET /team/identities/admins/current` |

Only one row moves. Sessions keep all three lifecycle verbs on both sides.

### The alternative, and why not

The mirror-image fix — adding `GET /identities/sessions/current` for accounts — was considered and rejected. It would mean two endpoints returning the same account payload (`GET /identities/accounts/current` and `GET /identities/sessions/current`), which is more surface for the same behaviour, and it would leave the semantic confusion in place rather than resolving it. Moving the admin read is one new route and one deprecation; adding the account session read is one new route and permanent ambiguity.

---

## 2. Changes

### Routes

```ruby
namespace :team do
  namespace :identities do
    namespace :admins do
      get 'current', controller: '/team/identities/admins', action: 'show'

      namespace :sessions do
        post   '',        controller: '/team/identities/admins/sessions', action: 'create'
        get    'current', controller: '/team/identities/admins/sessions', action: 'show'  # deprecated → PR-08
        patch  'current', controller: '/team/identities/admins/sessions', action: 'update'
        delete 'current', controller: '/team/identities/admins/sessions', action: 'destroy'
      end
    end
  end
end
```

Route ordering matters here: `get 'current'` on the `admins` namespace must be declared before the `sessions` namespace block so it is not shadowed. Verify with `bin/rails routes | grep admins`.

### New: `app/controllers/team/identities/admins_controller.rb`

```ruby
module Team
  module Identities
    class AdminsController < Team::AuthenticatedController

      def show
        render(
          json:   ::Identities::AdminSessionSerializer.new.serialize_to_json(CurrentRequest.identities_admin),
          status: :ok
        )
      end

    end
  end
end
```

Byte-for-byte the same body as `SessionsController#show`. The serializer is renamed in [PR-08](/docs/roadmap/notes/pr-08-deprecations); leave it alone here so this PR stays a pure move.

### `Team::Identities::Admins::SessionsController#show`

Keep it, delegating, so the old path behaves identically for one release:

```ruby
def show
  render(
    json:   ::Identities::AdminSessionSerializer.new.serialize_to_json(CurrentRequest.identities_admin),
    status: :ok
  )
end
```

It is two lines; a delegator would be longer than the duplicate. Mark it with a `# Deprecated: use GET /team/identities/admins/current` comment — this is a genuine constraint (the duplication is intentional and time-boxed) rather than narration.

---

## 3. Param shape normalization (IAM-19)

### Evidence

Admin login accepts either shape:

```ruby title="red-cab-api/app/domains/identities/admins/sessions/create_request.rb:18-27"
        def initialize(params:)
          source_params = if params[:session].present?
            params[:session]
          else
            params
          end

          permitted_params = source_params.permit(
```

Account login accepts flat only:

```ruby title="red-cab-api/app/domains/identities/sessions/create_request.rb:17-20"
        permitted_params = params.permit(
          :email,
          :password
        )
```

And the web app sends a different shape to each:

```javascript title="red-cab-web/app/api/team-sessions-api.js:7-11"
  create: (formData) => {
    return teamApiClient.post(
      TEAM_SESSIONS_PATH,
      { json: { session: formData } }
    ).json()
```

versus flat in `identities-sessions-api.js:14-19`.

The dual-shape branch is compensating for a client that sends the wrong thing. Nothing else in the codebase nests params under a resource key — every Request object in `app/domains/` permits at the top level.

### Fix

Flat everywhere. Two ordered steps across repos:

1. **This PR** keeps the dual-shape branch and adds a test asserting flat params work for admin login. Nothing breaks.
2. **A web PR** changes `team-sessions-api.js` to `{ json: formData }`.
3. **[PR-08](/docs/roadmap/notes/pr-08-deprecations)** deletes the branch and the nested-params test.

Do not delete the branch in this PR. Deploys are not atomic across repos, and a login endpoint is the worst possible place to discover ordering matters.

---

## 4. Error payload normalization (IAM-17, IAM-23)

### `request:` must be a parsed hash

The convention, stated in `.ai/instructions.md` and followed by most managers:

```ruby
request: JSON.parse(request.to_json(), symbolize_names: true)
```

Four managers pass the raw string instead:

| File | Line |
| --- | --- |
| `app/domains/identities/admins/sessions/create_manager.rb` | 66 |
| `app/domains/tourists/identities/accounts/create_manager.rb` | 26, 36 |
| `app/domains/corporate/identities/accounts/create_manager.rb` | 24, 34 |
| `app/domains/providers/identities/accounts/create_manager.rb` | 24, 34 |

The consequence is that the debug payload arrives at Sentry and in the error response as an escaped JSON string rather than a structured object — unreadable exactly when someone is trying to read it.

**Also fix the leak this exposes.** These are login and signup managers, so `request.to_json` includes the `password` field. Whether it is a string or a hash, the plaintext password reaches the error payload and Sentry. `raise_invalid_credentials` passes `skip_sentry: true`, which covers the login case, but the signup validation errors do not, and the error body is returned to the client regardless.

Add a `debug_payload` method to the two credential-bearing Requests that omits password fields:

```ruby
sig { returns(T::Hash[Symbol, T.untyped]) }
def debug_payload
  { email: email }
end
```

and have the managers pass `request: request.debug_payload`. This does not conflict with the rule against custom `to_json` on Request objects — `to_json` stays untouched for managers that legitimately serialize the whole request; this is an explicit, separately named accessor for the error path.

### Error messages must be arrays

```ruby title="red-cab-api/app/domains/corporate/identities/accounts/create_manager.rb:32"
                email: 'An account with this email address already exists.'
```

The documented envelope is `"messages": { "field": ["message"] }`, and `red-cab-web`'s `ApiError` indexes into these arrays. Tourists gets it right with `[ DUPLICATE_EMAIL_MESSAGE ]`; corporate and providers do not, so a duplicate-email signup on those two portals renders a broken or empty message.

Fix both, and hoist the shared constant. All three managers define or inline the same sentence; tourists already has `DUPLICATE_EMAIL_MESSAGE`. Move it to `Identities::Accounts::CreateService::DUPLICATE_EMAIL_MESSAGE` — or to the `ProvisionService` that [PR-07](/docs/roadmap/notes/pr-07-oauth-account-provisioning) introduces, if that lands first — and reference it from all three.

---

## 5. New vs deleted classes

| Change | File |
| --- | --- |
| **New** | `app/controllers/team/identities/admins_controller.rb` |
| Modified | `config/routes/team_routes.rb` |
| Modified | `team/identities/admins/sessions_controller.rb` — deprecation comment |
| Modified | four `create_manager.rb` files — parsed-hash payload, array messages, shared constant |
| Modified | `identities/sessions/create_request.rb`, `identities/admins/sessions/create_request.rb` — `debug_payload` |
| Deleted | none |

## 6. Serializer contract

**Before** — `GET /team/identities/admins/sessions/current`:

```json
{ "uuid": "…", "email": "admin@example.com", "name": "Team Admin" }
```

**After** — both `GET /team/identities/admins/current` and the deprecated path return the identical body. The serializer is unchanged; only the path is new.

**Error payload change**, corporate and provider signup with a duplicate email:

```json
// before — messages.email is a string, breaks the client's array access
{ "messages": { "email": "An account with this email address already exists." } }

// after
{ "messages": { "email": ["An account with this email address already exists."] } }
```

This is technically a breaking change to a response body. It is safe because the current shape is the one that does not work: `red-cab-web` expects arrays everywhere else, so no client can be relying on the string form.

## 7. Tests

- [ ] **New:** `GET /team/identities/admins/current` returns the admin payload for an authenticated admin
- [ ] **New:** the same path returns 401 without a session, and 401 with a *user* session (namespace isolation — assert an `rc_access` cookie cannot reach a team endpoint)
- [ ] Existing `GET …/sessions/current` cases still pass unchanged
- [ ] **New:** admin login succeeds with **flat** params (it already works; this locks it in before PR-08 removes the nested branch)
- [ ] Existing nested-params admin login test still passes
- [ ] **New:** duplicate-email signup on corporate and providers returns `messages.email` as an **array** — one test per portal
- [ ] **New:** a failed login's error payload contains no `password` key. Assert on the serialized response body, not on the manager's internals

That last test is the one worth writing carefully. It is the only thing standing between a refactor and plaintext passwords in an error log.

## 8. Frontend impact

**No breaking change in this PR.** Two follow-up web changes, in this order:

1. `team-sessions-api.js` → send flat params instead of `{ session: formData }`. Required before [PR-08](/docs/roadmap/notes/pr-08-deprecations).
2. `teamSessionsApi.current()` → call `team/identities/admins/current`. Required before PR-08.

Note that `ky-client.js`'s `teamApiClient` uses `team/identities/admins/sessions/current` as its **refresh** path. That is a `PATCH` and it is unaffected — the refresh endpoint is not moving. Only the `GET` moves. Call this out explicitly in the PR description; it is the easiest thing for a web developer to change by mistake.

## 9. Migration risk and rollback

**Risk: low.** One additive route, one duplicated two-line action, and payload shape fixes covered by tests.

The one real risk is route shadowing: if `get 'current'` lands inside or after the `sessions` namespace block, it silently resolves to the wrong controller. `bin/rails routes | grep admins` in the PR description settles it.

**Rollback:** revert. The old admin path still works throughout, so no client is stranded.

## 10. Reviewer checklist

- [ ] `bin/rails routes | grep admins` output is in the PR description and shows both `current` paths resolving to different controllers
- [ ] The nested-`session` branch is **still present** — removing it here breaks team login until the web app deploys
- [ ] No error payload anywhere in IAM contains a password field; verified by an assertion on a response body
- [ ] All three signup managers reference one shared duplicate-email constant
- [ ] `teamApiClient`'s refresh path (`PATCH …/sessions/current`) is untouched
