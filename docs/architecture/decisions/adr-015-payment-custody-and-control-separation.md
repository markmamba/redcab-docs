---
title: "ADR-015: Payment Custody and Control Separation"
sidebar_label: ADR-015
sidebar_position: 15
description: Architecture decision record 015.
---

## TL;DR

- **Custody** and **control** are separate axes: Red Cab MUST hold no customer funds, and MUST remain the authority that determines when a transaction completes.
- Funds are received and held by a **licensed payment provider**; the **Provider is merchant-of-record** for the service; Red Cab's commission arrives only as a provider-routed **platform fee**.
- Settlement is **released on Red Cab's completion determination**, never automatically at capture — the control side is a compliance requirement, not an operational preference.
- The payment provider is engaged only through a **capability-declaring adapter**, and the no-custody posture is asserted at boot.

## About this document

ADR for the separation of fund custody from transaction control on the payment path.

| Topic | Document |
| --- | --- |
| Payments architecture | [Payments Architecture](/docs/architecture/payments-architecture) |
| Financial authority | [ADR-011: Financial Authority Model](/docs/architecture/decisions/adr-011-financial-authority-model) |
| External systems | [ADR-009: External Systems Integration](/docs/architecture/decisions/adr-009-external-systems-integration) |
| Rules | [Business Rules](/docs/business-rules/invariants) (`PAY-13`, `PAY-15`..`PAY-17`) |
| Open items | [Open Questions](/docs/ambiguities/open-questions) (`AMB-037`..`AMB-040`) |

---

## Status

**Proposed** — pending legal counsel opinion.

This ADR is deliberately **not** Accepted. The decision rests on a regulatory position that counsel has not yet confirmed, and three of the conditions it depends on remain open (`AMB-037`, `AMB-039`, `AMB-040`). Marking it Accepted would misrepresent the basis on which it was made. It is recorded as Proposed so that engineering can build against a coherent target while the legal position is settled, and so that a different ruling produces a visible amendment rather than silent drift.

## Context

Red Cab collects payment from Tourists and later pays licensed transport suppliers. Under Japan's Payment Services Act, collecting and moving customer funds in this manner can require registration as a **Funds Transfer Business (資金移動業)** — a process that typically takes one to two years and carries a minimum ¥10 million reserve deposit requirement. That timeline is incompatible with the launch plan, and the reserve requirement is incompatible with the capital position of a pre-revenue marketplace.

There is an exemption for **genuine transaction platforms**, under which payment collection carried out by a transaction-platform provider falls outside the registration requirement. The exemption is conditional, and the condition is the whole of this ADR. It applies only if Red Cab **genuinely runs the marketplace** — setting terms of use and controlling when a transaction completes — rather than acting as a **payment pass-through**. The distinction is not about where money is stored; it is about whether Red Cab exercises substantive commercial control over the transaction it is collecting for.

That produces a **two-sided test**, and this is the force that reshapes the payment architecture:

1. **No custody.** Red Cab must not be the legal recipient or holder of customer funds. Funds Transfer Business registration is triggered by *Red Cab itself* collecting and moving customer money; if a licensed provider is the party legally receiving and moving the funds, Red Cab's activity is booking facilitation.
2. **Genuine control.** Red Cab must set the terms of use and control when a transaction completes. Absent that, Red Cab is a pass-through, the exemption does not apply, and the no-custody structure achieves nothing.

The previously resolved architecture satisfies the second condition well and violates the first completely. `PAY-13` as originally decided (Decision Log `AMB-001`, `AMB-002`, `AMB-003`, 2026-07-29) mandated **Separate Charges & Transfers** on the **Platform** Stripe account: the Tourist was captured on Red Cab's own account, funds were held on Red Cab's own account until Booking `COMPLETED`, and the Provider's net was transferred out afterwards. `AMB-032` compounded this by resolving Red Cab as **merchant-of-record** for the card charge. That is precisely the arrangement the exemption exists to distinguish Red Cab *from*: Red Cab collecting customer money, holding it, and remitting it onward to a third party.

The reason the original decision landed there is instructive, and it is why this ADR frames the problem as two axes rather than one. **The architecture achieved control by means of custody.** Holding the funds is the most direct way to control when they are released, so a design optimising for payout-timing control naturally reached for platform custody. Correcting the custody violation by the obvious route — letting the provider be paid immediately at capture — would satisfy condition 1 while destroying condition 2, because a platform that exercises no control over release is difficult to distinguish from a pass-through. **The cheapest technical correction is the one that forfeits the exemption.** Custody and control must therefore be decoupled deliberately and held apart by rule, because the failure mode in both directions is invisible in ordinary operation and only surfaces under regulatory examination.

A further force is that **the payment provider is not yet selected**. Stripe Connect, Komoju, and PAY.JP are all candidates, and they differ materially in the dimension that matters most here: whose balance holds the funds while they are held, and who controls the release trigger. Committing the domain to one provider's topology before that question is answered would repeat the original error in a new form — encoding a vendor's fund-flow model as if it were a business rule. `ADR-009` already establishes that external systems supply capabilities and never own the business; on the payment path that principle now has a regulatory consequence, not merely an architectural one.

The final force is that **the exemption depends on ongoing behavior, not on a one-time setup**. Terms of use and transaction-completion control are properties Red Cab must continuously exhibit and be able to evidence. A feature added later — instant provider payouts, provider-authored terms, an unattributed automatic completion sweep — could erode the exemption without any single change looking like a compliance decision. Commercial substance therefore has to be expressed as durable, auditable per-transaction facts and as machine-checked configuration, not as prose in a planning document. This architecture has already drifted into platform custody once, silently, during the resolution of `AMB-001`..`AMB-003`. That is the specific failure this ADR is written to prevent recurring.

Note that this ADR does **not** disturb [ADR-011](/docs/architecture/decisions/adr-011-financial-authority-model). The money-facts versus money-movement seam holds unchanged: Booking still owns the frozen commercial snapshots, Payments still owns movement and the Commission Rate, and financial operations still derive from snapshots rather than live configuration. ADR-011 already states that the external rail is responsible for executing charges, **holding funds**, and transferring the Provider's share. This ADR adds a third axis to that model — *where custody sits, and who controls release* — which ADR-011 left to the movement-topology ambiguities.

## Decision

Payment custody and payment control are fixed as independent axes, governed separately:

- **C1 — No custody, on any rail.** Red Cab MUST NOT be the legal recipient or holder of Tourist or Corporate Client funds for the service portion of a transaction, at any point, on any payment rail. This applies to card, wallet, and bank transfer alike (`PAY-13`, `PAY-9`). The service portion never enters a Red Cab account or a Red Cab balance at a payment provider.
- **C2 — Control retained.** Red Cab MUST remain the sole authority determining when a transaction completes and Provider settlement is released (`PAY-15`). Control of transaction completion is a **compliance requirement** grounded in the transaction-platform exemption, not an operational preference, and MUST NOT be traded away for settlement convenience.
- **C3 — Custody with the licensed party.** Funds are received and held by the licensed payment provider from capture until release. The **Provider is merchant-of-record** for the underlying service. Red Cab is merchant-of-record for nothing. This reverses Decision Log `AMB-032`.
- **C4 — Commission as platform fee.** Red Cab's commission reaches Red Cab only as a **platform fee routed by the payment provider**, as consideration for booking orchestration, itinerary management, supplier matching, and customer service. It MUST NOT be structured or described as a residual of funds Red Cab received or held. The fee amount MUST equal the snapshotted `commission_amount` (`INV-2`, `PAY-11`) — the provider applies the split, never defines it (per [ADR-011](/docs/architecture/decisions/adr-011-financial-authority-model)).
- **C5 — Deferred release.** Provider settlement MUST be released on Red Cab's recorded completion determination, never automatically at capture (`PAY-15`). The **Payout Queue Entry** is the evidentiary record of that instruction (`PAY-14`, `LC-6`, `LC-13`), and retains its existing lifecycle.
- **C6 — Capability-declared, machine-checked.** The payment provider is engaged only through an adapter that declares its **settlement model**, **custody location**, **merchant-of-record posture**, **capture timing**, and **clawback capability** as machine-readable configuration. A startup assertion MUST reject any adapter declaring platform custody or platform merchant-of-record, and MUST reject any adapter that cannot support deferred, platform-triggered release. Provider identity MUST NOT appear in domain branching; only declared capability may be branched on.
- **C7 — Disfavored models remain expressible.** `split_at_capture` settlement remains technically supported behind the capability descriptor but is **legally disfavored** under C2 and MUST NOT be enabled without explicit recorded counsel sign-off. This is deliberate: counsel has not yet opined, and the architecture must survive a different ruling without a rewrite.
- **C8 — Commercial substance is architectural.** Terms-of-use acceptance (`PAY-17`) and the transaction-completion determination (`PAY-16`) MUST be recorded as durable, immutable, auditable per-transaction facts, because they are the evidence on which the exemption rests. The completion determination MUST identify the determining actor and the basis; Provider `mark_delivered` is an **input** to that determination, not the determination itself.
- **C9 — Capture timing is a separate axis from settlement timing.** Whether the Tourist's instrument is captured at checkout or nearer to service delivery is independent of when settlement is released, and is declared separately by the adapter (`AMB-039`). Delayed capture is compatible with C1 and C2 and is not foreclosed.

Amounts, splits, and refund bases continue to derive exclusively from the frozen Commission Snapshot and Cancellation Policy Snapshot (`INV-1`, `FIN-6`, `PAY-6`). Nothing in this decision permits an external provider to author a financial fact.

## Consequences

### Positive

- **The registration trigger is removed at the architectural level.** Because Red Cab is never the legal recipient of customer funds on any rail (C1), the activity that triggers Funds Transfer Business registration does not occur, avoiding the one-to-two-year timeline and the ¥10 million reserve requirement.
- **The exemption condition is preserved rather than accidentally forfeited.** Making control an explicit rule (C2, `PAY-15`) prevents the natural drift toward split-at-capture, which would satisfy the custody rule while quietly destroying the commercial-substance argument.
- **Custody drift becomes a build failure.** The boot-time assertion (C6) converts "Red Cab never holds customer money" from a documented intention into an executable check. The prior silent drift into platform custody would not have survived it.
- **Provider selection stays open.** Because the domain branches on declared capability rather than provider identity (C6), the Stripe / Komoju / PAY.JP decision can be deferred until `AMB-040` is answered, and can be revisited without domain rework.
- **The existing payout queue is vindicated, not discarded.** `LC-6`, `LC-13`, `LC-14`, `PAY-8`, and `PAY-14` all survive; the queue gains evidentiary significance. Only the custody location and the transfer's source account change.
- **A different legal ruling is absorbable.** C7 keeps the disfavored settlement model expressible, so a counsel opinion permitting split-at-capture is a configuration change with a sign-off record, not an architectural reversal.
- **ADR-011 composes unchanged.** The facts-versus-movement seam, snapshot immutability, and the prohibition on external systems authoring policy all hold; this decision adds an axis rather than contradicting one.
- **Corporate stops being the worst exposure.** Routing furikomi through a provider-issued virtual account (`PAY-9`) removes funds from a Red Cab bank account on the path that was, prior to this decision, more directly exposed than the card path.

### Negative

- **Refund and chargeback recovery becomes a clawback problem.** With the Provider as merchant-of-record (C3) and liability assigned accordingly, honoring `PAY-7`'s 100% refund guarantee depends on a working clawback mechanism against a sub-merchant (`AMB-038`). A Provider with no balance, no future volume, and no cooperation is an unrecovered loss.
- **Provider selection is materially constrained.** Requiring custody at the provider *and* platform-triggered release (C1 with C5) is a demanding combination that some providers cannot satisfy, and it is not answerable from documentation alone (`AMB-040`).
- **Hold-duration limits become a product constraint.** Providers cap how long funds may be held. Long-lead bookings may exceed those caps, which is unresolvable without lead-time data (`AMB-039`).
- **Cross-border exposure is unresolved and potentially decisive.** Essentially all B2C volume is cross-border by design. `AMB-037` may narrow or disqualify the exemption regardless of how well this architecture is implemented.
- **Completion becomes heavier.** `PAY-16` requires an attributed, immutable determination record, so the auto-completion sweep can no longer complete a Booking anonymously; `OPR-12` needs an explicit system actor and recorded basis.
- **Compliance posture must be actively defended.** The exemption depends on ongoing behavior. Features that look purely commercial — instant provider payouts, provider-authored cancellation terms — can erode it, so C6's assertion and C8's records need to be treated as load-bearing rather than incidental.
- **Provider-neutral persistence costs a migration.** Stripe-specific, non-nullable external reference columns currently make a non-Stripe provider unrepresentable, and correcting that touches every payments table.

## Alternatives Considered

### Retain Separate Charges & Transfers on the Platform account

Keeping the model resolved in `AMB-001`..`AMB-003`: capture the Tourist on Red Cab's own account, hold until `COMPLETED`, transfer the Provider's net afterwards.

Rejected because it is the exact arrangement that triggers Funds Transfer Business registration — Red Cab collecting customer money, holding it, and remitting it onward to a supplier. It satisfies the control condition of the exemption while failing the custody condition outright, and no amount of operational discipline changes the legal characterisation of funds sitting in Red Cab's balance.

### Split at capture, with no platform-controlled release

Letting the provider settle the Provider's net immediately at capture and routing Red Cab's commission as a platform fee, eliminating custody concerns entirely.

Rejected as the default because it forfeits the exemption's second condition. A platform exercising no control over when the transaction completes and funds release is difficult to distinguish from a payment pass-through, which the exemption explicitly excludes. It also discards the payout/refund interlock's natural enforcement (`FIN-5`, `PAY-8`) and converts every non-delivery into a clawback. It is retained as an expressible but disfavored configuration under C7 precisely because counsel has not yet ruled.

### Pursue Funds Transfer Business registration

Registering as a 資金移動業 and keeping the platform-custody architecture unchanged.

Rejected on timeline and capital grounds: one to two years to launch and a ¥10 million minimum reserve deposit. The architecture would be legally sound but the business would not exist to run it. Registration remains the fallback if `AMB-037` disqualifies the exemption for cross-border collection.

### Red Cab as principal (buy and resell transport)

Restructuring so Red Cab contracts as principal, purchasing transport from the Provider and reselling to the Tourist, making the funds Red Cab's own revenue rather than customer money in transit.

Rejected because it changes the business model rather than the payment architecture. Red Cab would become merchant-of-record and seller-of-record, assume service liability and consumption-tax obligations on the full gross rather than on commission, and cease to be the marketing and matching platform the business is designed to be. It also contradicts the commission-based model recorded in the business model and `PAY-2`.

### A uniform payment gateway interface spanning all candidate providers

Defining one interface as the union of Stripe, Komoju, and PAY.JP capabilities and swapping implementations behind it.

Rejected because providers differ in exactly the dimension that carries regulatory weight — whose balance holds funds, and who triggers release. A lowest-common-denominator interface cannot express that difference, so it would either hide a compliance-relevant property or leak provider specifics back into the domain as conditional parameters. C6's capability declaration is preferred: differences are made explicit as data the domain can assert against, rather than smoothed away.

### Documenting the no-custody posture without a machine check

Recording C1 and C3 as rules in the business-rules document and relying on review to uphold them.

Rejected because that is precisely what failed. The custody violation entered the architecture through a resolved decision chain that was internally consistent and passed review, and it persisted through multiple documents without being recognised as a regulatory problem. A property this consequential and this easy to violate invisibly needs an assertion that fails at startup, not a sentence that requires a reader to notice a contradiction.

## Related Documents

- [ADR-009: External Systems Integration](/docs/architecture/decisions/adr-009-external-systems-integration) — the capability-versus-decision distinction that this ADR extends with a regulatory consequence on the payment path.
- [ADR-011: Financial Authority Model](/docs/architecture/decisions/adr-011-financial-authority-model) — the money-facts versus money-movement seam, which holds unchanged; this ADR adds the custody/control axis it left open.
- [ADR-006: Immutable Snapshot Strategy](/docs/architecture/decisions/adr-006-immutable-snapshot-strategy) — the frozen commercial basis from which the platform fee and refund amounts continue to derive.
- [ADR-002: Technology Stack Selection](/docs/architecture/decisions/adr-002-technology-stack) — records Stripe Connect as the assumed rail; superseded on the payments dimension pending provider selection (`AMB-040`).
- [Payments Architecture](/docs/architecture/payments-architecture) — the custody/control seam, flows, and financial invariants as implemented.
- [Business Rules](/docs/business-rules/invariants) — `PAY-13` (custody), `PAY-15` (control), `PAY-16` (determination evidence), `PAY-17` (terms acceptance), `PAY-9` (corporate rail).
- [Open Questions](/docs/ambiguities/open-questions) — `AMB-037` cross-border carve-back, `AMB-038` clawback mechanism, `AMB-039` capture timing, `AMB-040` custody location per provider; reversal of `AMB-002` and `AMB-032`.
- [Booking State Machine](/docs/architecture/booking-state-machine) — where the completion determination sits in the lifecycle.
