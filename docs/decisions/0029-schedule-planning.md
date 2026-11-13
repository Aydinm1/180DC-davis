# ADR 0029: Schedule planning with private disruptions and immutable comparisons

**Status:** Accepted; day-level presentation and versioned rows extended by ADR 0030
**Date:** 2026-11-12

## Context

An Individual exercise needs an editable ten-week project grid, an original plan committed
before a disruption is revealed, and a revised plan assessed by admins. Keeping two browser
copies is insufficient for cross-device saves, reveal privacy or reliable grading history.

## Decision

Add the assignment-scoped `schedule` workflow with private configuration, enrollment-scoped
runs, immutable submission-linked attempt snapshots and actor/request receipts. The same
semantic table editor serves admin starter configuration, member editing and read-only
comparisons. Use exactly ten simulated weeks and a single selected-cell color; no date,
dependency, milestone or chart library is introduced. Starting tasks/cells are editable.

User-scoped authenticated RPCs derive current enrollment and enforce verified roster access,
active cohort and published week. Configuration requires draft/Individual mode and freezes
on the first draft or reveal. The shared submission transaction gate serializes configuration,
reveal, replacement and review; optimistic versions reject stale input. Request receipts
recover lost responses without repeating an operation. Original/revised rows have stable
UUIDs and bounded labels/week selections. Reveal atomically saves the immutable original,
creates the revised copy and unlocks server-held disruption text.

Only a dedicated submit operation can create a graded text attempt and its structured
snapshot in one transaction. Existing submission targets, review states, feedback, history,
queue counts and completion remain authoritative. Generic text/link/upload paths, prepared
upload Storage/finalization and manual completion cannot bypass the exercise. Completed
attempts are read-only. Revisions alter only the revised plan/explanation; the original
and all earlier attempt snapshots remain unchanged.

Private tables have RLS and no direct browser or service grants. Narrow reads expose only
own work or admin-authorized review. Unrevealed disruption never enters a member response.
Admin preview simulates locally; Viewer practice uses fictional scenario, starter and
disruption and cannot mutate real records. Common authored instructions remain published.

## Consequences

Admins configure each assignment without a global activity library or hardcoded Week 4.
No real scenario, meeting schedule or cohort configuration is seeded automatically.
Students save explicitly, keep local edits after failures/conflicts, and confirm the
irreversible reveal. Read-only comparison defaults to Revised; phone grids scroll
horizontally with sticky task labels and accessible cell toggles.

The migration adds private storage/RPCs, expands the workflow contract and wraps existing
submission eligibility rather than repurposing Guided project/case/investigation records.
Hosted migration and deployment are separate release actions. The real assignment must
be configured by admins after release.
