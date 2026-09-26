---
title: Auth platform implementation specs
sidebar_label: Auth platform
description: Per-issue specs for ADR-018/019 execution (Phase 0–4). Create from _template.md before codegen.
---

## TL;DR

- Specs for the [authentication implementation roadmap](/docs/engineering/authentication/implementation-roadmap) live here.
- Program sequencing and GitHub issue mapping: [Web platform program strategy](/docs/product/planning/web-platform-program-strategy).
- No specs filed yet — use backlog table in the auth roadmap § Implementation spec backlog.

## Workflow

1. Open a GitHub issue in `red-cab-api` or `red-cab-web` as appropriate.
2. Copy [engineering/specs/_template.md](/docs/engineering/specs/_template.md) to `web-NNN-{slug}.md` or `api-NNN-{slug}.md` in this folder.
3. Run `review-implementation-spec`; set `status: approved`.
4. Implement with `spec_path` pointing at the committed file.

## Related documents

- [Authentication series](/docs/engineering/authentication)
- [IAM specs index](/docs/engineering/specs/iam/)
