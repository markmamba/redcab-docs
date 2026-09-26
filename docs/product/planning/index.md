---
title: Planning
sidebar_label: Planning
sidebar_position: 1
description: Product phasing, cross-cutting program strategy, and open decisions — how delivery tracks relate without blocking each other.
---

## TL;DR

- **Phasing roadmap** sequences bounded-context capability by Phase 0–3 and v2.
- **Tourist UI — pre–Phase 2** is a cross-cutting web track (IA, shell, funnel, Phase 2 UI slots) that runs alongside Phase 1/2 backend work.
- **Web platform program strategy** coordinates the tourist UI track with the **authentication redesign** (ADR-018/019): parallel execution, explicit gates, GitHub issue mapping.
- **Open questions** hold provisional requirements and ambiguity register entries.

## About this document

Planning tier index for product owners, tech leads, and agents. Implementation detail lives under [Engineering](/docs/engineering); architecture decisions under [Architecture](/docs/architecture).

| Topic | Document |
| --- | --- |
| Phase sequencing (IAM → CAT → BKG …) | [Phasing roadmap](/docs/product/planning/roadmap) |
| Tourist marketplace UX (web) | [Tourist UI — pre–Phase 2](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) |
| Auth redesign + tourist UI coordination | [Web platform program strategy](/docs/product/planning/web-platform-program-strategy) |
| Auth execution phases (engineering) | [Authentication implementation roadmap](/docs/engineering/authentication/implementation-roadmap) |
| Auth how-to series | [Authentication](/docs/engineering/authentication) |
| Provisional requirements | [Open questions](/docs/product/planning/open-questions) |

## How to use planning docs

1. **Pick your horizon:** product phase (roadmap) vs cross-repo program (web platform strategy) vs a single issue spec (`engineering/specs/`).
2. **Respect precedence:** business rules → requirements → architecture/ADRs → engineering authentication series → implementation specs → code.
3. **Do not serial-block unrelated tracks:** tourist shell and funnel work does not wait for policy-route migration; production launch of authenticated surfaces waits for auth Phase 0.
4. **Spec-first for code:** approved implementation spec before codegen in `red-cab-api` / `red-cab-web`.

## Agent session playbook

When work touches routes, auth, or tourist surfaces:

1. Read [Web platform program strategy](/docs/product/planning/web-platform-program-strategy) for track boundaries and gates.
2. Read the track-specific doc ([tourist UI](/docs/product/planning/roadmap/tourist-ui-pre-phase-2) or [auth roadmap](/docs/engineering/authentication/implementation-roadmap)).
3. Confirm the issue’s implementation spec is `status: approved` in `docs/engineering/specs/`.
4. Update planning snapshots when closing milestones (tourist snapshot table, program strategy “where we stand”).

## Related documents

- [Product](/docs/product) — product tier entry
- [Engineering specs README](/docs/engineering/specs/) — spec workflow and template
