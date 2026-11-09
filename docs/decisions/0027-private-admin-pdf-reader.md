# ADR 0027: Private PDF reading during grading

**Status:** Accepted
**Date:** 2026-11-09

## Context

Downloading each submitted or example PDF interrupts grading. Reading must preserve
private access and unsaved feedback without creating additional stored copies.

## Decision

Use pinned PDF.js viewer components in a lazy client reader, with version-matched worker,
fonts, CMaps, ICC profiles and image codecs copied locally at build/dev time. Isolate its
CSS. Do not ship the scripting engine; disable annotations, forms, XFA and scripting
integration. Do not activate embedded actions. Bound canvas/embedded-image resolution,
render nearby pages through the rendering queue, and destroy obsolete fetches/controllers.

Document-ID endpoints require live verified active Admin access before user-scoped RLS
metadata and session-authenticated Storage reads. Fetch full files within 20 MB, verify
signatures and stored sizes, and return private/no-store inline responses with nosniff,
same-origin resource policy and restrictive CSP. Missing-MIME historical submissions
additionally need `.pdf` filenames. No schema/RLS widening, arbitrary client paths,
public URLs, external viewer, conversion, OCR, range support or preview storage.
Existing download permissions remain unchanged.

The same native dialog and PDF controller serve inline and expanded reading. Expansion
does not refetch/reparse; Escape/Close restore focus. Examples mount on first Example
selection and remain mounted across tabs. Historical PDFs mount only on View PDF.
Reader actions preserve feedback/decision; actual navigation retains unsaved warnings.

## Consequences

Admins scroll, select/search embedded text, jump pages, zoom/Fit width and expand PDFs.
Scans remain readable without OCR. Unsupported/password/corrupt files retain retry and
Download. Upgrades require matching assets, audit, production builds and browser tests.
Member/Viewer readers and Office conversion are outside this release.

This supersedes download-only restrictions in ADRs 0009 and 0019 specifically for these
Admin PDFs, including explicitly opened submission history.
