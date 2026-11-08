---
title: IAM decisions
sidebar_label: Decisions
sidebar_position: 2
description: Current IAM rulings. One section for each decision, with the reason and what it replaces.
doc_type: domain-decisions
normative: true
status: current
context: iam
last_reviewed: 2026-11-09
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
- A big ruling keeps its reasons and its options in sub-sections of its own entry.
- This page is the source of truth, and an old invariant applies only where this page cites it.
- Open items are only in [Open questions](#open-forks).

## About this document

Each entry is numbered `D1`, `D2` and so on.

It carries the day when it was first written into these docs.

Rulings are recorded here once, and requirements and specs link here instead of restating them.

| Topic | Document |
| --- | --- |
| Front door | [IAM domain](/docs/30-49-domains/iam/) |
| Words | [IAM words](/docs/30-49-domains/iam/#words) |
| Findings and use cases | [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |
| Column truth | [identities.dbml](https://github.com/markmamba/red-cab-api/blob/main/docs/db/identities.dbml) |

The principal developer agreed these rulings on 2026-10-31, but Product Owner sign-off is not recorded.

---

## D1 — Person account (2026-10-31) \{#person-account\}

One account is one person, and it holds login data only.

- An account holds the email, the password, the Google link, the name and the language.
- An account has no role.
- Google sign-in finds or creates the person, and it does not decide the portal.
- Google links to an existing person only when Google says the email is verified.
- A person has at most one Google link.
- A locked or archived person can use no portal.
- The memberships of a locked person stay, so the company keeps working.
- Replaces: the single `role` on `identities_accounts` and the rule "role matches exactly one profile".

### Why \{#person-account-why\}

- A person must be able to book a tour and run a provider business with one email.
- The previous design gave one role to each account: `tourist`, `corporate` or `provider`.
  - Each role had one profile table, and each profile linked to exactly one account.
  - Provider sign-up created a new account with the role `provider`, and it refused an email that had an account.
  - `providers_profiles` acted as the company.
  - Listings, assets, bookings, reviews and the payout account linked to `providers_profiles`.
  - A new Google sign-up always got the role `tourist`, also from the provider login.
  - The session held the account ID only, and the web sent a person to the home of the one role.
- That design caused three problems.
  - A provider who wants to book a tour needs a second email.
  - Only one person can manage the listings of a provider business.
  - A person cannot switch between the tourist portal and the provider portal.
- Travel marketplaces separate the person from the business.
  - Airbnb gives one account to a guest who is also a host, with a "Switch to hosting" control.
  - GetYourGuide and Booking.com give a supplier business many users, and each user has a role.
- There is no production data yet, so the tables can change without a data migration.

### What changes with it \{#person-account-changes\}

- One person can be a tourist and a provider, and a company can have many staff.
- The provider portal checks the membership and the company role, not an account role.
- The approval, license and payout checks move from the provider profile to the company.
- The URL decides the portal, and the session stores no active portal.
- The current-session answer holds one access word for the provider portal.
- The web entry rules ask "may this person use this portal?", not "is this the one role?"
- The layout needs a portal switch, and the layout redesign starts after this entry.
- Catalog, Bookings, Reviews and Payments link to the company, not to `providers_profiles`.
- The Corporate domain goes away from the docs, the API and the web.
- The session model is in [Server-side sessions](#server-side-sessions).

### Options we did not choose \{#person-account-options\}

| Option | Why not chosen |
| --- | --- |
| Keep one role for each account and use a second email | A provider keeps two logins, and one person still runs the whole company. |
| Allow many role values on one account | The account keeps business roles, and the company still has one user. |
| Give each person a provider profile inside the company | It is the same idea as a membership. The word membership states the link and the company role in one place. |
| Allow one person in many companies now | It needs a company picker and more session rules. We keep one company for each person for now. |
| Move login to an external identity service | It does not add the company or the membership. Google sign-in already works. |

## D2 — Tourist profile (2026-10-31) \{#tourist-profile\}

A person has zero or one tourist profile.

- Tourist sign-up creates the person and the tourist profile.
- Provider sign-up does not create a tourist profile.
- The first booking creates the tourist profile when it is missing.
- Checkout asks only for the data that it needs and that the person does not have.
- Why: a provider who never books needs no tourist data.
- Replaces: the rule that only a tourist account can have a tourist profile.

## D3 — Provider company (2026-10-31) \{#provider-company\}

A provider company owns the business of a provider.

- The Providers domain owns the company and the membership (`Providers::Company` and `Providers::Membership`).
- Identities asks Providers for the access word through one small service.
- `providers_profiles` becomes `providers_companies`, and `Providers::Profile` goes away.
- The new table `providers_memberships` holds the link between a person and a company.
- Child tables of the profile point to the company with `providers_company_id`.
- Other domains keep the column name `provider_id`, and it points to the company.
- The company owns the approval status, the details, the documents and the licenses.
- An owner enters the legal business name and a contact phone before the company goes to the team for review.
- The company owns the support trial and the payout account.
- The company owns the listings, the assets, the bookings and the reviews.
- Provider sign-up creates the person, a company with the status pending, and an owner membership.
- An owner sends a pending company to the team with one Submit for review action.
- Submit needs the legal business name, a contact phone and four documents.
  - The documents are `business_registration`, `transport_license`, `insurance` and `id`.
- Submit also needs a permit record, an insurance record and a company registration record.
- A correction request from the team returns the company to the owner, and the owner submits again.
- A rejected company can correct its application and submit again, and it then returns to pending.
- An approved company can add license records, upload documents and change the contact phone.
- Only the team changes the legal business name of an approved company.
- The team can suspend an approved company with a reason, and the team can reinstate it.
- A suspended company has no discoverable listing and takes no new booking.
- A suspension changes no confirmed booking.
- A signed-in tourist can create a company with the same account.
- The approval status of the company applies to every member.
- Tourists see the company name, not the member.
- Why: a business keeps its listings and its history when a staff member leaves.
- Replaces: `providers_profiles` as the one-person owner of the business.

## D4 — Provider licenses (2026-10-31) \{#provider-licenses\}

A company holds permits, and a permit unlocks a vehicle kind.

- There is one kind of company, a vehicle travel company, and there is no provider type.
- The passenger car permit (一般乗用旅客自動車運送事業) unlocks vehicles of the kind `private_car`.
- The chartered permit (一般貸切旅客自動車運送事業) unlocks vehicles of the kind `charter_bus`.
- The team approves a company once, and the company must hold at least one permit with a matching vehicle.
- Every company must provide insurance.
- A company holds license records of four kinds: `passenger_car_permit`, `chartered_permit`, `insurance` and `company_registration`.
- A company has one record for each kind.
- Insurance and company registration unlock no vehicle kind.
- The owner enters the license number of each record.
- The owner can edit a record until the team checks it.
- A checked record is locked, and a change to it goes through the team.
- A document can point to the license record that it proves.
- The team checks each record and enters its expiry date.
- The team can withdraw a check, for example when a permit is revoked.
- Adding a permit later is checked by the team.
- Only the team records a license expiry date.
- A record is valid when the team has checked it and its expiry date has not passed.
- A permit stays valid until the end of its last valid day in Japan time.
- A company has no time zone, so the system uses the time zone of Japan.
- The approval needs a valid permit with a matching vehicle.
- The approval also needs a checked insurance record and a checked company registration record.
- The approval reads these records and the vehicles, and no stored checklist exists.
- A pending company can save a vehicle after it adds a permit record of the matching kind.
- Insurance has no expiry rule for now, and [Open questions](#open-forks) lists it.
- An expired permit makes the packages with that vehicle kind unavailable.
- A package sells a service date only up to the last valid day of its permit.
- An ended permit changes no confirmed booking, and the team follows up by hand.
- A listing with no available package is hidden, by the existing discoverable rule.
- Listings that use another permit stay live.
- A renewed permit recorded by the team brings the listings back.
- A renewal updates the same license record.
- Guide services are not in scope now, and they come back later as a new license.
- A listing has one service type: `tour`, `airport_transfer`, `private_charter` or `port_transfer`.
- This replaces the listing `service_type` values, and the Catalog pages must follow.
- Why: Japanese law gives a separate permit for each kind of transport.
- Replaces: `provider_type`, its detail tables, the verification checklist, the guide `display_name`, the list of served prefectures, `INV-7`, `INV-9` and `FR-PRV-002`.

## D5 — Company roles (2026-10-31) \{#company-roles\}

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

## D6 — Staff invitations (2026-10-31) \{#staff-invitations\}

An owner adds staff by invitation.

- An owner invites a person by email with a company role.
- The table `providers_invitations` holds the email, the company role, the token digest, the expiry and the owner who sent it.
- An invitation has the status `pending`, `accepted` or `cancelled`.
- Accepting an invitation creates the membership.
- An invitation is valid for 7 days, and the owner can send it again.
- A new send replaces the old link, and the old link stops working.
- A person who already has a membership cannot accept.
- The email of the signed-in person must match the invited email.
- A person without an account signs up first, and then accepts.
- A change of role or a removal applies at once.
- A removed member loses access to the provider portal on the next action.
- Why: the owner decides who works in the company.
- Replaces: nothing, because the system has no staff today.

## D7 — Portal access and switching (2026-10-31) \{#portal-access\}

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

## D8 — Server-side sessions (2026-10-31) \{#server-side-sessions\}

A session is one database record for each sign-in.

- Persons use `identities_account_sessions`, and team admins use `identities_admin_sessions`.
- The two systems share no table, no cookie and no code.
- The cookie holds only the signed uuid of the record, and it never changes after sign-in.
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
- Replaces: the `jwt_sessions` access and refresh cookies, the refresh endpoint and ADR-019.

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

### Why \{#server-side-sessions-why\}

- The API knew who made a request through the `jwt_sessions` gem.
  - The session cookie held a JWT access token, and a second cookie held a refresh token.
  - The gem kept every token in Redis, and it refused a request whose token was not in the store.
  - The access token lived for 1 hour, and the refresh token lived for 7 days.
  - A `401` made the web ask for a refresh, and the web retried the request.
- Two clients carry one cookie, the browser and the web server.
  - After an hour both meet a `401`, and both try to refresh.
  - Rails accepts one refresh and deletes the old token at once.
  - The refresh needed eight extra rules to stay safe.
  - The web API client had about 450 lines for refresh, and two bridges added about 230 lines.
- The gem checks the store on every request, so the token gives no benefit of skipping a store lookup.
  - A database record does the same job with less machinery.
- The account model changes now, so every base controller changes too.
  - The session layer costs less to replace now than after launch, because no production data exists.
- The Rails 8 authentication generator uses the same shape: a sessions table and a signed cookie.

### What changes with it \{#server-side-sessions-changes\}

- The web and the API both get simpler, and sign-out becomes exact.
- A removed member or a locked person loses access on the next request, because Rails reads the record each time.
- Sign out everywhere finds every record of one person.
- The web deletes the refresh code in the API client and the two bridges.
- The web entry rules read the access word, not a role.
- The portal switch is a link, so the session stores no active portal.
- The `jwt_sessions` gem and its Redis token store go away.
- Redis stays, because Sidekiq and the Google state store use it.
- The auth contract tests change.
- Issue red-cab-api#147, "Server-side sessions", covers this work.

### Options we did not choose \{#server-side-sessions-options\}

| Option | Why not chosen |
| --- | --- |
| Keep `jwt_sessions` with refresh | It needs eight refresh rules, and two clients still race for one cookie. |
| A JWT with no store lookup | It cannot end a session at once, and it cannot sign a person out everywhere. |
| Sessions in Redis only | A table row lets Rails find every session of one person and list devices later. |
| One session table for persons and team admins | The two systems must never share data. Two tables make a wrong-side lookup impossible. |

## D9 — Current-session answer (2026-10-31) \{#current-session-answer\}

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
- `rejected` opens the provider portal for onboarding only, and it explains the state.
- `suspended` opens a holding page that explains the state.
- The answer holds only who the person is, or the access word.
- The answer holds no company data, no role data and no ids of other records.
- A page that needs more reads its own endpoint in its own loader.
- An entry rule reads only whether a person is signed in, and the access word.
- An entry rule lets a person enter only for the words that allow it.
- A word that the web does not know never opens a private page.
- Why: the answer reaches every page, so every field in it goes everywhere.
- Replaces: the `role` and `should_prompt_language` fields of the account answer.

## D10 — Web session rules (2026-10-31) \{#web-session-rules\}

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

## D11 — Booking a listing of the own company (2026-10-31) \{#own-company-booking\}

A member cannot book a listing of the own company.

- Checkout refuses the booking.
- Why: false bookings must not raise the Most booked count or the reviews.
- Replaces: nothing.

## D12 — No corporate accounts (2026-10-31) \{#no-corporate-accounts\}

The corporate role and the corporate profile go away.

- There is no corporate sign-up.
- No new code may use `corporate_profiles`.
- Why: the principal developer dropped corporate clients from the product, and the Product Owner confirmed it.
- Replaces: `FR-IAM-013` and the Corporate Account in `FR-IAM-012`.

## D13 — Member on records (2026-10-31) \{#member-on-records\}

Some records keep the member who did the action.

- A listing status change keeps the member who published or paused the listing.
- A booking marked delivered keeps the member who marked it.
- A review answer keeps the member who wrote it.
- A review report keeps the member who sent it.
- An invitation keeps the owner who sent it.
- Other records, such as packages, assets, schedules, closures and documents, keep the company only.
- The record keeps the member who did the latest action, and it is not a full history of changes.
- A change that the system makes names no member.
- One example is a listing that the system unlists when a place is deactivated.
- Another example is a booking that the system completes on its own.
- Only an owner reads the member, so Staff and the team do not see it for now.
- Tourists see the company name, not the member.
- Why: the owner must be able to ask who did an action on money, public text or the listing status.
- Replaces: nothing, because the system has no members today.

## D14 — Policy routes (2026-10-31) \{#policy-routes\}

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

## D15 — Access codes (2026-10-31) \{#access-codes\}

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

## D16 — Language (2026-10-31) \{#language\}

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

## D17 — Emails (2026-11-07) \{#emails\}

The system sends four kinds of IAM email, and each email has an English text and a Japanese text.

- Password reset: a person who asks for a reset gets an email with a reset link.
  - The link works for 1 hour and only once.
  - A reset signs the person out of every session.
  - The page answer is the same for every email, so nobody can test which emails have an account.
  - An account with only Google sign-in gets an email with no link.
  - That email tells the person to use Google sign-in.
- Email change: a person who changes the email of the account gets a verification email at the new address.
  - The old address gets a notice that names the new address with most letters hidden, for example `n***@example.com`.
  - The notice tells the person to contact Red Cab if they did not make the change.
- Staff invitation: the system sends an email with the invitation link to the invited email.
  - A new invitation sends the email.
  - A send again sends a new email, and the old link stops working.
  - The answer to the owner still shows the link once.
  - The owner can copy that link when the email does not arrive.
- Owner decision: every active owner gets an email when the team approves, rejects or asks for a correction.
  - The rejection email and the correction email show the message that the team wrote.
  - Each email has a link to the provider portal.
  - Staff do not get these emails.
- Language: each email uses the saved language choice of the person who gets it.
  - The invitation email is in English, with one Japanese line, because the invited email may have no account.
- Text: every email text follows ASD-STE100 Tier A, in English and in Japanese.
  - A Japanese speaker checks every Japanese text before the code merges to `main`.
- Replaces: decision 1 of the spec `api-264`, which sent no invitation email.

### Why \{#emails-why\}

- A person who forgets the password cannot get back into the account today, because no reset email exists.
- A person who changes the email cannot verify the new address.
- An invited person needs a verified email to accept.
- An invited person must not depend on the owner to copy a link into a chat.
- An owner must know the result of the review without checking the portal each day.

### What changes with it \{#emails-changes\}

- The Notifications domain sends email for more events than registration and verification resend.
- The API publishes an event when a person changes the email of the account.
- The web shows the reset pages in English and Japanese.

### Options we did not choose \{#emails-options\}

| Option | Why not chosen |
| --- | --- |
| Remove the copy link and send only the email | The email can go to spam, so the owner needs a second way. |
| Send the decision email to staff too | Only an owner acts on the company application. |
| Send a short decision email with no team message | The owner must open the portal to learn what to fix. |
| Send the invitation in the language of the owner | The owner language says nothing about the invited person. |
| No notice to the old address | A person whose account someone else took gets no warning. |
| Send no email to a Google-only account | The person gets nothing and does not know why. |

## D18 — Email change closes old tokens (2026-11-08) \{#email-change-tokens\}

An email change closes every open token that went to the old address.

- The change closes every open email verification token of the account.
  - It also creates one new verification token for the new address.
- The change also closes every open password reset token of the account.
- A closed token answers like an expired token.
- The old address gets the notice of [D17 — Emails](/docs/30-49-domains/iam/iam-decisions/#emails) even when the person never verified that address.
  - The notice shows only the new address with most letters hidden.
- Structure: the email change flow in the spec `api-292`.

### Why \{#email-change-tokens-why\}

- A verification token that went to the old address must not verify the new address.
- A reset token that went to the old address must not work after the change.
  - A person who reads the old inbox could set a new password.
  - Such a token works for up to 1 hour.
- The system cannot tell a wrong address from a real address.
  - So the notice goes to the old address in every case.

### What changes with it \{#email-change-tokens-changes\}

- The change of the account email also closes the open password reset tokens of that account.
- The confirm check of the email verification treats a token that expires at exactly the current time as expired.
  - The password reset confirm already does this.
- A resend of the verification email waits for an email change that runs at the same moment.
  - It then reads the account again, so it cannot save a token for the old address.

### Options we did not choose \{#email-change-tokens-options\}

| Option | Why not chosen |
| --- | --- |
| Close only the verification tokens | A person who reads the old inbox could still reset the password for up to 1 hour. |
| Leave the reset tokens open until they expire | The same risk, and the person gets no warning. |
| Send the notice only to a verified old address | A person who signed up with the wrong address would never see that the address changed, and the system cannot tell the two cases apart. |

## D19 — Password reset rate limit (2026-11-09) \{#reset-rate-limit\}

A password reset request has two limits, and neither limit changes the answer for an email.

- IP limit: one IP address may send 30 reset requests in 1 hour.
  - The next request answers `429` with a `Retry-After` header.
  - The `429` says nothing about any email address.
- Address limit: one email address gets 1 reset email in 60 seconds and 3 in 1 hour.
  - A request over this limit sends no email.
  - It answers the same `200` message as every other request.
- The address limit counts every request, also a request for an email that has no account.
- One counter serves both kinds of email: the reset link and the Google sign-in notice.
- Every valid request does the same work: it queues one job and answers `200`.
  - The job looks up the account, writes the token and sends the email.
  - So the answer time does not show which emails have an account.
- A Redis failure never blocks a request, so the request goes through and the system reports the error to Sentry.
- The limits live in configuration.
- The Redis key of an address holds a keyed hash of the email, not the email.
- Out of scope: a CAPTCHA and a limit on any other endpoint.
- Structure: the spec `api-293`.

### Why \{#reset-rate-limit-why\}

- A script can ask for many emails for one address.
  - The owner of that inbox gets a flood of mail.
- The free Brevo plan sends 300 emails each day, and a script can use all of them.
  - Then no verification email and no invitation email goes out.
- A `429` for an address would show which addresses got a request.
  - An attacker could also block the reset of a victim.
  - So only the IP limit answers `429`.
- A shared network, for example hotel wifi or a mobile carrier, puts many people on one IP address.
  - So the IP limit is 30 and not 10.
- A reset email is not a payment, and the reset token already protects the account.
  - So a Redis failure must not stop people from getting back into their account.

### What changes with it \{#reset-rate-limit-changes\}

- The reset request queues a job, and the job does the lookup, the token and the event.
- The login rate limit code also counts the reset request path.
- The configuration file `config/identities_sessions.yml` holds the three new limits.

### Options we did not choose \{#reset-rate-limit-options\}

| Option | Why not chosen |
| --- | --- |
| A CAPTCHA after a few requests | It needs a web change and an outside vendor. |
| A `429` for the address limit | It shows which addresses got a request, and it lets an attacker block a victim. |
| 10 requests for each IP address in 1 hour | Many people share one IP address on hotel wifi and on mobile networks. |
| Send no email when Redis fails | Nobody can reset a password during the outage, and the page still says "we sent it". |
| Keep the lookup in the request and add only the limits | The answer time still shows which emails have an account. |

## Open questions \{#open-forks\}

These items are proposed, not agreed, and no page may treat them as rules.

| Question | Proposed default | Blocks |
| --- | --- | --- |
| What is the exact seat limit between the two permits? | Sources disagree. Confirm with MLIT or a 行政書士. | Provider company spec |
| Does Red Cab need registration under the Travel Agency Act? | Unclear for a marketplace. Ask a Japanese lawyer or a 行政書士. | Launch |
| What does expired insurance do? | Nothing for now. The team checks insurance by hand. The owner decides. | Acceptance |
| Does the owner accept a second application after a rejection? | Yes for now. The principal developer decided this, and the owner may change it. | Acceptance |
| Do confirmed bookings stay after a permit ends? | Yes for now. Operating without a permit may be a legal risk, so an expert must confirm it. | Launch |
| May a package sell a date after its permit ends? | No for now. The principal developer decided this, and the owner may change it. | Acceptance |
| Does the team get an email when an owner submits for review, and do owners get reminders 30 and 7 days before a permit ends? | Not now. [D17 — Emails](#emails) covers the other IAM emails. Not needed for launch. | None |
| Has the Product Owner signed off these rulings? | Not recorded. | Acceptance |
