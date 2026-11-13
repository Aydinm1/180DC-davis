# Architecture Decision Records

- [ADR 0030: Versioned day-level schedules](0030-day-level-schedules.md)

- [ADR 0029: Schedule planning](0029-schedule-planning.md)

- [ADR 0028: Manual attendance projection to Monday](0028-manual-monday-attendance-sync.md)

- [ADR 0027: Private PDF reading during grading](0027-private-admin-pdf-reader.md)

- [ADR 0026: Private per-team assignment instructions](0026-assignment-team-briefs.md)

- [ADR 0025: Private hints and checked investigation submissions](0025-spreadsheet-investigations.md)

- [ADR 0024: Public marketing boundary](0024-public-marketing-boundary.md)

- [ADR 0023: Individual case exercises](0023-individual-case-exercises.md)

- [ADR 0022: Guided team projects](0022-guided-team-projects.md)

- [ADR 0021: Manual assignment completion](0021-manual-assignment-completion.md)

- [ADR 0020: Admin-assigned teams and shared submission targets](0020-admin-assigned-team-submissions.md)

**Status:** Active
**Last updated:** 2026-11-12
**Source of truth for:** Durable decision history and ADR format

Create an ADR for decisions that materially affect architecture, schema, security,
authorization, external contracts, or major product behavior and would be costly to
reverse. Routine components, styling adjustments, and obvious implementation details do
not need ADRs.

## Naming

- [0008 — Manual accepted-member intake](0008-monday-member-import.md)

Use sequential filenames:

```text
0001-short-decision-title.md
0002-next-decision.md
```

Never reuse a number. Supersede an ADR instead of rewriting its historical decision.

## Template

```markdown
# ADR NNNN: Decision title

- **Status:** Proposed | Accepted | Superseded | Rejected
- **Date:** YYYY-MM-DD
- **Supersedes:** ADR link or None
- **Superseded by:** ADR link or None

## Context

What problem or constraint requires a durable decision?

## Decision

What has been decided? State the rule precisely.

## Consequences

What becomes easier, harder, required, or intentionally unsupported?

## Alternatives considered

Which credible alternatives were rejected, and why?
```

Living documents must reflect the current accepted result. ADRs explain the reasoning but
do not override a later source-of-truth update and superseding ADR.

## Accepted decisions

- [ADR 0019: Private assignment grading references](0019-private-assignment-grading-references.md)

- [ADR 0018: Minimal Last active and explicit week review scope](0018-last-active-and-week-review-scope.md)

- [ADR 0017: Test participant enrollments](0017-test-participant-enrollments.md)

- [ADR 0016: Viewer published-program access](0016-viewer-published-program-access.md)

- [ADR 0015: Week workshop attendance](0015-week-workshop-attendance.md)

- [ADR 0014: Focused assignment briefs](0014-focused-assignment-briefs.md)

- [ADR 0013: Written submissions and editor preview](0013-written-submissions-and-editor-preview.md)

- [ADR 0012: Multiple week assignments](0012-multiple-week-assignments.md)

- [ADR 0011: Read-only admin preview](0011-read-only-admin-preview.md)

- [ADR 0010: Separate private assignment briefs](0010-assignment-pdf-briefs.md)

- [ADR 0009: Private upload lifecycle](0009-private-upload-lifecycle.md)

- [ADR 0001: Documentation as product infrastructure](0001-documentation-as-product-infrastructure.md)
- [ADR 0002: Stable runtime and framework channels](0002-stable-runtime-and-framework-channels.md)
- [ADR 0003: Cohort history and advancement outcomes](0003-cohort-history-and-advancement-outcomes.md)
- [ADR 0004: Monday recruiting and GAP reporting](0004-monday-recruiting-and-gap-reporting.md)
- [ADR 0005: Explicit GAP enrollment approval](0005-explicit-gap-enrollment.md)
- [ADR 0006: Monday-ready enrollment foundation](0006-monday-ready-enrollment-foundation.md)
- [ADR 0007: Bring authentication into P5](0007-authentication-in-p5.md)
