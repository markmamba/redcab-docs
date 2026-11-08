---
title: "Send the password reset, email change, staff invitation and owner decision emails"
sidebar_label: API · IAM emails
issue: "https://github.com/markmamba/red-cab-api/issues/292"
repos:
  - red-cab-api
status: approved
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-261-permits-and-approval.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-264-invitations-and-members.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#emails"
  - "docs/30-49-domains/32-iam/iam-decisions.md#language"
  - "docs/30-49-domains/32-iam/iam-decisions.md#staff-invitations"
  - "docs/30-49-domains/32-iam/iam-decisions.md#company-roles"
  - "docs/30-49-domains/32-iam/iam-decisions.md#email-change-tokens"
---

## TL;DR

- The API sends four kinds of email: password reset, email change, staff invitation and owner decision.
- The dispatch code becomes generic, so a new email needs one mailer action and one map row.
- A change of the account email closes every open verification token and every open password reset token of the account.
- The invitation answers still return the link once.
- This spec ships no team email on submit and no permit reminder.
- This spec ships no production mail settings, because [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265) covers them.
- Breaking change: No.
  - Every JSON answer keeps its keys.
  - The web pair [red-cab-web#214](https://github.com/markmamba/red-cab-web/issues/214) should deploy with it, because the reset link adds `lang`.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| the table `notifications_dispatches` | One row for each email that the system sends. The model is `Notifications::Dispatch`. |
| mail key | The new column `notifications_dispatches.mail_key`. It names the email of the row, for example `password_reset`. |
| owner decision | The team approves a company, rejects it, or asks for a correction. |
| team message | The text that the team writes on a rejection or a correction. The API keeps it in `providers_companies.rejection_reason`. |
| Google-only account | A row in `identities_accounts` with `password_digest` null. The person signs in only with Google. |
| masked email | An email with most letters of the local part hidden, for example `n***@example.com`. |

## User stories

1. US-1: As a person who forgot the password, I want a reset email, so I can sign in again.
2. US-2: As a Google-only person, I want to learn why I get no reset link, so I use Google.
3. US-3: As a person who changes the email, I want a verification email, so I can verify it.
4. US-4: As a person, I want a notice at the old address, so I see a change by someone else.
5. US-5: As an owner, I want Red Cab to email the invitation link, so I need not send it.
6. US-6: As an owner, I want an email about the team decision, so I need not check each day.

## Problem

Four IAM flows change data, but no email goes out.

- `Notifications::PasswordResetRequested::EnqueueManager` is a stub, so a person who forgets the password cannot get back in.
- `Identities::Accounts::UpdateManager` sets `is_email_verified` to false on an email change.
  - It creates no token, publishes no event and sends no email.
  - The web already tells the person to check the new inbox.
- `Providers::Invitations::ProvidersCreateManager` and `ProvidersResendManager` publish no event.
- The team managers publish `ProviderApproved`, `ProviderRejected` and `ProviderCorrectionRequested`, and no handler consumes them.

The dispatch code works only for the two verification emails.

- `Notifications::Dispatches::ProcessManager` maps the events in `VERIFICATION_EVENTS` and requires `raw_verification_token`.
- `Notifications::Dispatches::Shared::EnqueueManager` needs an `Identities::Account`, and it always sends to the account email.
  - An invited email may have no account.
  - The notice goes to the old address, not to the account email.
- The idempotency key holds the event name and the account id.
  - Two emails for one event and one account would get the same key.

```ruby
# app/domains/notifications/dispatches/process_manager.rb:9-12
VERIFICATION_EVENTS = {
  'AccountRegistered'       => :account_registered,
  'EmailVerificationResent' => :verification_resent
}.freeze
```

The email verification confirm does not check that the token went to the current email.

- `Identities::EmailVerifications::ConfirmManager` finds the token by its digest and verifies the account.
- After an email change, an open token sent to the old address would verify the new address.

## Lasting rules \{#lasting-rules\}

The rulings live in [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails).

- After merge, the email of each flow moves to its use-case page, see [Docs](#tasks-docs).
- This spec keeps the scope, the design, the text and the verification.

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails) | The four emails, the receivers, the language rule and the Japanese check |
| Rule | [IAM D18 — Email change closes old tokens](/docs/30-49-domains/iam/iam-decisions/#email-change-tokens) | An email change closes the open tokens of the old address, and the notice goes to the old address in every case |
| Rule | [IAM D16 — Language](/docs/30-49-domains/iam/iam-decisions/#language) | The system uses the saved choice for emails |
| Rule | [IAM D6 — Staff invitations](/docs/30-49-domains/iam/iam-decisions/#staff-invitations) | 7 days, a new send replaces the link |
| Rule | [IAM D5 — Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) | Owner and Staff |
| Model | [Provider company and members](/docs/30-49-domains/iam/models/provider-company-and-members) | The invitation and the membership |
| Column truth | [notifications.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/notifications.dbml) and [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) | `notifications_dispatches` and the token tables |
| Convention | [Prose and ASD-STE100](/docs/00-09-meta/conventions/prose-and-ste100) | Tier A for every email text |
| Depends on | [api-261](api-261-permits-and-approval.md) and [api-264](api-264-invitations-and-members.md) | The decision events and the invitation managers |
| Paired work | [red-cab-web#214](https://github.com/markmamba/red-cab-web/issues/214) | The reset pages read `lang`, and two invitation texts change |
| Dependency | [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265) | Production sends no email until it ships |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | Add the column `notifications_dispatches.mail_key`, and the process manager picks the mailer action from it. | Pass the mail kind only in the job arguments. | The row is the record of each email, so it must say which email went out. |
| 2 | The enqueue manager takes `recipient_email`, `language_preference` and an optional `identities_account`. | Keep the account as the only receiver. | An invited email may have no account, and the notice goes to the old address. |
| 3 | The idempotency key is `{event_name}:{mail_key}:{recipient}:{channel}`, plus the suffix when one exists. | Keep `{event_name}:{account_id}:{channel}`. | One event can send two emails to one account, and an invitation has no account. |
| 4 | `{recipient}` is `account-{id}` when an account exists, and `email-{sha256 of the email}` when not. | Put the raw email in the key. | The key stays short, and it holds no address in plain text. |
| 5 | The process manager has one map: mail key to mailer class, mailer action and required job arguments. | One `if` branch for each event. | A new email adds one row, and a missing argument marks the row `failed`. |
| 6 | A raw token travels in the job arguments, as the verification email does today. | Store the raw token in the database. | The database must never hold a raw token. Redis holds it only until the job runs. |
| 7 | The password reset email has the suffix `sha256(raw token)`, so each request sends one email. | One email for each hour. | A person who asks twice expects the second email. |
| 8 | A Google-only account publishes the new event `PasswordResetRequestedWithoutPassword` with a new `request_id`. | Send nothing, as today. | D17 rules a hint email. The `request_id` keeps one email for each request. |
| 9 | The reset link is `{web_base_url}/reset-password?lang={en or ja}&token=…`. | No `lang`. | The web has no language cookie yet, so the link tells the page which language the email used. The query builder sorts the keys, and the web reads each key by name. |
| 10 | An email change creates a new verification token in the same transaction, and it publishes `AccountEmailChanged` after commit. | Ask the person to press Resend. | The web already says "Check your email", and D17 rules the email. |
| 11 | An email change sets `expires_at` to now on every open verification token of the account. The confirm check changes from `>=` to `>`, so a token with `expires_at` equal to now is expired. | Add an email column to the token table. Set `expires_at` to one second before now. | It closes the old-address hole with no migration, and the new token still works. The password reset confirm already uses the same rule, so the two confirms match. |
| 12 | `AccountEmailChanged` sends two emails: `email_change_verification` to the new address and `email_change_notice` to the old address. | One event for each email. | One fact happened, and the two rows differ by mail key. |
| 13 | The notice shows the new address as a masked email: the first letter of the local part, then `***`, then `@` and the domain. | The full new address. | Someone who reads the old inbox must not learn the new address. |
| 14 | The notice shows the setting `red_cab.support_email`. The default is the placeholder `help.support@redcab.app`, and a blank value fails the dispatch. | Write no contact address. | A guard must block. A notice with no contact cannot help the person. The owner gives the real address later. |
| 15 | The invitation managers publish the new event `StaffInvitationSent` after commit, with the invitation and the link. | Send from the manager. | Events publish after commit, and Notifications owns the email. |
| 16 | The invitation dispatch has no account, the language `en`, and the suffix `sha256(raw token)`. | Look up an account by the invited email. | D17 rules English, and decision 15 of [api-264](api-264-invitations-and-members.md) keeps the create blind to accounts. |
| 17 | The invitation email adds one Japanese line, read with `I18n.t(key, locale: :ja)`. | A full Japanese copy. | D17 rules one Japanese line. |
| 18 | The three decision events carry a new `decision_id` and the team message, and each owner gets one row. | Read `rejection_reason` when the job runs. | The owner may submit again before the job runs, and the submit clears `rejection_reason`. |
| 19 | The decision emails go to the active owner memberships at the time of the event. | Also send to staff. | D17 sends to owners only. |
| 20 | Every decision email links to `{web_base_url}/providers`. | A different page for each decision. | The provider policy routes already open the right page for each access word. |
| 21 | `Notifications::Dispatches::Shared::EnqueueManager` rescues `StandardError` from its own work, so one place covers every mail key. It reports the error with `Sentry.capture_exception` when `Sentry` is defined, and it returns. | Let the error reach the request. Rescue in each enqueue manager. | The event publishes after commit. A 500 answer after a committed change is wrong, and the owner would lose `invitation_link`. The code reads `Sentry` by name at run time, because the gem is not in the `Gemfile` yet. |
| 22 | A blank `support_email` and a missing job argument mark the row `failed` and return. They do not raise. | Raise, so Sidekiq retries. | A retry cannot succeed, because the row is not `pending`. A raise only adds noise to Sentry. |
| 23 | A `failed` row never retries by itself. Only a republish of the same event resets it. | Retry after an SMTP timeout. | This is the behavior today. A retry rule needs its own ruling. |
| 24 | `mail_key` is a string-backed enum on `Notifications::Dispatch`. The change is 3 migrations: add, backfill and constrain, as `db/AGENTS.md` asks. The backfill uses an explicit map. It stops with an error on any other `event_name`. | Copy `event_name` in snake case. Delete the other rows. | `EmailVerificationResent` maps to `verification_resent`, so a copy is wrong. Deleting rows hides data. |
| 25 | The job arguments hold plain strings only. The handler copies each value at event time. | Pass a record and read it when the job runs. | The owner may submit again before the job runs, and the submit clears `rejection_reason`. |
| 26 | `decision_id` lives only in the event payload, the job arguments and the idempotency key. | Store it in a table. | No other code reads it. |
| 27 | An email change also sets `expires_at` to now on every open password reset token of the account. | Close only the verification tokens. | A person who reads the old inbox could reset the password for up to 1 hour. [IAM D18](/docs/30-49-domains/iam/iam-decisions/#email-change-tokens) rules this. |
| 28 | The notice goes to the old address even when the person never verified that address. | Send the notice only to a verified old address. | The system cannot tell a wrong address from a real address. The notice shows only the masked new address. [IAM D18](/docs/30-49-domains/iam/iam-decisions/#email-change-tokens) rules this. |
| 29 | `Identities::EmailVerifications::ResendManager` locks the account row, and it checks the email and `is_email_verified` again before it saves a token. | Leave the manager as it is. | A resend at the same moment as an email change could save a token for the old address after the change closed the open tokens. |
| 30 | `Notifications::Dispatches::ProcessJob` does not write its arguments to the log. | Filter the log text. | Active Job writes the arguments at `info` level and does not apply `filter_parameters` to them. A raw token must stay out of the log. |
| 31 | The mail map has a `required_settings` list for each row. A blank required setting marks the row `failed` and does not raise. | Check the setting in each mailer. | One place covers every mail key, and the row keeps the reason. |

## API contract

No endpoint changes its path, its body or its answer.

- `POST /identities/password_resets/request` keeps the same `200` answer for every email.
- `POST /providers/invitations` and `POST /providers/invitations/:invitation_id/resend` keep `invitation_link` in the answer.
- `PATCH` of the account keeps its answer, and `is_email_verified` is false after an email change, as today.

### Events

The table lists each event that sends an email after this spec.

| Event | Published by | Payload | Emails |
| --- | --- | --- | --- |
| `PasswordResetRequested` | `Identities::PasswordResets::CreateManager` | `identities_account`, `raw_password_reset_token` | `password_reset` |
| `PasswordResetRequestedWithoutPassword` (new) | `Identities::PasswordResets::CreateManager` | `identities_account`, `request_id` | `password_reset_without_password` |
| `AccountEmailChanged` (new) | `Identities::Accounts::UpdateManager` | `identities_account`, `previous_email`, `raw_verification_token` | `email_change_verification`, `email_change_notice` |
| `StaffInvitationSent` (new) | `Providers::Invitations::ProvidersCreateManager` and `ProvidersResendManager` | `invitation`, `invitation_link`, `raw_token` | `staff_invitation` |
| `ProviderApproved` | `Providers::Companies::TeamApproveManager` | `provider_company`, `decision_id` (new) | `provider_approved` |
| `ProviderRejected` | `Providers::Companies::TeamRejectManager` | `provider_company`, `decision_id` (new), `team_message` (new) | `provider_rejected` |
| `ProviderCorrectionRequested` | `Providers::Companies::TeamRequestCorrectionManager` | `provider_company`, `decision_id` (new), `team_message` (new) | `provider_correction_requested` |

### Dispatch rows

The table lists the row that the enqueue manager writes for each mail key.

| Mail key | `recipient_account_id` | `recipient_email` | `language_preference` | Suffix | Mailer action |
| --- | --- | --- | --- | --- | --- |
| `account_registered` | The account | The account email | The saved choice | none | `EmailVerificationMailer#account_registered` |
| `verification_resent` | The account | The account email | The saved choice | `sha256(token)` | `EmailVerificationMailer#verification_resent` |
| `password_reset` | The account | The account email | The saved choice | `sha256(token)` | `AccountMailer#password_reset` |
| `password_reset_without_password` | The account | The account email | The saved choice | `request_id` | `AccountMailer#password_reset_without_password` |
| `email_change_verification` | The account | The new email | The saved choice | `sha256(token)` | `EmailVerificationMailer#email_change_verification` |
| `email_change_notice` | The account | `previous_email` | The saved choice | `sha256(token)` | `AccountMailer#email_change_notice` |
| `staff_invitation` | null | The invited email | `en` | `sha256(raw_token)` | `StaffInvitationMailer#staff_invitation` |
| `provider_approved` | The owner | The owner email | The saved choice of the owner | `decision_id` | `ProviderDecisionMailer#provider_approved` |
| `provider_rejected` | The owner | The owner email | The saved choice of the owner | `decision_id` | `ProviderDecisionMailer#provider_rejected` |
| `provider_correction_requested` | The owner | The owner email | The saved choice of the owner | `decision_id` | `ProviderDecisionMailer#provider_correction_requested` |

### Email texts

Every text below follows ASD-STE100 Tier A.

- Each email has an HTML template and a text template, as the verification email does.
- The texts live in `config/locales/notifications.en.yml` and `notifications.ja.yml`.
- `{name}` marks a value that the mailer fills in.
- Every email with a link also shows `link_fallback`, the same text as the verification email.
- A Japanese speaker checks every `ja` text before the final API pull request merges to `main`.

#### `password_reset`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Reset your Red Cab password` | `Red Cab のパスワードを再設定してください` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `We received a request to reset the password of your Red Cab account.` | `Red Cab アカウントのパスワード再設定のリクエストを受け付けました。` |
| `link_text` | `Choose a new password` | `新しいパスワードを設定する` |
| `expiry_note` | `This link works for 1 hour, and you can use it only once.` | `このリンクの有効期限は1時間です。使えるのは1回だけです。` |
| `sign_out_note` | `After the reset, Red Cab signs you out on every device.` | `再設定すると、すべての端末からログアウトします。` |
| `ignore_note` | `If you did not ask for this, ignore this email. Your password does not change.` | `心当たりがない場合は、このメールを無視してください。パスワードは変わりません。` |

#### `password_reset_without_password`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Your Red Cab account uses Google sign-in` | `Red Cab アカウントは Google でログインします` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `We received a request to reset the password of your Red Cab account.` | `Red Cab アカウントのパスワード再設定のリクエストを受け付けました。` |
| `reason` | `Your account has no password, because you sign in with Google.` | `このアカウントは Google でログインするため、パスワードはありません。` |
| `link_text` | `Open the sign-in page` | `ログインページを開く` |
| `next_step` | `On the sign-in page, choose Sign in with Google.` | `ログインページで「Sign in with Google」を選んでください。` |
| `ignore_note` | `If you did not ask for this, ignore this email.` | `心当たりがない場合は、このメールを無視してください。` |

The link is `{web_base_url}/login`.

#### `email_change_verification`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Verify your new email for Red Cab` | `Red Cab の新しいメールアドレスを確認してください` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `You changed the email of your Red Cab account to this address. Please verify this address.` | `Red Cab アカウントのメールアドレスをこのアドレスに変更しました。このアドレスを確認してください。` |
| `link_text` | `Verify your email` | `メールアドレスを確認する` |
| `expiry_note` | `This link expires in 24 hours.` | `このリンクの有効期限は24時間です。` |

The `body` text holds two sentences, and the template shows each sentence on its own line.

#### `email_change_notice`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `The email of your Red Cab account changed` | `Red Cab アカウントのメールアドレスが変更されました` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `The email of your Red Cab account changed to {masked_email}.` | `Red Cab アカウントのメールアドレスが {masked_email} に変更されました。` |
| `next_note` | `Red Cab now sends the emails of this account to the new address.` | `今後、このアカウントのメールは新しいアドレスに届きます。` |
| `warning` | `If you did not make this change, contact us at {support_email}.` | `この変更に心当たりがない場合は、{support_email} までご連絡ください。` |

This email has no link.

#### `staff_invitation`

| Key | en |
| --- | --- |
| `subject` | `{inviter_name} invited you to join {company_name} on Red Cab` |
| `greeting` | `Hello,` |
| `body` | `{inviter_name} invited you to join {company_name} on Red Cab as {role}.` |
| `role.owner` | `an owner` |
| `role.staff` | `staff` |
| `link_text` | `Open the invitation` |
| `sign_in_note` | `Sign in, or create an account, with this email: {invited_email}.` |
| `verify_note` | `If you create an account, verify your email first. Then open this invitation again.` |
| `expiry_note` | `This link works for 7 days.` |
| `ignore_note` | `If you do not know this company, ignore this email.` |

The Japanese line comes last, under a line break.

| Key | ja |
| --- | --- |
| `ja_note` | `Red Cab からのスタッフ招待です。上のリンクを開き、招待されたメールアドレスでログインしてください。` |

- `{inviter_name}` is the first name and the last name of the owner who sent the invitation.
- `{company_name}` is `providers_companies.business_name`.
  - Only an approved company can invite, so the name is never blank.

#### `provider_approved`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Red Cab approved {company_name}` | `Red Cab は {company_name} を承認しました` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `The Red Cab team approved your company, {company_name}.` | `Red Cab チームが {company_name} を承認しました。` |
| `next_step` | `You can now use every part of the provider portal.` | `プロバイダーポータルのすべての機能を使えるようになりました。` |
| `link_text` | `Open the provider portal` | `プロバイダーポータルを開く` |

#### `provider_rejected`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Red Cab did not approve {company_name}` | `Red Cab は {company_name} を承認しませんでした` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `The Red Cab team checked your company, {company_name}, and did not approve it.` | `Red Cab チームが {company_name} を確認しましたが、承認しませんでした。` |
| `message_label` | `Message from the Red Cab team:` | `Red Cab チームからのメッセージ：` |
| `link_text` | `Open the provider portal` | `プロバイダーポータルを開く` |

#### `provider_correction_requested`

| Key | en | ja |
| --- | --- | --- |
| `subject` | `Please correct the application of {company_name}` | `{company_name} の申請内容を修正してください` |
| `greeting` | `Hello,` | `こんにちは。` |
| `body` | `The Red Cab team checked your company, {company_name}, and asks you to correct some details.` | `Red Cab チームが {company_name} を確認しました。一部の内容の修正をお願いします。` |
| `message_label` | `Message from the Red Cab team:` | `Red Cab チームからのメッセージ：` |
| `next_step` | `Correct the details in the provider portal, and then submit again.` | `プロバイダーポータルで内容を修正し、もう一度提出してください。` |
| `link_text` | `Open the provider portal` | `プロバイダーポータルを開く` |

- The team message shows under `message_label` exactly as the team wrote it.
- The email does not translate the team message.

### Password reset flow

`Identities::PasswordResets::CreateManager` keeps its answer and adds one branch.

1. It validates the email, as today.
2. It finds no account, so it answers `200` and does nothing more.
3. It finds a Google-only account, so it publishes `PasswordResetRequestedWithoutPassword` with a new `request_id`.
4. It finds an account with a password, so it creates the token and publishes `PasswordResetRequested`, as today.
5. It answers `200` with `SUCCESS_MESSAGE` in each case.

The confirm flow does not change.

### Email change flow

`Identities::Accounts::UpdateManager` adds three steps when the email changes.

1. Inside the transaction, it sets `expires_at` to now on each open token of the account.
   - This covers the tables `identities_email_verification_tokens` and `identities_password_reset_tokens`.
   - An open verification token has `verified_at` null and `expires_at` later than now.
   - An open password reset token has `used_at` null and `expires_at` later than now.
2. Inside the transaction, it creates a new token with the 24-hour life of `Identities::EmailVerifications::ResendManager::VERIFICATION_TOKEN_TTL`.
3. After commit, it publishes `AccountEmailChanged` with the email from before the change.

The language event `LanguagePreferenceChanged` keeps its own branch.

- When the language and the email change together, the two emails use the new language.

### Files to create or modify (API)

- `db/migrate/{timestamp}_add_mail_key_to_notifications_dispatches.rb`: add `mail_key` as a nullable string.
- `db/migrate/{timestamp}_backfill_mail_key_on_notifications_dispatches.rb`
  - Fill it with this map: `AccountRegistered` gives `account_registered`, and `EmailVerificationResent` gives `verification_resent`.
  - Stop with an error when a row has any other `event_name`.
- `db/migrate/{timestamp}_set_mail_key_not_null_on_notifications_dispatches.rb`: set it to not null.
- `docs/db/notifications.dbml`: add `mail_key` and update the note of `idempotency_key`.
- `config/red_cab.yml`: add `support_email` from the credential `red_cab.support_email` or `RED_CAB_SUPPORT_EMAIL`, with the default `help.support@redcab.app`.
- `app/domains/notifications/dispatches/shared/enqueue_manager.rb`: the new arguments and the new key.
- `app/domains/notifications/dispatches/process_manager.rb`: the map of mail keys, with the job arguments and the settings that each row needs.
- `app/jobs/notifications/dispatches/process_job.rb`: set `log_arguments` to false.
- `app/domains/notifications/shared/report_enqueue_error_service.rb`: writes the log and reports the error.
- `app/domains/notifications/shared/web_url_builder.rb`: builds a web address from a path and a query.
- `app/domains/notifications/shared/masked_email_service.rb`: builds the masked email.
- `app/domains/notifications/password_reset_requested/enqueue_manager.rb`: replace the stub.
- `app/domains/notifications/password_reset_requested_without_password/enqueue_manager.rb`
- `app/domains/notifications/account_email_changed/enqueue_manager.rb`
- `app/domains/notifications/staff_invitation_sent/enqueue_manager.rb`
- `app/domains/notifications/provider_approved/enqueue_manager.rb`
- `app/domains/notifications/provider_rejected/enqueue_manager.rb`
- `app/domains/notifications/provider_correction_requested/enqueue_manager.rb`
- `app/domains/notifications/account_registered/enqueue_manager.rb` and `email_verification_resent/enqueue_manager.rb`: pass the mail key and the receiver.
- `app/mailers/notifications/email_verification_mailer.rb`: add `email_change_verification`.
- `app/mailers/notifications/account_mailer.rb`
- `app/mailers/notifications/staff_invitation_mailer.rb`
- `app/mailers/notifications/provider_decision_mailer.rb`
- `app/views/notifications/{mailer}/{action}.html.erb` and `.text.erb` for each new action.
- `config/locales/notifications.en.yml` and `notifications.ja.yml`
- `app/domains/shared/domain_events/publisher.rb`: the handlers for the six events.
- `app/domains/identities/events/account_email_changed.rb` and `password_reset_requested_without_password.rb`
- `app/domains/providers/events/staff_invitation_sent.rb`
- `app/domains/providers/events/provider_approved.rb`, `provider_rejected.rb` and `provider_correction_requested.rb`: the new payload keys.
- `app/domains/identities/password_resets/create_manager.rb`
- `app/domains/identities/accounts/update_manager.rb`: also close the open password reset tokens, and rename the local `email_changed` to `is_email_changed`.
- `app/domains/identities/email_verifications/resend_manager.rb`: lock the account row and check the email again before it saves a token.
- `app/domains/identities/email_verifications/confirm_manager.rb`: change `>=` to `>` in the check of `expires_at`.
- `app/domains/providers/invitations/providers_create_manager.rb` and `providers_resend_manager.rb`
- `app/domains/providers/companies/team_approve_manager.rb`, `team_reject_manager.rb` and `team_request_correction_manager.rb`
- `test/mailers/previews/notifications/*_preview.rb` (new folder): one preview for each action, in `en` and `ja`.

### Code to remove

- The constant `VERIFICATION_EVENTS` and the method `extract_raw_verification_token` in `ProcessManager`.
- The stub comment in `Notifications::PasswordResetRequested::EnqueueManager`.

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [api-264](api-264-invitations-and-members.md) | Decision 1: the API now sends the invitation email, and the answers still return the link once |
| [api-264](api-264-invitations-and-members.md) | The TL;DR line "The API sends no email", the implementation note "The invitation sends no email", the touchpoint "Events: none" and the out-of-scope line "The invitation email, and any other email" |
| [api-264](api-264-invitations-and-members.md) | Worked example step 4: Kenji may still copy the link, and Mika also gets the email |

### Tests that must change

| Test files | Change |
| --- | --- |
| `test/domains/notifications/dispatches/process_manager_test.rb` | Each mail key, a missing argument and an unknown mail key. A blank `support_email` marks the row `failed` and does not raise. A `failed` row stays `failed` after the job runs again. |
| `test/domains/notifications/dispatches/shared/enqueue_manager_test.rb` | The new key, a receiver with no account, and two rows for one event |
| `test/domains/notifications/{event}/enqueue_manager_test.rb` | One file for each new handler, and a republish that sends nothing |
| `test/mailers/notifications/*_test.rb` (new folder) | Subject, receiver, link and language of each action |
| `test/domains/identities/password_resets/create_manager_test.rb` | The Google-only branch and the unknown email |
| `test/domains/identities/accounts/update_manager_test.rb` | The token, the closed old tokens of both kinds, the event, two changes in a row, a change back to the old address and a change while unverified |
| `test/domains/identities/email_verifications/resend_manager_test.rb` | A resend does not save a token when the email changed after the account was read |
| `test/domains/identities/password_resets/confirm_manager_test.rb` | A reset token from before an email change answers `422` |
| `test/jobs/notifications/dispatches/process_job_test.rb` | The log holds no job argument |
| `test/domains/identities/email_verifications/confirm_manager_test.rb` | An old token after an email change answers `422`, also when time is frozen. A token with `expires_at` equal to now answers `422`. |
| `test/controllers/providers/invitations_controller_test.rb` | Create and send again publish `StaffInvitationSent`, and the answers keep `invitation_link` |
| `test/domains/providers/companies/team_*_manager_test.rb` | The new payload keys |
| `test/integration/notifications/iam_emails_integration_test.rb` | One run of each flow from the request to `ActionMailer::Base.deliveries` |

## Data / domain touchpoints

- Bounded context: IAM, with the email work in Notifications.
- Transaction boundaries:
  - The email change closes the old tokens and creates the new token in the transaction of the update.
  - Each event publishes after its transaction commits.
- Snapshots: the dispatch row keeps the receiver email and the language at the time of the event.
- Schema: one new column, `notifications_dispatches.mail_key`.
- Secrets: the database holds no raw token.
  - The job arguments in Redis hold the raw token until the job runs.

## Worked example

Kenji owns Kanto Charter, and the saved language of Kenji is `ja`.

1. Kenji invites `mika@example.com` as staff with `POST /providers/invitations`.
2. The manager commits the invitation and publishes `StaffInvitationSent`.
3. The handler writes one row with `mail_key: "staff_invitation"` and `language_preference: "en"`.
4. The job sends the English email with the Japanese line to Mika.
5. The answer still holds `invitation_link`, and Kenji does not need to copy it.
6. Mika changes the account email from `mika@example.com` to `mika.t@example.com`.
7. The update closes the open verification token of Mika and creates a new one.
8. The handler writes `email_change_verification` for `mika.t@example.com` and `email_change_notice` for `mika@example.com`.
9. The notice says that the email changed to `m***@example.com`.
10. Later, the team asks Kanto Charter for a correction with the message `Please upload the back page of the permit.`
11. Kenji gets `provider_correction_requested` in Japanese, with the team message in English as the team wrote it.

## Out of scope

- The team email when an owner submits for review.
  - It stays an open question on the IAM decisions page.
- The permit reminders 30 and 7 days before a permit ends.
- The `AccountLocked` email.
- The production mail settings, which [red-cab-api#265](https://github.com/markmamba/red-cab-api/issues/265) covers.
- A rate limit on the password reset request.
- Japanese for the API error messages of the reset endpoints.
- A change of the Google sign-in flow.

## Open items

- The address `help.support@redcab.app` is a placeholder.
  - The owner gives the real address later.
  - The change is one value in the credential, so it needs no new spec.
- A Japanese speaker must check every `ja` text in this spec before the final API pull request merges.
- Anyone can ask for a reset email for any address many times, because no rate limit exists.
  - The free Brevo plan sends 300 emails each day.

## Tasks

### API

- [ ] Add the migration, the model change and the DBML change.
- [ ] Make the enqueue manager and the process manager generic.
- [ ] Add the URL builder, the masked email service and the setting `support_email`.
- [ ] Add the four mailers, the templates, the texts and the previews.
- [ ] Add the three new events and the new payload keys.
- [ ] Add the six handlers in the publisher.
- [ ] Change the reset, update, invitation and team managers.
- [ ] Update the tests.

### Docs \{#tasks-docs\}

- [ ] Set spec `status: implemented` after merge.
- [ ] Update the two no-email lines on [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members).
  - One line says that the owner sends the link by hand.
  - One line says that the invitation sends no email.
- [ ] Add the email of each flow to its use-case page.
- [ ] Add `mail_key` to the words of the Notifications docs, if a page names the table.

## Acceptance criteria

- [ ] A reset request for an account with a password sends one `password_reset` email.
  - Its link works for 1 hour.
- [ ] A reset request for a Google-only account sends one `password_reset_without_password` email with no reset link.
- [ ] A reset request for an unknown email sends nothing, and the answer is the same as for a known email.
- [ ] An email change sends `email_change_verification` to the new address and `email_change_notice` to the old address.
- [ ] After an email change, a verification token sent before the change answers `422`.
- [ ] After an email change, a password reset token sent before the change answers `422`.
- [ ] The log holds no job argument, so it holds no raw token.
- [ ] Create and send again each send one `staff_invitation` email, and each answer still holds `invitation_link`.
- [ ] Each decision sends one email to each active owner, and no email to staff.
- [ ] The rejection and correction emails show the team message.
- [ ] Each email uses the saved language of the receiver, and the invitation uses English with the Japanese line.
- [ ] A republished event writes no second row.
- [ ] A blank `support_email` marks the notice row `failed`, and the default is `help.support@redcab.app`.
- [ ] An error while the system queues an email does not change the answer of a committed action.
- [ ] No table holds a raw token.

## Verification

```bash
# API (from red-cab-api/)
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc --ignore=.claude
bundle exec rubocop
bundle exec brakeman
git grep -n 'VERIFICATION_EVENTS' -- app
```

- Open each mailer preview at `/rails/mailers` in `en` and `ja`.
- A real send through Brevo needs the approval of the owner and an address from the owner.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-11-07 | Mark Henson Bautista | Approved. The Japanese texts still need a check before the code merges. |
| 2026-11-08 | Mark Henson Bautista | Approved decisions 11 and 21 to 26, after a design review of the plan. |
| 2026-11-08 | Mark Henson Bautista | Approved decisions 27 and 28, which are [IAM D18](/docs/30-49-domains/iam/iam-decisions/#email-change-tokens). Decisions 9, 21, 24 and 29 to 31 record what the code and the code reviews showed. |
