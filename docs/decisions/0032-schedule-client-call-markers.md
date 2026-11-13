# ADR 0032: Admin-authored client-call markers

**Status:** Accepted
**Date:** 2026-11-13

Add an optional client_call category to day-level schedule task JSON. Administrators set
it in editable starter configuration. Participants retain it while editing the task; the
mutation transaction compares each incoming task category with the frozen starter by ID.
Students may remove starter tasks, but cannot add or change client-call markers. No general
color picker, new format version, table or existing-row backfill is introduced.

Snapshot JSON preserves the marker with original/revised task history. Readers render
missing categories as ordinary green and calls as dark yellow with a readable phone marker.
Existing setup locks, authorization, optimistic saves and retry receipts remain intact.
The additive validator/mutation migration must precede the new production code.
