---
title: Cancellation policy with presets and custom tiers
sidebar_label: Cancellation policy
sidebar_position: 5
description: How a provider sets the refund rules for a listing, and what refund a tourist gets on cancellation.
normative: true
status: accepted
context: catalog
last_reviewed: 2026-10-29
supersedes:
  - FR-CAT-018 (up to four tiers per listing)
  - PRC-7 (Platform Default Cancellation Policy)
  - Glossary entry "Cancellation Policy"
---

## TL;DR

- Each listing has one cancellation policy, and it applies to all packages of the listing.
- A provider picks a preset (Flexible, Moderate or Strict) or writes a custom policy.
- Flexible is the default: a full refund until 24 hours before the service start.
- A custom policy has 1 to 4 tiers and must end with a tier at 0 hours.
- The refund never rises as the service start gets closer.
- A non-refundable policy is not allowed.
- A change applies to new checkouts only, and existing bookings keep their policy.

## About this document

This record is the only source for cancellation policy rules in Catalog.

| Topic | Document |
| --- | --- |
| Implementation issue | [red-cab-api#168](https://github.com/markmamba/red-cab-api/issues/168) |
| Status | Accepted on 2026-10-29 so that development can start, and open to later change |

---

## Context

A tourist who books a service needs to know what refund they get if they cancel.

The words below have one meaning on this page.

| Word | Meaning |
| --- | --- |
| Cancellation policy | The refund rules of one listing, for cancellations by the tourist. |
| Tier | One rule of a policy: a number of hours and a refund percent. |
| Preset | A ready-made policy that the provider picks by name. |
| Custom policy | A policy whose tiers the provider writes. |
| Service start | The date and time when the booked service begins. |
| Notice | The number of hours between the cancellation and the service start. |

Providers need a simple choice, and tourists need policies that they can compare.
- Most providers want a standard rule and do not want to design one.
- Some providers have real costs, for example a reserved driver, and need stricter rules.

Travel marketplaces solve this in a similar way.
- Viator sells most tours with one standard rule: a full refund until 24 hours before the start.
- Viator also allows a custom policy for some products.
- Airbnb lets a host pick from a short list of fixed policies.
- All of them give the same or a smaller refund as the start gets closer.

The decision is made now so that it does not block development.

## Decision

A listing has one cancellation policy, which is a preset or a custom policy.

### Rules

| # | Rule | Applies to | Example |
| --- | --- | --- | --- |
| 1 | One policy applies to all packages of a listing. | always | A sedan package and a van package of one tour have the same policy. |
| 2 | The provider picks Flexible, Moderate, Strict or Custom. | always | A provider picks Moderate for a full-day tour. |
| 3 | A new listing starts with Flexible. | always | A provider who never opens the setting sells with Flexible. |
| 4 | A tier applies when the notice is equal to or more than the tier hours. | always | A cancellation exactly 24 hours before the start gets the 24-hour tier. |
| 5 | A policy is never non-refundable. | always | A custom policy with 0 percent in every tier is refused. |
| 6 | The refund percent applies to the total that the tourist paid. | always | 50 percent of ¥20,000 is ¥10,000. |
| 7 | A provider may change the policy at any time, also on a published listing. | always | The change applies from the next checkout. |
| 8 | Before payment, the tourist sees the policy name and each tier in plain words. | always | "Moderate. Full refund if you cancel 72 hours or more before the start." |

A booking keeps the policy that the tourist saw at checkout.
- A later change by the provider does not change the refund of that booking.

### Presets

Each preset has a fixed set of tiers.

| Preset | Notice | Refund |
| --- | --- | --- |
| Flexible (default) | 24 hours or more | 100% |
| Flexible (default) | Under 24 hours | 0% |
| Moderate | 72 hours or more | 100% |
| Moderate | 24 hours or more | 50% |
| Moderate | Under 24 hours | 0% |
| Strict | 168 hours (7 days) or more | 100% |
| Strict | 72 hours or more | 50% |
| Strict | Under 72 hours | 0% |

### Custom policy rules

A custom policy must pass every check below, or the provider cannot save it.

| # | Check | Example of a refused policy |
| --- | --- | --- |
| 1 | It has 1 to 4 tiers, and the 0-hour tier counts toward the 4. | Five tiers. |
| 2 | One tier has 0 hours, so every cancellation matches a tier. | Tiers at 48 hours and 24 hours only. |
| 3 | No two tiers have the same hours. | Two tiers at 24 hours. |
| 4 | Each refund percent is a whole number from 0 to 100. | A tier with 12.5 percent. |
| 5 | The refund percent never rises as the hours fall. | 50 percent at 72 hours and 100 percent at 24 hours. |
| 6 | At least one tier refunds more than 0 percent. | 0 percent in every tier. |

The 0-hour tier may refund more than 0 percent.
- For example, a provider may give 20 percent at 0 hours.
  - The tier above it must then give 20 percent or more.

The provider cannot pick Custom without tiers.
- The save is refused until the custom policy has at least the 0-hour tier.

### Worked example

Aiko books a full-day tour that uses the Moderate preset.

1. Aiko pays ¥20,000 at checkout.
2. The booking keeps the Moderate tiers that Aiko saw before payment.
3. The tour starts on 12 May at 09:00.
4. Aiko cancels on 11 May at 03:00, which is 30 hours of notice.
5. The 72-hour tier does not match, because 30 hours is less than 72 hours.
6. The 24-hour tier matches, because 30 hours is 24 hours or more.
7. Aiko gets 50 percent of ¥20,000, which is ¥10,000.
8. If Aiko cancels on 9 May at 08:00 instead, the notice is 73 hours, and the refund is ¥20,000.

## Consequences

The tourist gets a clear rule, and the provider gets a short choice.
- The Flexible default matches what foreign tourists expect from other tour sites.
- Three presets let tourists compare listings by name.
- The custom policy covers providers with special costs.

The validation is strict, so every saved policy gives a refund for every cancellation time.
- The refund rules need no hidden fallback when no tier matches.

Notice is a count of hours between two moments.
- The result does not depend on a time zone.

Checkout copies the tiers into the booking.
- The table `bookings_cancellation_tier_snapshots` holds this copy.
- The implementation spec for red-cab-api#168 sets the Catalog columns for presets and custom tiers.

This record does not decide these points:
- The refund when the provider or the platform cancels.
- A free cancellation period just after booking.
- Cancellation because of weather or too few travelers.
- A no-show by the tourist.
- Rounding of a refund that is not a whole yen.
- How and when the money returns to the tourist.

## Alternatives considered

| Option | Why not chosen |
| --- | --- |
| Custom tiers only, with no presets | Every provider must design a policy, and tourists cannot compare listings by name. |
| Presets only, with no custom policy | Providers with special costs cannot express their rules. |
| No 0-hour tier, and no match gives 0 percent | The tourist does not see the last window, and the refund rule is hidden. |
| Only the basic checks on a custom policy | It allows illogical policies, for example a larger refund closer to the start. |
| Default of 72 hours for 100 percent and 24 hours for 50 percent | It is stricter than the 24-hour rule that tour sites use. It stays available as Moderate. |
| Calendar days, as in the Japanese standard travel terms | Days depend on a time zone and fit short services badly. |
| A non-refundable option | It lowers trust in the marketplace for tourists. |

References for the market comparison:
- [Viator: cancellation policies for partners](https://partnerresources.viator.com/travel-commerce/merchant/cancellation-policies/)
- [Airbnb: cancellation policies](https://www.airbnb.com/terms/cancellation_policies_en)
- [Osaka Info: travel terms with the domestic cancellation fee table](https://osaka-info.jp/experience/ja/page/travel-terms-planning)
