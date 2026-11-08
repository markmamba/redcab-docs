---
title: "Show the reset pages in English and Japanese, and update the invitation texts for the email"
sidebar_label: Web · Reset pages and invitation texts
issue: "https://github.com/markmamba/red-cab-web/issues/214"
repos:
  - red-cab-web
status: implemented
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-292-iam-emails.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-193-invitations-and-members.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#emails"
  - "docs/30-49-domains/32-iam/iam-decisions.md#language"
---

## TL;DR

- The reset pages `/forgot-password` and `/reset-password` show English and Japanese texts from the copy file.
- `/reset-password` reads `lang` from the reset email link, so the page uses the language of the email.
- `/forgot-password` shows Japanese only to a signed-in person who chose Japanese, until the language cookie of D16 ships.
- The link panel and `guest_note` say that Red Cab sends the invitation email.
- This spec ships no language cookie and no `Accept-Language` support.
- Breaking change: No.
  - The page reads an optional `lang`, and the API answers do not change.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| reset pages | The routes `/forgot-password` and `/reset-password`. |
| copy file | The file `app/domains/tourist/tourist-surface-copy.js`. It holds each text in `en` and `ja`. |
| copy helper | The function `getTouristSurfaceCopy` in the copy file. |
| link language | The value of the query `lang` on `/reset-password`, `en` or `ja`. |
| link panel | The view `ProvidersInvitationLinkView`. It shows the invitation link once to the owner. |

## User stories

1. US-1: As a person who chose Japanese, I want the reset page in Japanese, so it matches the email.
2. US-2: As an owner, I want the link panel to name the email, so I know what to do.
3. US-3: As an invited guest, I want the page to name the email, so I find the link.

## Problem

The reset pages have English text in the JSX, and they show the English `message` of the API answer.

- `forgot-password-page.jsx` shows `response.message` after a request.
- `reset-password-page.jsx` shows `response.message` after a reset, and the API error text for a bad link.
- The form components and `identities-password-reset-schema.js` hold English labels and English error texts.

The copy helper cannot give Japanese to a guest.

```js
// app/domains/tourist/tourist-surface-copy.js:258-261
const isLoggedIn      = options.isLoggedIn === true
const prefersJapanese = isLoggedIn && languagePreference === LANGUAGE_PREFERENCE.JA

return prefersJapanese ? entry.ja : entry.en
```

Two invitation texts do not match the email of [api-292](api-292-iam-emails.md).

- The link panel says `This link works for 7 days. Red Cab does not show it again.`
- `guest_note` tells a new person to open "this link" again, but the person now has the link in an email.

## Lasting rules \{#lasting-rules\}

The rulings live in [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails) and [IAM D16 — Language](/docs/30-49-domains/iam/iam-decisions/#language).

- After merge, the reset page texts and the link language move to a use-case page, see [Docs](#tasks-docs).

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [IAM D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails) | The reset pages in English and Japanese, and the invitation email |
| Rule | [IAM D16 — Language](/docs/30-49-domains/iam/iam-decisions/#language) | The order of the language sources |
| Use case | [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members) | The accept page and the link panel |
| Paired work | [api-292](api-292-iam-emails.md) and [red-cab-api#292](https://github.com/markmamba/red-cab-api/issues/292) | The reset link adds `lang`, and the API sends the invitation email |
| Depends on | [web-193](web-193-invitations-and-members.md) | The copy file, the accept page and the link panel |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The copy helper takes a new option `linkLanguage`, and a valid value wins over every other source. | Read `lang` in each page and call the helper twice. | One place decides the language, and other pages can use the option later. |
| 2 | Only `/reset-password` passes `linkLanguage`. | Pass it on every guest page. | Only the reset email carries `lang`. The language cookie of D16 covers the other pages later. |
| 3 | A `lang` value other than `en` or `ja` is ignored. | Show an error. | A broken link must still open the page. |
| 4 | The reset pages show their own success text, not `response.message`. | Keep the API text. | The API text is English only. |
| 5 | A `422` from the reset confirm shows `link_invalid` from the copy file. | Show the API text. | The API text is English only, and the page already offers a new link. |
| 6 | Field errors from the API still show the API text. | Map each API field error. | The zod schema catches the common errors first, and the API rules may change. |
| 7 | The zod schema becomes a function that takes the copy helper. | Keep one English schema. | The error texts must follow the page language. |
| 8 | The link panel stays English. | Add Japanese. | The provider portal has no Japanese copy yet. |
| 9 | The copy values hold no placeholder, as in [web-193](web-193-invitations-and-members.md) decision 18. | Interpolate in the copy. | The helper has no interpolation, and Japanese word order differs. |

## Web contract

| Surface | Route | Language source | API module |
| --- | --- | --- | --- |
| Guest | `/forgot-password` | The saved choice of a signed-in person, else English | `identities-password-resets-api.js` |
| Guest | `/reset-password?token=…&lang=…` | The link language, else the saved choice of a signed-in person, else English | `identities-password-resets-api.js` |
| Tourist | `/account/staff-invitation` | No change | No change |
| Provider | `/providers/members` | English | No change |

### Reset page texts

The new copy keys start with `password_reset.`.

| Key | en | ja |
| --- | --- | --- |
| `forgot.meta_title` | `Forgot Password \| Red Cab` | `パスワードをお忘れの方 \| Red Cab` |
| `forgot.title` | `Forgot password` | `パスワードをお忘れの方` |
| `forgot.intro` | `Enter your email address. We will send you an email to reset your password.` | `メールアドレスを入力してください。パスワード再設定用のメールをお送りします。` |
| `forgot.submit` | `Send reset email` | `再設定メールを送る` |
| `forgot.sent` | `If an account uses this email, we sent an email with the next step. Check your inbox.` | `このメールアドレスのアカウントがある場合は、次の手順のメールをお送りしました。受信トレイを確認してください。` |
| `forgot.remember` | `Remember your password?` | `パスワードを覚えていますか？` |
| `field.email` | `Email address` | `メールアドレス` |
| `field.password` | `New password` | `新しいパスワード` |
| `field.password_confirmation` | `Confirm new password` | `新しいパスワード（確認）` |
| `reset.meta_title` | `Reset Password \| Red Cab` | `パスワードの再設定 \| Red Cab` |
| `reset.title` | `Reset password` | `パスワードの再設定` |
| `reset.intro` | `Choose a new password for your account.` | `アカウントの新しいパスワードを決めてください。` |
| `reset.submit` | `Reset password` | `パスワードを再設定する` |
| `reset.done` | `Your password is changed. Please sign in with the new password.` | `パスワードを変更しました。新しいパスワードでログインしてください。` |
| `reset.link_invalid` | `This reset link does not work. It is used or more than 1 hour old. Please ask for a new link.` | `この再設定リンクは使えません。使用済みか、1時間以上たっています。新しいリンクをリクエストしてください。` |
| `reset.request_new` | `Request a new reset link` | `新しい再設定リンクをリクエストする` |
| `sign_in` | `Sign in` | `ログイン` |
| `back_to_sign_in` | `Back to sign in` | `ログインに戻る` |
| `error.email_blank` | `Please enter your email address.` | `メールアドレスを入力してください。` |
| `error.email_invalid` | `Please enter a valid email address.` | `正しいメールアドレスを入力してください。` |
| `error.password_blank` | `Please enter a password.` | `パスワードを入力してください。` |
| `error.password_short` | `Password must be at least 8 characters long.` | `パスワードは8文字以上にしてください。` |
| `error.password_number` | `Password must include at least one number.` | `パスワードには数字を1つ以上入れてください。` |
| `error.confirmation_blank` | `Please confirm your password.` | `確認のため、パスワードをもう一度入力してください。` |
| `error.confirmation_mismatch` | `Password confirmation does not match.` | `確認用のパスワードが一致しません。` |

- The `|` in the meta titles is a real character, and the table escapes it.
- The placeholder `you@example.com` stays the same in both languages.
- A Japanese speaker checks every `ja` text before the final web pull request merges to `main`.

### Invitation texts

The table lists the two texts that change.

| Place | en | ja |
| --- | --- | --- |
| `PROVIDERS_INVITATION_LINK_NOTES.WORKS_FOR_SEVEN_DAYS` | `Red Cab sent this link by email. It works for 7 days. You can also copy it now, because Red Cab does not show it again.` | none, see decision 8 |
| `staff_invitation.guest_note` | `Sign in with the invited email. If you create an account, verify your email first. Then open the link in the invitation email again.` | `招待されたメールアドレスでログインしてください。アカウントを作成した場合は、先にメールアドレスを確認してください。その後、招待メールのリンクをもう一度開いてください。` |

- The value of `WORKS_FOR_SEVEN_DAYS` keeps its constant name, so the tests that import it still work.

### Files to create or modify (Web)

- `app/domains/tourist/tourist-surface-copy.js`: the option `linkLanguage` and the `password_reset.*` keys.
- `app/domains/tourist/tourist-surface-copy.spec.js`: the option and the key list.
- `app/routes/identities-account/forgot-password-page.jsx`
- `app/routes/identities-account/reset-password-page.jsx`
- `app/domains/identities-password-reset/identities-password-reset-request-form.jsx`
- `app/domains/identities-password-reset/identities-password-reset-confirm-form.jsx`
- `app/domains/identities-password-reset/identities-password-reset-schema.js`
- `app/domains/providers-invitation/providers-invitation-constant.js`
- `app/routes/identities-account/forgot-password-page.spec.jsx` and `reset-password-page.spec.jsx` (new)

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-193](web-193-invitations-and-members.md) | The TL;DR line "This spec ships no email" for the invitation email only |
| [web-193](web-193-invitations-and-members.md) | The word "invitation link": the owner may still copy it, and Red Cab also emails it |
| [web-193](web-193-invitations-and-members.md) | The `guest_note` row of the accept page texts |
| [web-193](web-193-invitations-and-members.md) | Worked example step 4: Kenji may still copy the link, and Mika also gets the email |
| [web-193](web-193-invitations-and-members.md) | The out-of-scope line "The invitation email, and any other email" |

## Data / domain touchpoints

- Bounded context: IAM.
- Transaction boundaries: none in the web.
- Snapshots: none.
- The page never sends `lang` to the API.

## Worked example

Yuki has a password account, and the saved language of Yuki is `ja`.

1. Yuki opens `/forgot-password` as a guest, and the page shows English.
2. Yuki enters the email and sends the form.
3. The page shows `forgot.sent` in English, not the API `message`.
4. The API sends the reset email in Japanese, with the link `/reset-password?token=T1&lang=ja`.
5. Yuki opens the link, and the page shows `reset.title` in Japanese.
6. Yuki enters a password with 6 letters, and the zod schema shows `error.password_short` in Japanese.
7. Yuki enters a valid password, and the page shows `reset.done` in Japanese and opens `/login`.
8. Yuki opens the same link again, and the page shows `reset.link_invalid` in Japanese.

## Out of scope

- The language cookie, the language switch for guests and `Accept-Language` support of D16.
- Japanese for the API field errors.
- Japanese for the provider portal.
- Carrying the invitation link through sign-up and the verify-email page.
- A change of the account page text `Profile saved. Check your email to verify your new address.`
  - The API now sends that email, so the text is already true.

## Open items

- A Japanese speaker must check every `ja` text in this spec before the final web pull request merges.
- `/forgot-password` shows English to a guest until the language cookie of D16 ships.

## Tasks

### Web

- [x] Add the option `linkLanguage` to the copy helper, with tests.
- [x] Add the `password_reset.*` keys.
- [x] Move the reset pages, the forms and the schema to the copy file.
- [x] Show the page texts for success and for a bad link.
- [x] Change the link panel note and `guest_note`.
- [x] Update the tests.

### Docs \{#tasks-docs\}

- [x] Set spec `status: implemented` after merge.
- [x] Add the reset pages and the link language to an IAM use-case page.
- [x] Update the link panel and `guest_note` lines on [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members).

## Acceptance criteria

- [x] `/reset-password?lang=ja` shows every text in Japanese, also to a guest.
- [x] `/reset-password?lang=xx` shows the page in the normal language and does not fail.
- [x] `/forgot-password` shows Japanese to a signed-in person who chose Japanese, and English to a guest.
- [x] Neither reset page shows the API `message` text.
- [x] The zod errors follow the page language.
- [x] The link panel says that Red Cab sent the email.
- [x] `guest_note` points to the link in the invitation email.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm test
npm run build
```

- Open `http://localhost:5173/reset-password?token=x&lang=ja` and check the Japanese texts.
- Open `/forgot-password` as a guest and as a signed-in person with `ja`.

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| 2026-11-07 | Mark Henson Bautista | Approved. The Japanese texts still need a check before the code merges. |
