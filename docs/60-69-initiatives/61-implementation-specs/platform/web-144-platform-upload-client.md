---
title: "Platform upload client and provider document upload"
sidebar_label: Web · Platform uploads
issue: "https://github.com/markmamba/red-cab-web/issues/144"
repos:
  - red-cab-web
status: approved
phase: 1
context: PLATFORM
depends_on:
  - "docs/60-69-initiatives/61-implementation-specs/platform/api-197-object-storage-direct-upload.md"
epic: "https://github.com/markmamba/red-cab-web/issues/144"
related:
  - "https://github.com/markmamba/red-cab-api/issues/197"
---

## TL;DR

- Ships a **shared upload pipeline** in `red-cab-web`: API grant → `fetch` PUT → existing register ky clients.
- Ships **provider license document upload** on the registration documents page (remove the “not available” gate).
- Ships **marketplace listing image** rendering when API photo embeds include `url` (fallback to placeholder).
- Ships **`providers-uploads-api.js`** and **`PlatformObjectStorageService`** (domain helper) with unit tests.
- Does **not** ship tourist review photo picker (deferred in [web-121](../rev/web-121-tourist-review-submit-ui.md)), full listing edit/photo UI (edit page is still a stub), or submit-for-review HTTP (**FR-PRV-005** has no provider route yet).
- **Breaking change:** No.
- **Blocked on:** [api-197](./api-197-object-storage-direct-upload.md) deployed or available in dev with `status: approved`.

## Problem

Issue [#144](https://github.com/markmamba/red-cab-web/issues/144): register API clients expect `storage_key` after a separate upload, but the web app has no grant or PUT step.

`providers-profile-registration-documents-page.jsx` tells providers that upload is disabled.

Discover list and listing hero always use `CATALOG_LISTING_PLACEHOLDER_IMAGE_PATH` even when the API returns photo metadata.

There is no `UploadField` component (only referenced in skills).

Security rule **F6** forbids sending user-controlled paths to presign endpoints; grant payloads must use server-known scope only.

## Governing docs

| ID | Document | Why |
| --- | --- | --- |
| api-197 | [api-197-object-storage-direct-upload.md](./api-197-object-storage-direct-upload.md) | Grant paths, response fields, register coupling |
| FR-PRV-004 | [prv.md](/docs/70-79-business/requirements/functional-requirements/prv) | Document types and size |
| FR-CAT-011 | [cat.md](/docs/70-79-business/requirements/functional-requirements/cat) | Listing photo rules (helper only in #144) |
| NFR-SEC-006 | [non-functional-requirements](/docs/70-79-business/requirements/non-functional-requirements) | Client-side pre-check before grant |
| web-121 | [web-121-tourist-review-submit-ui.md](../rev/web-121-tourist-review-submit-ui.md) | Review photos still deferred |
| web-122 | [web-122-team-review-moderation-pages.md](../rev/web-122-team-review-moderation-pages.md) | Team photo metadata-only unchanged |
| frontend.md | [frontend conventions](/docs/50-59-frontend/conventions/frontend) | Domain modules, forms, ky clients |
| F6 | `red-cab-web/.ai/skills/review-react-style/rules/security.md` | No client-supplied storage paths on grant |

## Design decisions

| # | Decision | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| 1 | **`PlatformObjectStorageService` in `app/domains/platform-object-storage/`** | Logic only in route pages | Reuse for documents now; listing and review later |
| 2 | **`providers-uploads-api.js`** for `POST providers/uploads` | One mega api file | Matches api-197 actor-scoped grant |
| 3 | **`fetch` for PUT** to `upload_url` | ky `apiClient.put` | S3 presigned URLs are often cross-origin; ky CSRF not applicable |
| 4 | **Grant body whitelist** only `upload_kind`, `content_type`, `byte_size`, `listing_id` | Include `storage_key` | F6; server returns `storage_key` |
| 5 | **`UploadField` in `app/components/forms/upload-field.jsx`** | Inline file inputs | `creating-domain-forms` skill; shared a11y contract (see **UploadField** below) |
| 6 | **Document upload form + page submit** `providers-document-upload-form.jsx` | Page-only JSX | RHF + zod; form exposes `onSubmit` / `onCancel` like `providers-profile-form.jsx`; **page** calls `PlatformObjectStorageService`, toasts, and revalidate (domain forms do not call APIs) |
| 7 | **Marketplace `url` on photo embed** | Build URL from `storage_key` in web | api-197 owns public URL; web reads `thumbnail_photo.url` / `photos[].url` |
| 8 | **Placeholder fallback** when `url` is null | Hide image | Dev without `RED_CAB_OBJECT_STORAGE_PUBLIC_BASE_URL` |
| 9 | **Listing photo helper** exported but not mounted on stub edit page | Build full edit UI in #144 | Edit route is placeholder; avoid scope creep |
| 10 | **Submit for review button** stays disabled | Fake submit | No `submit_for_review` provider route in API today; update disabled `title` / helper copy so it no longer references upload being unavailable |
| 11 | **Client validation** mirrors `DOCUMENT_UPLOAD_*` and `CATALOG_LISTING_PHOTO_*` constants | API-only validation | Faster feedback; must match API limits; reject empty `file.type` when extension cannot be mapped to a permitted MIME |
| 12 | **`useRevalidator()` after successful upload** | Manual `providersProfilesApi.show()` in page | `clientLoader` uses `ProvidersProfileService.fetchCurrent()` → `providersProfilesApi.show()`, which returns `documents`, `checklist`, and `required_document_kinds`; revalidate reruns that loader |
| 13 | **Replace uploaded document kind** | Hide upload when kind already uploaded | API `find_or_initialize_by(document_kind)` updates the row; UI keeps per-kind upload with copy such as “Replace file” when `isUploaded` |
| 14 | **Upload UI only when profile is editable** | Always show forms; rely on grant 422 | Mirror api-197: `pending` or `rejected` only; hide or disable upload with short explanation when status is not editable |
| 15 | **Grant `byte_size` equals PUT body** | Separate size fields | Use `file.size` for grant `byte_size` and PUT body so api-197 HEAD/register checks pass |

## Web contract

### HTTP used (from api-197)

| Method | Path | Client module | When |
| --- | --- | --- | --- |
| POST | `providers/uploads` | `providers-uploads-api.js` | Before document or listing photo register |
| PUT | `upload_url` from grant | `PlatformObjectStorageService.putUploadBytes` | Direct to S3 or disk API |
| POST | `providers/documents` | `providers-documents-api.js` | After successful PUT |
| POST | `providers/catalog/listings/:id/photos` | `providers-catalog-listings-api.js` | After PUT (helper only in #144) |

Tourist `POST tourists/uploads` is **not** called in #144 (review photos deferred).

### Surfaces and routes

| Surface | Route | Loader | Change |
| --- | --- | --- | --- |
| Provider | `/providers/registration/documents` | `clientLoader` (existing) | Per-kind upload (replace allowed); page submit + revalidate; editable gating |
| Marketplace | `/jp/:district/:area` (discover list) | existing | `catalog-listing-list-view.jsx` uses `thumbnail_photo.url` when set |
| Marketplace | listing detail | existing | `catalog-listing-hero-view.jsx` and detail view use `photos[0].url` when set |

Auth: existing **provider-required-policy** parent; no new HOCs.

### Grant request shapes (provider)

**`provider_document`**

```json
{
  "upload_kind": "provider_document",
  "content_type": "application/pdf",
  "byte_size": 1024
}
```

**`listing_photo`** (helper / tests only in #144)

```json
{
  "upload_kind": "listing_photo",
  "content_type": "image/jpeg",
  "byte_size": 2048,
  "listing_id": "<listing-uuid>"
}
```

### Grant response (client must handle)

| Field | Use |
| --- | --- |
| `storage_key` | Pass to register APIs only |
| `upload_url` | `fetch` PUT target |
| `upload_headers` | Spread into PUT headers (include `Content-Type`) |
| `expires_at` | Optional UI warning if upload slow |

### `PlatformObjectStorageService` (exported API)

| Method | Purpose |
| --- | --- |
| `createProviderUploadGrant({ uploadKind, contentType, byteSize, listingId })` | Calls `providers-uploads-api.create` |
| `putUploadBytes({ file, grant })` | PUT `file` bytes; spread `grant.upload_headers`; grant step must use `byte_size: file.size`; throws on non-2xx |
| `uploadProviderDocument({ file, documentKind })` | Grant + PUT + `providersDocumentsApi.create` |
| `uploadListingPhoto({ file, listingId, displayOrder, altTextEn, altTextJa })` | Grant + PUT + `providersCatalogListingsApi.createPhoto` |

No method accepts `storage_key` from the caller for grant.

### UploadField (shared primitive)

First implementation in this repo. All per-kind document forms use the same props and behavior:

- **Label:** Required visible `label` wired to control `id` (`Form.Label` + `htmlFor`, same pattern as `text-field.jsx`).
- **`accept`:** Pass permitted MIME list (from `DOCUMENT_UPLOAD_PERMITTED_CONTENT_TYPES`) so the OS file picker filters where supported.
- **Errors:** Show validation message via `getFormFieldError` and `isInvalid` on the control (RHF `FormProvider` context).
- **Required indicator:** Support `required` prop when the kind is required.
- **Disabled:** Honor `disabled` when profile is not editable or while submit is in flight.
- **Help text:** Optional `formText` for max size and permitted types (page or form supplies copy).

### Provider documents page wiring

Follow `providers-profile-registration-edit-page.jsx`:

- `ProvidersDocumentUploadForm` receives `documentKind`, `isUploaded` (for replace copy), `disabled` (not editable), `onSubmit`, `onCancel`.
- Page `handleSubmit` calls `PlatformObjectStorageService.uploadProviderDocument`, then `showToast` / `setApiErrorsToFormFields`, then `revalidator.revalidate()`.
- Remove the upload-disabled `Alert`; keep checklist and uploaded list as today.

### Files to create or modify (Web)

**New**

- `app/api/providers-uploads-api.js`
- `app/domains/platform-object-storage/platform-object-storage-service.js`
- `app/domains/platform-object-storage/platform-object-storage-constant.js` (upload kinds enum)
- `app/domains/platform-object-storage/platform-object-storage-service.spec.js`
- `app/components/forms/upload-field.jsx`
- `app/domains/providers-profile/providers-document-upload-form.jsx`
- `app/domains/providers-profile/providers-document-upload-schema.js`

**Modify**

- `app/routes/provider/providers-profile-registration-documents-page.jsx` — per-kind forms, page-level submit + `useRevalidator`, editable gating, replace copy, submit-for-review disabled title update, remove upload-disabled alert
- `app/domains/catalog-listing/catalog-listing-list-view.jsx` — image `src` from `thumbnail_photo?.url` with placeholder fallback
- `app/domains/catalog-listing/catalog-listing-hero-view.jsx` — same for representative photo
- `app/domains/catalog-listing/catalog-listing-detail-view.jsx` — if hero image duplicated, align with `url`
- `app/domains/catalog-listing/catalog-listing-service.js` — optional `resolveListingPhotoUrl(photo)` helper for DRY
- `app/domains/providers-profile/providers-profile-constant.js` — re-export upload limits if not already aligned with API

**Tests**

- `app/routes/provider/providers-profile-registration-documents-page.spec.jsx` (if added) or form unit tests
- Extend `providers-documents-api` usage tests only if needed

## Data / domain touchpoints

- No new global client state; upload is per-form submit.
- **Refresh after upload:** `useRevalidator()` on the documents page is sufficient. `runProviderClientLoaderWithApiErrorFlags` always loads `providerProfile` via `ProvidersProfileService.fetchCurrent()` (`providersProfilesApi.show()`), which includes `documents`, `checklist`, and `required_document_kinds` (API `ProvidersProfileDetailSerializer`). No separate refetch unless implementation finds a gap in tests.
- **Replace:** Re-uploading the same `document_kind` updates the existing row (API manager); UI should not block replace for kinds already in the uploaded list.
- Marketplace pages remain read-only; no upload on tourist surface in #144.

## Out of scope

- Tourist review photo picker and `tourists-uploads-api.js` (follow [web-121](../rev/web-121-tourist-review-submit-ui.md)).
- Provider listing edit page photo UI (`provider-catalog-listings-edit-page.jsx` stub).
- Team document download or moderation photo previews.
- Submit for review (**FR-PRV-005**) until API exposes an endpoint.
- Corporate manifest upload.
- Kamal, S3, and CDN configuration (API / ops).

## Tasks

### Web

- [ ] Confirm api-197 is `status: approved` and grant routes are available in target environment.
- [ ] Add `providers-uploads-api.js` with whitelisted grant payload.
- [ ] Implement `PlatformObjectStorageService` (grant, PUT, composed upload helpers).
- [ ] Add `UploadField` and `providers-document-upload-form` with zod schema.
- [ ] Wire registration documents page (page submit, revalidate, editable gating, replace copy, submit-for-review title).
- [ ] Update marketplace listing views to prefer `url` on photo embeds.
- [ ] Unit tests: grant payload whitelist, PUT error handling, `uploadProviderDocument` happy path (mock fetch + ky).
- [ ] `npm run lint` and `npm run test`.

### Docs

- [x] Run `review-implementation-spec`; set `status: approved` before codegen.
- [ ] Set `status: implemented` after merge; link spec in PR.

## Acceptance criteria

| # | Criterion | Maps to |
| --- | --- | --- |
| 1 | Provider uploads a required document kind in dev (disk-backed API): file appears in uploaded list after `useRevalidator()`. | FR-PRV-004 |
| 2 | Provider can **replace** an already-uploaded kind; list shows updated metadata after revalidate. | FR-PRV-004 |
| 3 | Upload controls are hidden or disabled when profile status is not `pending` or `rejected`, with clear copy. | FR-PRV-004, api-197 |
| 4 | Presign/create-upload request body never includes `storage_key` or client-supplied path fields. | F6, NFR-SEC-006 |
| 5 | Invalid file type, size, or unresolvable MIME is blocked in the form before the upload request. | NFR-SEC-006 |
| 6 | Grant `byte_size` matches bytes PUT (`file.size`). | NFR-SEC-006, api-197 |
| 7 | Marketplace card and hero show photo `url` when present; placeholder when `url` is null. | FR-CAT-011 |
| 8 | `PlatformObjectStorageService.uploadListingPhoto` covered by unit test (mocked) for future catalog UI. | FR-CAT-011 |
| 9 | `UploadField` meets label, `accept`, error, and disabled behavior in **UploadField** section. | frontend.md |
| 10 | Register step succeeds only against API build with api-197 HEAD validation on register. | api-197 |
| 11 | Implementation spec path linked in PR. | — |

## Verification

```bash
# Web (from red-cab-web/)
npm run lint
npm run test -- app/domains/platform-object-storage/
npm run test -- app/domains/providers-profile/
```

Manual (with API api-197 in dev):

1. Sign in as provider; open `/providers/registration/documents`.
2. Upload a PDF under 10 MB for a required kind.
3. Confirm document row appears and checklist updates after revalidate (no full page reload).
4. Upload again for the same kind; confirm row updates (replace).
5. Open marketplace listing with configured public base URL; confirm image not placeholder.

## Review record

| Date | Reviewer | Tool / model | Outcome |
| --- | --- | --- | --- |
| 2026-10-12 | Mark (author) | `review-implementation-spec` (Composer) | Should-fix and author Q&A applied; `status: approved` |
