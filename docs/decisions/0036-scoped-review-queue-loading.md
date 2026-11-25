# ADR 0036: Scoped metadata loading for the review queue

**Status:** Accepted
**Date:** 2026-11-25

## Context

The shared admin layout loaded 16 datasets, including assignment bodies and all prior
submissions, before the review queue could render. Streaming guided requests helped but
did not remove that initial dependency.

## Decision

Use a lightweight authorized admin root, with queue and full-workspace route groups that
preserve all URLs. Reuse one admin shell while giving the queue a dedicated context and
metadata-only types. Read selected-cohort published assignment metadata, enrolled roster,
current submission metadata, group ownership and manual credits through user-scoped RLS.
Fetch case progress only when needed and keep pagination complete. Header catalogs are
small metadata projections. Load submission content/history through the existing review
path; keep guided requests independently streamed.

## Consequences

Opening the queue no longer waits for unrelated resource/activity/document reads or
transfers submission bodies/history. Navigation across route groups replaces the data
provider, so editor warnings and review-next must be regression-tested. Existing review
and editing pages retain their full loader. No migration, authorization weakening,
private-data cache, new endpoint or application URL is introduced.


## Extension — Weeks catalog (2026-11-25)

Apply the same route isolation to the Weeks list via `(catalog)`. Read week metadata
and assignment counts only; keep full editing under `(workspace)` and preserve all URLs.
Use one shared branded loading component for root/admin/nested boundaries, replacing the
queue-specific loading heading. Authorization and user-scoped database policies remain
unchanged; no schema or API changes are required.
