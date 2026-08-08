---
title: Conceptual ERD Diagrams
sidebar_position: 7
description: Conceptual data model for Red Cab Marketplace.
---

## 11. Conceptual ERD Diagrams

These diagrams are **conceptual**: entities are domain concepts (glossary terms), and associations are domain relationships and identity references — not tables, foreign keys, or storage relationships. Cross-context associations are drawn with the understanding that they are realized by **identity reference, snapshot, or published contract**, never by shared mutable state.

### 11.1 Whole-domain conceptual ERD (cross-context, by identity)

```mermaid
erDiagram
  ACCOUNT ||--o{ PROVIDER : "is principal of"
  ACCOUNT ||--o{ BOOKING : "buyer of"
  ACCOUNT ||--o{ QUOTATION_REQUEST : "submits"

  PROVIDER ||--o{ LISTING : "owns (id ref)"
  PROVIDER ||--o{ LICENSE_RECORD : "holds"
  PROVIDER ||--o| SUPPORT_TRIAL : "granted"

  AREA ||--o{ LISTING : "locates"
  DISTRICT ||--o{ AREA : "contains"
  LISTING ||--|| PRICING_POLICY : "priced by"
  LISTING ||--o{ AVAILABILITY_SLOT : "offers"

  AVAILABILITY_SLOT ||--o{ BOOKING : "reserved by (id ref)"
  LISTING ||--o{ BOOKING : "subject of (id ref)"

  BOOKING ||--o| PASSENGER_MANIFEST : "may have"
  BUNDLE_BOOKING ||--|{ BOOKING : "links two legs"

  BOOKING ||--o{ PAYMENT : "charged via (id ref)"
  BOOKING ||--o| PAYOUT_QUEUE_ENTRY : "owed via (id ref)"
  BOOKING ||--o{ REFUND : "refunded via (id ref)"
  COMMISSION_RATE_SETTING ||--o{ BOOKING : "rate read at checkout"

  QUOTATION_REQUEST ||--o| QUOTATION : "answered by"
  QUOTATION ||--o| INVOICE : "issues"
  QUOTATION ||--o| BOOKING : "converts to (ACL)"
  QUOTATION ||--o| RECONCILIATION_RECORD : "bank transfer reconciled"

  BOOKING ||--o| REVIEW : "completion enables (id ref)"
  LISTING ||--|| RATING_SUMMARY : "scored by"
```

> Reading guide: `||--o{` = one-to-many, `||--o|` = one-to-(zero-or-one), `||--||` = one-to-one, `||--|{` = one-to-(two-or-more) domain associations. "id ref" and "ACL" labels mark associations realized by identity reference or across the anti-corruption boundary, not by ownership.

### 11.2 Catalog & Inventory (intra-context)

```mermaid
erDiagram
  DISTRICT ||--o{ AREA : "contains"
  AREA ||--o{ LISTING : "locates"
  LISTING ||--o{ PHOTO : "has (>=1 to publish)"
  LISTING ||--|| PRICING_POLICY : "priced by"
  PRICING_POLICY ||--o{ PRICING_TIER : "<=5 non-overlapping"
  PRICING_POLICY ||--o{ SEASONAL_OVERRIDE : "labeled date ranges"
  PRICING_POLICY ||--o{ EXTRA_CHARGE : "mandatory/optional"
  PRICING_POLICY ||--o{ CANCELLATION_POLICY_TIER : "<=4 tiers"
  LISTING ||--o{ AVAILABILITY_SLOT : "offers"
  ASSET ||--o{ AVAILABILITY_SLOT : "consumed by (per-asset overlap)"
```

### 11.3 Booking & Checkout with its snapshots and links (intra-context)

```mermaid
erDiagram
  BOOKING ||--|| PRICE_SNAPSHOT : "froze (write-once)"
  BOOKING ||--|| COMMISSION_SNAPSHOT : "froze (write-once)"
  BOOKING ||--|| CANCELLATION_POLICY_SNAPSHOT : "froze (write-once)"
  BOOKING ||--|| SEAT_ALLOCATION : "slot ref + seat count"
  BOOKING ||--|| BOOKING_STATE : "lifecycle position"
  BOOKING ||--o| CANCELLATION_CONTEXT : "initiator + reason"
  BOOKING ||--o| PASSENGER_MANIFEST : "confirmed group only"
  PASSENGER_MANIFEST ||--o{ PASSENGER : "name + age group"
  BUNDLE_BOOKING ||--|{ BOOKING : "two independent legs"
```

### 11.4 Payments & Payouts (intra-context, with Booking facts read-only)

```mermaid
erDiagram
  COMMISSION_RATE_SETTING ||--o{ COMMISSION_SNAPSHOT : "rate value read at checkout"
  COMMISSION_SNAPSHOT ||--o{ PAYMENT : "amount basis (read-only)"
  COMMISSION_SNAPSHOT ||--o| PAYOUT_QUEUE_ENTRY : "net basis (read-only)"
  COMMISSION_SNAPSHOT ||--o{ REFUND : "refund basis (read-only)"
  RECONCILIATION_RECORD ||--o| PAYMENT : "bank-transfer receipt fact"
```

### 11.5 Corporate and Reviews (intra-context)

```mermaid
erDiagram
  QUOTATION_REQUEST ||--o| QUOTATION : "answered by"
  QUOTATION ||--o{ QUOTATION_LINE_ITEM : "itemizes (+10% tax)"
  QUOTATION ||--o| INVOICE : "issues on acceptance"
  REVIEW ||--o{ REVIEW_PHOTO : "has"
  REVIEW ||--o| PROVIDER_RESPONSE : "once published"
  RATING_SUMMARY ||--o{ REVIEW : "aggregates approved only"
```
