---
title: Provider company members
sidebar_label: Provider company members
sidebar_position: 3
description: What an owner and a staff member of a provider company do and see.
doc_type: requirement
normative: true
status: current
context: iam
last_reviewed: 2026-10-31
---

## TL;DR \{#members-tldr\}

- A provider company has members, and each member is Owner or Staff.
- An owner invites staff by email.
- Staff run the daily work of the catalog, the bookings and the reviews.
- Only an owner manages the company, the payout account and the members.
- One person belongs to one company.

## About this document

This page describes what the owner and the staff do and see, without screens, APIs or algorithms.

| Topic | Document |
| --- | --- |
| Rulings | [Provider company](/docs/30-49-domains/iam/iam-decisions/#provider-company), [Company roles](/docs/30-49-domains/iam/iam-decisions/#company-roles), [Staff invitations](/docs/30-49-domains/iam/iam-decisions/#staff-invitations) |
| Use cases | UC-10 to UC-18 in [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| member | A person with a membership in the company. |
| Owner | A company role. An owner can do everything in the company. |
| Staff | A company role for the daily work. |
| invitation | An email with a link that adds a person to the company. |

## User stories \{#user-stories\}

1. US-1: As an owner, I want to invite staff, so other people can manage the listings.
2. US-2: As staff, I want to manage the catalog and the bookings, so I can do the daily work.
3. US-3: As an owner, I want sole control of the payout account and the members, so the business is safe.
4. US-4: As an owner, I want to remove a staff member, so a person who leaves loses access.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| An owner invites a person by email with a company role. | US-1 | Kenji invites mika@example.com as Staff. |
| An invitation is valid for 7 days, and the owner can send it again. | US-1 | Mika opens the link on day 8 and sees that it expired. |
| A new send replaces the old link. | US-1 | Kenji sends the invitation again, and the first link stops working. |
| A person with an account signs in to accept. A person without an account signs up first. | US-1 | Mika has a tourist account, so she signs in and accepts. |
| A person who already has a membership cannot accept. | US-1 | Mika cannot join a second company. |
| The email of the signed-in person must match the invited email. | US-1 | A person who signs in with another email cannot accept the invitation for mika@example.com. |
| A tourist who accepts keeps the tourist profile. | US-1 | Mika can still book tours. |
| Staff create and edit listings, packages, assets, schedules and closures. | US-2 | Mika adds a package to a Tokyo tour. |
| Staff view bookings, mark a booking delivered and answer reviews. | US-2 | Mika marks a booking delivered. |
| Tourists see the company name, not the member. | US-2 | Mika's review answer shows "Kanto Charter". |
| A listing status change, a delivered booking, a review answer and a review report keep the member who did the action. | US-2 | The owner sees that Mika marked a booking delivered. |
| An invitation keeps the owner who sent it. | US-1 | The invitation for mika@example.com shows that Kenji sent it. |
| A change that the system makes names no member. | US-2 | The system completes a booking on its own, and no member is named. |
| Only an owner changes the company details, the documents, the payout account and the members. | US-3 | Mika cannot open the payout settings. |
| Staff see the price and the payout amount of each booking, and they do not see the payout account. | US-2, US-3 | Mika sees "¥20,000, payout ¥18,000" on a booking and no bank details. |
| The approval status of the company applies to every member. | US-3 | No member of a suspended company can publish. |
| A change of role or a removal applies at once. | US-4 | Kenji makes Mika an owner, and she can open the payout settings. |
| A removed member loses access to the provider portal on the next action. | US-4 | Kenji removes Mika, and her next click in the provider portal fails. |
| A company always has at least one owner. The last owner cannot leave. | US-4 | Kenji must make another owner before he leaves. |
| The listings and the bookings stay with the company when a member leaves. | US-4 | Mika leaves, and her packages stay. |

## Worked example \{#worked-example\}

Kenji runs Kanto Charter and adds Mika as staff.

1. Kenji signs up on "List your service", and the team approves Kanto Charter.
2. Kenji invites mika@example.com as Staff.
3. Mika already has a tourist account, so she signs in and accepts within 7 days.
4. Mika picks "Switch to provider" and adds a package to a Kanto Charter tour.
5. Mika tries to open the payout settings, and the system refuses because she is Staff.
6. Mika leaves the job, and Kenji removes her.
7. Mika's next click in the provider portal fails, and she still has the tourist portal.
8. The package that Mika added stays with Kanto Charter.

## Related requirements

- [Sign-up, sign-in and portals](/docs/30-49-domains/iam/requirements/sign-up-sign-in-and-portals)
