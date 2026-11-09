# GAP Documentation Guide

**Status:** Active
**Last updated:** 2026-08-12
**Source of truth for:** Documentation ownership, reading order, and maintenance

GAP is the 180 Degrees Consulting at UC Davis Growth Analyst Program portal. These
documents keep product and technical decisions consistent across human and AI-driven
changes.

## Reading order

Before making any change:

1. Read [`../AGENTS.md`](../AGENTS.md).
2. Read [`../todo.md`](../todo.md) to understand approved work and current progress.
3. Read the relevant source-of-truth documents below.
4. Inspect the implementation and migrations. Documentation can describe planned work,
   so confirm what exists before editing.

## Document ownership

Point-in-time audit evidence: [Security audit — 2026-11-09](security-audit-2026-11-09.md).
Audit snapshots record checked scope and open findings; canonical behavior remains in
the source-of-truth documents below.

| Document | Owns | Does not own |
| --- | --- | --- |
| [`product-spec.md`](product-spec.md) | Users, workflows, product rules, scope, acceptance | Technical implementation details |
| [`design-system.md`](design-system.md) | Brand, typography, components, responsive and accessibility rules | Product permissions or schema |
| [`architecture.md`](architecture.md) | Routes, boundaries, auth/data flow, mutation patterns | Exact database policy definitions |
| [`data-model.md`](data-model.md) | Tables, relationships, statuses, RLS, Storage | Page composition and visual styling |
| [`operations.md`](operations.md) | Setup, environment, external configuration, deployment | Product behavior |
| [`release.md`](release.md) | Routine release procedure, conditional migration checks (operations companion) | New release authorization or environment setup |
| [`ideas.md`](ideas.md) | Unapproved possibilities and follow-up questions | Approved requirements |
| [`decisions/`](decisions/README.md) | Historical durable decisions and rationale | Current behavior when superseded |
| [`../todo.md`](../todo.md) | Work order, progress, validation gates | Canonical product or technical rules |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Meaningful change history | Future requirements |

## Authority and conflict resolution

- The current implementation must agree with the relevant living source-of-truth file.
- A living document describes the current approved direction, including work not yet
  implemented when clearly labeled.
- ADRs explain why durable decisions were made. A superseded ADR is historical; the
  living docs remain authoritative.
- `todo.md` schedules work but cannot change product or security rules by itself.
- `ideas.md` is never authorization to build something.
- If two living documents overlap, the document whose ownership is most specific wins.
  Resolve genuine conflicts in the same change.

## Maintenance workflow

For every meaningful change:

1. Confirm or add an approved TODO item.
2. Update relevant living docs as part of the change, not afterward.
3. Add an ADR only if the decision is durable and costly to reverse.
4. Add an `Unreleased` changelog entry for user-facing, schema, operational, or security
   changes.
5. Run the TODO item's validation checks.
6. Mark the item complete only when code, tests, docs, and changelog agree.

Each living document begins with:

- `Status`: `Draft`, `Active`, or `Deprecated`.
- `Last updated`: ISO date.
- `Source of truth for`: the decisions governed by the file.

Avoid duplicating full rules across documents. Link to the owning document instead.
