---
title: Staff invitations and members
sidebar_label: Staff invitations and members
sidebar_position: 3
description: How an invited person accepts, how an owner manages members, and how staff see the registration pages and the dashboard in the web.
doc_type: use-case
normative: true
status: current
context: iam
last_reviewed: 2026-11-08
---

## TL;DR \{#staff-invitations-tldr\}

- An owner invites a person by email, and Red Cab emails the link to that person.
- The owner can also copy the link and send it by hand.
- The invited person opens `/account/staff-invitation`, signs in, and accepts.
- The accept page is an open route, outside every policy route.
- The page reads one preview and draws one state from `accept_state`.
- An owner manages members at `/providers/members`.
- The link shows once, in component state, and a reload clears it.
- Staff see the registration pages as read-only, and the dashboard shows no Members link.
- No entry rule reads a role.

## About this document

This page holds what stays true after the invitation work shipped in `red-cab-web`.

The rulings give the reasons, and the API side is in the model page.

| Topic | Document |
| --- | --- |
| Rulings | [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles), [Staff invitations](/docs/30-49-domains/iam/iam-decisions/#staff-invitations) and [Access codes](/docs/30-49-domains/iam/iam-decisions/#access-codes) |
| The API side | [Provider company and members model](/docs/30-49-domains/iam/models/provider-company-and-members) |
| What owners and staff do | [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members) |
| Entry rules and the access word | [Portal access and switch](/docs/30-49-domains/iam/use-cases/portal-access-and-switch) |
| The invitation email | [IAM emails and reset pages](/docs/30-49-domains/iam/use-cases/emails-and-reset-pages#invitation-email) |
| Work record | [Web spec web-193](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-193-invitations-and-members) and [Web spec web-214](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-214-reset-pages-and-invitation-texts) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| invitation link | The web address `/account/staff-invitation?token=…`. Red Cab emails it, and an owner may also copy it. |
| accept page | The page at that address. |
| accept state | One word from the API that says what the viewer can do: `guest`, `ready`, `email_mismatch`, `email_unverified`, `has_membership` or `company_suspended`. |
| link panel | The part of the members page that shows the link once. |
| owner-only part | A page part that only an owner may change. |
| read-only view | The same page with the values as text and no control. |

## User stories \{#user-stories\}

1. US-1: As an invited person, I want to accept with my own account, so I need no new email.
2. US-2: As an owner, I want to invite staff, so other people can manage the listings.
3. US-3: As an owner, I want to send a link again or cancel it, so an old link stops working.
4. US-4: As an owner, I want to change a role or remove a member, so a leaver loses access.
5. US-5: As staff, I want to keep working on the catalog and bookings, so my daily work goes on.

## Web contract \{#web-contract\}

### Routes \{#routes\}

| Page | Route | Loader | Policy route |
| --- | --- | --- | --- |
| Accept | `/account/staff-invitation` | `clientLoader` | None. It is in `marketplace.routes.js`. |
| Members | `/providers/members` | `clientLoader` | `provider-required-policy` |

- The accept route is not under `touristAccountRoutes`, so `tourist-required-policy` does not guard it.
- `postAuthPath` and `providerRequired` do not change.
- The entry rule opens every provider page for the word `active`, so the members page needs no new rule.
- A `redirect_to` to the accept page stays for the tourist portal and is dropped for the provider portal.

### The accept page \{#accept-page\}

The loader reads `token` from the search params.

- A missing token gives `unavailable`, and the loader makes no API call.
- A `404` gives `unavailable`.
- Another error gives `load_failed`.
- A success gives the preview.

The page uses a `clientLoader`, so the token stays out of the log of the web server.

- The page sets `noindex, nofollow` and `referrer: no-referrer`.
- The page shows the company name, the role and the invited email.

| State | The page shows |
| --- | --- |
| `guest` | A note, Sign in, Create an account and a note about chat-app browsers. |
| `ready` | The Accept button. |
| `email_mismatch` | The mismatch text, a sign-out note and Sign out. |
| `email_unverified` | The verify text and Send verification email again. |
| `has_membership` | The text that the person already belongs to a company. |
| `company_suspended` | The text that the company cannot take new members. |
| Any other word | The text `cannot_join`. An unknown word grants nothing. |
| `unavailable` | The dead-link text and no company name. |
| `load_failed` | The load-failed text. |

- Sign in goes to `/login?redirect_to=` with the full accept address, so the person returns to the page.
- Create an account goes to `/sign-up`.
  - The page never links to `/providers/sign-up`, because that sign-up creates a company.
- Sign out posts to `/logout`.
  - The link is lost, so the page tells the person to open it again.
- Send verification email again sends the email of the signed-in person.
- Accept sends the token, then revalidates the root loader, then moves to `/providers`.
  - The root loader must hold the word `active` before the entry rule runs.
- An error on Accept shows the API `title` in a toast, and the person stays on the page.
- A guest sees English, and the guest note points to the link in the invitation email.
- A signed-in person sees the saved language.
- The copy keys have the prefix `staff_invitation.` in `tourist-surface-copy.js`.

### The members page \{#members-page\}

The loader reads the company first.

- Staff get `{ isOwner: false }`, and the loader makes no member call.
- An owner gets the members and the pending invitations, read together.
- Every answer holds the company, because the page shows dates in the Service Timezone.

Staff see the note `Only an owner can manage members.` and nothing else.

An owner sees three cards.

| Card | Content |
| --- | --- |
| Invite a person | The fields `email` and `company_role`, with Staff first, and the link panel. |
| Invitations | One row for each pending invitation: email, role, sender, expiry, Send again and Cancel. An expired row shows `Expired`. |
| Members | One row for each member: name, email, role control, joined date and Remove. The own row shows `You`. |

The link panel follows these rules.

- It shows a read-only field, a Copy link button and the note `Red Cab sent this link by email. It works for 7 days. You can also copy it now, because Red Cab does not show it again.`
- The link panel stays English, because the provider portal has no Japanese copy yet.
- It lives in component state only.
  - The link never goes into storage.
- A new create or send again replaces the link.
- A reload, a move to another page and a Cancel clear it.
- A clipboard failure shows the toast `Select the link and copy it.`

Each action asks for a confirmation or not, as this table says.

| Action | Confirmation text |
| --- | --- |
| Remove another member | This person will lose access to the provider portal. |
| Remove the own row | You will lose access to the provider portal. |
| Change the own role to Staff | You will no longer manage the company. |
| Change another role | None |

- After the own removal, the page shows a toast and revalidates.
  - The entry rule then moves the person to the company create page.
- An API error shows a toast, and the list stays as it was.
- A refusal of the last owner shows the API title in the toast.

### Staff read-only views \{#staff-views\}

`ProvidersCompanyService.canManageCompany` is true only when `company_role` is `owner`.

- A missing or unknown role grants nothing.

| Page | Staff see |
| --- | --- |
| `/providers/registration/edit` | The business name and the phone as text. |
| `/providers/registration/licenses` | The records as text, with no add or edit control. |
| `/providers/registration/documents` | The status and the missing list, with no Submit. |
| `/providers` | The status summary, and no Members link. |

- Each registration page shows the note `Only an owner can change this.` above the read-only part.
- The licenses page shows the suspended note only for a suspended company.
- The catalog, bookings and reviews pages do not change.
- The web hides the controls, and it never reads the code `provider_owner_required`.
  - The API refuses staff on its own.

### Dashboard \{#dashboard\}

The dashboard shows the Members link only for the word `active` and an owner.

## Worked example \{#worked-example\}

Kenji is an owner of Kanto Charter, and he invites Mika.

1. Kenji opens `/providers/members` and enters `mika@example.com` with the role Staff.
2. The link panel shows the link once, and Kenji copies it.
3. Red Cab emails the link to Mika, and Kenji may also copy it and send it by chat.
4. Mika opens the link as a guest, and the page shows the company, the role and her email.
5. Mika picks Sign in and signs in with `mika@example.com`.
6. The page opens again in the state `ready`, and Mika picks Accept.
7. The page revalidates and moves Mika to `/providers`.
8. Mika opens the registration pages and sees the note `Only an owner can change this.`
9. Mika sees no Members link, and the members page shows the owner-only note.
10. Later, Kenji removes Mika after a confirmation, and Mika loses the provider portal on her next request.

## Open items \{#open-items\}

- A chat app may open the link in its own browser, and nobody tested this.
  - The page shows a note about it.
- A Japanese speaker must check every new `ja` text of the accept page.
- A staff member whose owners all left cannot leave, and the team fixes this by hand.
- The invitation email can go to spam, so the owner keeps the copy link.
