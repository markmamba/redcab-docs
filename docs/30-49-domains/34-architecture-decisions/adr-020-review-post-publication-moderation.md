---
title: "ADR-020: Review Post-Publication Moderation"
sidebar_label: ADR-020
sidebar_position: 20
description: Architecture decision record 020.
---

## TL;DR

- A tourist **submitted** review is **public** on the Listing immediately.
- The **Rating Score** updates when the review is published, not after a separate Admin approve step.
- A **Provider** may **report** a published review; the review **stays public** until Team Admin **removes** it.
- Team Admin **dismisses** a report or **removes** the review; only **remove** takes content down.

## About this document

ADR for REV moderation lifecycle after issue #121 product direction (2026-10-10).

| Topic | Document |
| --- | --- |
| Functional requirements | [rev.md](/docs/70-79-business/requirements/functional-requirements/rev) (`FR-REV-004`, `FR-REV-005`, `FR-REV-007`) |
| Rules | [Business Rules](/docs/70-79-business/business-rules/invariants) (`OPR-6`) |
| Decision log | [Open Questions](/docs/70-79-business/planning/open-questions) (supersedes `AMB-019` moderation leg) |
| Implementation | [api-157](/docs/60-69-initiatives/61-implementation-specs/rev/api-157-tourist-submit-review.md), [api-159](/docs/60-69-initiatives/61-implementation-specs/rev/api-159-team-review-moderation-endpoints.md), [api-161](/docs/60-69-initiatives/61-implementation-specs/rev/api-161-provider-review-report.md) |

---

## Status

**Accepted** — Product Owner, 2026-10-10.

## Context

Phase 2 REV specs and API PR #181 used **pre-publication** moderation: tourist submit created `pending_moderation`, and Team **approve** made a review public (`FR-REV-004` and `OPR-6` as of 2026-10-04).

Product direction for tourist review UX (#121) requires **immediate publication** on submit and **post-publication** dispute handling. Provider report plus Admin takedown replaces Admin pre-approve as the primary moderation gate.

The schema already supports `approved`, `removed`, and `is_flagged_by_provider`. The change is **lifecycle semantics**, not a new aggregate.

## Decision

1. **Publish on submit.** Tourist submit sets `moderation_status` to `approved`, sets `approved_at`, and includes the review in marketplace read paths and rating aggregates.
2. **Recalculate on publish.** Submit calls the same rating recalculation path as Admin remove (api-158).
3. **Provider report.** Provider HTTP sets `is_flagged_by_provider` and `flagged_at` on a published review (api-161). Optional report text may be stored when a column exists; reason **codes** stay deferred.
4. **Team queue.** Default Team index surfaces **provider-flagged** published reviews, sorted flagged-first then oldest submitted.
5. **Dismiss report.** Team clears the provider flag; the review stays public. This replaces Team **approve** from the pre-moderation model.
6. **Remove (takedown).** Team **remove** sets `removed`, records reason and admin, and recalculates. This is the only Admin action that hides a review from the public Listing.
7. **Visibility while reported.** A flagged review **remains public** on the Listing until Admin removes it (Gate 1 Q4=A).

## Consequences

- Tourist and marketplace UIs show **live** copy after submit; they must not promise “pending Team approval.”
- `pending_moderation` may remain in the enum for legacy rows; **new** tourist submits must not rely on it as the default path.
- `ReviewApproved` domain events tied to Team approve are **deprecated**; implementation may publish `ReviewReportDismissed` or omit events until W7.
- Web issue #121 and co-shipped API changes must deploy in order: docs → API behavior → staging verify → web.

## Supersedes

- Decision Log `AMB-019` row (2026-10-04) **moderation default** — replaced by this ADR and a new Decision Log entry (2026-10-10). The **14-day window** leg of `AMB-019` is unchanged.
