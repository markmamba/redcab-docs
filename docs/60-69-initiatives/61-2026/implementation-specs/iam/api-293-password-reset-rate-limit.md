---
title: "Limit the password reset request and make its answer time the same for every email"
sidebar_label: API · Reset rate limit
issue: "https://github.com/markmamba/red-cab-api/issues/293"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-147-server-side-sessions.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-292-iam-emails.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#reset-rate-limit"
  - "docs/30-49-domains/32-iam/iam-decisions.md#emails"
---

## TL;DR

- The password reset request gets an IP limit of 30 requests in 1 hour.
- A request over the IP limit answers `429` with a `Retry-After` header.
- Each email address gets 1 reset email in 60 seconds and 3 in 1 hour.
- A request over the address limit sends no email and answers the same `200` message.
- Every valid request queues one job and answers `200`, so the answer time shows nothing about an account.
- A Redis failure lets the request go through, and Sentry gets a report.
- This spec ships no CAPTCHA and no limit on another endpoint.
- Breaking change: No.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| reset request | A call to `POST /identities/password_resets/request`. It asks for a reset email. |
| IP limit | The count of reset requests from one IP address in 1 hour. |
| address limit | The count of reset emails for one email address in 60 seconds and in 1 hour. |
| the middleware `LoginRateLimit::Middleware` | The Rack code in `config/initializers/login_rate_limit.rb`. It counts requests for each IP address in Redis. |
| the manager `Identities::PasswordResets::CreateManager` | The code that handles a reset request. |
| Google-only account | A row in `identities_accounts` with `password_digest` null. |

## User stories

1. US-1: As an inbox owner, I want a limit on reset emails, so no script floods my mail.
2. US-2: As the team, I want a cap on reset mail, so verification emails keep going out.
3. US-3: As a person with a lost password, I want reset to work if Redis fails, so I get in.
4. US-4: As the team, I want one answer time for every email, so nobody can test for accounts.

## Problem

Anyone can ask for a reset email for any address many times.

- The reset request has no limit, and each request sends one email.
- A Google-only account gets one email for each request, because each request has its own `request_id`.
- The free Brevo plan sends 300 emails each day, and a script can use all of them.
- The manager `Identities::PasswordResets::CreateManager` does different work for each case.
  - A password account saves a token row, inserts a dispatch row and queues a job.
  - A Google-only account inserts a dispatch row and queues a job.
  - An unknown email does one query.
- The answer time can show which emails have an account.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| Kind | Document | Why |
| --- | --- | --- |
| Decision | [IAM D19 — Password reset rate limit](/docs/30-49-domains/iam/iam-decisions/#reset-rate-limit) | The ruling that this spec implements |
| Decision | [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails) | The same answer for every email |
| Decision | [IAM D1 — Person account](/docs/30-49-domains/iam/iam-decisions/#person-account) | The login rate limit and the open item for the real visitor address |
| Use case | [IAM emails and reset pages](/docs/30-49-domains/iam/use-cases/emails-and-reset-pages) | The reset flow |
| Spec | [api-292 IAM emails](api-292-iam-emails.md) | The code that this spec changes |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The IP limit is 30 requests in 1 hour. | 10 requests in 1 hour. | Hotel wifi and mobile networks share one IP address. |
| 2 | The IP limit answers `429` with `Retry-After`. | A silent `200`. | The `429` shows no email, and the person sees why the page waits. |
| 3 | The address limit never answers `429`. It sends no email and answers the same `200`. | A `429`. | A `429` shows which addresses got a request, and it lets an attacker block a victim. |
| 4 | The address limit is 1 email in 60 seconds and 3 emails in 1 hour. | Other numbers. | The owner chose the numbers. |
| 5 | The address limit counts every request, also for an unknown email. | Count only known accounts. | A count that skips unknown emails shows which emails have an account. |
| 6 | One counter serves the reset link and the Google sign-in notice. | One counter for each kind. | The inbox owner gets the same flood from both. |
| 7 | The hour counter grows only when the 60 second check passes. | Count every request in both. | A person who clicks three times in one minute can still ask again later. |
| 8 | The address key holds a keyed hash of the email. | The raw email. | An email is personal data, and Redis keys show in tools. |
| 9 | The reset request queues one job and answers `200`. The job does the lookup, the token and the event. | Keep the lookup in the request. | Every valid request does the same work, so the answer time shows nothing. |
| 10 | The address limit runs in the job. | Run it in the request. | A limited request and a normal request then do the same work in the request. |
| 11 | A retry of the same job gets the same answer as the first run. A marker holds the job id and the decision. | Count a retry again. Let every retry pass. | A retry after a crash must not lose the email, and a blocked request must stay blocked. |
| 12 | A Redis failure lets the request go through, and Sentry gets a report. | Send no email. | Reset must work when Redis fails, as in the login limit. |
| 13 | A failed `perform_later` is reported to Sentry, and the request still answers `200`. | Answer `503`. | The answer must stay the same for every email. |
| 14 | The three limits live in `config/identities_sessions.yml`. | Constants in code. | The login limit already lives there. |
| 15 | The IP limit uses the code of `LoginRateLimit`, with its own key prefix and its own configuration block. | Rails `rate_limit` in the controller. | One counter store and one `429` shape serve both limits. |
| 16 | The `429` uses the existing error `Errors::TooManyRequestsError` and its default code. | A new code. | The code contract list needs no new line. |
| 17 | A fixed window counter is enough. | A sliding window. | The login limit uses it, and the extra requests at a window edge are small. |
| 18 | The marker lives 24 hours. `SendJob` stops its retries before the marker ends. | A marker of 1 hour. | A Sidekiq retry can run later than 1 hour, and a late retry must not count again. |
| 19 | The service answers `true` for any error of the store, and not only for an empty answer. | Let an error reach the caller. | A cache error must not stop a reset email, and the report shows that the limit did not work. |
| 20 | The service uses the email in lower case with no spaces. | Use the email as given. | The same address always has one count. |
| 21 | Only tests may set the store. The setter lives in `test/support`. | A setter in `config/initializers/login_rate_limit.rb`. | The production module needs no way to swap its store. |

## API contract

| Method | Path | Auth | Request body | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| POST | `/identities/password_resets/request` | None | `email` | `200` with `message`, or `422`, or `429` | The `200` message does not change |

### The IP limit

The middleware `LoginRateLimit::Middleware` also counts `POST /identities/password_resets/request`.

- The configuration block `password_reset_rate_limit` gives `attempts: 30` and `window_seconds: 3600`.
- The key is `password_reset_rate_limit:{path}:{remote_ip}:{window_number}`.
- The request over the limit answers `429` with `Retry-After` set to the seconds left in the window.
- The title is `Too many password reset requests. Please wait and try again later.`
- The `429` does not report to Sentry (`skip_sentry: true`).
- A Redis error lets the request go through, as for the login limit.

### The address limit

`Identities::PasswordResets::AddressRateLimitService.execute(email:, job_id:)` returns `true` when the email may go out.

- The key holds `HMAC-SHA256(email)` with a key from `Rails.application.key_generator`.
- Step 1: write the marker `password_reset_decision:{job_id}` with the value `pending`, with `unless_exist: true` and 24 hours of life.
  - If the marker already exists, this job is a retry.
  - A marker with the value `blocked` returns `false`.
  - A marker with the value `allowed` or `pending` returns `true`.
  - A marker with `pending` means that the first run stopped before it saved the decision, so the email goes out.
- Step 2: increment the 60 second counter.
  - If it is above 1, the decision is `blocked`.
- Step 3: increment the hour counter, only when the decision is not `blocked`.
  - If it is above 3, the decision is `blocked`.
- Step 4: write the decision `allowed` or `blocked` into the marker, and return it.
- A nil answer or an error from the store returns `true`.
  - The service writes the failure to the log.
  - It also reports to Sentry when Sentry is defined.
- The service never raises an error.
- The service never raises `Errors::*`.
- The key and the log line never hold the email.

### The job

`Identities::PasswordResets::SendJob` is new.

- It takes the email of the request and runs on the queue `identities`.
- It calls the address limit service with its own job id, and it stops when the answer is `false`.
- It then calls the manager `Identities::PasswordResets::SendManager`.
  - The manager holds the logic that `CreateManager` has today: the lookup, the token and the event.
- The job does not change the email texts of `api-292`.
- The job writes no argument to the log, because the email is personal data.
- The log of Active Job also writes the message of an error when it retries and when it stops.
  - So the job turns every error into a new error whose message is only the class of the first error.
  - The retry and the stop lines then never hold the email.
- The job runs at most 5 times: the first run and 4 retries.
  - The waits grow, and they add up to about 6 minutes.
  - The retries end long before the marker of 24 hours ends.
  - After the last run, the job reports the error and stops.
  - Sidekiq adds no retry for an error that the job catches.
  - An error outside `perform` still reaches Sidekiq, see the open items.

### The manager

The manager `Identities::PasswordResets::CreateManager` keeps the validator and the `200` message.

- After the validator passes, it calls `SendJob.perform_later` for every valid request.
- It does no lookup and no database write.
- A failed `perform_later` is reported to Sentry, and the request still answers `200`.
- A `perform_later` that returns `false` is reported in the same way.

### Configuration

```yaml
# config/identities_sessions.yml (shape, not final code)
password_reset_rate_limit:
  attempts:       30
  window_seconds: 3600     # 1 hour, for each IP address
password_reset_address_limit:
  per_minute:     1
  per_hour:       3
```

### Files to create or modify (API)

- `config/initializers/login_rate_limit.rb`
- `config/identities_sessions.yml`
- `app/domains/identities/password_resets/create_manager.rb`
- `app/domains/identities/password_resets/address_rate_limit_service.rb` (create)
- `app/domains/identities/password_resets/send_manager.rb` (create)
- `app/jobs/identities/password_resets/send_job.rb` (create)
- Tests for each file above.

## Data / domain touchpoints

- Bounded context: IAM.
- Transaction boundaries: the job keeps the transaction of the token write, and the manager has none.
- Snapshots: none.
- Events: the job publishes the same events as today.

## Worked example

Mika owns `mika@example.com`, and a script sends reset requests for it.

1. The script sends request 1, and the page answers `200`.
2. The job passes the address limit and sends one email to Mika.
3. The script sends request 2 after 10 seconds, and the page answers the same `200`.
4. The job sees the 60 second counter at 2 and sends no email.
5. After 70 seconds the script sends request 3, and the job sends a second email.
6. Request 5 comes after 3 emails in the hour, and the job sends no email.
7. The script sends 31 requests in 1 hour from one IP address.
8. Request 31 answers `429` with `Retry-After`.
9. A new tourist asks for a verification email, and Brevo still has quota.

## Out of scope

- A CAPTCHA.
- A limit on any other endpoint, for example the email verification resend.
- A warning before the Brevo daily limit ends.
- The real visitor address in production, which is an open item of IAM D1.
- The email texts, which `api-292` covers.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- Production has no setting for trusted proxies, so the IP limit may count the proxy address.
- The email verification resend may have the same abuse, and it needs its own issue.
- During a Redis outage the request answers `200` and no email goes out, because the job cannot queue.
- A first run can stop between the counters and the decision.
  - Its retry then sends the email, even if the decision was `blocked`.
- Nobody has checked that the web reset page shows the `429` title.
- An error outside `perform` reaches Sidekiq, which retries it up to 25 times over days.
  - One case is a failed enqueue of a retry while Redis is down.
  - Another case is an error in the retry block.
  - A retry after 24 hours finds no marker, so the counters count it again.
  - Sidekiq also writes the job data, which holds the email, to its log.

## Tasks

### API

- [ ] Add the IP limit to the middleware and the configuration.
- [ ] Add `AddressRateLimitService`.
- [ ] Add `SendJob`, and move the lookup, the token and the event into it.
- [ ] Change the manager to queue one job.
- [ ] Add the tests.

### Docs

- [ ] Remove the line "A reset request has no rate limit yet" from `use-cases/emails-and-reset-pages.md`, and describe the limits.
- [ ] Set spec `status: implemented` after merge.

## Acceptance criteria

- [ ] A request over the IP limit answers `429` with `Retry-After`.
- [ ] A request over the address limit answers the same `200` message and sends no email.
- [ ] A request for an unknown email follows the same limits.
- [ ] Every valid request queues one job and does no lookup in the request.
- [ ] A retry of a job does not lose its email.
- [ ] A retry of a blocked job stays blocked, also after 1 hour.
- [ ] An error of the store, and not only an empty answer, lets the request go through.
- [ ] A Redis failure lets the request go through.
- [ ] The counters expire, so a person can ask again after the wait.
- [ ] No Redis key holds a raw email.

## Verification

```bash
# API (from red-cab-api/)
bin/rails test
bundle exec srb tc
bundle exec rubocop
bundle exec brakeman
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
