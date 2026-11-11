# ADR 0028: Manual attendance projection to Monday

**Status:** Accepted
**Date:** 2026-11-10

## Context

The connected members board has checkbox columns Week 1 through Week 6. Admins want
an explicit attendance-page action to check the matching week for people who attended.
GAP remains the attendance authority; importing Monday checks would create conflicting
sources of truth and matching by name/email alone could affect another cohort cycle.

## Decision

Add a live-admin Server Action scoped to the selected cohort/week. A service-only,
read-only database function rechecks verified UC Davis Google identity and active Admin
roster authority, derives official Present records and returns the existing private
account/board/item-to-enrollment links. Never accept participant IDs, attendance values,
Monday item IDs, column IDs or an actor ID from the browser.

Resolve exactly one checkbox with the selected Week N title on the configured members
board, validating the account, board and configured email column. Before checking an
item, validate its board/email and recheck GAP attendance, test flag, mapping and admin
access. Missing or multiple mappings are reported for explicit resolution; no guessing,
new items, cohort enrollments or automatic links are created. Returning enrollments use
their own stored item links. Test participants never export.

Write only the selected checkbox to true, skipping already-checked values. Leave every
other column and all Not recorded rows unchanged. Repeated/concurrent requests and lost
responses converge on the same value. Per-item failures preserve successes and report
retryable issues. Bound request time, retry transient transport/rate limits, and use at
most three concurrent workers. No background job, webhook or persisted sync ledger.
Checkbox values follow the [Monday checkbox API](https://developer.monday.com/api-reference/reference/checkbox).

## Consequences

Attendance corrections in GAP do not automatically clear Monday boxes previously checked;
admins explicitly correct those in Monday. A sync is a projection checked immediately
before each external mutation, not a transaction across two services. Concurrent external
edits cannot be locked by GAP. Reloaded pages need no stored sync state; retry reads the
board and skips completed checks. No attendance codes, assignment work or private files
leave GAP. The existing intake adapter remains read-only toward Monday; this narrowly
supersedes ADRs 0004/0015's deferred attendance reporting restriction.

Local tests use rollback-only database fixtures and an isolated server-side Monday stub;
real board metadata may be inspected read-only. Hosted migration, release and real-board
acceptance are separate from local verification.
