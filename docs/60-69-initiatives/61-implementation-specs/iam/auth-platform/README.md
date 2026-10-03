---
title: Auth platform implementation specs
sidebar_label: Auth platform
description: Per-issue specs for ADR-018/019 execution (Phase 0–4). Create from _template.md before codegen.
---

## TL;DR

- Specs for the [authentication implementation roadmap](/docs/90-99-engineering-meta/authentication/implementation-roadmap) live here.
- Program sequencing and GitHub issue mapping: [Web platform program strategy](/docs/70-79-business/planning/web-platform-program-strategy).
- GitHub epic: [red-cab-web#77](https://github.com/markmamba/red-cab-web/issues/77). Issue ↔ spec mapping: [Web platform program strategy § GitHub issues](/docs/70-79-business/planning/web-platform-program-strategy#github-issues--auth-phases).
- Committed: [`web-78-ssr-refresh-request-scope.md`](web-78-ssr-refresh-request-scope.md), [`web-79-root-session-read-contract.md`](web-79-root-session-read-contract.md), [`web-80-safe-redirect-helper.md`](web-80-safe-redirect-helper.md), [`web-84-auth-core-modules.md`](web-84-auth-core-modules.md), [`web-85-team-policy-routes.md`](web-85-team-policy-routes.md), [`web-86-tourist-account-policy-routes.md`](web-86-tourist-account-policy-routes.md), [`web-87-corporate-provider-policy-routes.md`](web-87-corporate-provider-policy-routes.md), [`web-88-remove-auth-hocs.md`](web-88-remove-auth-hocs.md), [`web-107-loader-401-revalidate.md`](web-107-loader-401-revalidate.md), [`api-145-portal-gate-forbidden.md`](api-145-portal-gate-forbidden.md), [`api-146-auth-contract-tests.md`](api-146-auth-contract-tests.md) (`status: approved` where listed) — other Phase 0–4 specs: create from `_template.md` when starting each issue.

## Workflow

1. Open a GitHub issue in `red-cab-api` or `red-cab-web` as appropriate.
2. Copy `60-69-initiatives/61-implementation-specs/_template.md` to `web-NNN-{slug}.md` or `api-NNN-{slug}.md` in this folder (template is repo-only; not published on the docs site).
3. Run `review-implementation-spec`; set `status: approved`.
4. Implement with `spec_path` pointing at the committed file.

## Related documents

- [Authentication series](/docs/90-99-engineering-meta/authentication)
- [IAM audit 2026-08](/docs/60-69-initiatives/implementation-specs/iam/iam-audit-2026-08/)
