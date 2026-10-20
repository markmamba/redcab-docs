# Wrong and right, one pair per rule

Red Cab examples. Wrong lines are illustrative; names match the platform vocabulary.

## 1. One idea per sentence, under 20 words

Wrong, 35 words:

```
- The tourist selects a departure time and seat count on the marketplace, and the API reserves seats only through the catalog availability service, and the web app must not send a price in the request body.
```

Right:

```
- The tourist selects a departure time and a seat count on the marketplace.
- The API reserves seats only through the catalog availability service.
- The web app must not send a price in the request body.
```

## 2. One sentence per bullet

Wrong, three sentences on one line:

```
- Booking snapshots cannot change after create. The rule is INV-2. Every checkout path must copy catalog state at confirmation time.
```

Right:

```
- Booking snapshots cannot change after create.
- The rule is [INV-2](/docs/70-79-business/71-business-rules/invariants.md).
- Every checkout path must copy catalog state at confirmation time.
```

## 3. Shorter never means less

Wrong, the reason disappeared:

```
- We add `bookings.snapshot_version`.
```

Right:

```
- We add the column `bookings.snapshot_version`.
  - Support can compare the snapshot on the booking to the catalog row at booking time.
```

## 4. Every reference names its kind

Wrong:

```
The DBML says the column is required, but the migration allows null.
```

Right:

```
The file `red-cab-api/docs/db/booking.dbml` says `bookings.status` is required.
- The migration `20260101000000_add_bookings.rb` still allows null on that column.
```

## 5. Name the record in full

Wrong on a page about `Catalog::Departure`:

```
The listing keeps the available seats.
```

Right:

```
The `Catalog::Listing` row keeps `available_seats`.
```

## 6. No invented nouns

Wrong:

```
The hold releases the seats, and the sweep clears stale carts.
```

Right:

```
The checkout session expiry job releases the seats.
- The nightly cleanup job clears stale checkout sessions.
```

## 7. Field values the way code writes them

Wrong:

```
The booking status is confirmed and payment is captured.
```

Right:

```
The manager sets the booking row.
- `status: "confirmed"`
- `payment_state: "captured"`
```

## 8. A heading resolves its own words

Wrong, "the hold" was defined three sections earlier:

```
## What the hold does
```

Right:

```
## The checkout session reserves seats until it expires
```

## 9. A link says what it points at

Wrong:

```
See [ADR-006].
```

Right:

```
See [ADR-006 — Booking snapshots are immutable after create](/docs/30-49-domains/34-architecture-decisions/adr-006-booking-snapshots.md).
```

## 10. Do not borrow a technical word

Wrong:

```
The tuple of provider, listing, and departure is unique.
```

Right:

```
The combination of provider, listing, and departure is unique.
```

## 11. No idioms

Wrong:

```
This invariant is load-bearing for checkout.
```

Right:

```
If we break this invariant, checkout can show a price the API will reject.
```

## 12. Rules are a table

Wrong:

```
The client must not send price, the snapshot must not change, and seats change only in the availability service, and team admins may override geography filters.
```

Right:

| Rule | Applies to | Example |
| --- | --- | --- |
| The client must not send price | always | Web sends only listing and departure ids |
| The snapshot must not change after create | always | A support edit does not rewrite `bookings.snapshot` |
| `available_seats` changes only in the availability service | always | A manager does not decrement the column directly |

## 13. User stories before the design (feature docs and specs)

Wrong: the doc opens with the migration.

Right:

```
## User stories

- US-1: As a tourist, I want to see the total before I pay, so I can decide without surprise charges.
- US-2: As a provider, I want confirmed bookings to keep the price shown at checkout, so my payout matches what the guest saw.
```

Implementation spec narrative uses Tier A; normative `FR-*` lines stay in requirements docs.

## 14. A diagram earns its place

Wrong, six boxes in one straight line with no branch:

Use a numbered list instead (see skill `mermaid-diagram`).

A diagram earns its place when it shows a branch, a state change, or relationships between aggregates.

## 15. Current truth only

Wrong:

```
We used to store price on the booking row, and ADR-006 moved price into the snapshot only.
```

Right:

```
Price at checkout lives only in the booking snapshot.
- History of that decision: [ADR-006](/docs/30-49-domains/34-architecture-decisions/adr-006-booking-snapshots.md).
```

## 16. Code is shown, not described

Wrong:

```
The manager validates in booking_create_manager.rb.
```

Right:

```
The manager rejects a client-supplied price before save.

# app/domains/booking/managers/booking_create_manager.rb:40-44
if request.price_cents.present?
  raise ApplicationError, "price is not accepted from the client"
end
```

(Path is illustrative; verify against `red-cab-api` before citing in a shipped doc.)

## 17. The words table comes first

Wrong, one bullet per column for the whole schema.

Right:

```
## Words used in this issue

| Word | Meaning |
| --- | --- |
| The model `Booking::Reservation` | One confirmed trip for a tourist, in `red-cab-api` under `app/domains/booking/` |
| The table `bookings` | The row the API stores after checkout confirms |
| **Snapshot** | The catalog and price fields copied at booking time; they cannot change after create |
```

Usually 5 to 10 rows, not every column.
