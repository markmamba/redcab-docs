---
title: "Add the members page, the invitation accept page and the Staff read-only views"
sidebar_label: Web · Invitations and members
issue: "https://github.com/markmamba/red-cab-web/issues/193"
repos:
  - red-cab-web
status: implemented
phase: 2
context: IAM
depends_on:
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/api-264-invitations-and-members.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-190-server-side-sessions-and-account-menu.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-191-permits-registration-and-team-approval.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/iam/web-192-portal-access-and-switch.md"
related:
  - "docs/30-49-domains/32-iam/iam-decisions.md#company-roles"
  - "docs/30-49-domains/32-iam/iam-decisions.md#staff-invitations"
  - "docs/30-49-domains/32-iam/iam-decisions.md#portal-access"
  - "docs/30-49-domains/32-iam/iam-decisions.md#current-session-answer"
  - "docs/30-49-domains/32-iam/iam-decisions.md#web-session-rules"
  - "docs/30-49-domains/32-iam/iam-decisions.md#policy-routes"
  - "docs/30-49-domains/32-iam/iam-decisions.md#access-codes"
---

## TL;DR

- An invited person opens `/account/staff-invitation?token=…` and accepts after sign-in.
- The accept page sits outside every policy route, so `postAuthPath` and `providerRequired` do not change.
- An owner of an approved company manages members and invitations at `/providers/members`.
- The page shows the invitation link once, with a Copy link button.
- Staff see the company pages as read-only, and the dashboard shows no Members link.
- Entry rules still read the access word and never a role.
- The invitation email comes from the API, see [web-214](web-214-reset-pages-and-invitation-texts.md).
- This spec ships no payout page and no carry of the link through sign-up.
- Breaking change: Yes.
  - The web and `red-cab-api` must deploy together.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| member | A person with an active membership in a provider company. |
| owner, staff | The two company roles. The company JSON holds the role of the asking person in `company_role`. |
| invitation link | The address `/account/staff-invitation?token=…`. Red Cab emails it, and an owner may also copy it and send it by hand. |
| accept state | The word `accept_state` in the invitation preview. It says what the viewer can do. |
| access word | The value of `provider_access.state`: `missing`, `pending`, `active`, `rejected` or `suspended`. |
| entry rule | A pure function that answers with null or a path. A policy route calls it before a page renders. |
| open route | A route that sits outside every policy route. A guest can open it. |

## User stories

1. US-1: As an invited person, I want to accept the invitation, so I join with my own account.
2. US-2: As a guest with a link, I want to return to it after sign-in, so I keep my place.
3. US-3: As an owner, I want to invite staff and copy the link, so I can send it.
4. US-4: As an owner, I want to send a link again or cancel it, so an old link stops working.
5. US-5: As an owner, I want to change a role or remove a member, so a leaver loses access.
6. US-6: As staff, I want to see why I cannot change the company, so I know to ask an owner.

## Problem

The web has no page for members or invitations.

- No page lets an owner invite, list, change or remove a member.
- No page lets an invited person read and accept an invitation.
- An invited person has the word `missing`, so `providerRequired` allows only `/providers/registration/create`.
- `postAuthPath` drops a `redirect_to` that is not a public return path or under `/account` or `/providers`.
- Every company page shows its edit controls to every member, and the API will refuse staff.
- The dashboard has no link to a members page.

## Lasting rules \{#lasting-rules\}

The lasting rules of this spec are on the use-case page [Staff invitations and members](/docs/30-49-domains/iam/use-cases/staff-invitations-and-members).

- That page holds the routes, the accept page and its states.
- It also holds the members page, the link panel and the confirmations.
- It also holds the staff read-only views and the dashboard link.
- The API side is on [Provider company and members](/docs/30-49-domains/iam/models/provider-company-and-members).
- This spec keeps the scope, the steps and the verification.

## Implementation notes \{#implementation-notes\}

The code differs from the plan of this spec in these places.

- The file `providers-invitation-service.js` joined the plan.
  - It reads the preview and maps a `404` to `unavailable`, so the page holds no read logic.
- `ProvidersMembershipService` holds `fetchMembers`, `formatDate` and `buildPersonLabel`.
  - Step 7 adds `formatMemberName` to it.
- Two small views joined the plan: the owner-only note and the read-only company details.
- The members loader returns the company in every answer, because the page shows dates in the Service Timezone.
  - A real browser run found this. The first version returned the company only when the load failed.
- The accept error shows the API `title` as the toast title.
- A real browser run passed 20 steps against the API integration branch.

## Governing docs

Read these before design. Do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| Rule | [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles) | What Staff cannot do, and the last owner |
| Rule | [Staff invitations](/docs/30-49-domains/iam/iam-decisions/#staff-invitations) | 7 days, a new send replaces the link, the email must match |
| Rule | [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access) | The URL decides the portal |
| Rule | [Current-session answer](/docs/30-49-domains/iam/iam-decisions/#current-session-answer) | The answer holds no role, so a page reads the role from its own loader |
| Rule | [Web session rules](/docs/30-49-domains/iam/iam-decisions/#web-session-rules) | A stale copy in the web grants nothing |
| Rule | [Policy routes](/docs/30-49-domains/iam/iam-decisions/#policy-routes) | The parts of a policy route, and no nesting |
| Rule | [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) | `provider_owner_required` |
| Requirement | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) | What an owner and a staff member see |
| Paired spec | [API invitations and members](api-264-invitations-and-members.md) | The contract, and it must deploy with this spec |
| Depends on | [Portal access and switch](web-192-portal-access-and-switch.md) | Entry rules, `postAuthPath`, the Google record and the dashboard |
| Depends on | [Permits and approval](web-191-permits-registration-and-team-approval.md) | The registration pages that Staff see as read-only |
| Depends on | [Sessions and account menu](web-190-server-side-sessions-and-account-menu.md) | The sign-out controls |
| Web rules | `red-cab-web/AGENTS.md` and `red-cab-web/app/routes/AGENTS.md` | Policy routes, domain folders and API modules |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | The accept page is `/account/staff-invitation`, and it is an open route in `marketplace.routes.js`. | A page under `/providers`. A public page such as `/invitations/accept`. | `providerRequired` sends the word `missing` away from `/providers`. A path outside `/account` and `/providers` needs a wider `postAuthPath`, and the principal developer did not allow that. |
| 2 | `postAuthPath` and `providerRequired` do not change. | Add an exception for the accept path. | The path is under the prefix `/account`, so the tourist portal keeps it. |
| 3 | A `redirect_to` to the accept page stays only for the tourist portal. | Allow it for both portals. | The provider portal drops it by decision 7 of `web-192`. A provider login must not open a page of the tourist portal. |
| 4 | The page reads one preview and draws by `accept_state`. | Read an error code from the accept action. | The page needs the state before the click, and the web reads words, not gate codes. |
| 5 | A word of `accept_state` that the page does not know shows the text `cannot_join`. | Treat it as `ready`. | An unknown word grants nothing. |
| 6 | The page uses a `clientLoader`. | A server `loader`. | The token must not sit in a server log of the web, and the page needs the session cookie of the browser. |
| 7 | The page sets `<meta name="referrer" content="no-referrer">`. | Do nothing. | The token is in the address. |
| 8 | After Accept, the page calls `revalidator.revalidate()` and then moves to `/providers`. | Move at once. | The root loader must hold the word `active` before the entry rule runs, as in decision 19 of `web-192`. |
| 9 | The invitation link lives only in component state of the members page. | `sessionStorage`. The loader data. | The API shows the link once, and a copy in storage would outlive that. |
| 10 | The page shows the link in a read-only field with a Copy link button. | The button only. | The clipboard can fail, and the owner can then select the text. |
| 11 | The members page is a `clientLoader` that reads the company first. For staff it makes no member call. | Call the members endpoint and read `403`. | Entry rules never read a gate code, and a staff member then sees a clear note. |
| 12 | `ProvidersCompanyService.canManageCompany` is true only for `company_role` `owner`. | True unless the role is `staff`. | A missing or unknown role grants nothing. |
| 13 | Staff see the registration pages as read-only, with the note `Only an owner can change this.` | Hide the pages from Staff. | Staff in a pending company could not see the state of the application, and hiding needs a new redirect. |
| 14 | The dashboard shows the Members link only for the word `active` and an owner. | Show it to everyone. | The members page shows nothing to Staff. |
| 15 | Removing the own row, or changing the own role to Staff, asks for a confirmation. | Act at once. | The person loses access on the next click. |
| 16 | After the own removal, the page shows a toast and revalidates. The entry rule then moves the person. | Send the person to a new page. | The rule already sends the word `missing` to the create page. |
| 17 | The provider pages keep English text, and the accept page uses the copy file with English and Japanese. | Translate the provider pages. | The provider header is English only. The accept page sits in the tourist area. |
| 18 | The copy values hold no placeholder. The page shows the company name and the email as separate fields. | Interpolate in the copy. | `getTouristSurfaceCopy` has no interpolation, and Japanese word order differs. |
| 19 | A guest sees the English text. | Read the language of the browser. | `getTouristSurfaceCopy` uses Japanese only for a signed-in person. The language spec changes this later. |

## Web contract

### Routes

| Surface | Route | Loader | API module | Policy route |
| --- | --- | --- | --- | --- |
| Accept (open) | `/account/staff-invitation` | `clientLoader` | `providersInvitationPreviewsApi.show` | None |
| Members | `/providers/members` | `clientLoader` | `providersMembershipsApi.index`, `providersInvitationsApi.index` | `provider-required-policy` |

The accept route goes into `app/marketplace.routes.js` as `route('account/staff-invitation', …)`.

- It sits inside `tourist-public-layout.jsx`, outside every policy route.
- `/account/staff-invitation` is not under `touristAccountRoutes`, so `tourist-required-policy` does not guard it.

The members route goes into `app/provider.routes.js` as `route('members', …)`.

- The entry rule of `web-192` opens every provider page for the word `active`, so the rule does not change.
- Words `pending`, `rejected`, `suspended` and `missing` never reach the page.

### API modules

| Module | Methods |
| --- | --- |
| `app/api/providers-invitations-api.js` | `index`, `create`, `resend`, `cancel` |
| `app/api/providers-memberships-api.js` | `index`, `update`, `remove` |
| `app/api/providers-invitation-previews-api.js` | `show` |
| `app/api/providers-invitation-acceptances-api.js` | `create` |

- `providersInvitationsApi.create` and `resend` return `{ invitation, invitation_link }`.
- `providersInvitationAcceptancesApi.create` returns the session answer, and the caller ignores the body.
- Each method takes `options.cookie` like the existing modules.

### The accept page

The loader reads `token` from the search params.

- A missing token gives the state `unavailable`, with no API call.
- A `404` gives `unavailable`.
- Another error gives `load_failed`.
- A success gives the preview.

The page shows the company name, the role and the invited email in a list.

| `accept_state` | The page shows |
| --- | --- |
| `guest` | `guest_note`, a Sign in link, a Create an account link and `chat_browser_note` |
| `ready` | The Accept button |
| `email_mismatch` | `state.email_mismatch`, `sign_out_note` and a Sign out button |
| `email_unverified` | `state.email_unverified` and a Send verification email again button |
| `has_membership` | `state.has_membership` |
| `company_suspended` | `state.company_suspended` |
| Any other word | `cannot_join` |
| `unavailable` | `dead`, and no company name |
| `load_failed` | `load_failed` |

The guest links act as follows.

- Sign in goes to `authSafeRedirect.loginRedirectPath('/login', location)`.
  - That path is `/login?redirect_to=%2Faccount%2Fstaff-invitation%3Ftoken%3D…`.
- Create an account goes to `/sign-up`, with no `redirect_to`.
  - The tourist sign-up creates a tourist profile.
  - The provider sign-up at `/providers/sign-up` would create a company, so the page never links to it.

The Accept button acts in this order.

1. It sends `providersInvitationAcceptancesApi.create({ token })`.
2. On success, it calls `revalidator.revalidate()`.
3. It then moves to `/providers`.
4. On an error, it shows the API `title` in a toast and stays on the page.

The email button calls `identitiesAccountsApi.resendVerificationEmail({ email })` with the email of the signed-in person.

The Sign out button reuses `use-logout-fetcher.jsx`.

- `/logout` always ends at `/`, so the link is lost.
- The text `sign_out_note` tells the person to open the link again.

The page exports `meta` with `noindex, nofollow` and the `referrer` tag.

### The copy of the accept page

The keys go into `app/domains/tourist/tourist-surface-copy.js` with the prefix `staff_invitation.`.

| Key | `en` | `ja` |
| --- | --- | --- |
| `title` | `Staff invitation` | `スタッフ招待` |
| `label.company` | `Company` | `会社` |
| `label.role` | `Role` | `役割` |
| `label.email` | `Invited email` | `招待されたメールアドレス` |
| `role.owner` | `Owner` | `オーナー` |
| `role.staff` | `Staff` | `スタッフ` |
| `sign_in` | `Sign in` | `ログイン` |
| `sign_up` | `Create an account` | `アカウントを作成` |
| `guest_note` | `Sign in with the invited email. If you create an account, verify your email first. Then open the link in the invitation email again.` | `招待されたメールアドレスでログインしてください。アカウントを作成した場合は、先にメールアドレスを確認してください。その後、招待メールのリンクをもう一度開いてください。` |
| `chat_browser_note` | `If Google sign-in fails, open this link in Safari or Chrome.` | `Googleでログインできない場合は、このリンクをSafariまたはChromeで開いてください。` |
| `accept` | `Accept invitation` | `招待を受ける` |
| `state.email_mismatch` | `This invitation is for another email address. Please sign in with the invited email.` | `この招待は別のメールアドレス宛てです。招待されたメールアドレスでログインしてください。` |
| `sign_out_note` | `After you sign out, open this link again.` | `ログアウトしたあと、このリンクをもう一度開いてください。` |
| `sign_out` | `Sign out` | `ログアウト` |
| `state.email_unverified` | `Please verify your email before you accept this invitation.` | `招待を受ける前に、メールアドレスを確認してください。` |
| `resend_verification` | `Send verification email again` | `確認メールを再送する` |
| `state.has_membership` | `You already belong to a provider company.` | `すでに別の事業者に所属しています。` |
| `state.company_suspended` | `This company cannot take new members now.` | `この会社は現在、新しいメンバーを受け入れられません。` |
| `dead` | `This invitation link no longer works. Please ask the owner for a new link.` | `この招待リンクは無効です。オーナーに新しいリンクを依頼してください。` |
| `cannot_join` | `You cannot join this company now.` | `現在この招待を受けることはできません。` |
| `load_failed` | `We could not load this invitation. Try again later.` | `招待を読み込めませんでした。しばらくしてからもう一度お試しください。` |

A Japanese speaker must check every `ja` value.

### The members page

The loader acts in this order.

1. It reads the company with `providersCompaniesApi.show`.
2. If `canManageCompany` is false, it returns `{ isOwner: false }` and makes no member call.
3. Otherwise it reads the members and the invitations in parallel.

A staff member sees the note `Only an owner can manage members.` and nothing else.

An owner sees three parts.

| Part | Content |
| --- | --- |
| Invite form | The fields `email` and `company_role`. The role list has `Staff` first and `Owner`. |
| Invitations | One row for each pending invitation: email, role, sender, expiry, Send again and Cancel. An expired row shows `Expired`. |
| Members | One row for each member: name, email, role, joined date, a role control and Remove. |

The invite form acts as follows.

- Create sends `providersInvitationsApi.create`.
- The page then shows the link panel and reloads the invitation list.
- The email field uses a zod schema in `providers-invitation-schema.js`, and the API checks it again.

The link panel acts as follows.

- It shows a read-only field with the link, a Copy link button and the note `Red Cab sent this link by email. It works for 7 days. You can also copy it now, because Red Cab does not show it again.`
- It holds the link in component state only.
- A new send again or create replaces the link in the panel.
- A reload, a move to another page or a Cancel clears the panel.
- Copy link uses `navigator.clipboard.writeText`, and a failure shows the toast `Select the link and copy it.`

The row actions act as follows.

| Action | Call | After |
| --- | --- | --- |
| Send again | `providersInvitationsApi.resend` | The link panel shows the new link |
| Cancel | `providersInvitationsApi.cancel` | The row leaves the list |
| Change role | `providersMembershipsApi.update` | The list reloads |
| Remove | `providersMembershipsApi.remove` | The row leaves the list |

- Remove asks for a confirmation through `use-modal.jsx`.
- Remove and a role change on the row with `is_current_person` use the confirmation texts below.
- An API error shows the API `title` in a toast, and the list stays as it was.

| Confirmation | Text |
| --- | --- |
| Remove the own row | `You will lose access to the provider portal.` |
| Change the own role to Staff | `You will no longer manage the company.` |
| Remove another member | `This person will lose access to the provider portal.` |

After the own removal or the own role change, the page calls `revalidator.revalidate()`.

- A removed owner has the word `missing`, and the entry rule moves the person to `/providers/registration/create`.
- A former owner who stays as Staff sees the staff note.

### Staff read-only views

`ProvidersCompanyService.canManageCompany(providersCompany)` returns true only when `company_role` is `owner`.

The pages from `web-191` read it from the company in their loaders.

| Page | Staff see |
| --- | --- |
| `/providers/registration/edit` | The fields as read-only text |
| `/providers/registration/licenses` | The records as read-only text, with no add or edit control |
| `/providers/registration/documents` | The status and the missing list, with no upload control and no Submit |
| `/providers` | The status summary, and no Members link |

- Each page shows the note `Only an owner can change this.` above the read-only part.
- The catalog, bookings and reviews pages do not change.

### Dashboard

The dashboard `/providers` adds one link.

| Word | Role | Links added |
| --- | --- | --- |
| `active` | owner | Members |
| `active` | staff | None |
| Any other word | Any | None |

### Entry rules

No entry rule changes.

- `providerRequired` still answers by the access word.
- No rule reads `company_role`.
- A staff member who opens `/providers/members` by hand sees the note, and the API would refuse the calls.

### Files to create or modify (Web)

Routes and layouts:

- `app/marketplace.routes.js`
- `app/provider.routes.js`
- `app/routes/identities-account/staff-invitation-page.jsx` (create)
- `app/routes/provider/provider-members-page.jsx` (create)
- `app/routes/provider/provider-dashboard-page.jsx`
- `app/routes/provider/providers-company-registration-edit-page.jsx`
- `app/routes/provider/providers-company-registration-licenses-page.jsx`
- `app/routes/provider/providers-company-registration-documents-page.jsx`
- `AGENTS.md` and `app/routes/AGENTS.md`

API modules:

- `app/api/providers-invitations-api.js` (create)
- `app/api/providers-memberships-api.js` (create)
- `app/api/providers-invitation-previews-api.js` (create)
- `app/api/providers-invitation-acceptances-api.js` (create)

Domains:

- `app/domains/providers-invitation/providers-invitation-constant.js` (create, holds the accept states)
- `app/domains/providers-invitation/providers-invitation-schema.js` (create)
- `app/domains/providers-invitation/providers-invitation-form.jsx` (create)
- `app/domains/providers-invitation/providers-invitation-list-view.jsx` (create)
- `app/domains/providers-invitation/providers-invitation-link-view.jsx` (create)
- `app/domains/providers-invitation/providers-invitation-accept-view.jsx` (create)
- `app/domains/providers-membership/providers-membership-constant.js` (create, holds the roles)
- `app/domains/providers-membership/providers-membership-list-view.jsx` (create)
- `app/domains/providers-membership/providers-membership-service.js` (create)
- `app/domains/providers-company/providers-company-constant.js` (add `PROVIDERS_COMPANY_ROLE`)
- `app/domains/providers-company/providers-company-service.js` (add `canManageCompany`)
- The license record views and forms of `web-191`, for the read-only state.
- `app/domains/tourist/tourist-surface-copy.js`

### Code to remove

This spec removes no code.

- It adds pages, modules and read-only states.

### Implemented specs that this spec replaces

| Spec | Part replaced |
| --- | --- |
| [web-191](web-191-permits-registration-and-team-approval.md) | The tables "What each status shows" and the registration pages assume that the actor is an owner. Staff now see the read-only state. |
| [web-192](web-192-portal-access-and-switch.md) | The out-of-scope line for member screens, and the dashboard table, which gets the Members link |

This spec changes no Catalog ruling, so it replaces no part of [api-208](../cat/api-208-keyword-search.md) or [api-213](../cat/api-213-pickup-coverage-and-discoverable-gate.md).

### Tests that must change

| Test file | Change |
| --- | --- |
| `app/routes/policies/public-routes-tree.spec.js` | Add `./routes/identities-account/staff-invitation-page.jsx` to `OPEN_PAGE_MODULES` |
| `app/auth/auth-safe-redirect.spec.js` | Assert that the accept path with a token stays for `tourist` and is dropped for `provider` |
| `app/routes/provider/provider-dashboard-page.spec.js` | Assert the Members link by word and role |
| `app/domains/providers-company/providers-company-service.spec.js` | Assert `canManageCompany` for `owner`, `staff`, an unknown role and no role |
| `app/domains/tourist/tourist-surface-copy.spec.js` | Assert the new keys in both languages |
| The registration page specs from `web-191` | Assert the read-only state for staff |

New tests cover these behaviors.

- The accept page draws each `accept_state`, and an unknown word shows `cannot_join`.
- A missing token and a `404` show the `dead` text and no company name.
- The guest Sign in link keeps the full accept address in `redirect_to`.
- The Create an account link goes to `/sign-up` and never to `/providers/sign-up`.
- Accept revalidates and then moves to `/providers`.
- An accept error shows the API `title` and keeps the page.
- The members page for staff makes no member call.
- The invite form shows the link panel, and a reload clears it.
- Send again replaces the link in the panel.
- Remove and the own role change ask for a confirmation.
- Removing the own row revalidates.
- The members page shows `Expired` for an expired row.

## Data / domain touchpoints

- Bounded context: IAM, with reads from Providers.
- Transaction boundaries: none in the web.
- Snapshots: none.
- The web stores no role and no token.
  - The link lives in component state of one page.

## Worked example

Kenji runs Kanto Charter and adds Mika as staff.

1. Kenji opens `/providers`, and the dashboard shows Members because the word is `active` and the role is owner.
2. Kenji opens `/providers/members`, enters `mika@example.com`, picks Staff and sends.
3. The page shows the link panel with the link and the note about 7 days.
4. Red Cab emails the link to Mika, and Kenji may also pick Copy link and send it by chat.
5. Mika opens the link and sees Kanto Charter, Staff and `mika@example.com`, with a Sign in link.
6. Mika signs in on `/login`, and `postAuthPath` returns Mika to the accept page.
7. The page shows the Accept button, because `accept_state` is `ready`.
8. Mika picks Accept, the page revalidates, and `/providers` opens.
9. Mika opens `/providers/registration/edit` and sees the fields as read-only text with the note `Only an owner can change this.`
10. Mika adds a package to a tour, because the catalog pages stay open to staff.
11. Kenji removes Mika on the members page and confirms.
12. Mika's next click in the provider portal sends Mika to the create page, and the tourist portal still works.

## Out of scope

- Any email other than the invitation email, which [web-214](web-214-reset-pages-and-invitation-texts.md) covers.
- A payout page, because the web has none.
- Carrying the invitation link through sign-up, forgot password and the verify-email page.
- A message that tells a removed member why the portal changed.
- A Leave action for staff.
- Invitations from a pending or rejected company.
- The language switch and the translation files.
- The layout redesign, because topic A2 in markmamba/redcab-docs#154 owns it.

## Open items

- Product Owner sign-off on the IAM rulings is not recorded.
- Only an approved company can invite for now, and the owner may change this.
- A Japanese speaker must check every new `ja` value.
- A guest sees English on the accept page until the language spec ships.
- A chat app may open the link in its own browser, and nobody has tested this.
  - The note `chat_browser_note` covers it.
- A staff member whose owners all left cannot leave, and the team fixes this by hand.

## Tasks

### Web

- [x] Add the four API modules.
- [x] Add the accept route, page and views.
- [x] Add the copy keys.
  - A Japanese speaker still has to check every `ja` value.
- [x] Add the members route, page, forms and views.
- [x] Add `PROVIDERS_COMPANY_ROLE` and `canManageCompany`.
- [x] Add the read-only state to the registration pages.
- [x] Add the Members link to the dashboard.
- [x] Update the tests.
- [x] Update `AGENTS.md` and `app/routes/AGENTS.md`.

### Docs

- [x] Set spec `status: implemented` after merge.

## Acceptance criteria

- [x] A guest with a link signs in and returns to the accept page.
- [x] A person with a matching, verified email and no company accepts, and `/providers` opens with no new sign-in.
- [x] The accept page shows the right text for each accept state.
- [x] A dead link shows no company name.
- [x] An owner of an approved company can invite, send again, cancel, change a role and remove a member.
- [x] The invitation link shows once, and the page cannot show it again.
- [x] Staff see the registration pages as read-only, and the dashboard shows no Members link.
- [x] Staff can still use the catalog, bookings and reviews pages.
- [x] No entry rule reads a role.
- [x] `postAuthPath` and `providerRequired` keep the rules of `web-192`.

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test
git grep -n 'company_role' -- app ':!*.spec.*'
git grep -n -E 'PORTAL_GATE_CODE|isPortalGateError' -- app
```

## Review record

| Date | Reviewer | Outcome |
| --- | --- | --- |
| | | |
