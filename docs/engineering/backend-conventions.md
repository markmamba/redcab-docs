---
title: Backend Conventions
sidebar_position: 3
description: Rails API patterns — Request, Manager, Validator.
---

## TL;DR

- Rails API: **Request → Manager → Validator**, `app/domains/`, explicit routes, DBML-first schema.
- Red Cab rules on top: single pricing authority, immutable snapshots, financial authority seam.

## About this document

Backend implementation conventions for `red-cab-api`.

| Topic | Document |
| --- | --- |
| Code mapping | [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) |
| Engineering overview | [Engineering](/docs/engineering) |
| API design | [API Design](/docs/architecture/api-design) |
| Rules | [Business Rules](/docs/business-rules/invariants) |

---

## Stack (locked for implementation)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Ruby on Rails 8.x, API-only | Single modular monolith ([ADR-001](/docs/architecture/decisions/adr-001-modular-monolith)) |
| Database | PostgreSQL | Single shared DB ([ADR-002](/docs/architecture/decisions/adr-002-technology-stack)) |
| Cache / jobs | Redis | Cache, JWT session store, Sidekiq backend |
| Types | Sorbet (`sorbet-runtime`) | `# typed: true` on Managers, Requests, Services |
| Serialization | Panko Serializer | Context-scoped `{Actor}{Model}{Base\|Detail}Serializer` |
| Pagination | Pagy | Via `paginate_and_render` helper |
| Auth | `jwt_sessions` | Cookie-based JWT; separate team/admin cookies |
| Background jobs | Sidekiq + sidekiq-scheduler | Idempotent, retriable ([ADR-008](/docs/architecture/decisions/adr-008-domain-event-architecture)) |
| Tests | Minitest | Rails default |
| Search | pg_search (MVP) | Inside Catalog; dedicated engine only per fitness function |
| Payments | Stripe Connect | Webhook reconciliation ([../architecture/payments-architecture.md](/docs/architecture/payments-architecture)) |
| PDF (B2B) | Server-side with embedded JA fonts | Owned by `b2b/` domain |

---

## Request lifecycle

Every HTTP request follows this flow:

```
HTTP Request
  → Route          (config/routes/{actor}_routes.rb — explicit, never resources)
  → Controller     (thin — delegates only)
    → Request      (params → typed PORO, strong parameters)
    → Manager      (validate → query/mutate → return)
      → Validator  (ActiveModel::Validations — never model-level)
      → Model      (ActiveRecord in app/domains/)
      → Service    (side-effects, cross-domain writes)
      → DTO        (multi-model composition when needed)
    → Serializer   (Panko → JSON)
  → Response
```

### Controller rules

- Instantiate Request from `params`
- Call `Manager.execute(request: request, ...)` with auth context from `CurrentRequest` passed as keyword args
- Serialize with `::Domain::ActorModelSerializer.new.serialize_to_json(object)` or `paginate_and_render`
- For single-object responses: `SerializerClass.new.serialize_to_json(object)` with status `:ok` or `:created`
- For list responses: `paginate_and_render(request:, collection:, serializer:, object_name:)`
- Destroy actions return `{ message: '...' }`, not a serialized object
- Never put business logic in controllers
- Use `::` prefix for all domain class references

### Controller inheritance chain

```
ApplicationController (ActionController::API)
  ├── error handling (rescue_from)
  ├── pagination (PaginationHelper)
  └── cookie_domain (private)
      │
      ├── Identities::Users::AuthenticatedController
      │     ├── include SessionCookieManager
      │     ├── JWT cookie auth (jwt_sessions)
      │     ├── CurrentRequest population
      │     │
      │     ├── Tourists::BaseController
      │     ├── Corporate::BaseController
      │     ├── Providers::BaseController
      │     └── Identities::SessionsController (login/refresh/logout)
      │
      ├── Team::AuthenticatedController
      │     ├── include SessionCookieManager
      │     ├── JWT cookie auth with team cookies + namespace
      │     ├── CurrentRequest.identities_admin population
      │     └── Team::Identities::Admins::SessionsController
      │
      └── Marketplace::BaseController
            Optional auth (tries JWT, proceeds if absent)
            Sets: CurrentRequest.identities_user (may be nil)
```

### CurrentRequest (thread-local state)

`CurrentRequest` extends `ActiveSupport::CurrentAttributes`. Controllers populate it; Managers receive values as keyword arguments — never read `CurrentRequest` inside Managers.

```ruby
CurrentRequest.identities_user      # Identities::User (optional on marketplace)
CurrentRequest.tourist_profile      # Tourist profile (tourists base)
CurrentRequest.corporate_profile    # Corporate client profile
CurrentRequest.provider_profile     # Provider profile
CurrentRequest.identities_admin     # Admin identity (team base)
```

### Manager rules

- `def self.execute(request:, ...)` — always class method, always keyword args
- First step: build Validator, raise `Errors::ValidationError` if invalid
- **Owns transaction boundary** — `ActiveRecord::Base.transaction` wraps atomic writes
- Non-transactional side effects (notifications, analytics) go **after** the transaction
- Never access `CurrentRequest` directly — receive context as keyword arguments
- Never use model callbacks for side effects

### Validator rules

- `include ActiveModel::Validations` — all validation here, not on models
- All fields via `attr_reader`; initialize extracts from Request (and any preloaded records)
- Use Rails validators: `validates_presence_of`, `validates_format_of`, `validates_length_of`, `validate`
- Custom business rules as `validate :method_name` with early return on success
- Index validators extend `BaseIndexValidator` and implement `valid_order_columns`
- Error messages: plain language, explain what / why / how to fix (see [Error messages for users](#error-messages-for-users))

### Request rules

- Always `# typed: true` at top
- Every `attr_reader` has a Sorbet `sig` returning `T.nilable(Type)`
- `initialize(params:)` takes `ActionController::Parameters` with explicit `params.permit(...)`
- Each field assigned directly: `@name = permitted_params[:name]` (no `T.let`)
- Nested params use `permitted_params.dig(:nested_key, :field)`
- Index requests extend `BaseIndexRequest` and override `custom_permitted_params` + `custom_params`
- `BaseIndexRequest` provides: `page`, `page_size`, `order_by`, `order_dir`

### Model rules

- Live in `app/domains/{domain}/`, **not** `app/models/` (only `ApplicationRecord`, `CurrentRequest` in `app/models/`)
- `self.table_name = '{domain}_{plural}'`
- All associations: explicit `class_name:`, `foreign_key:`, `inverse_of:` where applicable
- String-backed enums with `prefix: true`:
  ```ruby
  enum :status, {
    draft:  'draft',
    active: 'active'
  }, prefix: :status
  ```
- When referencing enum values in validators, managers, or services, use the model enum definition (e.g. `MyModel.statuses.values`) — never hardcode strings
- Boolean columns: `is_` prefix
- Scoped associations for active records: `has_many :active_slots, -> { where(status: :active) }, ...`
- No model-level validations

### Serializer rules

- Panko, context-scoped naming: `MarketplaceListingBaseSerializer`, `TeamBookingDetailSerializer`
- Never query the database inside serializers
- List endpoints use `paginate_and_render`

### Service rules

- Class method `self.execute(...)` with Sorbet sig
- Actor-agnostic: `Catalog::Listings::PublishService`, not `ProvidersPublishService`
- Receive models, not Request objects
- Transaction-agnostic — Manager owns transactions
- Cross-domain: Service lives in the **consuming** domain (e.g. `Catalog::Availability::ReserveSeatsService` called from Booking checkout)
- No model callbacks — side effects are explicit Manager calls
- Extract to a Service when multiple writes are needed, multiple Managers share logic, or creation invariants are non-trivial

### Shared::CreateService (creation invariants)

When creating a model requires mandatory dependencies (slug, related rows, defaults), encapsulate the full invariant in `{Domain}::{Models}::Shared::CreateService`:

- Lives in `app/domains/{domain}/{model_plural}/shared/create_service.rb`
- Receives an **unsaved** model; Manager builds it, validates, then delegates save + dependencies
- Transaction-agnostic — Manager wraps the call in `ActiveRecord::Base.transaction`
- Actor-agnostic — any Create Manager may call it

### DTO rules

- Plain Ruby objects with `attr_reader`
- Never query the database — Managers fetch and pass results to the constructor
- Serializers may serialize DTOs when a response composes multiple models

---

## Routing

Explicit routes only — **never** `resources`:

```ruby
## Pattern: /{actor}/{domain}/{model}
namespace :providers do
  namespace :catalog do
    namespace :listings do
      post   '',              controller: '/providers/catalog/listings', action: 'create'
      get    '',              controller: '/providers/catalog/listings', action: 'index'
      get    ':listing_id',   controller: '/providers/catalog/listings', action: 'show'
      patch  ':listing_id',   controller: '/providers/catalog/listings', action: 'update'
    end
  end
end
```

Route files per actor: `config/routes/marketplace_routes.rb`, `tourists_routes.rb`, `corporate_routes.rb`, `providers_routes.rb`, `team_routes.rb`, `shared_routes.rb`.

Main `config/routes.rb` uses `draw('marketplace_routes')` etc.

See [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) for actor namespaces.

---

## Error handling

Error class hierarchy:

```
Errors::BaseError
  ├── ValidationError           (422)
  ├── NotFoundError             (404)
  ├── UnauthorizedError         (401)
  ├── UnprocessableContentError (422)
  └── InternalServerError       (500)
```

Response shape:

```json
{
  "status_name": "unprocessable_content",
  "status": 422,
  "messages": { "field": ["message"] },
  "code": "Errors::ValidationError",
  "title": "There was an error when creating the booking",
  "server": "api"
}
```

In Managers, raise `Errors::ValidationError` when validation fails. For non-validation business failures, use `Errors::UnprocessableContentError` (optionally with `skip_sentry: true` for expected auth failures).

### Error messages for users

Target users are non-technical tourists and corporate clients. Every message should answer:

1. What went wrong?
2. Why it went wrong?
3. What can the user do to fix it?

```ruby
## BAD
'something went wrong'

## GOOD
'This time slot is no longer available. Please choose another date or time.'
```

---

## Pagination

All list endpoints use `paginate_and_render` from `PaginationHelper`:

```ruby
paginate_and_render(
  request:     request,
  collection:  bookings_list,
  serializer:  ::Bookings::TouristsBookingDetailSerializer,
  object_name: 'bookings'
)
```

Response format:

```json
{
  "bookings": [ ... ],
  "meta": {
    "page": 1,
    "page_size": 10,
    "next": 2,
    "last": 5,
    "count": 50,
    "pages": 5
  }
}
```

---

## Soft delete pattern

Records are not hard-deleted. Soft delete uses `status :archived` — no `is_deleted` flag and no `deleted_at`.

- **No restore.** Once archived, create a new row to bring something back.
- **No hard delete.** Rows stay in the database.
- Simple lookup tables: `status :active | :archived` (default `:active`).
- Lifecycle-heavy tables (bookings, payments, quotations): use existing terminal states (`:cancelled`, `:completed`, `:paid`, etc.) instead of `:archived`.
- Audit / append-only tables: no `status` column.
- Models define both `has_many :things` and `has_many :active_things, -> { where(status: :active) }`.
- Destroy managers set `status: :archived` inside the transaction — never call `.destroy`.
- Partial unique indexes: `where: "status = 'active'"`.

---

## Date / time / timezone handling

Ask: **in whose timezone is this?**

| Kind | When | DB column | Wire format | Parse / format |
| --- | --- | --- | --- | --- |
| **Instant** | A moment in time (booking start, payment captured) | `timestamptz` | ISO-8601 with offset | `Time.zone.parse` — never `Date.parse` |
| **Civil date** | Same calendar day everywhere (date of birth, travel date label) | `date` | `YYYY-MM-DD` | Date-only, no timezone conversion |

Red Cab operates in Japan — store and display using the entity's timezone (listing area, provider locale), not hardcoded offsets. Frontend converts in one place per form submit (see [Frontend Conventions](/docs/engineering/frontend-conventions#date-and-time)).

---

## Sorbet type annotations

- All Managers, Requests, and Services: `# typed: true` at top
- `extend T::Sig` in class body
- `sig` blocks on `self.execute` and `attr_reader` declarations
- Use `T.nilable(Type)` for optional values
- Do not use `T.let()` for Request instance variable assignments — `attr_reader` sigs are sufficient

---

## Coding rules

### Naming

- Variables match their class name: `provider_profile = Providers::Profile.find(id)` not `profile = ...`
- Boolean variables and columns use `is_` prefix: `is_active`, `is_email_verified`

### Syntax

- No Ruby 3.1+ hash/keyword shorthand — write `{ a: a }` and `execute(request: request)`
- Class methods always use keyword arguments, never positional
- Prefer explicit `class_name:`, `foreign_key:`, `table_name:` everywhere

### Database queries

- Prefer ActiveRecord; raw SQL only when ORM cannot produce a performant query (document why)
- Sanitize user input: `ActiveRecord::Base.sanitize_sql_like(request.name)`
- Use `.includes()` to prevent N+1 (Bullet in development)
- Use `.find_by()` when the record may not exist

---

## Red Cab–specific backend rules

These extend the baseline API conventions with Red Cab domain rules:

1. **Never accept price from the client.** Checkout requests carry `listing_id`, `slot_id`, passenger count — not amounts. Manager calls `Catalog::Pricing::CalculateQuoteManager` and snapshots the result.
2. **Never mutate booking snapshots.** No update path for price, commission, or cancellation policy snapshots after create.
3. **Payments reads snapshots only.** Charge/refund/payout managers take a `booking:` and read its frozen snapshots; they never recompute commission from live `CommissionRateSetting`.
4. **Seat reservation only via guarded command.** `Catalog::Availability::ReserveSeatsManager` is the only writer of `available_seats` decrement; called inside `Bookings::CheckoutManager`'s transaction.
5. **B2B → Booking via ACL manager.** `B2b::Quotations::CreateBookingFromQuoteManager` translates quotation vocabulary; Booking domain never imports B2B models.
6. **Domain events after commit.** Publish past-tense events (`BookingCreated`, `PaymentSucceeded`) after transaction commits; consumers are idempotent.
7. **Webhook ingestion in Payments only.** Stripe webhooks converge state; never roll back committed booking transitions.
8. **Whole-yen integers.** Money columns as integer cents or `decimal` with scale 0 — no fractional yen (`PAY-1`).

---

## Migrations and DBML

### DBML workflow

Schema is designed DBML-first. One file per bounded context (split when large). See [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping) for file layout.

DBML conventions:

- Table names: `{domain}_{model_plural}`
- `rails_enum(...)` in column notes → `t.string` + model `enum`
- Table `Note:` → migration `create_table comment:`
- Column `note:` → migration column `comment:`
- Every table: `uuid string [unique, not null]`, `created_at timestamptz`, `updated_at timestamptz`
- Ref syntax: `[ref: > target.id]` belongs_to, `[ref: - target.id]` has_one, `[ref: < target.id]` has_many

### Migration conventions

- `ActiveRecord::Migration[8.0]`
- `t.references :foo, foreign_key: { to_table: :domain_foos }` — always explicit `to_table`
- `t.timestamptz :created_at, null: false` and `:updated_at` — never `t.datetime` / `t.timestamps`
- Column `comment:` from DBML `note:`
- Enum columns: `t.string` with `comment: 'rails_enum(:draft, :active)'` — never DB-level `CREATE TYPE`
- Partial unique indexes: `where: "status = 'active'"` for soft-deleted tables
- Money: integer cents or `decimal` with scale 0 for whole-yen (`PAY-1`)
- Boolean state flags: `is_` prefix; feature flags may use `has_` prefix
- Adding NOT NULL to existing tables: 3-step pattern (add nullable → backfill → add constraint)

Example table creation:

```ruby
class CreateCatalogListings < ActiveRecord::Migration[8.0]
  def change
    create_table :catalog_listings, comment: 'Provider-authored tour listing' do |t|
      t.string :uuid, null: false, comment: 'external reference'
      t.references :provider_profile, null: false, foreign_key: { to_table: :providers_profiles }
      t.string :status, null: false, default: 'draft', comment: 'rails_enum(:draft, :active, :archived)'
      t.timestamptz :created_at, null: false
      t.timestamptz :updated_at, null: false
    end
    add_index :catalog_listings, :uuid, unique: true
  end
end
```

DBML files live in `app/docs/db/` (red-cab-api) per [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping).

---

## Anti-patterns (never)

1. Domain models in `app/models/`
2. Validations on models
3. `resources` in routes
4. Integer-backed enums
5. DB queries in serializers or DTOs
6. `CurrentRequest` access from Managers
7. Ruby 3.1+ hash/keyword shorthand (`{ a: }`, `execute(request:)`)
8. Positional arguments on class methods
9. Model callbacks (`after_create`, `after_commit`) for side effects
10. Services wrapping their own transactions
11. Request objects passed to Services
12. Client-submitted prices or commission amounts
13. Cross-context direct table access
14. `t.datetime` / `t.timestamps` (use `t.timestamptz`)
15. Database-level enum types
16. `is_deleted` / `deleted_at` for soft delete (use `status :archived`)
17. Hardcoded enum strings (use model enum definitions)
18. Vague user-facing error messages
19. Omitting `class_name:` and `foreign_key:` on associations

---

## AI tooling (at scaffold time)

When `red-cab-api` is created, set up the standard layout:

- `.ai/instructions.md` — derived from this document and [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)
- `.ai/skills/new-endpoint/SKILL.md`
- `.ai/skills/new-model/SKILL.md`
- `.cursor/rules/redcab-conventions.mdc`

---

## Related documents

- [Domain-to-Code Mapping](/docs/engineering/domain-to-code-mapping)
- [Frontend Conventions](/docs/engineering/frontend-conventions)
- [../architecture/api-design.md](/docs/architecture/api-design)
- [../architecture/payments-architecture.md](/docs/architecture/payments-architecture)

