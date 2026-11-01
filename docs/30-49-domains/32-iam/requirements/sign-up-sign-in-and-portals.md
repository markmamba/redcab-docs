---
title: Sign-up, sign-in and portals
sidebar_label: Sign-up, sign-in and portals
sidebar_position: 2
description: What a guest and a signed-in person do to sign up, sign in and switch between the tourist portal and the provider portal.
doc_type: requirement
normative: true
status: current
context: iam
last_reviewed: 2026-10-31
---

## TL;DR \{#sign-in-tldr\}

- A guest signs up as a tourist or as a provider, with email or Google.
- One person uses one email for the tourist portal and the provider portal.
- A tourist can start a provider company without a new email.
- A provider gets a tourist profile at the first booking.
- A person switches portals without a new sign-in.

## About this document

This page describes what the person does and sees, without screens, APIs or algorithms.

| Topic | Document |
| --- | --- |
| Rulings | [Person account](/docs/30-49-domains/iam/iam-decisions/#person-account), [Tourist profile](/docs/30-49-domains/iam/iam-decisions/#tourist-profile), [Portal access and switching](/docs/30-49-domains/iam/iam-decisions/#portal-access) |
| Sessions | [Server-side sessions](/docs/30-49-domains/iam/iam-decisions/#server-side-sessions) |
| Use cases | UC-01 to UC-09 and UC-20 to UC-22 in [redcab-docs#155](https://github.com/markmamba/redcab-docs/issues/155) |

---

## Words used in this doc \{#words\}

| Word | Meaning |
| --- | --- |
| guest | A person who is not signed in. |
| person | A signed-in account. |
| tourist login | The sign-in page of the tourist portal. |
| provider login | The sign-in page of the provider portal. |
| switch | The control that changes the active portal. |

## User stories \{#user-stories\}

1. US-1: As a guest, I want to sign up as a tourist, so I can book a tour.
2. US-2: As a guest, I want to sign up to list a service, so I can sell tours.
3. US-3: As a tourist, I want to start a provider company with my account, so I need no second email.
4. US-4: As a provider, I want to book a tour with my account, so I need no second email.
5. US-5: As a person, I want to switch portals, so I do not sign in twice.
6. US-6: As a person, I want to stay signed in while I use the site, so I sign in less.
7. US-7: As a person, I want to sign out on all devices, so a lost device cannot reach my account.

## Rules \{#rules\}

| Rule | Applies to | Example |
| --- | --- | --- |
| Tourist sign-up creates the person and a tourist profile, and sends a verification email. | US-1 | Aiko signs up with email and gets a verification email. |
| Google sign-up from the tourist login creates the person, the Google link and a tourist profile. | US-1 | Aiko signs up with Google and can book at once. |
| Provider sign-up creates the person, a company with the status pending and an owner membership. | US-2 | Kenji signs up on "List your service" and sees his pending company. |
| Provider sign-up does not create a tourist profile. | US-2 | Kenji has no tourist profile after sign-up. |
| Google sign-up from the provider login creates a provider company, not a tourist profile. | US-2 | Kenji signs up with Google on the provider login. |
| An email that has an account cannot sign up again. The person signs in instead. | US-1, US-2 | Aiko tries to sign up twice and sees a message to sign in. |
| A signed-in tourist can pick "List your service" and create a company. | US-3 | Aiko becomes the owner of a new company with the same email. |
| The first booking creates the tourist profile when it is missing. | US-4 | Kenji books a tour, and the system creates his tourist profile. |
| Checkout asks only for the data that it needs and that the person does not have. | US-4 | Checkout asks Kenji for the passenger phone, as it asks every tourist. |
| A member cannot book a listing of the own company. | US-4 | Kenji cannot book a Kanto Charter tour. |
| After sign-in, the system opens the portal of the login page that the person used. | US-5 | Kenji signs in on the provider login and lands in the provider portal. |
| The home page is always the tourist home. | US-5 | Kenji types the site address and picks "Switch to provider". |
| A person switches the active portal without a new sign-in. | US-5 | Aiko picks "Switch to traveling" and sees the tourist portal. |
| Any signed-in person may use the tourist portal, with or without a tourist profile. | US-4, US-5 | Kenji has no tourist profile and opens checkout. |
| The switch shows only the portals that the person can use. | US-5 | A tourist with no company sees no switch to the provider portal. |
| Google links to an existing person only when Google says the email is verified. | US-1, US-2 | Kenji signs in with Google on his email account, and Google is linked. |
| A locked or archived person can use no portal. | US-5 | Mika is locked and cannot open either portal. |
| A guest sees the language of the browser, and can change it with the language switch. | US-1 | A guest with a Japanese browser sees Japanese. |
| A signed-in person sees the saved language, and the switch changes it. | US-5 | Aiko picks Japanese, and her emails use Japanese too. |
| A person stays signed in while they use the site. After a long break, the person signs in again. | US-6 | Aiko is away for a month and sees the login page. |
| A person whose session ended sees the login page and returns to the same page after sign-in. | US-6 | Aiko opens her bookings after a break, signs in and lands on her bookings. |
| Sign out ends the session on this device. | US-7 | Aiko signs out on her laptop and stays signed in on her phone. |
| Sign out everywhere ends all sessions of the person. | US-7 | Aiko loses her phone, signs out everywhere, and the phone is signed out on its next request. |
| A password reset ends all sessions of the person. | US-7 | Aiko resets her password and is signed out on every device. |
| There is no corporate sign-up. | US-1, US-2 | The corporate sign-up page does not exist. |

## Worked example \{#worked-example\}

Aiko is a tourist who starts a business.

1. Aiko signs up on the tourist login with Google.
2. The system creates Aiko, the Google link and her tourist profile.
3. Aiko books a tour in Kyoto.
4. Later, Aiko picks "List your service" and enters her company details.
5. The system creates her company with the status pending and her owner membership.
6. Aiko now sees a switch between the tourist portal and the provider portal.
7. She picks "Switch to provider" and sees her pending company.
8. She signs out and signs in on the tourist login, and the tourist portal opens.

## Related requirements

- [Provider company members](/docs/30-49-domains/iam/requirements/provider-company-members)
