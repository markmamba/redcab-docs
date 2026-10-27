---
title: "Return the current Terms of Use version from a public endpoint"
sidebar_label: API · Terms of Use version
issue: "https://github.com/markmamba/red-cab-api/issues/246"
repos:
  - red-cab-api
status: implemented
phase: 2
context: PAY
related:
  - "docs/70-79-business/71-business-rules/invariants.md#pay-17"
  - "docs/70-79-business/72-requirements/functional-requirements/pay.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/pay/api-71-payment-attempt-checkout.md"
  - "docs/60-69-initiatives/61-2026/implementation-specs/cat/web-157-provider-coverage-and-checkout-booking-location.md"
---

## TL;DR

- Ships `GET /marketplace/bookings/terms_of_use`, a public read-only route.
- The route returns the current terms version and the link to the web `/terms` page.
- The version comes from the service that checkout create already uses, so the two cannot differ.
- A blank setting gives a 500 error with a clear message.
- Does NOT ship the web checkbox, the `/terms` page, the terms text, old versions or a database change.
- Breaking change: No. The route is new.

## Problem

Checkout create needs `terms_version`, and it rejects any value that differs from the current version.

No API route returns the current version.

The web cannot send a correct value, so every checkout create answers 422.

A version kept in the web would drift from the API setting `RED_CAB_TERMS_OF_USE_VERSION`.

Evidence: `app/domains/bookings/checkout_sessions/tourists_create_validator.rb` (`terms_version_current?`), `app/domains/bookings/terms_of_use/current_version_fetch_service.rb`, `config/routes/marketplace_routes.rb` (no such route), issue #246.

## Words used in this spec

| Word | Meaning |
| --- | --- |
| current version | The value of `terms_of_use_version` in `config/red_cab.yml`, read by `Bookings::TermsOfUse::CurrentVersionFetchService`. |
| terms page | The public page `/terms` in the web app, built in red-cab-web#180. |
| web base URL | The value of `web_base_url` in `config/red_cab.yml`. |

## Governing docs

Read these before design, and do not invent behavior that contradicts them.

| ID | Document | Why |
| --- | --- | --- |
| PAY-17 | [Invariants](/docs/70-79-business/business-rules/invariants) | A checkout session records the accepted terms version before payment. |
| FR-PAY-012 | [Pay requirements](/docs/70-79-business/requirements/functional-requirements/pay) | Payment cannot proceed without acceptance. |
| Spec api-71 | [Payment attempt at checkout](./api-71-payment-attempt-checkout.md) | The terms gate at payment initiation. |
| Spec web-157 | [Coverage and booking location](../cat/web-157-provider-coverage-and-checkout-booking-location.md) | Decision 1 left the terms checkbox to red-cab-web#180. |
| Issue | [red-cab-web#180](https://github.com/markmamba/red-cab-web/issues/180) | The owner decided on 2026-10-26 that the web reads the version from an API endpoint. |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Owner ruling, 2026-10-26. A new API endpoint returns the current version and the link to the terms page.** | A version constant in the web. | The web cannot drift from `RED_CAB_TERMS_OF_USE_VERSION`. |
| 2 | **Owner ruling, 2026-10-26. A blank version or a blank web base URL gives a 500 error through `Errors::InternalServerError`, with a clear message.** | A new 503 error class. | A blank setting is a server setup fault, not a bad request. No new class is needed. |
| 3 | **Owner ruling, 2026-10-26. The route is `GET /marketplace/bookings/terms_of_use`.** | A path that ends in `/current`. | It follows `/{actor}/{domain}/{resource}`. Old versions are out of scope. |
| 4 | **Added point, please review. The route is open to guests. It uses `Marketplace::BaseController`.** | Login required. | The terms page is public, and the checkout step can read it before the tourist pays. |
| 5 | **Added point, please review. The manager reads the version through the existing `CurrentVersionFetchService`.** | A second reader of the setting. | One reader means checkout create and this route cannot differ. |
| 6 | **Added point, please review. The link is the web base URL without a trailing slash, plus `/terms`. A new service `Bookings::TermsOfUse::PageUrlService` builds it, and it holds the path `/terms` as a constant.** | A new setting for the whole link. | The API keeps no second address. The path pairs with red-cab-web#180, and the spec of that issue must use the same path. |
| 7 | **Added point, please review. The manager has no request and no validator, because the route takes no input. It returns `Bookings::TermsOfUse::MarketplaceShowDto`.** | A request and a validator without fields. | `Catalog::Regions::MarketplaceIndexManager` takes no input either. |
| 8 | **Added point, please review. The response is `{ terms_of_use: { version, url } }`. A serializer `Bookings::MarketplaceTermsOfUseSerializer` builds the inner object.** | A flat response. | A root key matches the other marketplace routes. |
| 9 | **Added point, please review. The 500 error keeps `skip_sentry` off, and it puts no setting value in the response.** | Skip Sentry. | A blank setting is a deploy fault, and the team must see it. |
| 10 | **Added point, please review. The route sends no cache header, and no request limit ships here.** | A cache header. | The response is small, and the repo has no rate limiter today (spec api-240, decision 14). |
| 11 | **Added point, please review. The route ignores unknown query parameters and changes no data.** | Reject unknown parameters. | It matches the other read routes. |

## API contract

| Method | Path | Auth | Request | Response | Notes |
| --- | --- | --- | --- | --- | --- |
| GET | `/marketplace/bookings/terms_of_use` | none | none | `terms_of_use`: `{ version, url }` | 500 when the version or the web base URL is blank. |

Response example:

```json
{ "terms_of_use": { "version": "2026-01-01", "url": "https://example.com/terms" } }
```

Error text:

- Blank setting: "Terms of Use are not available right now, so please try again later."

### Files to create or modify (API)

- `config/routes/marketplace_routes.rb`
- `app/controllers/marketplace/bookings/terms_of_use_controller.rb` (new)
- `app/domains/bookings/terms_of_use/marketplace_show_manager.rb` (new)
- `app/domains/bookings/terms_of_use/marketplace_show_dto.rb` (new)
- `app/domains/bookings/terms_of_use/page_url_service.rb` (new)
- `app/domains/bookings/marketplace_terms_of_use_serializer.rb` (new)
- `test/domains/bookings/terms_of_use/page_url_service_test.rb` (new)
- `test/domains/bookings/terms_of_use/marketplace_show_manager_test.rb` (new)
- `test/integration/marketplace/bookings/terms_of_use_integration_test.rb` (new)

## Data / domain touchpoints

- Bounded context: BKG owns the terms version and the checkout session.
- Transaction boundaries: none, because the route only reads settings.
- Snapshots: none.
- Query change: none, because the route runs no database query.

## Out of scope

- The web checkbox and the `/terms` page (red-cab-web#180).
- The terms text, in English or in Japanese.
- Old versions, and any storage of terms in the database.
- Changes to how checkout create records the acceptance.
- Corporate checkout.
- A request limit for public routes.

## Tasks

### API

- [x] Add the route, the controller and the serializer.
- [x] Add the DTO, the manager and the page URL service.
- [x] Add the tests.

### Web

- [ ] None in this issue, because red-cab-web#180 covers the checkbox.

### Docs

- [x] Set spec `status: implemented` after merge.

## Acceptance criteria

- [x] A guest without a login gets the version and the link.
- [x] The version equals the value of `CurrentVersionFetchService`.
- [x] Checkout create accepts the version that the route returned.
- [x] The link is the web base URL plus `/terms`, with one slash between them.
- [x] A web base URL with a trailing slash gives the same link.
- [x] A blank version gives 500 with the error text above.
- [x] A blank web base URL gives 500 with the error text above.
- [ ] The response holds no setting name and no stack detail.
- [x] The route runs no database query.
- [x] `bundle exec srb tc` shows no new errors, and `bundle exec rubocop` and the full test suite pass.

## Verification

```bash
# API (from red-cab-api/)
export PGGSSENCMODE=disable
PARALLEL_WORKERS=1 bin/rails test test/domains/bookings/terms_of_use test/integration/marketplace/bookings
PARALLEL_WORKERS=1 bin/rails test
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-26 | owner | Author review in chat | Approved. Owner ruled on decisions 1 to 3 and approved the added points 4 to 11. `review-implementation-spec` was not run. |
