---
title: Sessions are database records, and nothing refreshes
sidebar_label: Server-side sessions
sidebar_position: 2
description: Why IAM keeps each sign-in as one database record with a signed cookie, and removes the JWT refresh.
normative: true
status: accepted
context: iam
last_reviewed: 2026-10-31
supersedes:
  - ADR-018
  - ADR-019
---

## TL;DR

- Each sign-in is one database record, and the cookie holds only the signed uuid of that record.
- Nothing refreshes, and `401` means that the session is gone.
- The URL decides the portal, and the current-session answer holds the person and one access word for the provider portal.
- ADR-019 chose to keep `jwt_sessions` and deferred this option.
- This record takes the option.

## About this document

This record gives the reasons for the session model, and the rules are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#iam-decisions-tldr).

| Topic | Document |
| --- | --- |
| Rulings | [Server-side sessions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions), [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer), [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules) |
| Account model | [Accounts are persons, and provider companies have members](/docs/30-49-domains/iam/architecture-decisions/accounts-and-provider-companies) |
| Findings and use cases | [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |
| Status | Accepted on 2026-10-31 by the principal developer, and Product Owner sign-off is not recorded |

---

## Context

The API knows who makes a request through the `jwt_sessions` gem.

- The session cookie holds a JWT access token, and a second cookie holds a refresh token.
- The gem keeps every token in Redis, and it refuses a request whose token is not in the store.
- The access token lives for 1 hour, and the refresh token lives for 7 days.
- A `401` makes the web ask for a refresh, and the web retries the request.

Two clients carry one cookie, the browser and the web server.

- After an hour both meet a `401`, and both try to refresh.
- Rails accepts one refresh and deletes the old token at once.
- ADR-019 added eight refresh rules (R1 to R8) to keep this safe.
- The web API client has about 450 lines for refresh.
- A cross-tab bridge and a revalidation bridge add about 230 lines.

The gem checks the store on every request.

- So the token gives no benefit of skipping a store lookup.
- A database record does the same job with less machinery.

ADR-019 named server-side sessions as Option B and deferred them.

- The account model now changes, so every base controller changes too.
- The session layer is cheaper to replace now than after launch, because no production data exists.

The Rails 8 authentication generator uses the same shape: a sessions table and a signed cookie.

## Decision

Each sign-in is one database record, and nothing refreshes.

- The rules are in [IAM decisions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions).
- The portal comes from the URL and the access word, as described in [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access).

## Consequences

The web and the API both get simpler, and sign-out becomes exact.

- A removed member or a locked person loses access on the next request, because Rails reads the record each time.
- Sign out everywhere finds every record of one person.
- The web deletes the refresh code in the API client and the two bridges.
- The web entry rules read the access word, not a role.
- The portal switch is a link, so the session stores no active portal.

The change touches the API session layer.

- 17 API files mention the `jwt_sessions` gem, and about 38 files use the session helpers.
- The 31 auth contract tests change.
- The `jwt_sessions` gem and its Redis token store go away.
- Redis stays, because Sidekiq and the Google state store use it.

These documents change because of this record.

- ADR-019 is superseded, and its refresh rules R1 to R8 go away.
- ADR-018 is superseded too, and its web rules now live in the IAM decisions.
- Issue red-cab-api#147, "Server-side sessions", covers this work.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Keep `jwt_sessions` with refresh (ADR-019 Option A) | It needs eight refresh rules, and two clients still race for one cookie. |
| A JWT with no store lookup | It cannot end a session at once, and it cannot sign a person out everywhere. |
| Sessions in Redis only | A table row lets Rails find every session of one person and list devices later. |
| One session table for persons and team admins | The two systems must never share data. Two tables make a wrong-side lookup impossible. |
