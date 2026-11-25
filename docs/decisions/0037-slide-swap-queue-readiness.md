# ADR 0037: Slide Swap preparation metadata for review queue

**Status:** Accepted
**Date:** 2026-11-25

## Decision

Expose an admin-only, cohort-scoped paginated RPC returning assignment, group and
enrollment IDs plus current finalized deck readiness. Read it only for cohorts with
published Slide Swap activities. Keep private stories, links, asset references and
proof history out of the queue; do not load the full setup response to derive readiness.

## Consequences

Admins can monitor individual preparation before group submission. Existing submission
and completion counts retain their meaning. The function checks live verified active
Admin access, uses an empty search path and grants execution only to authenticated users;
ordinary members cannot call it. No private-table grants or participant records change.
