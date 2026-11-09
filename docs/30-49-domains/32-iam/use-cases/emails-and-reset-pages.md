---
title: IAM emails and reset pages
sidebar_label: IAM emails and reset pages
sidebar_position: 4
description: The ten emails of IAM, when each one goes out, who gets it, which language it uses, and how the reset pages follow the language of the reset email.
doc_type: use-case
normative: true
status: current
context: iam
last_reviewed: 2026-11-09
---

## TL;DR \{#emails-tldr\}

- The API sends the password reset, email change, staff invitation and owner decision emails.
- Each email has an English text and a Japanese text.
- A person gets the email in the saved language, except the invitation email.
- The invitation email is in English, with one Japanese line.
- A password reset email gives a link that works for 1 hour and only once.
- A reset request answers the same for every address.
- A reset request has an IP limit of 30 requests in 1 hour.
- It also has an address limit of 1 email in 60 seconds and 3 in 1 hour.
- An email change closes every open verification token and every open reset token of the account.
- The reset link holds `lang`, so the reset page uses the language of the email.
- No email holds a raw token in the database.

## About this document

This page holds what stays true after the IAM emails shipped in `red-cab-api` and `red-cab-web`.

The rulings give the reasons, and the work records give the build.

| Topic | Document |
| --- | --- |
| Rulings | [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails), [IAM D18 — Email change closes old tokens](/docs/30-49-domains/iam/iam-decisions/#email-change-tokens) and [IAM D16 — Language](/docs/30-49-domains/iam/iam-decisions/#language) |
| The invitation flow | [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members) |
| The company decisions | [Provider company and members model](/docs/30-49-domains/iam/models/provider-company-and-members) |
| Work record of the API | [Spec api-292](/docs/60-69-initiatives/61-2026/implementation-specs/iam/api-292-iam-emails) |
| Work record of the web | [Spec web-214](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-214-reset-pages-and-invitation-texts) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| the table `notifications_dispatches` | One row for each email that the system sends. The model is `Notifications::Dispatch`. |
| mail key | The column `notifications_dispatches.mail_key`. It names the email of the row, for example `password_reset`. |
| Google-only account | A row in `identities_accounts` with `password_digest` null. The person signs in only with Google. |
| masked email | An email with most letters of the local part hidden, for example `n***@example.com`. |
| owner decision | The team approves a company, rejects it, or asks for a correction. |
| team message | The text that the team writes on a rejection or a correction. It is in `providers_companies.rejection_reason`. |
| reset pages | The web routes `/forgot-password` and `/reset-password`. |
| link language | The query `lang` on `/reset-password`. It is `en` or `ja`. |
| support email | The setting `red_cab.support_email`. The email change notice shows it. |

## User stories \{#user-stories\}

1. US-1: As a person who forgot the password, I want a reset email, so I can sign in again.
2. US-2: As a Google-only person, I want to learn why I get no reset link, so I use Google.
3. US-3: As a person who changes the email, I want a verification email, so I can verify it.
4. US-4: As a person, I want a notice at the old address, so I see a change by someone else.
5. US-5: As an owner, I want Red Cab to email the invitation link, so I need not send it.
6. US-6: As an owner, I want an email about the team decision, so I need not check each day.
7. US-7: As a person who chose Japanese, I want the reset page in Japanese, so it matches the email.
8. US-8: As an inbox owner, I want a limit on reset emails, so no script floods my mail.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| A reset request for an unknown email sends nothing, and the answer is the same as for a known email. | US-1 | A stranger asks for `nobody@example.com` and sees the normal answer. |
| A reset request for an account with a password sends one `password_reset` email. | US-1 | Yuki asks for a reset and gets a link. |
| A reset request for a Google-only account sends one `password_reset_without_password` email with no reset link. | US-2 | Aiko signs in with Google, asks for a reset, and gets a hint to use Google. |
| One IP address may send 30 reset requests in 1 hour, and the next request answers `429` with `Retry-After`. | US-8 | A script sends 31 requests, and request 31 answers `429`. |
| One email address gets 1 reset email in 60 seconds and 3 in 1 hour, and a request over the limit sends no email and answers the same `200`. | US-8 | Mika asks twice in 10 seconds, gets one email, and sees the same answer both times. |
| Every valid reset request queues one job and does no lookup, so the answer time is the same for every address. | US-1, US-8 | A known, a Google-only and an unknown address run the same queries. |
| The reset link works for 1 hour and only once. | US-1 | Yuki opens the link a second time and sees the text that the link does not work. |
| An email change sends `email_change_verification` to the new address and `email_change_notice` to the old address. | US-3, US-4 | Noriko changes the email, and both addresses get one email. |
| The notice shows the new address as a masked email, and it shows the support email. | US-4 | The old inbox shows `n***@example.com`. |
| An email change closes every open verification token and every open reset token of the account. | US-3, US-4 | A reset token sent before the change answers `422`. |
| Create and send again each send one `staff_invitation` email, and the owner still gets the link once. | US-5 | Kenji invites Mika, and Mika gets the email. |
| Each owner decision sends one email to each active owner, and no email to staff. | US-6 | The team approves Kanto Charter, and Kenji gets one email. |
| The rejection email and the correction email show the team message as the team wrote it. | US-6 | Kenji reads what to fix in the email. |
| An email uses the saved language of the receiver, and the invitation uses English with one Japanese line. | always | An invited email may have no account, so it has no saved language. |
| The system never stores a raw token in a table or in a log. | always | The job arguments hold the raw token only until the job runs. |

## The emails \{#the-emails\}

The table lists each email, and the rows of `notifications_dispatches` use the mail key.

| Mail key | Sent when | Receiver | Language | Link |
| --- | --- | --- | --- | --- |
| `account_registered` | A person signs up. | The account email | The saved choice | The page `/verify-email` |
| `verification_resent` | A person asks for the verification email again. | The account email | The saved choice | The page `/verify-email` |
| `password_reset` | A person with a password asks for a reset. | The account email | The saved choice | `{web_base_url}/reset-password?lang=…&token=…` |
| `password_reset_without_password` | A Google-only person asks for a reset. | The account email | The saved choice | `{web_base_url}/login` |
| `email_change_verification` | A person changes the account email. | The new email | The saved choice | The page `/verify-email` |
| `email_change_notice` | A person changes the account email. | The old email | The saved choice | None |
| `staff_invitation` | An owner creates or sends again an invitation. | The invited email | English, with one Japanese line | `{web_base_url}/account/staff-invitation?token=…` |
| `provider_approved` | The team approves a company. | Each active owner | The saved choice of the owner | `{web_base_url}/providers` |
| `provider_rejected` | The team rejects a company. | Each active owner | The saved choice of the owner | `{web_base_url}/providers` |
| `provider_correction_requested` | The team asks for a correction. | Each active owner | The saved choice of the owner | `{web_base_url}/providers` |

- Every email that has a link also shows the link as text, under the text key `link_fallback`.
- The texts live in `config/locales/notifications.en.yml` and `config/locales/notifications.ja.yml`.
- Every text follows ASD-STE100 Tier A.

### How the system sends an email \{#dispatch\}

Each flow publishes a domain event after the transaction commits.

- The Notifications domain writes one row in `notifications_dispatches` for each email.
- The row has the mail key, the receiver and the language.
- The row also has a key that stops a second email for the same event.
- A job sends the email.
  - The job log shows no job argument, so it shows no raw token.
- An error while the system queues an email does not change the answer of the action.
  - The system reports the error and returns.
- A blank support email, or a missing job argument, marks the row `failed`.

## Password reset flow \{#password-reset-flow\}

`POST /identities/password_resets/request` answers `200` with the same text for every address.

1. The middleware counts the request for the IP address.
   - After 30 requests in 1 hour, it answers `429` with `Retry-After`.
2. The manager `Identities::PasswordResets::CreateManager` checks the email format and queues one job `Identities::PasswordResets::SendJob`.
3. The job asks the address limit.
   - It stops when the address got 1 email in 60 seconds or 3 in 1 hour.
4. The job finds no account, so it does nothing more.
5. The job finds a Google-only account, so it sends `password_reset_without_password`.
6. The job finds an account with a password, so it creates a token and sends `password_reset`.

- The address limit counts every request, also for an unknown address, and one counter serves both kinds of email.
- The Redis key holds a keyed hash of the email.
- A marker for the job keeps its decision for 24 hours.
- A retry of the same job gets the same decision, and the job runs at most 5 times.
- A Redis failure lets the request and the email go through, and the failure goes to the log.
- The limits live in `config/identities_sessions.yml`.

`PATCH /identities/password_resets/confirm` sets the new password and ends every session of the person.

- A used or expired token answers `422` with a `base` message.

## Email change flow \{#email-change-flow\}

`PATCH` of the account changes the email, and the account becomes unverified.

1. Inside the transaction, the API closes every open verification token and every open reset token of the account.
2. Inside the transaction, the API creates one new verification token for the new address.
3. After commit, the API sends `email_change_verification` and `email_change_notice`.

- The notice goes to the old address even when the person never verified it.
  - The system cannot tell a wrong address from a real address.
- A token that expires at exactly the current time is expired, in both confirm calls.

## Invitation email \{#invitation-email\}

An owner creates or sends again an invitation.

- The API sends one `staff_invitation` email to the invited email.
- A send again makes a new link, so the old link stops working.
- The answer to the owner still holds `invitation_link` once.
- The owner can copy the link when the email does not arrive.
- The email is in English with one Japanese line, because the invited email may have no account.

## Owner decision emails \{#decision-emails\}

The team approves a company, rejects it, or asks for a correction.

- Each active owner of the company gets one email.
- The system reads the active owners when the event runs.
- Staff and removed members get no email.
- The event carries a `decision_id` and the team message, so a later submit cannot change the email.
- One decision sends one email to each owner, also when the event runs twice.

## The reset pages in the web \{#reset-pages\}

The reset pages read all their texts from `app/domains/tourist/tourist-surface-copy.js`, with the keys `password_reset.*`.

- `/reset-password` reads `lang` from the query and passes it as `linkLanguage` to the copy helper `getTouristSurfaceCopy`.
- A valid link language wins over every other source.
- Any value other than `en` or `ja` is ignored, and the page still opens.
- `/forgot-password` shows Japanese only to a signed-in person who chose Japanese, and English to a guest.
- The tab title of `/reset-password` follows the link language.
- The tab title of `/forgot-password` is English, because the route `meta` function has no session.
- Neither page shows the API `message`.
- After a request, the page shows `password_reset.forgot.sent`.
- After a reset, the page shows `password_reset.reset.done` and opens `/login`.
- A `422` with a `base` message shows `password_reset.reset.link_invalid` and a link to ask for a new one.
- A `422` with field keys shows the API text, because the API rules may change.
- The zod schemas are functions that take the copy helper, so the error texts follow the page language.
- The page never sends `lang` to the API.

## Worked example \{#worked-example\}

Yuki has a password account, and the saved language of Yuki is `ja`.

1. Yuki opens `/forgot-password` as a guest, and the page shows English.
2. Yuki enters the email and sends the form.
3. The page shows `password_reset.forgot.sent` in English.
4. The API sends `password_reset` in Japanese, with the link `/reset-password?lang=ja&token=T1`.
5. Yuki opens the link, and the page shows `password_reset.reset.title` in Japanese.
6. Yuki enters a password with 6 letters, and the zod schema shows `password_reset.error.password_short` in Japanese.
7. Yuki enters a valid password, and the page shows `password_reset.reset.done` in Japanese and opens `/login`.
8. Yuki opens the same link again, and the page shows `password_reset.reset.link_invalid` in Japanese.

## Open items \{#open-items\}

- A Japanese speaker must check every `ja` text of the emails and the reset pages.
- The address `help.support@redcab.app` is a placeholder for the support email.
  - The owner gives the real address, and the change is one value in the credential.
- Production mail is not set up, see [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265).
- Production has no setting for trusted proxies, so the IP limit may count the proxy address.
- An error outside `perform` of `SendJob` reaches Sidekiq, which retries it up to 25 times over days.
- The email verification resend may have the same abuse as the reset request.
- The team message has no length limit.
- An owner with no name makes the invitation email row fail, and the system reports it.
- Two team members who decide at the same moment send two emails to each owner.
  - The team accepts this for now.
- When Sentry ships, check that it does not send job arguments, because they can hold raw tokens.
- The language cookie and the language switch of IAM D16 are not built.
  - So `/forgot-password` shows English to a guest.
