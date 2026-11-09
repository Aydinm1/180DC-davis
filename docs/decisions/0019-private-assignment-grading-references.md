# ADR 0019: Private assignment grading references

- Status: Accepted
- Date: 2026-10-25

The download-only example restriction is superseded by
[ADR 0027](0027-private-admin-pdf-reader.md); private reference storage remains unchanged.

## Context

Reviewers need criteria and a model answer beside member work. The original rubric
exclusion prevented a scoring system, but also omitted useful private reference material.
Assignment instructions/PDFs are readable by participants and Viewers, so they are not
appropriate storage for private model answers.

## Decision

Allow reference-only rubrics: one optional formatted rubric and example response per
assignment, shared among live admins. No scores, criterion ratings or automated decisions.
Use separate admin-only RLS tables and explicit admin-page DTOs, never shared assignment
contracts or program-preview loaders. All readers use user-scoped clients.

Save text independently through a live-admin RPC with a monotonic text version. Exact
lost-response retries return the saved receipt. File changes use a separate version so
they cannot silently undo text edits or revive a removed PDF through stale upload intent.
Assignment-first locks serialize saves, replacement, removal and cleanup.

Use a separate private PDF-only 20 MB bucket with exact expiring upload intents, no
client overwrite/delete, and service-only inspected finalization. The server verifies
current Auth/admin authority before invoking trusted attestation RPCs, which recheck live
roster authority. Downloads use document IDs and user-scoped Storage with no-store
attachment responses. This is format validation, not malware scanning.

Replacement/removal unsets the current document and retains committed bytes. Local
cleanup abandons expired intents under locks before Storage API deletion; leased paths
are revisited to remove late transfers. Failures remain retryable. No Storage metadata
is directly deleted, no hosted cleanup schedule is introduced, and real data is not seeded.

## Consequences

Members, Viewers and member previews cannot receive the reference through shared DTOs,
database rows, Storage or downloads. Admin editors must save a new assignment first;
reference text and PDF saves are explicitly separate from week/publication saves.
Saved reference metadata protects assignment deletion through restrictive foreign keys.
Historical reference retention/deletion policy and hosted cleanup scheduling are separate
operations work. Existing assignment briefs and submission review statuses are unchanged.
