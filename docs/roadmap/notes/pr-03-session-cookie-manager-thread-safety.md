---
title: "PR-03 — Thread-safe session cookies, one code path per principal"
sidebar_label: PR-03 — Session cookie manager
sidebar_position: 4
description: Remove process-global JWTSessions.access_cookie mutation and collapse the duplicated account/admin session methods into one parameterized path.
---

## TL;DR

- `with_access_cookie` assigns the **process-global** `JWTSessions.access_cookie` on every authenticated request; Puma runs three threads per worker.
- A team request and a user request in flight together can read each other's cookie name.
- The same six methods exist twice — once per principal — differing only in three constants.
- Introduce a `SessionPrincipal` descriptor, remap cookies per request instead of mutating globals, and delete about 60 duplicated lines.
- **Phase 0. No API contract change.**

**Fixes:** IAM-05 (High), IAM-11 (Medium), IAM-21 (Medium), IAM-27 (Low).

**Depends on:** [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes) — overlapping edits to the authenticated controllers.

---

## 1. The race (IAM-05)

### Evidence

```ruby title="red-cab-api/app/controllers/concerns/session_cookie_manager.rb:202-209"
    def with_access_cookie(access_cookie:)
      previous_access_cookie    = JWTSessions.access_cookie
      JWTSessions.access_cookie = access_cookie

      yield
    ensure
      JWTSessions.access_cookie = previous_access_cookie
    end
```

`JWTSessions.access_cookie` is a module-level attribute on the `JWTSessions` module — one slot for the whole process. The save/restore pattern is only safe if nothing else runs between `yield` and `ensure`. Under Puma it does:

```ruby title="red-cab-api/config/puma.rb:27-28"
threads_count = ENV.fetch('RAILS_MAX_THREADS', 3)
threads threads_count, threads_count
```

Every authenticated request funnels through this method — `authorize_account_session!`, `authorize_admin_session!`, `refresh_account_session`, `refresh_admin_session`, and `flush_session` all wrap themselves in it.

### The interleaving

| Time | Thread A (team request) | Thread B (user request) | Global value |
| --- | --- | --- | --- |
| t1 | sets `rc_team_access` | — | `rc_team_access` |
| t2 | — | sets `rc_access` | `rc_access` |
| t3 | reads cookie → **`rc_access`** | — | `rc_access` |
| t4 | — | reads cookie → `rc_access` | `rc_access` |
| t5 | `ensure` restores `rc_access` | — | `rc_access` |
| t6 | — | `ensure` restores `rc_access` | `rc_access` |

At t3 the team request authorizes against the *user's* access cookie. The blast radius is bounded by two things and neither is a designed defence:

- A browser hitting the team portal usually does not carry `rc_access` at all, so the common failure is a spurious 401 rather than a privilege grant.
- The namespace check (`identities_admin:<uuid>` versus `identities_account:<uuid>`) means a user token cannot satisfy an admin session lookup even if it is read.

But t5/t6 also shows the restore leaking: thread A's `ensure` writes back a value that thread B installed, so the global can settle on the wrong default for subsequent requests that never set it. This is exactly the kind of intermittent, unreproducible 401 that costs a week to diagnose. Fix it before the team portal has real traffic.

### Why not just use a `Thread.current` variable

It would work, but it papers over the actual problem: the cookie name is *request state* being stored in *process configuration*. Rails already gives us a per-request object to hang this on — the controller instance.

---

## 2. Design: `SessionPrincipal` + cookie remapping

`jwt_sessions` reads the cookie name from its module config, but `JWTSessions::RailsAuthorization` reads the cookie **values** through an overridable `request_cookies` method. Override that instead of mutating the global: present the current principal's cookie under the name the gem expects, per request, on the controller instance.

### New: `app/controllers/concerns/session_principal.rb`

```ruby
class SessionPrincipal

  ACCOUNT = new(
    access_cookie:    'rc_access',
    refresh_cookie:   'rc_refresh',
    csrf_cookie:      'CSRF_TOKEN',
    namespace_prefix: 'identities_account',
    payload_key:      'identities_account_uuid'
  )

  TEAM = new(
    access_cookie:    'rc_team_access',
    refresh_cookie:   'rc_team_refresh',
    csrf_cookie:      'TEAM_CSRF_TOKEN',
    namespace_prefix: 'identities_admin',
    payload_key:      'identities_admin_uuid'
  )

  attr_reader(
    :access_cookie,
    :refresh_cookie,
    :csrf_cookie,
    :namespace_prefix,
    :payload_key
  )

  def initialize(access_cookie:, refresh_cookie:, csrf_cookie:, namespace_prefix:, payload_key:)
    @access_cookie    = access_cookie
    @refresh_cookie   = refresh_cookie
    @csrf_cookie      = csrf_cookie
    @namespace_prefix = namespace_prefix
    @payload_key      = payload_key
  end

  def namespace_for(uuid:)
    "#{namespace_prefix}:#{uuid}"
  end

end
```

Write it with the constants after the `initialize` definition so they resolve — the sketch above is ordered for readability, not for Ruby.

This is the one new concept the PR introduces, and it is the reason the audit scores Simplicity 4/5 rather than 5/5. It pays for itself by removing the duplication in § 3 and by giving [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes)'s `RevokeAllService` a home for the namespace prefix it currently duplicates.

### Rewritten `SessionCookieManager`

```ruby
module SessionCookieManager

  extend ActiveSupport::Concern

  included do
    include JWTSessions::RailsAuthorization

    rescue_from JWTSessions::Errors::Unauthorized, with: :render_jwt_unauthorized
  end

  def login_session(session_principal:, subject_uuid:)
    session = JWTSessions::Session.new(
      payload:                   { session_principal.payload_key => subject_uuid },
      namespace:                 session_principal.namespace_for(uuid: subject_uuid),
      refresh_by_access_allowed: true
    )
    tokens  = session.login

    write_session_cookies(session_principal: session_principal, tokens: tokens)

    tokens
  end

  def logout_session(session_principal:)
    flush_session(session_principal: session_principal)
    clear_session_cookies(session_principal: session_principal)
  end

  def authorize_session!(session_principal:)
    @session_principal = session_principal
    authorize_by_access_cookie!
  end

  def refresh_session(session_principal:)
    @session_principal = session_principal
    authorize_refresh_by_access_cookie!

    subject_uuid = claimless_payload[session_principal.payload_key]
    tokens       = JWTSessions::Session.new(
      refresh_by_access_allowed: true,
      payload:                   claimless_payload.to_h,
      namespace:                 session_principal.namespace_for(uuid: subject_uuid)
    ).refresh_by_access_payload

    write_session_cookies(session_principal: session_principal, tokens: tokens)

    tokens
  end

  private

    # jwt_sessions reads cookie VALUES through this hook but cookie NAMES from its
    # module config. Aliasing here keeps the cookie name per-request instead of
    # assigning JWTSessions.access_cookie, which is shared across Puma threads.
    def request_cookies
      return request.cookies if @session_principal.nil?

      request.cookies.merge(
        JWTSessions.access_cookie  => request.cookies[@session_principal.access_cookie],
        JWTSessions.refresh_cookie => request.cookies[@session_principal.refresh_cookie]
      )
    end
```

That comment is the one comment worth keeping in this file: it explains a constraint imposed by the gem that the code cannot show on its own.

`write_session_cookies`, `clear_session_cookies`, and `flush_session` collapse to one implementation each, taking `session_principal:` instead of three separate cookie-name arguments. `csrf_cookie_name_for` and its `raise ArgumentError` branch disappear entirely — the mapping now lives on the descriptor.

### Call sites

| Before | After |
| --- | --- |
| `login_account_session(identities_account:)` | `login_session(session_principal: SessionPrincipal::ACCOUNT, subject_uuid: identities_account.uuid)` |
| `login_admin_session(identities_admin:)` | `login_session(session_principal: SessionPrincipal::TEAM, subject_uuid: identities_admin.uuid)` |
| `authorize_account_session!` | `authorize_session!(session_principal: SessionPrincipal::ACCOUNT)` |
| `authorize_admin_session!` | `authorize_session!(session_principal: SessionPrincipal::TEAM)` |
| `refresh_account_session` / `refresh_admin_session` | `refresh_session(session_principal: …)` |
| `logout_account_session` / `logout_admin_session` | `logout_session(session_principal: …)` |

If the call-site churn makes review harder, keep the six old names as one-line delegators in the same PR and delete them in [PR-08](/docs/roadmap/notes/pr-08-deprecations). The audit's preference is to change them now — there are only eight call sites and they are all in controllers this PR already touches.

### Initializer

Set stable defaults once so `JWTSessions.access_cookie` is never assigned at request time:

```ruby
JWTSessions.access_cookie  = 'rc_access'
JWTSessions.refresh_cookie = 'rc_refresh'
```

After this PR, no code path writes either attribute outside the initializer. That invariant is what makes the fix hold; state it in the PR description so a future change does not quietly reintroduce the pattern.

---

## 3. Duplication removed (IAM-11)

Line counts from the current file:

| Concern | Current | After |
| --- | --- | --- |
| Login | 2 methods, 24 lines | 1 method, ~12 lines |
| Logout | 2 methods, 22 lines | 1 method, ~4 lines |
| Authorize | 2 methods, 12 lines | 1 method, ~4 lines |
| Refresh | 2 methods, 62 lines | 1 method, ~20 lines |
| Cookie writers + namespace helpers | 9 methods, ~60 lines | 4 methods, ~35 lines |
| **Total** | **284 lines** | **~150 lines** |

The two refresh methods are the clearest case: they are 31 lines each and differ only in the cookie constants and the payload key. Any future change to refresh semantics currently has to be made twice, correctly, in both — the same failure mode that produced [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes)'s inverted conditions.

---

## 4. Dead and near-dead code

### `identify_account_session` (IAM-21)

```ruby title="red-cab-api/app/controllers/concerns/session_cookie_manager.rb:79-85"
  def identify_account_session
    authorize_session_by_access_cookie!(
      access_cookie: USER_ACCESS_COOKIE
    )
  rescue JWTSessions::Errors::Unauthorized
    nil
  end
```

Nothing calls it. `Marketplace::BaseController` reimplements optional auth with its own `rescue`, catching a wider set (`JWTSessions::Errors::Unauthorized, Errors::UnauthorizedError`). Delete the concern method and keep the marketplace implementation, which is the one that actually works — the concern version would not have caught `Errors::UnauthorizedError`.

### `cookie_domain` (IAM-27)

```ruby title="red-cab-api/app/controllers/application_controller.rb:100-102"
    def cookie_domain
      Rails.application.credentials.dig(:cookie, :domain)
    end
```

Never referenced. Cookies are currently host-only, which is the safer default and works with the deployment shape `red-cab-web` documents (`api.example.com` and `example.com` share a registrable domain, so `SameSite=Lax` cookies are sent on XHR). Delete the helper. If cookie sharing across subdomains is ever needed, it should arrive as a deliberate change with a `domain:` argument threaded through `write_session_cookies`, not as an orphaned reader someone wires up years later.

### `authorize_approved_provider_profile` (IAM-28)

Out of scope here — handled in [PR-05](/docs/roadmap/notes/pr-05-actor-base-controllers).

---

## 5. New vs deleted classes

| Change | File |
| --- | --- |
| **New** | `app/controllers/concerns/session_principal.rb` |
| Rewritten | `app/controllers/concerns/session_cookie_manager.rb` |
| Modified | `identities/users/authenticated_controller.rb`, `team/authenticated_controller.rb`, `marketplace/base_controller.rb`, `identities/sessions_controller.rb`, `identities/oauth/google_controller.rb`, `team/identities/admins/sessions_controller.rb` |
| Modified | `config/initializers/jwt_sessions.rb` |
| Modified | `app/domains/identities/sessions/revoke_all_service.rb` — use `SessionPrincipal::ACCOUNT.namespace_for` instead of its own constant (collapses the duplication PR-02 flagged) |
| Deleted | `SessionCookieManager#identify_account_session`, `#csrf_cookie_name_for`, the six per-principal method pairs, `ApplicationController#cookie_domain` |

**Test constant references.** Six test files reference `SessionCookieManager::USER_ACCESS_COOKIE` and friends. Keep those constants as aliases on the concern pointing at the descriptor values, or update the tests. Prefer updating the tests to `SessionPrincipal::ACCOUNT.access_cookie` — the constants are now derived state and having two sources invites drift.

## 6. Serializer contract

**Unchanged.** No response body, status code, cookie name, cookie flag, or JWT payload changes. Cookie attributes stay `httponly: true` (session cookies), `httponly: false` (CSRF), `secure: Rails.env.production?`, `same_site: :lax`, `path: '/'`.

This PR is behaviour-preserving by construction. If any test that does not touch `SessionCookieManager` internals changes behaviour, the refactor is wrong.

## 7. Tests

- [ ] Entire existing suite passes **unmodified**, apart from the constant references in § 5
- [ ] **New:** `test/controllers/concerns/session_cookie_manager_test.rb` — a user session and a team session issued in the same process do not leak cookie names into each other. Assert on `JWTSessions.access_cookie` being `'rc_access'` before and after a team request
- [ ] **New:** a request carrying **both** `rc_access` and `rc_team_access` authorizes against the correct one on both a team endpoint and a user endpoint. This is the closest deterministic proxy for the race and it fails against the current implementation when the globals are pre-seeded to the wrong value
- [ ] Existing CSRF cases in `sessions/update_integration_test.rb` and `team/…/sessions_controller_test.rb` still return 401 without the header

A true concurrency test would need real parallel requests and would be flaky. The cookie-collision test above is deterministic and catches the class of bug; note the limitation in the PR description rather than pretending it proves thread safety.

## 8. Frontend impact

**None.** Cookie names, CSRF cookie names, and refresh paths are all unchanged, so `red-cab-web/app/api/ky-client.js` needs no edit — including its two client instances and their `csrfCookieName` / `refreshPath` configuration.

## 9. Migration risk and rollback

**Risk: medium** — this touches every authenticated request in the application. Nothing else in the audit has that blast radius.

Mitigations, in order:

1. Ship after [PR-02](/docs/roadmap/notes/pr-02-iam-security-fixes), never bundled with it. PR-02 changes behaviour deliberately; this PR must change nothing observable. Mixing them makes an incident impossible to attribute.
2. Deploy to staging and exercise all four flows manually: user login, user refresh after access-token expiry, team login, team refresh. The refresh paths are the risky ones because they use `claimless_payload`, which behaves differently from `payload`.
3. Watch 401 rates for both cookie namespaces for a full session-expiry cycle after deploy.

**Rollback:** revert the whole PR. It is a self-contained refactor with no data or contract dependency, so there is nothing to unwind. Do not attempt a partial revert — the descriptor and the call sites move together.

## 10. Reviewer checklist

- [ ] `git grep 'JWTSessions.access_cookie ='` returns only `config/initializers/jwt_sessions.rb`
- [ ] `git grep 'JWTSessions.refresh_cookie ='` likewise
- [ ] `@session_principal` is only ever assigned on the controller instance, never on a class or module
- [ ] `request_cookies` returns `request.cookies` untouched when no principal is set, so unauthenticated controllers are unaffected
- [ ] No response body, cookie name, or cookie flag differs from `main` — diff a captured `Set-Cookie` header before and after
- [ ] `RevokeAllService` now reads its namespace from `SessionPrincipal::ACCOUNT`
