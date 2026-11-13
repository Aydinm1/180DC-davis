# ADR 0031: Derived schedule resource allocation

**Status:** Accepted
**Date:** 2026-11-13

## Decision

Add an advisory weekly resource view to day-level schedules using existing total-effort,
consultant and scheduled-day fields. Split hours equally across assigned consultants and
distinct scheduled days (weekends included). Sum by the ten simulated project weeks. A
five-hour weekly threshold provides warnings only, not validation or automatic scheduling.

Incomplete tasks are omitted and counted explicitly. Task breakdowns explain contributing
hours. Keep full precision for calculations and capacity checks; round display to two decimal
places. Snapshots derive their own allocation; changing a working plan cannot change history.
Original/Revised share only the selected view and allocation week, with headings explicitly
naming the active plan. Each continues to derive totals from its own rows.

## Consequences

No stored allocation, schema migration, per-consultant hour entry or authorization expansion
is needed. This supersedes the earlier exclusion of a resource-capacity interface specifically
for this advisory view. Legacy week-grid records remain unchanged.
