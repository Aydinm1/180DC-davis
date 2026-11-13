# ADR 0030: Versioned day-level schedule planning

**Status:** Accepted
**Date:** 2026-11-12

## Context

The original schedule exercise stores selected whole weeks. Day-level bars, consultant
assignments and effort estimates need a richer format without altering frozen originals
or previously submitted work. This extends ADR 0029's presentation and row contract.

## Decision

Keep the assignment-scoped schedule workflow and private config/run/attempt/receipt tables.
Use explicit format 2 for new configuration and snapshot metadata; missing format means
legacy format 1. Add stable block IDs and inclusive simulated day ranges 1–70 to stable
task rows, consultant selections 1–5 and total effort hours. Keep format-1 readers/editors.
No existing task JSON, submission timestamp, feedback or original is backfilled.

Use a native pointer-based editor with local gesture previews, day snapping, automatic edge
scrolling and cancellation. Merge neighboring/overlapping task blocks. Exact range forms,
explicit block actions and inline consultant/hour inputs provide equivalent keyboard/touch
editing. Metadata belongs in task rows; exact schedule controls are secondary row actions.
Selected blocks support Delete/Backspace with bar/chart focus, preserving form-field typing.
Hours describe total effort, not duration or per-consultant allocation. No chart dependency,
calendar arithmetic, resource capacity or scheduling engine is introduced.

Configure may leave staffing and hours unset. Drafts permit incomplete work; locking or
submitting requires fully named/scheduled/staffed/estimated tasks. Database validation checks
format and all fields under the existing authorization, optimistic version and receipt
contracts. Reveal/submit preserve original/revised data and snapshot format atomically.
The private disruption, generic-path denials and completion decisions remain unchanged.

A draft configuration without participant/upload/submission history may explicitly upgrade
from whole weeks to full Monday–Sunday blocks. Preserve task IDs, merge connected weeks,
leave staffing/hours unset and require review/save. Started activity never changes format;
format-2 configurations cannot downgrade. Admin/Viewer previews remain write-free and
Viewer practice uses fictional scenarios and schedules.

## Consequences

The application maintains two bounded formats rather than silently translating historical
work. Admin review selects the renderer from each immutable snapshot. A backward-compatible
migration must precede new production code, with normal separate release authorization.
Real assignments are never configured, upgraded or published automatically.

ADR 0031 extends this with an advisory resource-allocation view derived from existing
hours, consultants and scheduled days; no enforced capacity rule is added.

The task-count ceiling is removed by migration 202611130003; byte-size bounds and per-task
validation remain the protection against oversized data. Existing records are not rewritten.
