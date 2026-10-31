---
title: IAM decisions
sidebar_label: Decisions
sidebar_position: 2
description: Current IAM rulings. One section for each decision, with the reason and what it replaces.
doc_type: domain-decisions
normative: true
status: current
context: iam
last_reviewed: 2026-10-31
supersedes:
  - ADR-018
  - ADR-019
  - FR-IAM-009 (partial)
  - FR-IAM-010
  - FR-IAM-011
  - FR-IAM-012 (partial)
  - FR-IAM-013
  - FR-PRV-002
  - INV-7
  - INV-9
legacy_ids:
  - FR-IAM-009
  - FR-IAM-012
  - FR-IAM-013
---

## TL;DR \{#iam-decisions-tldr\}

- This page holds every current IAM ruling, each with one section and one stable link.
- Behavior that users see is in [requirements](/docs/30-49-domains/iam/requirements/).
- The reasons and the options we did not choose are in [Accounts and provider companies](/docs/30-49-domains/iam/architecture-decisions/accounts-and-provider-companies).
- This page is the source of truth, and an old invariant applies only where this page cites it.
- Open items are only in [Open questions](#open-forks).

## About this document

Rulings are recorded here once, and requirements and specs link here instead of restating them.

| Topic | Document |
| --- | --- |
| Front door | [IAM domain](/docs/30-49-domains/iam/) |
| Words | [IAM words](/docs/30-49-domains/iam/#words) |
| Findings and use cases | [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) |

The principal developer agreed these rulings on 2026-10-31, but Product Owner sign-off is not recorded.

---

## Person account \{#person-account\}

One account is one person, and it holds login data only.

- An account holds the email, the password, the Google link, the name and the language.
- An account has no role.
- Google sign-in finds or creates the person, and it does not decide the portal.
- Google links to an existing person only when Google says the email is verified.
- A person has at most one Google link.
- A locked or archived person can use no portal.
- The memberships of a locked person stay, so the company keeps working.
- Why: one person can book tours and run a business with one email.
- Replaces: the single `role` on `identities_accounts` and the rule "role matches exactly one profile".

## Tourist profile \{#tourist-profile\}

A person has zero or one tourist profile.

- Tourist sign-up creates the person and the tourist profile.
- Provider sign-up does not create a tourist profile.
- The first booking creates the tourist profile when it is missing.
- Checkout asks only for the data that it needs and that the person does not have.
- Why: a provider who never books needs no tourist data.
- Replaces: the rule that only a tourist account can have a tourist profile.

## Provider company \{#provider-company\}

A provider company owns the business of a provider.

- The Providers domain owns the company and the membership (`Providers::Company` and `Providers::Membership`).
- Identities asks Providers for the access word through one small service.
- `providers_profiles` becomes `providers_companies`, and `Providers::Profile` goes away.
- The new table `providers_memberships` holds the link between a person and a company.
- Child tables of the profile point to the company with `providers_company_id`.
- Other domains keep the column name `provider_id`, and it points to the company.
- The company owns the approval status, the details, the documents and the licenses.
- The company owns the support trial and the payout account.
- The company owns the listings, the assets, the bookings and the reviews.
- Provider sign-up creates the person, a company with the status pending, and an owner membership.
- A signed-in tourist can create a company with the same account.
- The approval status of the company applies to every member.
- Tourists see the company name, not the member.
- Why: a business keeps its listings and its history when a staff member leaves.
- Replaces: `providers_profiles` as the one-person owner of the business.

## Provider licenses \{#provider-licenses\}

A company holds permits, and a permit unlocks a vehicle kind.

- There is one kind of company, a vehicle travel company, and there is no provider type.
- The passenger car permit (一般乗用旅客自動車運送事業) unlocks vehicles of the kind `private_car`.
- The chartered permit (一般貸切旅客自動車運送事業) unlocks vehicles of the kind `charter_bus`.
- The team approves a company once, and the company must hold at least one permit with a matching vehicle.
- Every company must provide insurance.
- Adding a permit later is checked by the team.
- Only the team records a license expiry date for the demo.
- An expired permit makes the packages with that vehicle kind unavailable.
- A listing with no available package is hidden, by the existing discoverable rule.
- Listings that use another permit stay live.
- A renewed permit recorded by the team brings the listings back.
- Guide services are not in scope now, and they come back later as a new license.
- A listing has one service type: `tour`, `airport_transfer`, `private_charter` or `port_transfer`.
- This replaces the listing `service_type` values, and the Catalog pages must follow.
- Why: Japanese law gives a separate permit for each kind of transport.
- An expired permit must hide only the listings that need it.
- Replaces: `provider_type`, its detail tables, `INV-7`, `INV-9` and `FR-PRV-002`.

## Company roles \{#company-roles\}

A membership has one company role, Owner or Staff.

- A person has zero or one active membership, so one person belongs to one company.
- A membership has the status `active` or `removed`.
- A removed membership stays as a row, because records keep the member who did an action.
- A removed person can come back with a new invitation and a new membership row.
- Staff manage listings, packages, assets, schedules, closures, bookings and review answers.
- Only an owner changes the company details, the documents, the payout account and the members.
- Staff see the price and the payout amount of each booking.
- Staff do not see the payout account, and they cannot open the payout settings.
- A company always has at least one owner.
- The last owner cannot leave until there is another owner.
- Why: two roles cover the first need, and we add roles later.
- Replaces: nothing, because the system has no company roles today.

## Staff invitations \{#staff-invitations\}

An owner adds staff by invitation.

- An owner invites a person by email with a company role.
- The table `providers_invitations` holds the email, the company role, the token digest and the expiry.
- An invitation has the status `pending`, `accepted` or `cancelled`.
- Accepting an invitation creates the membership.
- An invitation is valid for 7 days, and the owner can send it again.
- A person who already has a membership cannot accept.
- A person without an account signs up first, and then accepts.
- A change of role or a removal applies at once.
- A removed member loses access to the provider portal on the next action.
- Why: the owner decides who works in the company.
- Replaces: nothing, because the system has no staff today.

## Portal access and switching \{#portal-access\}

Any signed-in person may use the tourist portal, and an access word opens the provider portal.

- Any signed-in person may use the tourist portal, with or without a tourist profile.
- `provider_access` decides what a person may do in the provider portal.
- The URL decides the portal, and the session stores no active portal.
- Each portal area has a policy that decides before the page renders.
- After sign-in, the system opens the portal of the login page that the person used.
- The system does not remember the last portal, so the home page is always the tourist home.
- A switch is a link to the other portal, and it needs no new sign-in.
- "Switch to traveling" shows to every signed-in person in the provider portal.
- "Switch to provider" shows when `provider_access` is not `missing`.
- Why: a person who is a tourist and a provider must not sign in twice.
- Replaces: the one-role portal rule of `FR-IAM-009`.

## Server-side sessions \{#server-side-sessions\}

A session is one database record for each sign-in.

- Persons use `identities_account_sessions`, and team admins use `identities_admin_sessions`.
- The two systems share no table, no cookie and no code.
- The cookie holds only the signed id of the record, and it never changes after sign-in.
- The cookie is `HttpOnly`, `Secure` outside development and test, and `SameSite=Lax`.
- The cookie domain comes from configuration, and never from the request.
- Nothing refreshes, and no endpoint renews a cookie.
- Rails reads the record on every request.
- A missing or expired record answers `401`.
- `401` means the session is gone and nothing else.
  - A wrong password answers `422`.
  - A missing or wrong CSRF token answers `403`.
- The CSRF token lives on the record.
- Sign-in writes the token into a readable cookie.
- Every write sends the token back in the `X-CSRF-Token` header, and Rails compares the two.
- A session has an idle limit and an absolute limit.
- Rails enforces both limits on every read.
- A person session has an idle limit of 7 days and an absolute limit of 30 days.
- A team admin session has an idle limit of 1 day and an absolute limit of 7 days.
- A request updates the last-used time at most once every 15 minutes.
- The limits and this interval live in configuration, so a change needs no migration.
- A login endpoint allows 10 attempts in 3 minutes from one IP address, and then answers `429`.
- This rate limit covers persons and team admins, and it lives in configuration.
- The account lockout after 5 failed logins stays, because it protects one account.
- Before launch, we confirm that the login rate limit sees the real visitor address.
- A cleanup job deletes expired records, only to keep the table small.
- Logout ends one session, and sign out everywhere ends all sessions of the person.
- A password reset ends all sessions of the person.
- The team admin sessions use the same shape in their own table.
- No production data exists, so there is no cutover.
- The API and the web deploy together, and everyone signs in again.
- Why: refresh needs eight rules to stay safe, and a session record needs none.
- Replaces: the `jwt_sessions` access and refresh cookies, the refresh endpoint and ADR-019.
- Record: [Sessions are database records, and nothing refreshes](/docs/30-49-domains/iam/architecture-decisions/server-side-sessions).

### Production hosts \{#production-hosts\}

Each identity system has its own hosts and its own cookies.

| Who | Web | API | Cookie domain | Session cookie | CSRF cookie |
| --- | --- | --- | --- | --- | --- |
| Persons | `redcab.app` | `api.redcab.app` | `.redcab.app` | `__Secure-rc_session` | `CSRF_TOKEN` |
| Team admins | `team.redcab.app` | `api.team.redcab.app` | `.team.redcab.app` | `__Secure-rc_team_session` | `TEAM_CSRF_TOKEN` |

- The team cookies stay under `team.redcab.app`, so the public site never receives them.
- The person cookies reach the team hosts, and the team code never reads them.
- Other apps, such as a blog or a marketing tool, never use a `redcab.app` subdomain.
- The team admin audit may move team admins to their own domain later.
- One Rails app serves both API hosts.

## Current-session answer \{#current-session-answer\}

The current-session answer holds the person and one access word for the provider portal.

- The answer is the response of "read the current session".
- Sign-in returns the same answer.
- It holds two keys and nothing else: the person and `provider_access`.
- The person holds `uuid`, `first_name`, `last_name`, `email`, `language_preference` and `is_email_verified`.
- `provider_access` holds one word, `state`.
- `provider_access` holds one of five words: `missing`, `pending`, `active`, `rejected` or `suspended`.
- `missing` means that the person has no active membership.
  - A removed member and an invited person who has not accepted are both `missing`.
- `pending` opens the provider portal for onboarding only.
- `active` opens the full provider portal.
- `rejected` and `suspended` open a holding page that explains the state.
- The answer holds only who the person is, or the access word.
- The answer holds no company data, no role data and no ids of other records.
- A page that needs more reads its own endpoint in its own loader.
- An entry rule reads only whether a person is signed in, and the access word.
- An entry rule lets a person enter only for the words that allow it.
- A word that the web does not know never opens a private page.
- Why: the answer reaches every page, so every field in it goes everywhere.
- Replaces: the `role` and `should_prompt_language` fields of the account answer.

## Web session rules \{#web-session-rules\}

The web sends the cookie and acts on the answer of Rails.

- A request with no session cookie is signed out, and the web never calls Rails for it.
- Only `401` means signed out.
- A `403`, a `5xx` and a network failure are errors that change nothing about the session.
- The web never reads the age of a cookie, never refreshes and never retries a refused request.
- Node reads the session, the browser writes, and Rails decides.
- A response built with a session cookie carries `Cache-Control: private, no-store`.
- Policy routes decide before a page renders, and Rails enforces every rule again.
- Why: any copy of the session in the web can be stale, and a stale copy must grant nothing.
- Replaces: the refresh rules R1 to R8 of ADR-019.

## Booking a listing of the own company \{#own-company-booking\}

A member cannot book a listing of the own company.

- Checkout refuses the booking.
- Why: false bookings must not raise the Most booked count or the reviews.
- Replaces: nothing.

## No corporate accounts \{#no-corporate-accounts\}

The corporate role and the corporate profile go away.

- There is no corporate sign-up.
- No new code may use `corporate_profiles`.
- Why: the principal developer dropped corporate clients from the product, and the Product Owner must confirm it.
- Replaces: `FR-IAM-013` and the Corporate Account in `FR-IAM-012`.

## Member on records \{#member-on-records\}

Some records keep the member who did the action.

- A listing status change keeps the member who published or paused the listing.
- A booking marked delivered keeps the member who marked it.
- A review answer keeps the member who wrote it.
- A review report keeps the member who sent it.
- Other records, such as packages, assets, schedules, closures and documents, keep the company only.
- The record keeps the member who did the latest action, and it is not a full history of changes.
- Tourists see the company name, not the member.
- Why: the owner must be able to ask who did an action on money, public text or the listing status.
- Replaces: nothing, because the system has no members today.

## Policy routes \{#policy-routes\}

A policy route decides who may enter the routes inside it.

- A policy route has three parts: a session middleware, an entry rule and a guard.
- The session middleware sits on the root route, and it gets the facts but never decides.
- The entry rule is a pure function that answers with null or a path, and it never fetches.
- The guard sits on the policy route, calls the rule and throws the redirect.
- Every policy route exports a `loader` that returns null, so that an in-app click reaches Node.
- A policy route never exports `shouldRevalidate` or `clientLoader`.
- A policy route renders only an `Outlet`.
- A policy route is never nested inside another policy route.
- The account and the team admin have separate roots, guards and entry rules.
- Web guards only shape the journey, and Rails is the boundary.
- Why: each part has one job, so each part can change and be tested alone.
- Replaces: the web enforcement model of ADR-018.

## Access codes \{#access-codes\}

Rails refuses a signed-in person with `403` and one code.

- `provider_membership_required` matches the word `missing`.
- `provider_approval_pending` matches the word `pending`.
- `provider_application_rejected` matches the word `rejected`.
- `provider_account_suspended` matches the word `suspended`.
- `provider_owner_required` refuses Staff on an owner-only action.
- `csrf_token_missing` and `csrf_token_invalid` are `403` too, and they mean a client bug.
- A `403` never signs anyone out.
- `tourist_profile_required`, `corporate_profile_required` and `provider_role_required` go away.
- Why: Rails must refuse on its own, and the web reads the code to show the right message.
- Replaces: the seven portal gate codes of ADR-018.

## Language \{#language\}

The web picks the screen language for each request, and the account keeps a saved choice.

- The web uses the first value that it finds, in this order.
  1. The saved choice of a signed-in person.
  2. The language cookie.
  3. The `Accept-Language` header of the browser.
  4. English.
- A language switch sets the cookie, so a guest can choose a language.
- A signed-in person who uses the switch also changes the saved choice.
- The account keeps `language_preference`, because an email has no browser to ask.
- The system uses the saved choice for emails.
- The URL does not hold the language, because search traffic in Japanese is not important at launch.
- There is no language prompt at first login.
- Why: a guest has no account, so a guest could never get Japanese from an account field.
- Replaces: `FR-IAM-010`, `FR-IAM-011` and the first-login language prompt.

## Open questions \{#open-forks\}

These items are proposed, not agreed, and no page may treat them as rules.

| Question | Proposed default | Blocks |
| --- | --- | --- |
| What is the exact seat limit between the two permits? | Sources disagree. Confirm with MLIT or a 行政書士. | Provider company spec |
| Does Red Cab need registration under the Travel Agency Act? | Unclear for a marketplace. Ask a Japanese lawyer or a 行政書士. | Launch |
| Has the Product Owner signed off these rulings? | Not recorded. | Acceptance |
