# ADR 0033: Private schedule grading examples

**Status:** Accepted
**Date:** 2026-11-13

Store optional original/revised example schedules in the existing admin-only grading
reference row, with an independent schedule_version. The dedicated live-admin RPC validates
bounded day-level schedule JSON, locks the assignment/reference, rejects stale changes,
and safely retries identical saves. Existing text/PDF versions remain independent.
No participant runs, submissions, counts or activity receipts are created by references.

Examples can remain incomplete drafts and can be edited after student work starts. They
are admin guidance, not public instructions. Explicit loaders add them only to admin edit
and review DTOs; existing database RLS denies Member/Viewer reads and direct mutations.
No real assignment or model answer is populated. The migration must precede release.
