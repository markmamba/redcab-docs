---
title: Staying a platform only
sidebar_position: 1
description: Note for the owner meeting of 14 November 2026, with nine questions about cancellation, payment, fees and the Travel Agency Act.
---

## TL;DR

- Red Cab wants to be a platform only, and it needs no travel agency registration.
- We found no official source that says "taking payment through the platform means a licence".
- The sources say that what Red Cab does matters more than the money flow.
- Two decisions of the team point toward registration: a platform-set cancellation policy, and a share of the late-cancel fee.
- We ask the owner nine questions, and each has an example.

## About this document

This page is a non-normative meeting note.

- It is research, not legal advice.
- A Japanese lawyer or an administrative scrivener (行政書士) must confirm every legal point.

| Topic | Document |
| --- | --- |
| Meeting history | [Owner meetings](./index.md) |
| Glossary | [Glossary](/docs/70-79-business/business-rules/glossary) |
| Open questions | [Open questions](/docs/70-79-business/planning/open-questions) |

## Purpose of this meeting

This note is for the meeting on 14 November 2026 about the "platform only" position of Red Cab.

- We need the owner to answer 9 questions.
- Each question has an example, so the owner can see what changes for a tourist and for a provider.
- This note is research, not legal advice.
- A Japanese lawyer or an administrative scrivener (行政書士) must confirm every legal point.

## Words used in this note

| Word | Meaning |
| --- | --- |
| platform only | Red Cab provides software, and the provider sells the service. Red Cab needs no travel agency registration. |
| travel agency registration | The registration of 旅行業 (travel business) under the Travel Agency Act. People call it the "Travel Agency licence". |
| provider | A road transport company that lists services on Red Cab and holds a transport permit. |
| contract party | The company that the tourist makes the transport contract with. |
| merchant of record | The company that the card statement of the tourist shows as the seller. |
| commission | The money that Red Cab keeps from each booking. |
| cancellation terms | The rules that say how much money a tourist gets back when the tourist cancels. |
| 運送約款 (conditions of carriage) | The terms of a transport company. The Ministry of Land, Infrastructure, Transport and Tourism (MLIT) approves them. They include the cancellation fee. |
| no-action letter | A written question to the tourism agency about a planned business. The agency answers in writing. |

## Why we need this meeting

The owner said in the last meeting that Red Cab is a "SaaS platform only".

- The owner said this needs no travel agency registration.
- The owner also asked for payment, cancel and refund before launch.
- The owner wants to review how Red Cab can earn from cancellations.
  - The example was a free cancel 5 days before the service, and 14 days for a tour.
- The owner prefers the strict cancellation preset.

While we designed this, the principal engineer found a conflict between two wishes.

- Wish 1: stay a platform only.
- Wish 2: Red Cab sets the cancellation terms and earns from a late cancel.
- The sources we found say that wish 2 points toward travel agency registration.

## What we found

### Short answer

- We found no official source that says "taking payment through the platform means a licence".
  - The sentence the principal engineer read is not confirmed as written.
- The law looks at what Red Cab does, not only at the money.
  - The Travel Agency Act, Article 2(1), covers a business that acts for pay on a transport contract.
  - The acts are agent (代理), mediator (媒介) and intermediary (取次ぎ).
  - Transport alone counts, so a taxi ride or a private car transfer is enough.
- We could not confirm that "platform only" needs no registration.
  - The answer may be true for a careful design.
  - Only a lawyer can say if it is true for today's design.

### Three official sources that matter

1. **The tourism agency answered a question about a taxi link on 30 April 2024.**
   - A pet care company linked to a taxi company's own booking website and got a fee for each booking.
   - The agency said that needs no registration.
   - The agency also said that giving information about one specific taxi company is 媒介 and needs registration.
2. **The official guide 旅行業法施行要領 gives one safe path for websites.**
   - The website must not actively work on the deal between the tourist and the provider.
   - The website must show clearly that the contract is with the provider.
   - It must show this at the latest when the tourist sends the booking form.
3. **The same guide limits who may collect travel money.**
   - The collector must be like a bank.
   - The collector may take only a fixed fee for each payment.
   - The collector may not take part in cancellations or refunds.

### Other laws that add risk

- The Road Transportation Act makes each provider file or get approval for its fares and its 運送約款.
  - A cancellation policy that Red Cab sets may differ from the approved terms of the provider.
- A cancellation fee is void above the average loss of the business, under the Consumer Contract Act, Article 9.
  - A share for Red Cab is not a loss of the provider.
- The Payment Services Act changed in 2025 for cross-border payment collection.
  - This matters most when Red Cab holds money for providers and a tourist pays from abroad.

### What other companies did

- GO, the taxi app, holds a travel agency registration (東京都知事登録旅行業第3-6444号).
  - GO is a transport-only app, and it registered anyway.
  - We do not know why.
- We could not confirm the registration of Klook, KKday, Viator, GetYourGuide, Airbnb Experiences, Booking.com taxis and Uber Japan.

## Decisions that may conflict with "platform only"

| Decision made in the team | Risk | Why |
| --- | --- | --- |
| Red Cab sets one cancellation policy for each service type | High | The provider's own terms hold the cancellation fee, and Red Cab would write them. |
| Red Cab keeps a share of the late-cancel fee | High | The guide keeps cancellation money between the seller and the tourist. |
| Red Cab charges the tourist on its own account and pays the provider later | High | Red Cab then looks like the seller. |
| Red Cab takes a percentage commission | Medium | The fee alone did not change the 2024 answer, but a fixed fee is closer to the guide. |
| The system confirms a booking after a 15-minute vehicle hold | Medium | Concluding the contract for the provider is 代理. |
| The team approves providers on documents | Low to medium | Approval is fine. Advice about one provider to a tourist is not. |

## Questions for the owner

### 1. Which matters more: "platform only", or earning from cancellations?

We need the owner to rank two wishes that today's design cannot meet together.

**Example, a tour for 60,000 yen with a commission of 15% (assumption):**
1. Emma books a tour with Sakura Kotsu for 60,000 yen.
2. Emma cancels 10 days before the tour.
3. The free window is 14 days, so she loses 50%.
4. The kept fee is 30,000 yen.
5. Red Cab keeps 15% of the kept fee, which is 4,500 yen.

This 4,500 yen is the money that the sources mark as high risk.

- Answer A: "Platform only comes first."
  - Red Cab gives up the 4,500 yen.
  - The provider keeps the whole fee.
- Answer B: "Earning comes first." Red Cab may need a travel agency registration.
- Answer C: "We decide after the lawyer answers." We pause the work on cancellations.

### 2. Who writes the cancellation terms?

Today the team planned one policy for each service type, and the provider cannot change it.

**Example, a transfer for 20,000 yen:**
1. Sakura Kotsu runs a hire-car business, and its approved 運送約款 has its own cancellation fees.
2. Red Cab shows a free cancel until 5 days before the ride.
3. The approved terms of Sakura Kotsu say something else.
4. Emma cancels, and nobody knows which rule binds her.

- Answer A: the provider chooses from templates that Red Cab offers, such as flexible, standard or strict.
- Answer B: the provider writes its own terms, and Red Cab only shows them.
- Answer C: Red Cab sets the terms, and we accept the risk and ask the lawyer.

The owner's example (5 days, and 14 days for a tour) can still be a template or a default.

### 3. Who is the seller on the tourist's card statement?

We have three ways to take the card payment.

| Way | What the tourist sees | Risk |
| --- | --- | --- |
| A: the provider takes the payment on its own Stripe account | The provider's name | Low |
| B: Red Cab starts the payment and Stripe shows the provider as the seller | The provider's name | Medium or unknown |
| C: Red Cab takes the payment and pays the provider later | Red Cab's name | High |

**Example, a tour for 60,000 yen:**
1. Emma pays with an Australian card.
2. With way A, the statement shows "Sakura Kotsu" and the money goes to Sakura Kotsu.
3. With way C, the statement shows "Red Cab".
4. Red Cab holds the money until the tour ends and then pays Sakura Kotsu.

- Way A needs each provider to have a full Stripe account.
- Red Cab then controls refunds less.

- Answer A: way A.
  - It is the safest.
- Answer B: way B, if the lawyer agrees.
- Answer C: way C, and the owner accepts the high risk and the extra Payment Services Act questions.

### 4. How should Red Cab earn?

The owner needs income, and the way of earning changes the risk.

| Way of earning | Risk |
| --- | --- |
| A percentage commission on each booking | Medium |
| A fixed fee for each booking | Medium, maybe lower |
| A monthly subscription or listing fee | Lower |
| A share of the cancellation fee | High |

**Example, a provider with 20 bookings of 20,000 yen in one month:**
1. A commission of 15% gives Red Cab 60,000 yen.
2. A fixed fee of 2,000 yen for each booking gives 40,000 yen.
3. A subscription of 30,000 yen gives 30,000 yen, even with 2 bookings.
4. The numbers are examples, not a proposal.

- Answer A: keep the percentage commission, and accept the medium risk.
- Answer B: choose a fixed fee or a subscription for lower risk.

### 5. Who confirms a booking?

Today the system holds a vehicle for 15 minutes and confirms the booking after payment.

**Example:**
1. Emma pays at 10:00 for a transfer on the next day.
2. The system confirms the booking at once.
3. The provider sees a confirmed booking that it did not accept.

- Answer A: the provider accepts each booking, or turns on an "accept at once" switch in its own account.
  - This is safer, because the provider concludes the contract.
  - A tourist may wait for a provider who is slow to answer.
- Answer B: the system keeps confirming at once, and we ask the lawyer if that is 代理.

### 6. May Red Cab recommend providers, sell bundles or sell to travel agencies?

The 2024 answer treated advice about one specific company as 媒介.

**Example:**
1. A tourist writes to support and asks "Which transfer is best?".
2. A staff member answers "Take Sakura Kotsu".
3. The agency's 2024 answer treats this kind of advice as 媒介 for pay.

- Answer A: no personal advice and no "Red Cab pick".
  - Search ranks by visible rules such as price or rating.
  - We also sell no bundles and no extra items.
- Answer B: yes, because the owner wants a concierge or bundle service.
  - Then the owner should expect travel agency registration.

### 7. What words may the screens use?

The guide asks for a clear display of the contract party before the booking form is sent.

**Example:**
- Safe words: "Book with Sakura Kotsu", "Sakura Kotsu confirms your booking", "You pay Sakura Kotsu".
- Risky words: "Red Cab arranges your trip", "Your Red Cab ride", "Red Cab guarantees your transfer".

- Answer A: the owner accepts the safe words, and the Red Cab brand is weaker on each screen.
- Answer B: the owner wants a stronger brand, and we ask the lawyer for a limit.

### 8. If a lawyer says "register", what do we do?

Registration may be needed for some answers above.

- The options we found are a third class registration or an area-limited registration.
- A second option is to act as an agent of one registered travel agency (旅行業者代理業).
- A 2017 table showed a deposit of 3,000,000 yen for the third class, and the same amount in assets.
  - These figures are old.
  - The lawyer must confirm them.
- Each registration also needs a certified travel business manager (旅行業務取扱管理者).

**Example:**
1. The lawyer says that a platform-set cancellation policy needs registration.
2. The owner can register, change the design, or delay the feature.

- Answer A: we change the design, and the feature waits or stays out.
- Answer B: we plan registration, and the owner names who pays and who becomes the manager.

### 9. May we engage a lawyer now, and may we pause some work?

We need a person who knows both the Travel Agency Act and the Road Transportation Act.

- We want the lawyer to read this note and 20 questions that we prepared.
- We want the lawyer to say if we should send a no-action letter to the tourism agency, as in 2024.
- We suggest to pause these decisions until the answer:
  - the platform-set cancellation policy;
  - the share of the late-cancel fee;
  - payment way C, and way B with a percentage fee;
  - bundles, a Red Cab-branded trip, and sales to travel agencies.
- The work on provider approval and the 15-minute vehicle hold can go on.

**Example of the cost of waiting:**
1. The payment redesign cannot choose the payment way until the lawyer answers.
2. Launch cannot happen before the payment redesign.
3. So the lawyer's answer is on the path to launch.

- Answer A: yes, engage a lawyer this week, and name the person who gives the facts.
- Answer B: no, because the owner accepts the risk and wants to continue.
- We also ask for the expected launch date, so we know how long we can wait.

## A recommended target, for discussion

The research recommends one rule set, which we call "marketplace with the provider as seller".

- The provider sets the price and the cancellation terms, from a template or its own text.
- The provider keeps all cancellation fees.
- The tourist pays the provider (way A above).
- The provider confirms bookings, or turns on "accept at once".
- Red Cab earns a fixed fee for each booking, or a subscription.
- The screens say "Book with `{provider}`".
- Red Cab sells no bundles and gives no advice about one provider.

This target gives up the owner's wish to earn from cancellations.

- A fallback is a directory that links to the provider's own booking page.
- The third rule set keeps today's decisions, and the sources point toward registration for it.

## What we could not verify

- We did not read the full current text of the guide 旅行業法施行要領.
- We found no official example of "active work on the deal" for an on-site checkout.
- We could not confirm the registration of most other platforms.
- We do not know why GO registered.
- The deposit figures for registration come from 2017.
- We did not confirm the exact text of the Payment Services Act changes.

## Next steps after the meeting

- [ ] The owner answers the 9 questions, or names who decides.
- [ ] We send the questions to a lawyer or a 行政書士.
- [ ] We write decision entries for the cancellation policy, the fee model and the payment way.
- [ ] We update the owner brief and the open work.

## Sources

The sources below are official unless the table says otherwise.

| What | Source |
| --- | --- |
| Travel Agency Act, Articles 2, 3, 23 and 74 | [e-Gov, 旅行業法](https://laws.e-gov.go.jp/law/327AC0100000239) |
| Interpretation guide 旅行業法施行要領, comparison table of the 2019 amendment | [Fukuoka Prefecture copy of the guide](https://www.pref.fukuoka.lg.jp/uploaded/attachment/57628.pdf) |
| Question of 9 April 2024 about a pet taxi link | [Tourism agency, question](https://www.mlit.go.jp/appli/content/001742195.pdf) |
| Answer of 30 April 2024 about a pet taxi link | [Tourism agency, answer](https://www.mlit.go.jp/appli/content/001742196.pdf) |
| Road Transportation Act, Articles 9-2, 9-3 and 11 | [e-Gov, 道路運送法](https://laws.e-gov.go.jp/law/326AC0000000183) |
| Consumer Contract Act, Article 9 | [e-Gov, 消費者契約法](https://laws.e-gov.go.jp/law/412AC0000000061) |
| Guideline for online travel websites | [Tourism agency, summary of the guideline](https://www.mlit.go.jp/kankocho/content/810000471.pdf) |
| Stripe Connect charge types (vendor documentation) | [Stripe, Connect charges](https://docs.stripe.com/connect/charges) |
| GO travel business notice (company notice) | [GO, travel business information](https://go.goinc.jp/travel-info) |
