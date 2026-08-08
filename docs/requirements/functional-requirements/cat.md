---
title: CAT — Catalog & Inventory
sidebar_label: CAT
sidebar_position: 4
description: Functional requirements for CAT context.
---

## TL;DR

- Catalog FRs: geography, listings, photos, pricing modes, tiers, seasonal overrides, slots, search, publish gates.
- **Catalog** is the single pricing authority; tourists see only districts/areas with published listings.

## About this document

Functional requirements for **CAT — Catalog & Inventory**.

| Topic | Document |
| --- | --- |
| All FR contexts | [Functional Requirements](/docs/requirements/functional-requirements) |
| Catalog context | [Catalog & Inventory](/docs/architecture/bounded-contexts/catalog) |
| Pricing authority | [Business Rules](/docs/business-rules/invariants) (`PRC-`) |

---

## CAT — Catalog & Inventory
*(Includes Geography, Listings, Pricing, Availability, Search modules. Price is computed only via the Pricing authority, PRC-1.)*

### FR-CAT-001 — District/Area management
The system **shall** allow Admin to create, edit, and deactivate Districts and Areas, each with English and Japanese labels.
- Source: B-05. Status: Approved.

### FR-CAT-002 — District deactivation cascade
When Admin deactivates a District with active Listings, the system **shall** require confirmation stating the affected count and **shall** set those Listings to Unlisted without deleting them.
- Source: B-05. Governs: OPR-10, INV-11. Status: Approved.

### FR-CAT-003 — Discovery of districts and areas
The system **shall** present only Districts and Areas that have at least one Published Listing, and **shall** indicate when an area has no available services.
- Source: B-01, B-02. Governs: INV-8. Status: Approved.

### FR-CAT-004 — Primary discovery navigation
The system **shall** allow Tourists to discover services through the location hierarchy (District then Area). Service type **shall** be available as a filter, not as the primary navigation axis.
- Source: B-01–B-03. Status: Approved (Decision Log `AMB-020`).

### FR-CAT-005 — Service list presentation
The system **shall** present, for a selected Area, each Published Listing with at least its service name, provider name, representative photo, starting price, service type, rating, and review count.
- Source: B-03. Governs: PRC (starting price), REV (rating). Status: Approved.

### FR-CAT-006 — Fully booked visibility
The system **shall** continue to present a Listing that is fully booked for a selected date, marked as fully booked rather than hidden.
- Source: B-03, E-11. Governs: CON-3. Status: Approved.

### FR-CAT-007 — Service detail content
The system **shall** present a Listing detail with description, photo gallery, price breakdown, provider, service type, location, availability, cancellation policy, and reviews; type-specific attributes **shall** be shown for guides and buses.
- Source: B-04. Status: Approved.

### FR-CAT-008 — Unavailable listing graceful state
When a Listing's Provider is suspended or otherwise unavailable, the system **shall** present a temporarily-unavailable state rather than an error or blank.
- Source: B-04. Status: Approved.

### FR-CAT-009 — Listing creation by type
The system **shall** allow an Approved Provider to create a Listing with the attributes applicable to its Provider Type.
- Source: C-01. Governs: LC-8. Status: Approved.

### FR-CAT-010 — Listing creation blocked when not approved
The system **shall not** allow a non-Approved Provider to create a Listing.
- Source: C-01. Governs: INV-6, LC-8. Status: Approved.

### FR-CAT-011 — Photo rules
The system **shall** accept listing photos in the permitted formats up to the published per-image size limit, **shall** reject others, and **shall** treat the first photo as the representative thumbnail.
- Source: C-02. Status: Approved.

### FR-CAT-012 — Minimum photo to publish
The system **shall not** publish a Listing with zero photos.
- Source: C-02. Governs: INV-10. Status: Approved.

### FR-CAT-013 — Pricing mode
The system **shall** allow a Provider to set a Listing's pricing mode as per-person or per-vehicle/flat, and **shall** present and compute price according to the selected mode.
- Source: C-03. Governs: PRC-3. Status: Approved.

### FR-CAT-014 — Group size tiers
The system **shall** allow up to five non-overlapping group-size price tiers and **shall** reject overlapping tiers.
- Source: C-04. Governs: PRC-4. Status: Approved.

### FR-CAT-015 — Duration pricing
The system **shall** allow duration-based rates (e.g. 2-hour, half-day, full-day, custom) where applicable to the Provider Type.
- Source: C-05. Governs: PRC-2. Status: Approved.

### FR-CAT-016 — Seasonal overrides
The system **shall** allow date-range price overrides or multipliers with a label, and **shall** apply them to prices for dates within range.
- Source: C-06. Governs: PRC-5. Status: Approved.

### FR-CAT-017 — Extra charges
The system **shall** allow a Provider to define mandatory and optional extra charges with triggers; mandatory charges **shall** be included in the displayed total and optional charges **shall** be selectable by the Tourist.
- Source: C-07. Governs: PRC-6. Status: Approved.

### FR-CAT-018 — Cancellation policy configuration
The system **shall** allow up to four cancellation tiers per Listing and **shall** apply the Platform Default when none is set.
- Source: C-08. Governs: PRC-7. Status: Approved.

### FR-CAT-019 — Availability slot creation
The system **shall** allow a Provider to create availability slots with date, start time, end time, and capacity, rejecting non-positive durations and past slots.
- Source: C-09. Status: Approved.

### FR-CAT-020 — Per-asset overlap prevention
The system **shall not** allow two overlapping slots on the same Asset, **shall** treat boundary-touching slots as non-overlapping, and **shall** allow overlap across different Assets.
- Source: C-10. Governs: CON-4. Status: Approved.

### FR-CAT-021 — Remaining capacity visibility
The system **shall** present a slot's remaining capacity and **shall** present a slot as fully booked when no seats remain.
- Source: E-11, B-03. Governs: INV-3, CON-3. Status: Approved.

### FR-CAT-022 — Edit/unpublish with confirmed bookings
The system **shall** allow a Provider to edit or unpublish a Listing, **shall** warn when confirmed future bookings exist, and **shall** preserve historical booking data; such changes **shall not** affect confirmed bookings.
- Source: C-11. Governs: INV-11, BKG-8. Status: Approved.

### FR-CAT-023 — Search by date
The system **shall** allow Tourists to filter Listings to those with at least one available slot on a selected date.
- Source: D-01. Status: Approved.

### FR-CAT-024 — Filter by service type
The system **shall** allow filtering by service type.
- Source: D-02. Status: Approved.

### FR-CAT-025 — Filter by language and group size
The system **shall** allow filtering by supported language and by group size, applying conjunctive logic when combined.
- Source: D-03. Status: Provisional (AMB-024 supported languages).

### FR-CAT-026 — Filter by price range
The system **shall** allow filtering by price range using the Listing's starting price, and **shall** allow clearing all filters.
- Source: D-04. Governs: PRC-2. Status: Approved.

### FR-CAT-027 — Sort results
The system **shall** allow sorting by recommended, price (both directions), rating, review count, and newest.
- Source: D-05. Status: Approved.

### FR-CAT-028 — Single pricing authority
The system **shall** compute every displayed and charged price through the single pricing authority so that display, filtering, and checkout prices are consistent.
- Source: architecture. Governs: PRC-1. Status: Approved.

### FR-CAT-029 — Provider asset registration
The system **shall** allow an Approved Provider to register Provider Assets (vehicles or guides) with capacity and vehicle category, and **shall** require every Availability Slot to reference an Asset.
- Source: C-09, architecture. Governs: CON-4, `AMB-023`. Status: Approved.

### FR-CAT-030 — Publish requires Stripe Connected Account
The system **shall not** publish a Listing unless the owning Provider has an active, verified Stripe Connected Account.
- Source: architecture. Governs: INV-12, LC-12. Status: Approved.

### FR-CAT-031 — Per-vehicle slot exclusivity
When a Tourist books a per-vehicle (flat-rate) listing against a slot, the system **shall** set that slot's remaining capacity to zero immediately, regardless of the vehicle's nominal seat capacity.
- Source: E-02. Governs: CON-6. Status: Approved.

---
