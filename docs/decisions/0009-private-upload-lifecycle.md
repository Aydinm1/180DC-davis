# ADR 0009: Private intent-based uploads and download-first review

- **Status:** Accepted
- **Date:** 2026-09-22
- **Supersedes:** None

The download-only restriction is superseded for Admin submitted/example PDFs by
[ADR 0027](0027-private-admin-pdf-reader.md); upload and existing download rules remain.

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
format and rejects corrupt/animated/multipage images and images above 50 megapixels. Guided
projects retain document-only enforcement across preparation, Storage and finalization.

The resolution cap was raised from 20 to 50 megapixels on 2026-11-05 to accommodate
24/48 MP camera images. The 20 MB byte bound, processing timeout and 1600 × 1600
preview bound remain unchanged.

### Amendment — Apple HDR JPEG compatibility (2026-11-05)

Apple HDR photos may include an auxiliary brightness image rather than an unrelated
second photo ([Apple documentation](https://developer.apple.com/documentation/appkit/applying-apple-hdr-effect-to-your-photos)).
Accept exactly one primary JPEG plus one Apple HDR gain map identified by namespaced
XMP inside the auxiliary JPEG's APP1 header. Validate the MPF/TIFF table, version,
entry count, encoding, offsets, sizes, contiguous ranges and complete-file coverage;
reject nested MPF, unrelated images and malformed/unsupported metadata. Use bounded
header/XML traversal and disable XML entities/DTDs. Both JPEGs must fully decode within
50 MP and ten seconds each; auxiliary dimensions cannot exceed the primary, giving a
maximum 100 MP total decoded sequentially. See also the reference
[MPF layout](https://github.com/google/libultrahdr/blob/main/lib/src/multipictureformat.cpp).

Previews render only the oriented primary photo with metadata stripped. The original
HDR JPEG remains immutable and available through existing private downloads. This
narrowly supersedes blanket MPF rejection, not the restriction on unrelated multipicture
uploads. The supplied personal photo is tested locally only and is never a repository
fixture; synthetic HDR containers cover regression tests.

### Amendment — Android Ultra HDR compatibility (2026-11-05)

Extend the same two-image, bounded-decoding policy to Android Ultra HDR v1 JPEGs,
following the [Android format specification](https://developer.android.com/media/platform/hdr-image-format).
Require namespace-checked version 1.0 identifiers in both primary and auxiliary XMP,
exactly two ordered Google container items (Primary/GainMap), JPEG MIME types and an
auxiliary length matching the MPF range. v1 XMP may coexist with ISO 21496-1 metadata;
ISO-only and extra-video/Motion Photo containers remain unsupported. Previews use only
the primary SDR photo, so HDR radiometric metadata is not used for reconstruction.

The [published Pixel 6 Pro sample](https://github.com/MishaalRahmanGH/Ultra_HDR_Samples/blob/main/Originals/Ultra_HDR_Samples_Originals_01.jpg)
has a primary MPF length that undercounts the actual JPEG by 307 bytes. For Android-
identified files only, derive the primary boundary from the valid secondary offset;
the declared primary length must still be in bounds and nonoverlapping. A bounded
marker/entropy scan verifies that each resulting range contains exactly one complete
JPEG, not a gap, appended junk or another image. Both ranges then fully decode using
the existing limits. Apple files retain exact primary-size matching.

Synthetic v1/big/little-endian/legacy/malformed fixtures and public sample checks do not
require an Android device. Published samples are checked locally outside the repo;
physical-device browser selection remains unverified until tested separately.

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
