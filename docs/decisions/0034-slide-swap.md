# ADR 0034 — Assignment-specific Slide Swap groups and private deck exchange

**Status:** Accepted
**Date:** 2026-11-17

Slide Swap is an Individual assignment with one prepared deck per enrolled participant,
but one graded meeting-proof submission per pair/trio. Project teams are cohort-wide and
must not be reused or renamed to represent these temporary presentation groups.

Add assignment-scoped groups/members as a third submission-target owner. Shared proof
keeps one review/version/history; its frozen participant membership gives individual
completion. Existing individual/team targets and files remain unchanged. A withdrawn
participant loses live access without deleting the group, deck snapshots or proof history.

Stories/configuration and deck/proof upload intents remain private. The private
`slide-swap` bucket uses immutable generated paths. User-scoped reads and Storage policies
check live participation; partner decks are available only after an atomic all-ready unlock
and only along the fixed presentation cycle. Preserve story/asset references; a link asset stores the selected URL, not remote contents.
Admins can inspect all frozen decks/stories during proof review. Viewer practice is
fictional and cannot check readiness, upload or read real partner content.

Updated 2026-11-18: decks may be Google Slides/Canva links or five-page PDFs. PDF files
are verified with bounded bytes and a timed PDF.js server parse before service-only
finalization. Link readiness uses a dedicated authenticated RPC with the same live access,
transaction gate, expected-ID and receipt rules. Only HTTPS presentation/design URLs are
allowed; no remote requests or embeds are made. Members configure viewing permissions.
Remote content may change and cannot be automatically checked for exactly five slides. Image proofs reuse existing
bounded image inspection. Generic submission/upload entrypoints cannot create this
workflow's attempts. Ready assets are never removed by abandoned-upload cleanup.

Use the existing transaction gate, optimistic expected IDs/versions and retry receipts
for setup, uploads, unlock and proof replacement. Before unlock, admins may re-pair people
without changing their started story; pending uploads conflict with changed group versions.
After unlock, membership and chosen deck references remain fixed; linked content may change. Existing individual completion credits
provide explicit admin exceptions and never unlock a swap or fabricate a submission.

No Slack sends, automatic pairings, story generation, real Week 5 setup or hosted changes
are part of this implementation.
