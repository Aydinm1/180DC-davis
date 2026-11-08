# ADR 0025: Private hints and checked investigation submissions

**Status:** Accepted
**Date:** 2026-11-08

## Context

A spreadsheet investigation needs optional progressive hints, private accepted names and
evidence-based conclusions. Hint activity must not create grading obligations or completion.
Existing Guided project and case tables have different ownership and completion semantics.

## Decision

Use an Individual `investigation` workflow with assignment-keyed private configuration,
enrollment drafts, distinct hint reveals, immutable submission snapshots and retry receipts.
Keep content server-side until opened, and accepted names admin-only. Stable UUID stage/hint
IDs preserve reveal identity. Use live user-scoped security-definer RPCs over RLS-enabled
tables with direct privileges revoked. No service-key content loader is introduced.

Serialize mutations with the existing submission gate and assignment/run locks; use
optimistic draft versions. A reveal never changes a draft version or fields. Check names
by NFKC normalization, collapsed/trimmed whitespace and case-insensitive exact matching.
Incorrect attempts save only the draft. Correct names atomically create a private structured
snapshot before an ordinary text submission, using a deferred FK. A submission insert guard
requires that private matching snapshot, so generic text/link/file and forged upload
finalization cannot bypass the check. Existing review and completion remain authoritative.

Freeze configuration after participant activity and require readiness at publication.
Expose admin-only review/insights projections, with Official/Test separation and “opened”
terminology. Admin preview is local-only; Viewer practice is fictional. Do not seed the real
answer, student URL or Week 3 configuration. No hints carry a penalty or completion rule.

## Consequences

This reuses grading/history/counts without new submission enums or fabricated completion.
Each attempt retains its original hint context even when more hints are opened later.
Configuration edits after activity require future versioning work; ordinary response
revisions remain available. Hosted migration and real workbook setup are separate releases.
