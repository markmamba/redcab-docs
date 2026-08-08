---
title: "ADR-010: Identity and Authorization Architecture"
sidebar_label: ADR-010
sidebar_position: 10
description: Architecture decision record 010.
---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## TL;DR

- **Identity & Access** is supporting: authentication, roles, sessions, language preference — not business authority.
- Each context owns its domain gates; IAM exposes a minimal contract (`principal`, `role`, `language`).

## About this document

ADR for identity and authorization architecture.

| Topic | Document |
| --- | --- |
| Identity context | [Identity & Access](/docs/architecture/bounded-contexts/identity) |
| API security | [API Design](/docs/architecture/api-design) |

---

## Status

Accepted

## Context

Per [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture), every concept in Red Cab has exactly one owning context, and Identity & Access is one of the two supporting contexts and the dependency root of them all; per [ADR-004-context-integration-model.md](./adr-004-context-integration-model), contexts collaborate only through published contracts — commands, queries, and domain events — and identity-only references, never by reaching across a boundary; per [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries), an invariant can only be protected by the context that owns the state behind it, and consistency stops at the context edge; and per [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration), external systems supply capabilities but never own the business. Those decisions establish that Identity is upstream of everything, that it is reached only through a minimal published contract, and that whatever it supplies is a fact other contexts consume rather than a mandate they obey. What none of them states in its own right is *why identity is deliberately kept separate from business authority* — why the context that answers "who is acting" is intentionally not the context that answers "is this action allowed here." Because every context in the system consumes the authenticated principal, and because the temptation to let identity alone decide business questions is constant, the reasoning that keeps identity a shared upstream fact while keeping authorization local to each owner deserves to be recorded explicitly. This ADR records that reasoning; it changes nothing about what Identity owns, what its contract exposes, or where each business gate is enforced, all of which remain as locked in [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../api-design.md](/docs/architecture/api-design).

The philosophical core of the decision is two sentences: **authentication establishes identity; authorization protects business ownership.** Identity & Access answers a single, generic question — *who is acting, with what coarse Role, in what language* — and answers it once for the whole platform. Whether that actor may then publish a listing, review a booking, set the Commission Rate, or convert a quotation is a *different* question, answered not by identity but by the context that owns the state those actions would change. Everything the architecture asks of identity and authorization follows from that one distinction between *establishing who someone is* and *deciding what they may do to a particular piece of owned business state*.

The dominant force is that **identity is a generic capability, not a place where Red Cab's business is decided**. Identity & Access is classified supporting rather than core precisely because it encodes no Red-Cab-specific competitive logic: accounts, coarse Roles, and Language Preference are the same shape they would be for any marketplace, whereas frozen revenue splits, verified-only participation, never-overbooked inventory, and verified-only reviews are the logic that makes Red Cab what it is (per [ADR-003](./adr-003-bounded-context-architecture), [../bounded-contexts.md](/docs/architecture/bounded-contexts) §7). Identity is the dependency root only because *identity precedes everything* — someone must be known before they can act — not because it is domain-central. Treating it as core, and letting it accumulate each context's rules about who-may-do-what, would turn the generic subdomain into a god-context holding authority it does not own, exactly the accumulation the supporting classification exists to prevent.

The second force is that **authentication establishes identity but not business authority**. Identity resolves an authenticated principal and a coarse Role — `Tourist | Corporate | Provider | Admin` — and that resolution is a genuine, load-bearing fact every context depends on ([../../business-rules/glossary.md](/docs/business-rules/glossary) §7, `FR-IAM-005`, `FR-IAM-009`). But knowing *who* is acting does not by itself decide whether a specific business action is permitted, because the permissibility of an action is a function of *owned domain state* the identity context cannot see. A principal being authenticated as a Provider does not make that Provider allowed to publish — the right to operate is a verified, Approved status with a valid license decided in Provider Onboarding & Verification (`INV-6`, `INV-7`, `LC-8`). A principal authenticated as a Tourist is not thereby allowed to review any listing — a review may exist only for a genuinely completed booking owned by that Tourist (`INV-5`, `BKG-7`). Identity establishes the actor; the owning context decides the act.

The third force is that **user Roles alone are insufficient to determine business authority**, which is why the architecture keeps Role deliberately coarse and pairs it with domain-state gates owned elsewhere. Role gates which *surface* an actor reaches — the Tourist App, the Client Portal, the Provider Portal, the Admin Panel — and blocks cross-Role access at the boundary (`FR-IAM-009`, `NFR-SEC-004`). But the surface a request arrives on, and the Role that admitted it, confer no business authority by themselves: authorization is evaluated against the principal's Role *and*, where relevant, the additional domain gates owned by the responsible context (per [../api-design.md](/docs/architecture/api-design), API Security Model). Catalog authoring requires Provider Status `Approved` and a valid license on top of the Provider Role; a Review requires a completed booking owned by the requesting Tourist on top of the Tourist Role. Role is necessary but never sufficient; business authority is Role narrowed by the owning context's invariants.

The fourth force is that **business permissions belong to the context that owns the state they protect**. [ADR-007](./adr-007-transaction-and-consistency-boundaries) fixed that an invariant can only be upheld by the single context that owns the state behind it; the right to perform an action is itself such an invariant — "who may change this, and under what conditions" is inseparable from "who owns this." So authorization is *owned by the context that owns the capability*: Identity answers Role, and each context applies its own domain-state gates before it acts (per [../api-design.md](/docs/architecture/api-design), Authorization). Onboarding decides right-to-operate (`INV-6`, `INV-7`); Catalog decides who may author and publish a listing and remains the sole pricing authority (`PRC-1`); Booking governs its own lifecycle transitions (`LC-1..6`); Payments alone sets the Commission Rate (`PAY-2`) and moves money against frozen facts; Reviews decides review eligibility (`INV-5`). Pushing these decisions into Identity would make it a second modifier of state it does not own — the ownership ambiguity [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model) exist to forbid.

The fifth force is that **identity is shared, but authority is local, and identity never transfers ownership of a business decision**. Every context consumes the authenticated principal *by identity only*, exactly as it references any other context's aggregate — holding an identifier and depending on a published fact, never embedding or co-owning the Account, and never reading Account internals (per [ADR-004](./adr-004-context-integration-model), [../../domain/domain-models.md](/docs/domain/domain-models) §2, §3.1). Receiving the principal grants a context the ability to *know who is acting*; it never grants authority over another context's state, just as receiving a domain event grants the right to react but never ownership of the fact ([ADR-008](./adr-008-domain-event-architecture)). A shared identity fact leaves Identity & Access; ownership of any business decision does not leave the context that holds it. This is what lets identity be universal without making Identity powerful: the same principal flows everywhere, and every context still decides its own business questions locally.

The sixth force is that **the published identity contract carries identity without exposing internal implementation**. Identity & Access exposes a deliberately minimal, stable contract — `principal`, `role`, `language` — and nothing else (per [../bounded-contexts.md](/docs/architecture/bounded-contexts) §7, [../overview.md](/docs/architecture/overview) IAM). How an actor was authenticated, and everything an Account holds internally, stays behind that boundary; consumers depend only on the resolved fact. This minimality is not incidental — it is the mitigation for Identity-as-universal-upstream (`CR-6`): because every context depends on this contract, any change to it ripples the widest, so the contract is kept small and stable on purpose. The same published-contract discipline that keeps Catalog's pricing vocabulary and Booking's snapshot behind their surfaces keeps Identity's internals behind its own.

The final force is **evolution of identity without changing the domain**. The authentication methods themselves and the scope of unauthenticated access are deliberately deferred — which methods a principal may be established through (`AMB-021`), how far a Visitor may reach before authenticating (`AMB-022`), and the lockout parameters (`AMB-016`) are all open. That they can be left open is itself the evidence that the architecture accommodates any resolution *without moving a boundary*: because identity is a generic capability behind a minimal contract, and because business authority is decided locally against owned state, an external identity provider that establishes identity is — in the terms of [ADR-009](./adr-009-external-systems-integration) — a *capability the platform invokes*, never an authority for business policy. Whether identity is established one way or another, or by an external provider, the invariants, the ownership map, and the published contracts are untouched. The domain depends on *identity being established*, not on *how* it is established or *who* establishes it.

## Decision

The identity-and-authorization posture is fixed as already established:

- **Identity & Access is a supporting, generic bounded context.** It owns authentication, accounts, coarse Roles, and Language Preference, and is the dependency root because identity precedes all action — but it is supporting, not core, because it encodes no Red-Cab-specific competitive logic (per [ADR-003](./adr-003-bounded-context-architecture), [../bounded-contexts.md](/docs/architecture/bounded-contexts) §7).
- **Authentication establishes identity; it does not establish business authority.** Identity resolves an authenticated principal, a coarse Role, and a language, and answers only "who is acting"; whether a specific business action is permitted is a separate question decided elsewhere (`FR-IAM-005`, `FR-IAM-009`; [../api-design.md](/docs/architecture/api-design), API Security Model).
- **Authorization is evaluated within business ownership boundaries.** Identity answers Role; each context applies its own domain-state gates on top before it acts. A command is refused when the Role or the owning context's domain state does not permit it (per [../api-design.md](/docs/architecture/api-design), Authorization).
- **Business permissions belong to the owning context.** The right to operate is decided by Onboarding (`INV-6`, `INV-7`, `LC-8`); the right to author, publish, and price a listing by Catalog (`PRC-1`); lifecycle transitions by Booking (`LC-1..6`); the Commission Rate and money movement by Payments (`PAY-2`); review eligibility by Reviews (`INV-5`, `BKG-7`). No permission over owned state is owned by Identity.
- **User Roles alone are insufficient to determine business authority.** Role gates which surface an actor reaches (`FR-IAM-009`, `NFR-SEC-004`) but is necessary, not sufficient; business authority is the Role narrowed by the owning context's invariants and domain state. The surface a request arrives on confers no authority by itself.
- **Identity never transfers ownership of a business decision.** Contexts consume the principal by identity only, never reading or mutating Account internals and never acquiring authority over another context's state; knowing who acts is a shared fact, not a grant of ownership (per [ADR-004](./adr-004-context-integration-model), [../../domain/domain-models.md](/docs/domain/domain-models) §2).
- **The published identity contract carries identity without exposing internals.** Identity exposes a deliberately minimal, stable contract (`principal`, `role`, `language`); how identity was established and what an Account holds internally stay behind that boundary, kept small on purpose to limit ripple (`CR-6`; [../bounded-contexts.md](/docs/architecture/bounded-contexts) §7).
- **Identity is shared while business authority remains local.** The same authenticated principal flows to every context, yet every context decides its own business questions against its own owned state; a universal identity does not centralize authority.
- **External identity providers supply a capability, never business policy.** An external provider may establish identity, but the authoritative decision of whether an action is allowed is always an in-domain policy owned by the responsible context; no external identity source becomes authoritative for right-to-operate, pricing, lifecycle, money, or review eligibility (per [ADR-009](./adr-009-external-systems-integration); `AMB-021`).

This decision records *why the architecture separates identity from business ownership*; it changes nothing about what Identity owns, the shape of its contract, the Roles it issues, or where each business gate is enforced, all of which remain as locked in [../overview.md](/docs/architecture/overview), [../bounded-contexts.md](/docs/architecture/bounded-contexts), [../../domain/domain-models.md](/docs/domain/domain-models), and [../api-design.md](/docs/architecture/api-design). The authentication methods (`AMB-021`), guest-access scope (`AMB-022`), and lockout parameters (`AMB-016`) remain open and are not decided here.

## Consequences

### Positive

- **Every business permission has a single guardian.** Because the right to perform an action is decided by the context that owns the state it would change, "who may do this, and when?" always has one in-domain answer, extending the singular-ownership discipline of [ADR-003](./adr-003-bounded-context-architecture) from data ownership to decision authority.
- **Identity stays generic and small.** Keeping business permissions out of Identity means the dependency root never accumulates each context's rules, protecting its supporting classification and holding the universal `principal`/`role`/`language` contract minimal and stable against the widest-rippling coupling risk (`CR-6`).
- **Authorization reinforces bounded-context ownership.** Authority is evaluated where the state lives, so a decision about a Booking, a listing, a payout, or a review cannot be made by a context that does not own it — the same instinct that places consistency boundaries at the context edge ([ADR-007](./adr-007-transaction-and-consistency-boundaries)).
- **Robust authority under coarse Roles.** Because Role is necessary but not sufficient, a compromised or over-broad surface still cannot bypass a domain gate: publishing still requires an Approved provider with a valid license (`INV-6`, `INV-7`), and reviewing still requires an owned, completed booking (`INV-5`, `BKG-7`).
- **Identity independence over time.** Because business authority is local and the identity contract is minimal, the deferred identity decisions can resolve either way and the way identity is established — including via an external provider — can change without moving a boundary or touching an invariant (`AMB-021`, `AMB-022`; [ADR-009](./adr-009-external-systems-integration)).
- **Composes cleanly with the integration model.** Identity is consumed by identity-only reference like every other cross-context fact, so it fits the published-contract discipline of [ADR-004](./adr-004-context-integration-model) without adding a special path or a privileged bypass.

### Negative

- **Authority is evaluated in more than one place.** A single request is checked for Role at the boundary and again against the owning context's domain state; this is more deliberate than a single central check, but it is what keeps each permission with its owner rather than with Identity.
- **Role is intentionally not the whole answer.** Contributors must resist the convenience of treating a Role as a complete grant; the model holds only as long as each context keeps applying its own domain-state gates rather than trusting the surface or the Role alone (per [../api-design.md](/docs/architecture/api-design), Authorization).
- **Admin breadth must come from Role, not bypass.** Admin's wide reach is the breadth of the Admin Role's authorization exercised across the *same* boundary as every other actor; the discipline is defeated the moment breadth is implemented as a privileged path around the owning contexts' gates.
- **The identity contract is a standing ripple risk.** Because every context depends on `principal`/`role`/`language`, the contract must be evolved additively and held stable; this is ongoing discipline the universal-upstream position (`CR-6`) demands and that a less-shared context would not.
- **Deferred identity detail is carried as open questions.** Authentication methods, guest scope, and lockout parameters are intentionally left open (`AMB-021`, `AMB-022`, `AMB-016`); this is deliberate isolation of mechanism from the domain, but it means those decisions are tracked rather than settled here.

## Alternatives Considered

### Identity as the central authorization authority

Letting Identity & Access decide not only who is acting but whether each business action is permitted — a single place that holds every context's rules about who-may-do-what.

Rejected because it makes the generic supporting context a second owner of state it does not hold. The permissibility of publishing, reviewing, transitioning a booking, or setting the Commission Rate depends on owned domain state (`INV-6`, `INV-5`, `LC-1..6`, `PAY-2`) that Identity cannot see and must not replicate; centralizing those decisions would duplicate business logic outside its owner and let it drift, the exact ownership ambiguity [ADR-003](./adr-003-bounded-context-architecture) and [ADR-004](./adr-004-context-integration-model) forbid. It would also swell the dependency root into a god-context and turn its minimal contract into an ever-growing one, worsening the widest coupling risk in the system (`CR-6`).

### Role as a sufficient grant of business authority

Treating the coarse Role as a complete authorization — a Provider Role grants publishing, a Tourist Role grants reviewing — with no further domain-state gate.

Rejected because Role gates *surfaces*, not *business acts*, and the invariants require more than a Role. A Provider Role without an Approved status and a valid license must not publish (`INV-6`, `INV-7`, `LC-8`); a Tourist Role without an owned, completed booking must not review (`INV-5`, `BKG-7`). Making Role sufficient would let a right be exercised without the owned state that legitimizes it, breaching verified-only participation and verified-only reviews — the trust mechanics the architecture treats as first-class ([../overview.md](/docs/architecture/overview), Business drivers).

### External identity provider as authority for business policy

Letting whatever external source establishes identity also carry the authority for business decisions — deriving right-to-operate, eligibility, or other policy from the identity provider rather than from the owning context.

Rejected because it inverts the capability/decision distinction [ADR-009](./adr-009-external-systems-integration) exists to protect. An external provider that establishes identity is a *capability the platform invokes*, not a participant that authors business truth; right-to-operate, review eligibility, pricing authority, and money policy are decided inside their owning contexts and nowhere else (`INV-6`, `INV-5`, `PRC-1`, `PAY-2`). Binding business authority to an external identity source would make in-domain policy depend on a system Red Cab does not own and forfeit the identity independence that leaving authentication methods open (`AMB-021`) is meant to preserve.

### Surface-granted authority (trusting the channel a request arrives on)

Letting the consumer surface itself confer authority — a request that reached the Admin Panel or the Provider Portal is treated as authorized by virtue of the surface.

Rejected because the surface is not the authority. Authorization is evaluated against the resolved principal and Role and the owning context's domain gates on *every* command and query; no surface confers authority by itself, and Admin crosses the same boundary and the same evaluation as every other actor (per [../api-design.md](/docs/architecture/api-design), Role boundaries). Trusting the channel would create a privileged bypass around the owning contexts' gates and undermine the per-owner authority the rest of this decision establishes.

### Identity carrying live account references or write-back authority

Letting the identity a context consumes carry a live handle into the Account, or letting a context write back into identity state, so identity and business state can be "kept in sync."

Rejected because it transfers ownership through the back door the architecture exists to close. Contexts reference identity by id only and never read Account internals or mutate them (per [ADR-004](./adr-004-context-integration-model), [../../domain/domain-models.md](/docs/domain/domain-models) §3.1); a live reference or write-back would make the Account a concept with more than one modifier — the ambiguity [ADR-003](./adr-003-bounded-context-architecture) forbids — and couple every consumer to Identity's internals rather than to its minimal published contract (`CR-6`). A shared identity fact leaves its owner; ownership of that fact does not.

## Related Documents

- [ADR-003-bounded-context-architecture.md](./adr-003-bounded-context-architecture) — the singular-ownership partitioning that makes Identity a supporting context and every business permission the property of the context that owns the state it protects.
- [ADR-004-context-integration-model.md](./adr-004-context-integration-model) — the published-contract, identity-only discipline by which the authenticated principal is consumed without exposing Identity's internals or transferring ownership.
- [ADR-007-transaction-and-consistency-boundaries.md](./adr-007-transaction-and-consistency-boundaries) — the rule that an invariant is upheld only by the context that owns its state, of which per-owner authorization is the decision-authority expression.
- [ADR-008-domain-event-architecture.md](./adr-008-domain-event-architecture) — the "a fact leaves its owner, ownership does not" principle that identity consumption mirrors.
- [ADR-009-external-systems-integration.md](./adr-009-external-systems-integration) — the capability-versus-decision distinction that keeps an external identity provider a supplier of identity, never an authority for business policy.
- [overview.md](/docs/architecture/overview) — top-level architecture, the IAM supporting context, the role-confined consumer surfaces, and the verified-participation trust drivers.
- [bounded-contexts.md](/docs/architecture/bounded-contexts) — authoritative context structure, the Identity & Access §7 definition, the minimal `principal`/`role`/`language` contract, and the `CR-6` universal-upstream coupling risk.
- [api-design.md](/docs/architecture/api-design) — the API Security Model where authentication resolves the principal and authorization is owned by the context that owns each capability.
- [domain-models.md](/docs/domain/domain-models) — the Identity & Access aggregate ownership, the coarse Role value object, and the reference-by-identity rules across contexts.
