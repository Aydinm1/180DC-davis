# ADR 0009: Private intent-based uploads and download-first review

- **Status:** Accepted
- **Date:** 2026-09-22
- **Supersedes:** None

## Context

Private 20 MB submissions require direct transfers, retained revision history, and safe
recovery across Storage and Postgres, which do not share a transaction. A client must
not be able to select another person's path or commit unvalidated bytes.

## Decision

Reserve a private one-hour intent with authenticated ownership, generated immutable
path, metadata and the current attempt version. Use authenticated resumable Storage
uploads with exact-intent INSERT policies. Only the server may attest bounded PDF/Office
format inspection and invoke the service-only finalize operation. Finalization repeats
live authorization, locks the intent/enrollment/current attempt, and atomically creates
one submission/history transition and a repeatable receipt.

Abandonment is terminal. Cleanup claims terminal intents before Storage API deletion and
retains retryable tombstones, so cleanup and commit cannot race into a broken submission.
Committed and historical objects are never orphan-cleanup targets.
The local cleanup command supports owner-scoped fixture validation, bounded batches,
and retryable network/API failure receipts. Lost finalization responses use the same
committed receipt; cancellation errors must not prevent link submission.

Download by submission ID through an authenticated, no-store streaming attachment route.
Only live owners/authorized teammates/admins can read committed files. No public or
persistent signed URLs, embedded document viewers, or Monday exports are generated.

### Amendment — private screenshot previews (2026-11-04)

Standard assignments also accept still PNG/JPEG/WebP files under the same intent and
review lifecycle. Original bytes remain immutable; bounded Sharp decoding verifies
format and rejects corrupt/animated/multipage images above 20 megapixels. Guided
projects retain document-only enforcement across preparation, Storage and finalization.

Admins may inspect images through a submission-ID route with the same live RLS/Storage
permissions as downloads. On each request it creates a metadata-free, auto-oriented PNG
inside 1600 × 1600 without enlargement, with private/no-store/nosniff responses and no
shared optimizer cache. No preview object is persisted. This narrowly supersedes the
earlier no-embedded-viewer limitation for still images only; documents stay download-first.
Retries retain feedback and do not constitute a review decision or automatic credit.

## Consequences

Direct resumable transfer avoids Server Action body limits and supports progress/retry.
Selected browser files and TUS state are session-local; reload requires reselection.
The private server key is required for inspection and attestation, not ordinary reads.
Basic bounded format checks are not antivirus. Hosted cleanup scheduling, malware scanning,
and hosted configuration remain separate operational work.

## Alternatives considered

- Proxying upload bytes through Server Actions: rejected because of request-size limits.
- Committing browser-supplied paths/validation results: rejected because authorization
  and content verification could be bypassed.
- Deleting the previous object on replacement: rejected because it destroys review history.
- Public URLs or embedded Office viewers: unnecessary exposure and scope for download-first review.
