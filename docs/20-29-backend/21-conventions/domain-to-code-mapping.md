---
title: Domain-to-Code Mapping
sidebar_position: 2
description: Actors and bounded contexts mapped to folders and routes.
---

## TL;DR

- Maps **actors, bounded contexts, aggregates** → folders, routes, namespaces, and DBML ownership in both repos.
- Context codes (`IAM`, `PRV`, `CAT`, etc.) drive module and route structure.

## About this document

Domain-to-code mapping for Red Cab API and web repos.

| Topic | Document |
| --- | --- |
| Engineering overview | [Engineering](/docs/90-99-engineering-meta) |
| Backend patterns | [Backend Conventions](/docs/20-29-backend/conventions/backend) |
| Frontend patterns | [Frontend Conventions](/docs/50-59-frontend/conventions/frontend) |

---

## Actor → API controller namespace

Red Cab has three external actors.

Map them to explicit route files and controller namespaces — one file per actor, explicit verb + path (never `resources`).

| Red Cab Actor | Glossary term | Controller namespace | Route file | Auth base |
| --- | --- | --- | --- | --- |
| Tourist | Tourist | `marketplace/` (public discovery) + `tourists/` (authenticated booking) | `marketplace_routes.rb`, `tourists_routes.rb` | Optional session for marketplace; required session for tourists. Any signed-in person may use `tourists/`, with or without a tourist profile |
| Provider | Provider | `providers/` | `providers_routes.rb` | Required session + the access word of the person (`missing`, `pending`, `active`, `rejected` or `suspended`) |
| Admin | Admin | `team/` | `team_routes.rb` | Required team session (admin identity, separate from user) |

### Notes

- **`marketplace/`** serves optional-auth discovery: geography, listings, `calculate_quote`, availability reads.
  - Uses an optional session (a gone session is a guest).
- **`tourists/`** serves authenticated B2C booking lifecycle, payments visibility, and reviews.
  - Booking initiation requires auth at checkout per `NFR-SEC-005` (guest browse is unauthenticated per `AMB-022`).
- **`providers/`** serves onboarding, catalog authoring, incoming bookings, review responses.
  - Gated by Provider Status conformist read.
- **`team/`** serves Admin operations across all contexts.
  - Independent admin identity, separate from tourist/user accounts.

### Visitor / guest browsing

Guest discovery is unauthenticated (`AMB-022` resolved, Option A).

Those endpoints live under `marketplace/` with optional auth.

They do **not** get a separate actor namespace.

---

## Bounded context → `app/domains/` module

Each bounded context maps to a top-level domain folder.

Table names use `{domain}_{model_plural}` prefix.

| Context code | Bounded context | `app/domains/` module | Example model / table |
| --- | --- | --- | --- |
| IAM | Identity & Access | `identities/` | `Identities::Account` → `identities_accounts` (thin auth principal) |
| — | Tourist profile (demand) | `tourists/` | `Tourists::Profile` → `tourists_profiles` |
| COR | Corporate Quotation & Invoicing | None. No code exists | The product dropped corporate clients, see [IAM D12 — No corporate accounts](/docs/30-49-domains/iam/iam-decisions/#no-corporate-accounts) |
| PRV | Provider company and onboarding | `providers/` | `Providers::Company` → `providers_companies`; `Providers::Membership` → `providers_memberships` |
| CAT | Catalog & Inventory | `catalog/` | `Catalog::Listing` → `catalog_listings` |
| BKG | Booking & Checkout | `bookings/` | `Bookings::Booking` → `bookings_bookings` |
| PAY | Payments & Payouts | `payments/` | `Payments::Charge` → `payments_charges` |
| REV | Reviews & Ratings | `reviews/` | `Reviews::Review` → `reviews_reviews` |
| NOT | Notifications | `notifications/` | `Notifications::Dispatch` → `notifications_dispatches` |

### Internal modules inside Catalog

Geography, Listings, Pricing, Availability, and Search are **modules inside `catalog/`**, not separate domain folders — matching the bounded-context doc:

```
app/domains/catalog/
  geography.rb        # Catalog::Geography — replaces district.rb / area.rb at persistence layer
  listing.rb
  pricing_policy.rb
  availability_slot.rb
  geography/          # seed task, near-me query, slug resolver
  districts/          # marketplace API surface (reads Catalog::Geography)
  areas/              # marketplace API surface (reads Catalog::Geography)
  listings/           # action classes
  pricing/
  availability/
  search/             # query-only managers
```

`catalog.dbml` is authoritative for geography storage: the `catalog_countries` table and the `catalog_geographies` tree (`level`, `code_system`, `external_code`, `path`, `is_discovery_root`, `is_listable`, `discovery_root_id`, `successor_geography_id`, `name_kana`, `latitude`, `longitude`, `timezone` on every node).

**Target model** — shipped schema catches up in epic [#130](https://github.com/markmamba/red-cab-api/issues/130).

Shared datetime utilities: `app/shared/date_time_utils.rb` — see [Date / Time / Timezone](/docs/20-29-backend/conventions/datetime-and-timezones).

### Cross-context calls

- **Synchronous:** Manager in context A calls `::Catalog::Pricing::CalculateQuoteManager` or `::Bookings::CreateFromQuoteManager` — never raw SQL across tables.
- **The one shared transaction (CR-1):** `Bookings::CheckoutManager` calls `::Catalog::Availability::ReserveSeatsManager` inside its own `ActiveRecord::Base.transaction` block.
- **Asynchronous:** publish domain events; `notifications/`, payout queuing, rating recalculation consume them via jobs.
  - No model callbacks.

---

## Actor-scoped class naming

Actor prefix on Request, Manager, Validator, Serializer; no prefix on Model, Service, DTO.

| Class type | Actor-scoped? | Red Cab example |
| --- | --- | --- |
| Controller | Yes | `Providers::Catalog::ListingsController` |
| Request | Yes | `ProvidersCreateListingRequest` |
| Manager | Yes | `ProvidersCreateListingManager` |
| Validator | Yes | `ProvidersCreateListingValidator` |
| Serializer | Yes | `ProvidersListingDetailSerializer` |
| Service | No | `Catalog::Listings::SyncService` |
| Model | No | `Catalog::Listing` |
| DTO | No | `Catalog::ListingDetailDto` |

---

## Frontend surface → route groups

Map Red Cab consumer surfaces to React Router route files — one `*.routes.js` per surface, imported into `app/routes.js`.

| Surface | Layout | Route group file | URL prefix | Auth HOC |
| --- | --- | --- | --- | --- |
| Tourist App (public) | `TouristPublicLayout` | `marketplace.routes.js` | `/`, `/districts`, `/districts/:districtSlug/areas/:areaSlug/listings`, `/listings/:listingUuid` (resolver) | None |
| Tourist App (private) | `TouristDashboardLayout` | `tourist.routes.js` | `/account`, `/account/checkout`, `/account/bookings`, `/account/reviews` | `withTouristAuth` |
| Provider Portal | `ProviderLayout` | `provider.routes.js` | `/providers` | `withProviderAuth` |
| Admin Panel | `TeamLayout` | `team.routes.js` | `/team` | Team admin auth (independent) |

Public catalog pages use server `loader` and `index, follow` robots per [spec #56](/docs/60-69-initiatives/61-2026/implementation-specs/iam/web-56-tourist-access-and-route-contract).

Checkout and account routes remain in `tourist.routes.js` with `withTouristAuth`.

The **Auth HOC** column is transitional.

Each private surface moves to a policy route (`tourist-required`, `provider-required`, `admin-required`) one surface at a time.

See Policy routes and surfaces (removed) and the roadmap (removed).

### API client naming

Naming pattern: `{actor}-{domain}-{model}-api.js`

Examples:

- `marketplace-catalog-listings-api.js`
- `tourists-bookings-booking-api.js`
- `providers-companies-api.js`
- `providers-catalog-listings-api.js`
- `team-payments-commission-rates-api.js`

### Domain component folders

Hyphenated domain-model names under `app/domains/`:

```
app/domains/
  catalog-listing/
  bookings-booking/
  providers-company/
  payments-charge/
  reviews-review/
```

---

## DBML → migrations

Schema design follows a DBML-first workflow.

One DBML file per bounded context (split when large):

```
docs/db/               # in red-cab-api
  identities.dbml
  tourists.dbml
  notifications.dbml
  providers.dbml
  catalog.dbml
  bookings.dbml
  payments.dbml
  reviews.dbml
  redcab.dbml          # index / cross-references
```

Conventions (see [Backend Conventions](/docs/20-29-backend/conventions/backend)):

- Domain-prefixed table names: `bookings_bookings`, `catalog_listings`
- `uuid` column on every table
- `t.timestamptz` for all timestamps (never `t.datetime` / `t.timestamps`)
- String-backed enums in model (never DB-level `CREATE TYPE`)
- `rails_enum(...)` in DBML notes → `t.string` + model `enum`
- Soft delete via `status :active | :archived` where applicable (not `is_deleted`) — see [Backend Conventions — Soft delete](/docs/20-29-backend/conventions/backend#soft-delete-pattern)

DBML is authoritative for **storage shape**.

---

## Pricing and snapshot rules in code

These architectural rules must appear as code constraints, not comments:

| Rule | Code enforcement |
| --- | --- |
| Single pricing authority (`PRC-1`) | Only `Catalog::Pricing::CalculateQuoteManager` computes price. No price fields accepted from client requests. |
| Snapshot immutability (`INV-1`) | No update managers/validators for snapshot columns. DB columns have no update paths after create. |
| Money facts vs movement (`FIN-3`) | `Bookings::*Manager` writes snapshots; `Payments::*Manager` reads them. Payments never mutates booking snapshot tables. |
| Atomic checkout (`CON-1`, `CR-1`) | `Bookings::CheckoutManager` owns one transaction wrapping snapshot + `Catalog::Availability::ReserveSeatsManager` + booking create. |
| No client price computation | Frontend displays `price_breakdown` from API only. No arithmetic on listing prices in `app/domains/` or routes. |

---

## Related documents

- [Backend Conventions](/docs/20-29-backend/conventions/backend)
- [Frontend Conventions](/docs/50-59-frontend/conventions/frontend)

