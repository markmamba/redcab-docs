---
title: "Platform object storage direct upload (disk dev, S3 prod)"
sidebar_label: API · Platform uploads
issue: "https://github.com/markmamba/red-cab-api/issues/197"
repos:
  - red-cab-api
status: approved
phase: 1
context: PLATFORM
depends_on:
  - "redcab-docs/scratchpad/design-direct-upload-local-s3.md"
related:
  - "https://github.com/markmamba/red-cab-web/issues/144"
---

## TL;DR

- Ships a **Platform object-storage port** in `red-cab-api`: upload grants, object HEAD verification, signed download for private blobs, and optional public URLs for listing photos.
- **Development and test** use a **disk** adapter under `storage/objects/`.
- **Production** uses a **private S3** bucket with presigned PUT.
- **Register** endpoints for provider documents, listing photos, and review submit **must** pass HEAD verification and prefix rules before insert.
- Does **not** ship web upload UI (web #144), virus scan, image variants, or Active Storage on domain models.
- **Breaking change:** No for HTTP shapes on existing register bodies; clients that register keys without a prior upload will get **422** after this ships.

## Problem

Issue [#197](https://github.com/markmamba/red-cab-api/issues/197): metadata rows exist (`storage_key` on `providers_documents`, `catalog_listing_photos`, `reviews_review_photos`) but no blob layer.

Register endpoints do not verify that an object exists.

Only review submit validates `storage_key` prefix today.

There is no authorized download path for license documents (**NFR-PRIV-002**).

Marketplace serializers expose photo metadata without a delivery URL, so the web app uses placeholders.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| FR-PRV-004 | [prv.md](/docs/70-79-business/requirements/functional-requirements/prv) | Provider document upload limits |
| FR-CAT-011 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Listing photo format and size |
| FR-REV-003 | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) | Review photo limits (when used) |
| NFR-SEC-006 | [non-functional-requirements](/docs/70-79-business/requirements/non-functional-requirements) | Reject bad size and format |
| NFR-PRIV-002 | [non-functional-requirements](/docs/70-79-business/requirements/non-functional-requirements) | License document access |
| NFR-PRIV-004 | [non-functional-requirements](/docs/70-79-business/requirements/non-functional-requirements) | Personal data protection (NFR status: **Draft** — directional only) |
| INV-10 | [invariants](/docs/70-79-business/business-rules/invariants) | Publish requires photos (unchanged) |
| api-157 | [api-157-tourist-submit-review.md](../rev/api-157-tourist-submit-review.md) | Review `storage_key` prefix and photo payload |
| Design plan | `redcab-docs/scratchpad/design-direct-upload-local-s3.md` | Adapter and flow baseline |

### Explicit deferrals (not closed)

These stay **out of scope** for #197. There is **no** resolved `AMB-*` for them; do not treat silence as a product decision.

| Topic | Status in #197 | Follow-on |
| --- | --- | --- |
| Virus scanning on upload | Deferred | New issue after object-storage baseline ships |
| Orphan-object sweeper (grants without register) | Deferred | Follow-on rake task / ops job |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **Platform port** `Platform::ObjectStorage::*` (not Active Storage on AR models) | `has_one_attached` on domain rows | Matches api-157 and existing `storage_key` columns |
| 2 | **Disk adapter** in `development` and `test`; **S3 adapter** in `production` | MinIO in dev; API multipart proxy | Issue #197; same key layout across envs |
| 3 | **Server-generated `storage_key`** on grant | Client supplies key | Blocks path traversal and cross-actor keys (web F6) |
| 4 | **Stateless upload token** (HMAC) for disk PUT and download URLs | DB upload session table | Fewer tables; token embeds key, content_type, max byte_size, purpose, exp |
| 5 | **Actor-scoped grant routes** under existing namespaces | Single `/platform/uploads` | Matches explicit per-actor routes (`providers`, `tourists`) |
| 6 | **HEAD verify** on register | Trust client metadata only | Stops orphan or wrong-object registration |
| 7 | **Prefix rules** on grant and register for PRV/CAT; REV unchanged | Prefix on grant only | Defense in depth |
| 8 | **Listing public `url`** on marketplace photo embeds only | Expose `storage_key` on marketplace | Tourist-readable; keys stay internal |
| 9 | **Document download** via `download_grant` sub-resource | Permanent URLs on document serializer | Short-lived access (**NFR-PRIV-002**) |
| 10 | **S3 presigned PUT** includes `Content-Type` and size cap when SDK allows | Unsigned dev-only upload | Aligns stored object with declared metadata; see **S3 PUT constraints** below |
| 11 | **File extension** derived from `content_type` on grant | Random suffix only | Predictable keys; still unique via UUID segment |
| 12 | **CloudFront** | Public S3 prefix | Defer to ops; spec uses `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` for listing `url` |
| 13 | **Public read only for `listings/*`** | Single public bucket for all keys | Ops expose CDN or bucket prefix for listing photos only; `providers/*` and `reviews/*` stay private |
| 14 | **Grant auth mirrors register rules per kind** | One “operable” check for all provider grants | `provider_document` uses profile **editable** rules; `listing_photo` uses listing photo rules (operable, draft, ownership) |

### Key prefix and size limits

| `upload_kind` | Grant auth | `storage_key` prefix | Max size | Permitted `content_type` |
| --- | --- | --- | --- | --- |
| `provider_document` | Provider JWT | `providers/{provider_profile_uuid}/` | 10 MB | `DocumentUploadPolicy` |
| `listing_photo` | Provider JWT | `listings/{listing_uuid}/` | 5 MB | `Catalog::ListingPhoto::PERMITTED_CONTENT_TYPES` |
| `review_photo` | Tourist JWT | `reviews/{tourist_uuid}/` | 5 MB | `Reviews::ReviewPhoto::PERMITTED_CONTENT_TYPES` |

Grant for `listing_photo` requires body field `listing_id` (listing UUID).

Provider must own the listing and listing must be `draft`.

Tourist `review_photo` grant does not require `booking_id` on grant (submit still enforces eligibility).

### Provider grant authorization (per `upload_kind`)

Grant validation **must** match the same rules as the register endpoint for that kind (not a single shared “operable” gate).

| `upload_kind` | Rules (mirror existing validators) | Typical HTTP |
| --- | --- | --- |
| `provider_document` | Profile **editable** only: `status` is `pending` or `rejected` (same as `Providers::Documents::ProvidersCreateValidator#provider_profile_editable?`). Do **not** apply listing-photo suspended/operable checks to this kind. | `422` when not editable |
| `listing_photo` | Provider **operable** (not suspended); listing exists, owned by provider, **`draft`** (same as `Catalog::ListingPhotos::ProvidersCreateValidator`) | `404` when listing not found or not owned; `422` when not `draft` or provider suspended |

### S3 PUT constraints

- When the AWS SDK supports it, presigned PUT **must** bind `Content-Type` and maximum object size to grant `content_type` and `byte_size`.
- When the SDK **cannot** enforce max size on PUT, the client may still upload an oversize object to S3; **register** and disk PUT **must** reject via HEAD / `Content-Length` mismatch. Document any SDK limitation in adapter comments.

### Configuration

| Name | Default | Purpose |
| --- | --- | --- |
| `RED_CAB_OBJECT_STORAGE_ADAPTER` | `disk` in dev/test; `s3` in production | Adapter selection |
| `RED_CAB_OBJECT_STORAGE_BUCKET` | — | S3 bucket (production) |
| `RED_CAB_OBJECT_STORAGE_REGION` | — | AWS region |
| `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` | unset | Optional CDN or dev base for listing `url` (no trailing slash) |
| `RED_CAB_OBJECT_STORAGE_UPLOAD_TOKEN_SECRET` | credentials / env | HMAC for disk PUT and download tokens |

Add `aws-sdk-s3` gem when implementing S3 adapter.

Production must not store user blobs on container local disk.

**Deploy (production):** Configure `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` (or CDN) so only **`listings/*`** objects are world-readable. **`providers/*`** license blobs and **`reviews/*`** photos remain private (presigned GET / `download_grant` only).

## API contract

### Create upload grant (provider)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/providers/uploads` | JWT provider | Body whitelists fields below |

**Request body (JSON)**

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `upload_kind` | string | yes | `provider_document` or `listing_photo` |
| `content_type` | string | yes | Must match kind policy |
| `byte_size` | integer | yes | Positive; within max for kind |
| `listing_id` | string (UUID) | when `listing_photo` | Listing owned by provider; `draft` |

**Response `201`**

| Field | Type | Notes |
| --- | --- | --- |
| `storage_key` | string | Server-generated full key |
| `upload_url` | string | S3 presigned URL or disk API URL |
| `upload_headers` | object | Client must send on PUT (e.g. `Content-Type`) |
| `expires_at` | string (ISO8601) | Grant expiry (15 minutes) |

**Errors**

| Condition | HTTP |
| --- | --- |
| Invalid `upload_kind`, `content_type`, or `byte_size` | `422` |
| `provider_document` and profile not editable (`pending` / `rejected` only) | `422` |
| `listing_photo` and `listing_id` not found or not owned | `404` |
| `listing_photo` and listing is not `draft` | `422` |
| `listing_photo` and provider is suspended | `422` |

### Create upload grant (tourist)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/tourists/uploads` | JWT tourist | `upload_kind` must be `review_photo` |

Same request/response shape as provider grant (without `listing_id`).

### Disk adapter — receive PUT (development, test, and when adapter is `disk`)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| PUT | `/platform/object_storage/uploads` | `Authorization: Bearer <upload_token>` | Raw body = file bytes |

- Reject when token expired, wrong method, or `Content-Length` over grant `byte_size`.
- Persist to `Rails.root.join("storage", "objects", storage_key)` (create parent dirs).
- Return `204` on success.

Not used when production adapter is S3 (client PUTs to S3 URL).

### Register endpoints (existing — behavior change)

After grant + PUT, clients call existing register routes unchanged.

| Method | Path | Change |
| --- | --- | --- |
| POST | `/providers/documents` | HEAD verify + `providers/{profile_uuid}/` prefix |
| POST | `/providers/catalog/listings/:listing_id/photos` | HEAD verify + `listings/{listing_uuid}/` prefix |
| POST | `/tourists/bookings/orders/:booking_id/reviews` | HEAD verify per photo (prefix already enforced) |

**New validation failures (422):** object missing; `content_type` or `byte_size` mismatch vs HEAD; `storage_key` outside allowed prefix.

### Document download grant (private)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/providers/documents/:document_id/download_grant` | JWT provider | Own document only; `document_id` is document UUID |
| POST | `/team/providers/profiles/:profile_id/documents/:document_id/download_grant` | JWT team admin | Any provider document; params match team route style (`profile_id`, `document_id`) |

**Response `200`**

| Field | Type | Notes |
| --- | --- | --- |
| `download_url` | string | Signed URL or disk token URL |
| `expires_at` | string (ISO8601) | 15 minutes |

**Errors:** `404` when document not found or not authorized.

### Disk adapter — download GET

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/platform/object_storage/downloads` | `Authorization: Bearer <download_token>` | Streams file with `Content-Type` from object metadata |

S3 adapter returns presigned GET URL in `download_url` instead.

### Marketplace listing photo delivery

Extend `Catalog::MarketplaceListingPhotoEmbeddedSerializer` (list and detail embeds):

| Field | Type | Notes |
| --- | --- | --- |
| `url` | string or null | When `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` set: `#{base}/#{storage_key}`; else null |

When `url` is present, listing photos are **world-readable** by design (tourist marketplace). License documents never use this field.

Do not add `storage_key` to marketplace serializers.

Provider-facing listing photo serializers remain without `storage_key` (unchanged).

## Data / domain touchpoints

- Bounded context: **PLATFORM** (new), called from **PRV**, **CAT**, **REV**.
- No new domain tables for blobs in this slice (tokens are stateless).
- Register transactions unchanged; HEAD runs inside manager before insert.
- Extract `Platform::ObjectStorage::VerifyUploadedObjectService` for shared HEAD + metadata match.
- Add `storage_key_prefix_for` / `storage_key_allowed?` on `Providers::Document` and `Catalog::ListingPhoto` (mirror `Reviews::ReviewPhoto`).

## Files to create or modify (API)

### Routes

- `config/routes/providers_routes.rb` — `POST /providers/uploads`; document `download_grant`
- `config/routes/tourists_routes.rb` — `POST /tourists/uploads`
- `config/routes/team_routes.rb` — team document `download_grant`
- `config/routes/platform_routes.rb` (new) — disk PUT/GET; `draw` from `config/routes.rb` when adapter is disk or in dev/test

### Platform domain

- `app/domains/platform/object_storage/adapter.rb` (port)
- `app/domains/platform/object_storage/disk_adapter.rb`
- `app/domains/platform/object_storage/s3_adapter.rb`
- `app/domains/platform/object_storage/upload_token.rb`
- `app/domains/platform/object_storage/verify_uploaded_object_service.rb`
- `app/domains/platform/object_storage/public_url_builder.rb`
- `app/domains/platform/uploads/providers_create_{request,validator,manager}.rb`
- `app/domains/platform/uploads/tourists_create_{request,validator,manager}.rb`
- `app/controllers/providers/uploads_controller.rb`
- `app/controllers/tourists/uploads_controller.rb`
- `app/controllers/platform/object_storage/uploads_controller.rb`
- `app/controllers/platform/object_storage/downloads_controller.rb`
- `app/controllers/providers/documents/download_grants_controller.rb` (or nested action)
- `app/controllers/team/providers/documents/download_grants_controller.rb`
- `app/domains/providers/documents/providers_download_grant_{request,validator,manager}.rb`
- `app/domains/providers/documents/team_download_grant_{request,validator,manager}.rb`

### Touch existing register paths

- `app/domains/providers/documents/providers_create_validator.rb` — prefix + delegate verify
- `app/domains/catalog/listing_photos/providers_create_validator.rb` — prefix + delegate verify
- `app/domains/reviews/reviews/tourists_submit_validator.rb` — HEAD per photo
- `app/domains/catalog/marketplace_listing_photo_embedded_serializer.rb` — `url`

### Config / deps

- `Gemfile` — `aws-sdk-s3`
- `config/initializers/platform_object_storage.rb` (or env-driven config object)
- `.env.example` / deploy docs note for production bucket, **public prefix for `listings/*` only**, and private `providers/*`

### Tests and API docs

- `test/integration/platform/object_storage_upload_flow_test.rb`
- `test/integration/providers/documents_create_with_upload_test.rb`
- `test/integration/providers/catalog/listing_photos_create_with_upload_test.rb`
- `test/domains/platform/object_storage/upload_token_test.rb`
- Bruno under `docs/api/red-cab-api/platform/` and update provider document flows

## Out of scope

- `red-cab-web` upload helper and UI (web [#144](https://github.com/markmamba/red-cab-web/issues/144)).
- Corporate manifest upload.
- Virus scanning and image variants (see **Explicit deferrals** — no closed `AMB-*`).
- Orphan-object sweeper (follow-on rake task; see **Explicit deferrals**).
- Removing unused Active Storage migrations.
- Team review photo image preview URLs (metadata-only UI may remain).
- ADR publication (recommended before production cutover; use `write-doc`).

## Tasks

### API

- [ ] Implement Platform port, disk and S3 adapters, and upload token helper.
- [ ] Add provider and tourist upload grant endpoints.
- [ ] Add disk PUT and download controllers (guarded by adapter).
- [ ] Wire HEAD verification into document, listing photo, and review submit managers/validators.
- [ ] Add prefix helpers on `Providers::Document` and `Catalog::ListingPhoto`; update fixtures/tests from legacy keys (e.g. `providers/1/...`) to UUID prefixes.
- [ ] Add provider and team document `download_grant` endpoints.
- [ ] Add marketplace photo `url` via `PublicUrlBuilder`.
- [ ] Integration tests for grant → PUT (disk) → register and download grant flows.
- [ ] Bruno docs and env documentation for S3 production.

### Docs

- [x] Run `review-implementation-spec`; set `status: approved` before codegen.
- [ ] Set `status: implemented` after merge.

## Acceptance criteria

| # | Criterion | Maps to |
| --- | --- | --- |
| 1 | Provider `provider_document` grant → disk PUT → `POST /providers/documents` persists row; file exists under `storage/objects/`. | FR-PRV-004, NFR-SEC-006 |
| 2 | Provider `listing_photo` grant (draft listing) → disk PUT → `POST .../photos` persists row; HEAD verify passes. | FR-CAT-011, NFR-SEC-006 |
| 3 | `provider_document` grant returns **422** when profile is not editable (not `pending` / `rejected`). | FR-PRV-004 |
| 4 | `listing_photo` grant returns **422** when listing is not `draft`; **404** when listing not found or not owned. | FR-CAT-011 |
| 5 | Register returns **422** when object is missing or HEAD metadata does not match request. | NFR-SEC-006 |
| 6 | Register returns **422** when `storage_key` is outside the actor prefix. | api-157, FR-PRV-004 / FR-CAT-011 / FR-REV-003 |
| 7 | Tourist grant works for `review_photo` with `reviews/{tourist_uuid}/` prefix. | FR-REV-003, api-157 |
| 8 | Disk PUT returns failure when `Content-Length` exceeds grant `byte_size`. | NFR-SEC-006 |
| 9 | Provider and team can obtain `download_url` for a license document; unauthenticated GET without token fails. | NFR-PRIV-002 |
| 10 | Team `download_grant` uses `profile_id` and `document_id` route params (UUID values). | NFR-PRIV-002 |
| 11 | Marketplace listing embed includes `url` when public base URL is configured; documents never exposed on marketplace embeds. | FR-CAT-011 |
| 12 | Production adapter is S3 (verified via config test or deploy checklist). | — |
| 13 | `bundle exec srb tc`, `bin/rails test`, and `bundle exec rubocop` pass on touched files. | — |

## Verification

```bash
# API (from red-cab-api/)
RED_CAB_OBJECT_STORAGE_ADAPTER=disk bin/rails test test/integration/platform/
RED_CAB_OBJECT_STORAGE_ADAPTER=disk bin/rails test test/integration/providers/documents_create_with_upload_test.rb
RED_CAB_OBJECT_STORAGE_ADAPTER=disk bin/rails test test/integration/providers/catalog/listing_photos_create_with_upload_test.rb
RED_CAB_OBJECT_STORAGE_ADAPTER=disk bin/rails test test/domains/platform/
bundle exec srb tc
bundle exec rubocop
```

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-12 | Mark (author) | `review-implementation-spec` | Must-fix and should-fix applied; author Q&A recorded; `status: approved` |
