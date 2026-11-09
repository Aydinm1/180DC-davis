# Security audit — 2026-11-09

**Status:** Completed assessment; remediation items open
**Scope:** Current working tree (including the unreleased Admin PDF reader), local
production build, read-only hosted database/Storage configuration, public production login.
**Baseline:** `ba65266f3df9cc77efe0eccbb2debd3900aa4097` plus pending PDF changes.

## Assessment

No critical/high-severity access-control defect was confirmed in the reviewed scope.
The application consistently derives roles from the live approved roster and enforces
authorization again in database functions/RLS and Storage. The main confirmed gap is
authenticated resource abuse/retention, followed by two defense-in-depth improvements.
This is a point-in-time engineering audit, not a claim that every possible attack was tested.

| ID | Priority | Finding | State |
| --- | --- | --- | --- |
| SEC-01 | Medium | Upload cancellation does not bound cumulative storage; no hosted cleanup job is supplied | Confirmed locally; fix proposed |
| SEC-02 | Low | HTML responses lack an explicit browser security-header baseline | Confirmed on public production login; hardening proposed |
| SEC-03 | Low | Private submission retry ledger lacks RLS, although all client grants are revoked | Confirmed; no current client exposure |

## SEC-01 — Canceled uploads can accumulate

An approved, enrolled participant can use ordinary `prepareUpload` / authenticated Storage
upload / `cancelUpload` operations repeatedly. The ten-intent limit counts only pending,
unexpired intents. Canceling abandons the intent and frees a slot without removing its
uploaded object. Expiry likewise does not delete bytes. Existing cleanup machinery safely
handles uncommitted paths, but the supplied cleanup command is explicitly local-only and
there is no hosted scheduled cleanup integration in this repository.

**Evidence:** In a disposable local cohort, twelve ordinary member Server Action
prepare/upload/cancel cycles left **12 abandoned intents, 12 stored objects and zero
pending intents**. Only tiny synthetic files were used; every fixture was removed afterward.
The reproduction did not use a forged actor or expose another member's files.

**Impact/precondition:** An approved account, or someone controlling it, can consume
storage and increase retained metadata. Repeated valid replacements also retain history;
the pending-intent cap is not an account byte quota or a time-based throttle. Image preview
and file-inspection routes also lack an application-level per-person request budget.
Their file/pixel/time limits are useful bounds per operation, not cumulative abuse controls.
No production abuse or bill impact was measured. General platform DDoS protection must
not be confused with a verified per-user application quota.

**Recommended order:** Add rolling per-person prepare/inspection/preview limits and a
measured byte budget, then a separately authorized hosted maintenance job using the
existing `cleanup_uploads` claim/retry contract. Preserve committed submissions/history,
handle late resumable transfers, and never delete a current or committed file merely to
meet a quota. Keep failures recoverable and explain any limit to the member.

Sources: [upload actions](../src/lib/uploads/actions.ts),
[pending-intent check](../supabase/migrations/202611040001_submission_images.sql),
[local-only cleanup](../scripts/cleanup-uploads.mjs),
[scoped cleanup implementation](../scripts/lib/cleanup-upload-batches.mjs).

## SEC-02 — Add a browser security-header baseline

A read-only request to `https://www.180dcdavis.com/login` returned HTTP 200, private/no-store
caching and `Strict-Transport-Security: max-age=63072000`. It did **not** return
Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy or
Permissions-Policy. [Next configuration](../next.config.ts) supplies only the landing
indexing header. Private image/PDF endpoints already set their own restrictive headers.

This is missing defense in depth, **not a demonstrated XSS exploit or authenticated
clickjacking bypass**. React text rendering, restricted formatted links, existing cookie
behavior and Server Action origin checks remain important protections.

Add anti-framing and nosniff headers, explicit referrer/permissions policies, and introduce
a tested CSP in Report-Only mode before enforcement. Account for Next's scripts, the local
PDF worker/font/WASM assets, PDF text-layer styles and Supabase/TUS connections. Do not
apply a generic policy that breaks Google sign-in, uploads or the reader. Retain HSTS.

## SEC-03 — Enable RLS on the private retry ledger

`private.submission_requests` is the one application table without RLS enabled. It is in
the unexposed `private` schema, all anonymous/authenticated/service-role table grants are
revoked, and ordinary writes occur through authorized security-definer submission
operations. **No current direct-read or direct-write exposure was found.**

Enable RLS in a reviewed migration without granting new client access. Its existing
privileged receipt operations should continue to work. Remove the narrow legacy
exception from the new security-schema check afterward. This prevents a future grant or
schema-exposure mistake from turning a missing second barrier into a data leak.

Source: [retry-ledger creation and revoked grants](../supabase/migrations/202610250002_team_submissions.sql).

## Verified protections

- All **18 public application tables** have RLS; no direct anonymous access or
  authenticated column/table mutations were permitted. The 23 private tables deny
  direct client access. The private schema is absent from the configured Data API schemas.
- Application security-definer functions use an empty search path and deny anonymous
  execution. Actor-accepting upload/import/cleanup functions are service-only; server
  actions derive the actor from verified authentication. Profiles/user metadata do not
  grant authority. Live role changes and deactivation remove access on later requests.
- Legacy text/link submission functions delegate to the current authorized target
  resolver. Guided approvals, cases and investigations cannot be bypassed with generic
  submissions, forged file intents or stale finalization. Optimistic versions, transaction
  gates, unique targets and receipts protect concurrent submissions/decisions.
- Member/Viewer/cross-team boundaries, private grading references, team briefs,
  unrevealed recommendations/hints, accepted names, attendance codes and admin activity
  remain protected. Only safe published content reaches Viewer/Explore.
- All three **hosted** buckets are private and capped at 20,971,520 bytes. Assignment
  briefs/examples permit only PDFs; submissions have the expected document/image allowlist.
  Hosted Storage's six policies match local definitions. No client overwrite/delete or
  anonymous object policy was found in those definitions.
- User-scoped private downloads/previews recheck RLS and session Storage permissions.
  PDF endpoints are additionally Admin-only. Private responses avoid shared preview caches;
  object URLs are not made public. Image decodes have byte/pixel/time bounds and strip
  preview metadata. Office checks bound archive/XML expansion; PDF.js scripting/forms/
  annotation integration is disabled. Format inspection is not antivirus scanning.
- Formatted instructions render a restricted React text/link/code/table subset, not raw
  HTML. Submission links permit HTTP(S), server file fetches use derived Storage paths,
  and OAuth return paths are restricted to the local app origin. Development-only pages
  return not-found in production.

## Hosted parity and secret/dependency checks

Read-only schema exports found all **79 local application functions identical on hosted
Supabase**, plus one additional hosted `rls_auto_enable` event-trigger function. The 18
application policies and their RLS enablement match; grant differences relate to that
managed event-trigger function. Two table column-order differences have no permission
effect. The managed event-trigger return type is not an ordinary callable Data API action.
Storage policies and bucket configuration were checked separately, without exporting
object rows or reading real uploaded files.

`npm audit` reports **zero advisories** for the current lockfile. A common credential-pattern
scan found no candidates in tracked files; only `.env.example` is tracked. Comparing three
non-public local secret values against **607 local public build/asset files** found no
matches. Public Supabase configuration is intentionally public. This did not decrypt
production environment secrets or scan the complete historical Git object database.

The Vercel active custom-firewall configuration lookup returned `Config not found`.
No custom per-user rate limit was verified; this does not establish that platform DDoS
protection is absent. Google account 2-step enforcement, hosting-account MFA, Auth-provider
settings, backup restore drills and production authenticated browser sessions were not
verified by this audit. Local fixture Google identities are not real Google OAuth acceptance.

## Validation and repeatability

Fresh local production-browser/application/database runs passed **68 entries without
skips**: program/auth (14), Viewer (8), attendance (9), Guided (9), cases (7), investigations
(9), team briefs (6), private PDF reader (6). These cover anonymous/wrong-domain/inactive/
withdrawn/revoked and forged-operation cases, private response boundaries, retries and
concurrent saves. Disposable fixture records/files were cleaned. No real program content,
hosted migrations, runtime configuration, commits, pushes or deployments were changed.

Added [read-only security-schema checks](../scripts/verify-security-schema.mjs), runnable
as `npm run test:security-schema`, to catch accidental table grants, missing RLS, unsafe
privileged function grants/search paths and public/overbroad Storage settings. All four
checks pass. Wire this fast check into future migration/release verification; this change
does not claim a CI pipeline has been configured.

All 121 unit/documentation checks, lint, typecheck and diff checks also pass. Runtime
application code was not changed during this audit; authenticated checks used the already
verified local Webpack production build, including the pending PDF reader.

The existing PDF changes and their validation were preserved. The known local Turbopack
fetch panic remains a build-verification limitation, not a confirmed security defect.
