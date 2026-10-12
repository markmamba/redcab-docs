---
title: "ADR-021: Object Storage and Direct Upload"
sidebar_label: ADR-021
sidebar_position: 21
description: Direct upload to object storage with metadata rows in PostgreSQL; disk in dev, S3 in production.
---

## TL;DR

- User files (license documents, listing photos, review photos) live in **object storage**, not in PostgreSQL or on the API container disk in production.
- The API stores **metadata only** (`storage_key`, `content_type`, `byte_size`) on domain rows in PRV, CAT, and REV.
- Clients use **direct upload**: authenticated **grant** → **PUT** bytes to storage → existing **register** HTTP with **HEAD** verification.
- The API **generates** `storage_key` values; clients never choose object paths.
- **Development** uses a **disk** adapter; **production** uses **private S3** ([ADR-009](/docs/30-49-domains/architecture-decisions/adr-009-external-systems-integration)).
- **Rails Active Storage** is not attached to domain models for these assets.

## About this document

This ADR records the object storage and direct-upload architecture.

Tracking issues: [api #197](https://github.com/markmamba/red-cab-api/issues/197), [web #144](https://github.com/markmamba/red-cab-web/issues/144).

- API spec: [api-197](/docs/60-69-initiatives/implementation-specs/platform/api-197-object-storage-direct-upload).
- Web spec: [web-144](/docs/60-69-initiatives/implementation-specs/platform/web-144-platform-upload-client).
- Upload constraints: [NFR-SEC-006](/docs/70-79-business/requirements/non-functional-requirements).
- License privacy: [NFR-PRIV-002](/docs/70-79-business/requirements/non-functional-requirements).
- Review keys: [api-157](/docs/60-69-initiatives/implementation-specs/rev/api-157-tourist-submit-review).
- External systems: [ADR-009](/docs/30-49-domains/architecture-decisions/adr-009-external-systems-integration).

---

## Status

**Accepted** — Engineering, 2026-10-12 (aligns with platform design plan and api-197 / web-144 specs).

## Context

Provider onboarding, listing publish (**INV-10**), and reviews need photos and PDFs.

PostgreSQL already has `storage_key` columns on `providers_documents`, `catalog_listing_photos`, and `reviews_review_photos`.

Register endpoints accept metadata but, before platform work, did not store bytes or verify objects.

[ADR-009](/docs/30-49-domains/architecture-decisions/adr-009-external-systems-integration) treats external systems as **capabilities at the edge**.

S3 in production is an external capability.

It holds bytes only.

PRV, CAT, and REV own whether a row may reference a key and what metadata is stored.

**NFR-SEC-006** requires rejecting disallowed formats and sizes.

**NFR-PRIV-002** requires license documents to be readable only by the Provider and Platform Admin.

Large uploads must not stream through the Rails process in production.

## Decision

1. **Metadata in the domain; bytes in object storage.** Domain tables keep `storage_key` and upload-time metadata. Blobs are not BLOB columns and are not `has_one_attached` on `Providers::Document`, `Catalog::ListingPhoto`, or `Reviews::ReviewPhoto`.
2. **Direct upload pipeline.** Each file uses four steps.
   - Actor calls an upload **grant** endpoint.
   - Client **PUT**s to `upload_url` (S3 presigned URL or disk receiver in dev).
   - Client calls the existing **register** endpoint.
   - API **HEAD**s the object and rejects register when missing or mismatched.
3. **Server-generated keys.** Grant responses include the full `storage_key`. Grant requests whitelist `upload_kind`, `content_type`, `byte_size`, and scope ids (for example `listing_id`). Clients must not send arbitrary paths (web rule F6).
4. **Key namespaces (UUID-based).**
   - `providers/{provider_profile_uuid}/` — license documents (private).
   - `listings/{listing_uuid}/` — listing photos (public read via CDN or configured base URL).
   - `reviews/{tourist_uuid}/` — review photos (prefix enforced at register; see api-157).
5. **Platform port in the API.** `Platform::ObjectStorage` exposes grant, HEAD, and signed GET behind adapters:
   - **Disk** — `storage/objects/{storage_key}` in development and test.
   - **S3** — private bucket in production; presigned PUT and GET.
6. **Access classes.**
   - **Private** — provider documents: short-lived **download_grant** for provider and team only.
   - **Public listing images** — marketplace serializers expose a `url` field built from `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` + key; raw `storage_key` is not exposed on public marketplace responses.
7. **Web upload client.** `red-cab-web` uses ky for grant and register and **`fetch` for PUT** to presigned or disk URLs (cross-origin safe; no CSRF on S3).
8. **Environment parity.** The same key layout is used in dev and prod; only the adapter changes.

Implementation detail lives in [api-197](/docs/60-69-initiatives/implementation-specs/platform/api-197-object-storage-direct-upload) and [web-144](/docs/60-69-initiatives/implementation-specs/platform/web-144-platform-upload-client).

## Consequences

### Positive

- API containers stay stateless in production; blobs survive deploys and scale-out.
- Register-time HEAD closes the gap where metadata referenced non-existent objects.
- Prefix rules reduce cross-actor key attachment (reviews already; PRV/CAT aligned with grants).
- S3 can be replaced behind the port without changing PRV/CAT/REV aggregates ([ADR-009](/docs/30-49-domains/architecture-decisions/adr-009-external-systems-integration)).
- Marketplace can show real listing images when a public base URL is configured.

### Negative

- Two-step upload UX (grant, PUT, register) is more complex than a single multipart POST.
- Orphan objects may exist if PUT succeeds and register fails; lifecycle cleanup is a follow-on.
- CORS and presigned URL expiry must be handled in the web client.
- CDN topology for `listings/*` is not fully specified here; ops must configure bucket policy and CloudFront (or equivalent).

### Open (not blocking acceptance of this ADR)

- Virus scanning on upload (proposed follow-on; not agreed).
- Image variants / thumbnails (deferred; `image_processing` not enabled).
- Corporate manifest upload (Phase 3).

## Alternatives considered

### Active Storage on domain models

Attach files with `has_one_attached` on listing photos and documents.

Rejected for REV and catalog because api-157 and existing schema use explicit `storage_key` rows.

Rejected to avoid dual sources of truth (attachment id vs `storage_key` column).

### API proxies all uploads (multipart through Rails)

Single POST with file body to the API.

Rejected for production scale and memory use.

Conflicts with direct-upload goal in issue #197.

### MinIO in every developer environment

Same S3 SDK path in dev and prod.

Rejected to reduce local docker dependency; disk adapter matches same key layout.

### Client-supplied object keys

Client sends desired `storage_key` on grant.

Rejected due to path traversal and cross-tenant attachment risk (web F6).

## Related work

- API issue: [red-cab-api#197](https://github.com/markmamba/red-cab-api/issues/197).
- Web issue: [red-cab-web#144](https://github.com/markmamba/red-cab-web/issues/144).
- Design plan: `redcab-docs/scratchpad/design-direct-upload-local-s3.md`.
