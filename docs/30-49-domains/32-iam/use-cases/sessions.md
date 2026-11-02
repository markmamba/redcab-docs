---
title: Sessions
sidebar_label: Sessions
sidebar_position: 1
description: How a session works in the API and in the web, with the endpoints, limits, cookies, error answers, sign-out routes and the account menu.
doc_type: use-case
normative: true
status: current
context: iam
last_reviewed: 2026-11-02
---

## TL;DR \{#sessions-tldr\}

- Each sign-in is one database record, and Rails reads it on every request.
- Nothing refreshes.
- A `401` means that the session is gone.
- A `403` never ends a session, and the web never retries a `401` or a `403`.
- Persons and team admins have separate tables, cookies and code.
- The browser writes the session, and Node only reads it.
- A person or a team admin can sign out of one device or of all devices.

## About this document

This page holds what stays true after the sessions work shipped, and the rulings give the reasons.

| Topic | Document |
| --- | --- |
| Rulings | [Server-side sessions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions), [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules), [Policy routes](/docs/30-49-domains/iam/iam-decisions/#policy-routes), [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes), [Production hosts](/docs/30-49-domains/iam/iam-decisions/#production-hosts) |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) |
| Web conventions | [Frontend conventions, Sessions](/docs/50-59-frontend/conventions/frontend#sessions) |
| Work record | [API spec api-147](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-147-server-side-sessions) and [web spec web-190](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-190-server-side-sessions-and-account-menu) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| session | One row for each sign-in. The table `identities_account_sessions` holds person sessions. The table `identities_admin_sessions` holds team admin sessions. |
| idle limit | The longest time that a session can stay unused. |
| absolute limit | The longest time that a session can live after sign-in. |
| CSRF token | A value on the session row. The web sends it back in the header `X-CSRF-Token` on every write. |
| policy route | A route that decides on Node who may enter the routes inside it. |
| account menu | The dropdown that opens from the avatar and the name in the tourist nav. |

## User stories \{#user-stories\}

1. US-1: As a tourist, I want my profile and my bookings in one menu, so the top bar stays short.
2. US-2: As a person whose session ended, I want to return to my page, so I keep my place.
3. US-3: As a person who lost a device, I want to sign out everywhere, so my account stays safe.
4. US-4: As a provider or a team admin, I want a sign-out control, so I can end my session.

## API contract \{#api-contract\}

Persons and team admins use separate endpoints.

| Method | Path | Auth | Answer | Notes |
| --- | --- | --- | --- | --- |
| POST | `identities/sessions` | None | `201` account JSON and cookies | `422` for a wrong password. `429` at the rate limit |
| DELETE | `identities/sessions/current` | Session and CSRF | `200 { message }` | Deletes one row and clears the cookies |
| DELETE | `identities/sessions` | Session and CSRF | `200 { message }` | Deletes all rows of the person and clears the cookies |
| POST | `identities/oauth/google/callback` | None | `200 { account }` and cookies | Creates one row |
| PATCH | `identities/password_resets/confirm` | None | `200` | Deletes all rows of the person |
| GET | `identities/accounts/current` | Session | `200` account JSON | |
| POST | `team/identities/admins/sessions` | None | `201` admin JSON and team cookies | `422` for a wrong password. `429` at the rate limit |
| DELETE | `team/identities/admins/sessions/current` | Team session and CSRF | `200 { message }` | Deletes one row and clears the team cookies |
| DELETE | `team/identities/admins/sessions` | Team session and CSRF | `200 { message }` | Deletes all rows of the admin and clears the team cookies |
| GET | `team/identities/admins/current` | Team session | `200` admin JSON | |

No refresh endpoint exists.

The actor namespaces use the session in these ways.

| Namespace | Session | CSRF on a write | `401` means |
| --- | --- | --- | --- |
| `tourists/**`, `corporate/**`, `providers/**`, `identities/**` | Required person session, except the public routes | `CSRF_TOKEN` value in `X-CSRF-Token` | The session is gone |
| `team/**` | Required team session, except sign-in | `TEAM_CSRF_TOKEN` value in `X-CSRF-Token` | The session is gone |
| `marketplace/**` | Optional person session | The namespace has no write routes | Never. A gone session is a guest |

A request with a required session passes these checks in this order.

1. Rails reads the signed uuid from the session cookie.
2. Rails finds the session row, or answers `401`.
3. Rails checks the idle limit and the absolute limit, or answers `401`.
4. Rails checks that the account or the admin has `status: "active"`, or answers `401`.
5. On a method other than `GET` and `HEAD`, Rails checks the CSRF token, or answers `403`.
6. Rails updates `last_used_at` when the stored value is at least 15 minutes old.

### Limits and configuration \{#configuration\}

The file `config/identities_sessions.yml` in `red-cab-api` holds every value.

A change to a value needs no migration.

| Key | Value |
| --- | --- |
| `account.idle_limit_seconds` | `604800` (7 days) |
| `account.absolute_limit_seconds` | `2592000` (30 days) |
| `admin.idle_limit_seconds` | `86400` (1 day) |
| `admin.absolute_limit_seconds` | `604800` (7 days) |
| `last_used_interval_seconds` | `900` (15 minutes) |
| `login_rate_limit.attempts` | `10` |
| `login_rate_limit.window_seconds` | `180` (3 minutes) |

- The rate limit counts each endpoint and each IP address in a fixed window.
- Person sign-in and team sign-in count separately.
- The rate limit covers `POST identities/sessions` and `POST team/identities/admins/sessions`.
- The count lives in Redis.
- If Redis fails, the sign-in request goes through.
- Two hourly jobs delete expired rows: `Identities::AccountSessions::CleanupExpiredJob` and `Identities::AdminSessions::CleanupExpiredJob`.

### Cookies \{#cookies\}

| Environment | Person session | Person CSRF | Team session | Team CSRF | Person domain | Team domain |
| --- | --- | --- | --- | --- | --- | --- |
| Production | `__Secure-rc_session` | `CSRF_TOKEN` | `__Secure-rc_team_session` | `TEAM_CSRF_TOKEN` | `.redcab.app` | `.team.redcab.app` |
| Development and test | `rc_session` | `CSRF_TOKEN` | `rc_team_session` | `TEAM_CSRF_TOKEN` | Not set | Not set |

| Attribute | Session cookie | CSRF cookie |
| --- | --- | --- |
| Value | The signed uuid of the row | The `csrf_token` of the row |
| `HttpOnly` | Yes | No |
| `Secure` | Yes, outside development and test | Yes, outside development and test |
| `SameSite` | `Lax` | `Lax` |
| `Path` | `/` | `/` |
| `Expires` | `created_at` plus the absolute limit | `created_at` plus the absolute limit |

### Error answers \{#error-answers\}

| Case | Status | `code` | `title` |
| --- | --- | --- | --- |
| The header `X-CSRF-Token` is missing | `403` | `csrf_token_missing` | `We could not check your request. Please reload the page and try again.` |
| The header `X-CSRF-Token` is wrong | `403` | `csrf_token_invalid` | `We could not check your request. Please reload the page and try again.` |
| Too many login attempts | `429` | `too_many_requests_error` | `Too many sign-in attempts. Please wait a few minutes and try again.` |

- A gone session answers `401` and does not clear the cookies.
- Only logout and sign out everywhere clear the cookies.
- A locked account answers `401`, and its session rows stay.
- A new sign-in leaves the older rows of the person in place.

## Web contract \{#web-contract\}

The web sends the cookie and acts on the answer of Rails.

| Answer | Where | Result |
| --- | --- | --- |
| No session cookie | Session middleware | The person is signed out, and Rails is not called |
| `401` in the session read on Node | Session middleware | The person is signed out, and the policy route decides |
| `401` in a `clientLoader` | The loader helpers throw the error | The policy redirect wins on the same navigation |
| `401` outside a navigation | Root error boundary | The session-expired page shows "Sign in again" |
| `403` with `csrf_token_missing` or `csrf_token_invalid` | The caller | The caller shows the API `title`, and the session stays |
| `429` on login | The login action | The login form shows the API `title` |
| `5xx` or a network failure | The caller or the boundary | An error shows, and the session stays |

- The client sends a request again only for the statuses in `retry.statusCodes`.
- A `401` and a `403` stay final.
- `POST` and `PATCH` requests are never sent again.
- A click that enters a policy area makes one session read, shared inside one `.data` request.
- The root `shouldRevalidate` reloads the root only after a failed action with `401` or `403`.
- Node sends no CSRF header.
- The browser adds `X-CSRF-Token` to every request that is not `GET` or `HEAD`.
- A missing CSRF cookie sends no header.

### Sign-out routes \{#sign-out-routes\}

Each route is a resource route with a `clientAction` and no page.

| Route | Loader redirects to | API call | After the action |
| --- | --- | --- | --- |
| `/logout` | `/` | `DELETE identities/sessions/current` | Redirect to `/` |
| `/logout/everywhere` | `/` | `DELETE identities/sessions` | Redirect to `/` |
| `/team/logout` | `/team` | `DELETE team/identities/admins/sessions/current` | Redirect to `/team/login` |
| `/team/logout/everywhere` | `/team` | `DELETE team/identities/admins/sessions` | Redirect to `/team/login` |

- A `401` on these routes counts as signed out.
- Any other failure shows a toast, and the session stays as it is.

### Account menu \{#account-menu\}

The menu replaces the Bookings, Account and Sign out links in the tourist nav.

| Order | Item | Target | Shows |
| --- | --- | --- | --- |
| 1 | Name and email | None | Always, as a header |
| 2 | My Profile | `/account` | Always |
| 3 | My Bookings | `/account/bookings` | Always |
| 4 | Sign out | `POST /logout` | Always, after a divider |
| 5 | Sign out of all devices | The confirmation, then `POST /logout/everywhere` | Always, in the danger color |

- The mobile menu lists the same items as the desktop menu.
- A guest sees the guest links, and `Services` stays a link in the nav.
- The menu items live in `app/layouts/tourist/tourist-nav-config.js`.
- The copy keys live in `app/domains/tourist/tourist-surface-copy.js`.

| Portal | Place | Controls |
| --- | --- | --- |
| Tourist | The account menu, on desktop and in the mobile menu | Sign out, and Sign out of all devices |
| Provider | An Account dropdown in the header `PortalChrome` | Sign out, and Sign out of all devices |
| Team | The bottom of `TeamSidebar` | Sign out, and Sign out of all devices |

- Sign out of all devices asks for confirmation in all three portals.
- The hook `useSignOutAllDevices` builds the confirmation with the `useModal` hook.
- The red button of the dialog repeats the action.

## Worked example \{#worked-example\}

Aiko signs in on her laptop, and her session later ends.

1. Aiko sends `POST identities/sessions` with the right password.
2. Rails creates a row in `identities_account_sessions` with `last_used_at` set to now.
3. Rails sets `__Secure-rc_session` and `CSRF_TOKEN`, and both expire in 30 days.
4. Aiko sends `PATCH identities/accounts/current` with `X-CSRF-Token`, and Rails accepts it.
5. Aiko sends no request for 8 days, and the idle limit of 7 days passes.
6. Aiko clicks My Bookings in the account menu.
7. The policy route runs on the `.data` request, and Rails answers `401`.
8. The web redirects to `/login?redirect_to=%2Faccount%2Fbookings` on the same click.
9. The cleanup job deletes the row within one hour after the idle limit.

## Open items \{#open-items\}

- Before launch, we confirm that `request.remote_ip` gives the real visitor address behind the production proxy.
  - The login rate limit and the column `ip_address` both depend on this.
- A Japanese speaker must check the Japanese text of the new copy keys.
- Product Owner sign-off on the IAM rulings is not recorded.
