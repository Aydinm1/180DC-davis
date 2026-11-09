# GAP Operations Guide

**Status:** Active
**Last updated:** 2026-11-09
**Source of truth for:** Local setup, environment variables, external configuration, and deployment

This file defines the intended operating procedure. Steps marked **Pending** have not yet
been configured or verified.

## Private PDF reader

Review-workspace UI verification (2026-11-09): six PDF, seven grading-reference,
13 Storage, nine team, nine guided and nine investigation entries pass locally without
skips. Desktop/phone screenshots were inspected; long-rubric footer visibility, keyboard
tabs, history, retry and draft/reading-state retention passed. All 121 unit/docs checks,
lint, typecheck, Webpack production build and diff checks pass. Disposable fixtures were
cleaned. This UI revision has no schema changes; the authorized release uses the code-only
path. Verify the exact commit and production aliases through the release runbook.

Security maintenance: run `npm run test:security-schema` against local Docker after
schema changes, alongside the relevant authenticated/Storage regressions and dependency
audit. This is read-only and checks grants, RLS, privileged RPCs and bucket policies.
See [the 2026-11-09 audit](security-audit-2026-11-09.md) for hosted parity evidence and open
follow-ups: cumulative upload limits/hosted cleanup, HTML headers and private retry-ledger
RLS. Those findings are documented; their runtime/schema remediation is not yet applied.

Review now uses a bounded document/tools workspace. Feedback opens first; Rubric and
Example are adjacent tabs with save actions kept below the tools scroller. On phones use
Submitted work / Review. Open History to inspect earlier attempts, then Current submission
to resume reading. These local view changes preserve unsaved feedback and PDF state.

Current submitted PDFs open automatically during Admin review. Use page controls, Find,
zoom/Fit width or Expand; Escape/Close returns focus without losing feedback. Open Example
to load a private example PDF, or View PDF in history to load an older attempt. Download
remains available for unsupported, corrupt or password-protected PDFs. Scans have no OCR.

`predev`, `prebuild` and `pretest` run `scripts/prepare-pdf-assets.mjs`, copying only public
version-matched library assets into ignored `public/pdfjs/<version>/`. The worker, fonts,
CMaps, ICC profiles and codecs are local; vendor CSS is scoped to `.gap-pdf-reader`.
Never place uploads there. Updating pinned `pdfjs-dist` also requires updating the reader's
asset version, then testing worker/font loading, audits, production builds and browsers.
No migration, new environment variable or hosted configuration is required.

Against a local production server, run `GAP_TEST_APP_URL=http://localhost:3004 npm run
test:pdf`. It creates and cleans disposable local users/cohorts/files; never point it at
hosted data. Tests verify live endpoint authorization, exact bytes/headers, lazy history
and Example reads, search/page/zoom/modal behavior and preserved review state.
Local fixture/browser acceptance is separate from real Google-session/production acceptance.

Local acceptance (2026-11-09): six PDF entries, seven grading-reference, nine team and
13 Storage entries pass without skips, including desktop/390px browsers. Coverage includes
18 MB historical reads, multipage text, embedded fonts, image-only scans, password/corrupt
files, expired/revoked access, modal focus/page/zoom/search preservation, download/retry
feedback retention, review-next and obsolete-request cancellation. Screenshots inspected;
fixture-owned records/files cleaned, real files unchanged. All 121 unit/docs checks,
lint, typecheck, generated-type consistency, full/production zero-vulnerability audits,
install-script review, Webpack production build and diff checks pass.

Default local Turbopack verification remains limited: it stalls in fetch handling and
reports `request should be cloneable` from `turbo-tasks-fetch`, including an attempt with
the existing Montserrat bytes supplied through a temporary local font response. No font,
framework or hosted build settings were changed; the final verified app is a normal
Webpack production build. Hosted Turbopack/worker and real Google acceptance require a
separately authorized release. No migration, commit, push or deployment was performed.

## Per-team brief setup

Save the assignment as **Standard / Team**, then open **Instructions → Team briefs**.
Select each existing team, paste its formatted directions and Save team brief. Shared
instructions and assignment PDFs retain their existing save controls. Use Preview as member
and Sample team to inspect each brief. Blank teams remain on shared instructions; this adds
no publication gate. Guided-project directions remain in their existing activity setup.
Real Week 3 briefs are not populated automatically; the supplied Team 1 document is source
material to paste after local implementation and a separately authorized release.

Run `npm run test:team-briefs` against local Supabase, with `GAP_TEST_APP_URL` pointing to a
matching production-mode local server for desktop/phone checks. The suite uses disposable
accounts/cohorts and verifies own-team/draft/Test/privacy boundaries, independent saves,
conflicts/retries, long tables, preview and existing shared review. Migration `202611080002`
must precede production code; hosted migration, commit/push/deployment and real content
configuration remain separately authorized. Local fixture acceptance is not real Google
acceptance. No student records or existing submission timestamps/feedback/files are backfilled.

Local verification on 2026-11-09 passed six team-brief entries, nine team regressions,
six multiple-assignment regressions and 118 unit/docs checks, plus lint, typecheck,
generated types, production build and diff checks. The supplied Warby Parker document
was rendered only in disposable local fixtures through optional `GAP_TEST_BRIEF_SOURCE`;
its text was not copied into the repository or real assignment records. Desktop/phone
screenshots were inspected and fixtures cleaned; hosted migration/release remain pending.

## Spreadsheet investigation setup and verification

In a draft week, save an Individual assignment, open Activity setup, select Spreadsheet
investigation, and complete Setup. Provide the **student** workbook URL, canonical suspect,
optional accepted variants and private grading guidance; inspect/edit the four-stage hint
starter. Save investigation independently, then publish through the existing week controls.
Configuration locks at the first participant draft/reveal. No real Week 3 setup, publication,
answer or student workbook URL is seeded. The located answer-key workbook is linked only
in the starter's private grading guidance, remains unchanged, and must not be used as the
student link.

Run `npm run test:investigations` against local Supabase. Set
`GAP_TEST_APP_URL=http://localhost:3004` with a matching local production build to exercise
desktop/phone setup, drafts/reveals, retry, checked submission, review and preview. The suite
creates disposable cohort/accounts, verifies private database and Storage boundaries,
optimistic conflicts, exact-name normalization, duplicate receipts, hint snapshots and
Official/Test insights, then removes its own fixtures. Never point it at hosted Supabase.
Real Google-session acceptance remains separate from local fixture results. Migration
`202611080001` must precede production code, but hosted migration, real configuration,
commit/push and deployment require separate release authorization.

Local verification on 2026-11-08: nine investigation entries, thirteen Storage entries,
nine Guided entries, seven case entries and fourteen program entries passed without
skips, alongside 116 unit/documentation checks, lint, standalone typecheck, generated-type
consistency, Webpack production build and diff checks. Desktop/phone screenshots were
inspected and disposable fixtures cleaned. This is local fixture evidence, not hosted
migration, real Google acceptance or real Week 3 configuration/publication evidence.

P5 has Supabase-backed reads, server mutations, and Google sign-in code. Local core
workflow and session-authorization acceptance passed on 2026-10-20. Missing configuration shows a
setup error, not mock data. Only unsaved drafts are session-local. Local P6 enables private
file uploads. Local Google callback/admin access and analyst access were user-confirmed;
hosted setup, second-lead provisioning, and extended Monday checks stay open in `todo.md`.

## Routine releases

### Dependency security checkpoint — 2026-11-05

This checkpoint supersedes the older unresolved dependency-audit follow-ups below.
The full npm audit (including development packages) reports zero advisories after
updating transitive Zod from 4.4.3 to 4.6.7 and overriding only
`@typescript-eslint/typescript-estree`'s minimatch dependency from 10.2.6 to 11.0.4.
Both affected packages belong to development-only lint tooling; application/runtime
packages, Next/eslint-config-next 16.4.2 and the React pair remain unchanged.

The override addresses [the minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249)
while upstream typescript-estree still requests minimatch 10. Its consumer uses the
retained named `minimatch()` function, not removed v11 APIs. A type-aware parser regression
checks matching and rejected default-project paths, in addition to full lint/build checks.
Keep the override scoped: unrelated minimatch 3 consumers retain their compatible versions.
Revisit/remove it when upstream requests a patched compatible major and rerun those checks.
Zod's update addresses [its memory-exhaustion advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

The updated lockfile reproduces with `npm ci --ignore-scripts`; install-script review
reports no unreviewed scripts. No install-script approvals were broadened. Verify both
`npm audit` and `npm audit --omit=dev` for subsequent releases. This is local validation,
not evidence that the updated dependencies have been deployed.

### Upload and browser verification

Screenshot support (local implementation): Standard assignments accept PNG, JPG/JPEG and
WebP alongside documents, up to 20 MB/50 megapixels and one file per attempt. Guided work
still requires a document. The private image route uses the same permissions as downloads;
admins get inline PNG previews and Retry, while originals stay untouched. Sharp provides
bounded primary/auxiliary decoding. Apple HDR and Android Ultra HDR v1 JPEGs with one validated gain map
are accepted; ordinary multipicture JPEGs remain unsupported. No migration is needed for
the 50 MP/HDR compatibility adjustment. Android testing uses synthetic files and a public
Pixel sample; actual Android browser file-picker testing remains manual acceptance.
Sharp 0.35.5 is
now an explicit dependency (already present through Next.js); no image optimizer cache or
new environment variables are used. The submissions bucket/function migration must be
applied before releasing this code; hosted migration/deployment are separately authorized.
Use the existing `test:storage` suite with `GAP_TEST_BROWSER=1` and the matching local
production server for image upload/privacy/retry/review/history plus document regressions.
Also run team/guided/type checks. Fixture-only acceptance is not hosted or real-Google proof.
No real Week 3 assignment is created/configured. For the anonymous-feedback use case,
instruct members to upload only the final completion screen, never feedback answers;
GAP verifies identifiable completion, not the external form's anonymity configuration.

Public website development: run the existing npm/Node app and open `/landing`. Edit the
thin page under `(marketing)/landing` and public-site components under
`src/components/marketing`; put website-only assets in `public/marketing`, never private
GAP files. Open GAP still points to `/`, centralized in `src/lib/marketing/site.ts`.
The starter needs no new dependencies, environment values, migration, auth settings or
Vercel project. It is public, not access-protected: robots metadata and X-Robots-Tag only
discourage indexing. No Supabase refresh or Last active recording occurs on public visits.
Run `GAP_TEST_APP_URL=http://localhost:3004 GAP_TEST_BROWSER=1 npm run test:program`
against a matching local production build for session-free public and protected GAP
regressions; the suite uses disposable local fixtures. No hosted or real-Google result
is implied. A future homepage and `/gap` cutover requires its own plan and release,
including callbacks, legacy links, downloads and attendance QR destinations.

Activity presentation: case/guided pages have Instructions / Workspace. New work starts
with instructions; saved work resumes its workspace. Guided final briefs are reached
through Read final-document brief without leaving the assignment or losing selected files.
Admins act only on pending alternatives in Direction requests. Expand Team project progress
to inspect recommended selections and current research; History retains prior snapshots.
No migration or real assignment reconfiguration is required for this presentation change.
Run case/guided and week/activity/assignment browser regressions against the isolated
local production-mode server; verify view switches preserve input/files and send no
mutation requests. Local fixture acceptance is not hosted or real-Google acceptance.

Case response inspection is read-only: select a case assignment in Review queue, filter
Complete / In progress / Not started, then View answers. Finish challenge, not eight saved
answers alone, determines Complete. Existing document-submission totals exclude exercises.
Admin response reads use the existing RPC; no migration or completion backfill is needed.
Run `npm run test:cases` with `GAP_TEST_APP_URL` pointing to a local production-mode server
to verify desktop/phone filtering, answer comparison, permission boundaries and unchanged
case state using disposable fixtures. Never run fixture writes against hosted Supabase.

Guided project setup (local implementation): save a draft assignment in Team mode, open
Assignments → select the assignment → Activity setup, choose Guided project and save its supplied common instructions.
Enter each team's real company/direction/scope in Team directions, then publish the week.
Do not invent recommendations or silently modify existing assignments. Research saves
lock membership and preserve original responses; recommendations lock once research
exists. Missing first-time recommendations may still be supplied. Admin review queue has
a separate Project direction requests section. This is distinct from final grading.
Run `npm run test:guided` against local Supabase; set `GAP_TEST_APP_URL` to a stable local
production server for desktop/phone checks. Skipped browser checks are not acceptance.
Authorized hosted follow-up (2026-10-28): migrations `202610290001` and `202610290002`
applied after an exact two-migration dry run, without seeds, role or Vault changes.
Both receipts, five private RLS tables, denied direct reads/anonymous RPC execution and
four workflow guards verified. All guided tables are empty; existing assignments remain
Standard. Real Week 2 configuration and authenticated hosted acceptance remain manual.

Local guided verification (2026-10-28): nine focused entries pass with zero skips,
including 1280px/390px editor save/reload, research reveal, recoverable network failure,
alternative approval, final PDF upload/download/review, feedback and file-to-link history.
Read-only sample-team preview and guided Viewer practice produce no submission/upload
writes; the existing authorized Last active recorder is explicitly excluded from that
assertion. Direct RPC/HTTP permissions, private table grants, original retention,
concurrent saves/direction races, pending-upload gates and late-team setup pass. Exact
fictional cohorts/accounts/objects are cleaned up; no hosted changes or real directions.
Eight team, 12 program/session, 12 Storage, seven completion, eight Viewer and six
multi-assignment entries pass, all including their enabled browser checks. 82 unit/docs,
lint/typecheck, generated types, Webpack build and diff checks pass. Member screenshots
were inspected. Initial accessible-name test failures and JSON operator grouping were
corrected and rerun; skipped early browser runs were not counted as acceptance.

Manual completion (local implementation): apply `202610280001` locally, never reset.
Admin → Review queue → choose Week 1 and its specific Individual assignment → Not
submitted → Mark complete for each participant who should receive credit. Confirm the
person/assignment. Complete → Undo completion rescinds only that credit. Existing
submissions still use review; next week's Team assignments are unchanged. No actual
participant credits are seeded or automatically applied. Run `npm run test:completion`
with a stable local production server in `GAP_TEST_APP_URL` for desktop/phone and HTTP
checks; omitted app checks are pending, not passes.

Authorized hosted follow-up (2026-10-28): migration `202610280001` applied after a
single-migration dry run. Receipt, enabled RLS, denied direct client writes and anon
RPC execution, and authenticated RPC execution verified. Credit ledger remains empty;
real completion grants require explicit admin action. Code release follows this migration.

Local verification (2026-10-28): seven completion entries pass without skips, including
desktop/phone admin grant/cancel/reload/undo, member Complete/reload and reopened input
after undo. RLS/HTTP tests deny unauthorized callers; concurrency, audit receipts,
existing-work preservation and prepared-file finalization restrictions pass. The 12
program/session, 12 Storage and eight team regressions pass with their browser checks;
80 unit/docs, lint, typecheck, generated types, Webpack build and diff checks pass.
Screenshots were inspected and exact fixture records/objects cleaned up. Initial parallel
program/team runs timed out; separate reruns pass. Duplicate generated `.next/dev/types`
artifacts were moved to `/private/tmp/gap-generated-types.DjgUgs` before typechecking,
without editing source or changing project dependencies. No hosted data or configuration
changed. Real Google acceptance remains separate from these fixture sessions.

Use the [GAP release runbook](release.md) for repeat commit/push, conditional hosted
migration and Vercel verification. It records known targets and the lighter code-only
path; do not repeat backfill/data-preservation inventories when no data change is pending.
Environment setup below is separate from routine release execution.

## Review inbox simplification — local verification

UI polish (2026-10-27): Teams now has a selector-header/read-only roster, explicit
member editing, secondary rename/delete and numbered creation. Review counts use
14px Montserrat with restrained semibold emphasis. Local desktop/phone checks cover
creation conflicts, selection after creation/saves, canceled dirty switches, stale-save
input retention, rename, confirmed deletion, locks and review navigation. Eight team
and five week/activity entries pass without skips; 79 unit/docs, lint, typecheck,
generated-type consistency, Webpack build and diff checks pass. Screenshots are inspected
at 1280px/390px; exact fixtures are cleaned. No schema or hosted changes, commit or deploy.

### Team submission implementation checkpoint (local only)

Apply migrations `202610250002` through `202610250005` in order with local migration up;
never reset or seed the program. These introduce admin-assigned teams, shared targets,
team upload authorization, a consistent provisioning/submission lock order and live
authority rechecks after waiting for locks. All
existing assignments remain Individual; no real teams or conversions are auto-created.
In Members → Teams, create a team, choose it, select participants and Save members.
Official/test teams are separate. In the week editor choose Team submission for a new
assignment, then save. Submitted/upload history locks mode; committed team work locks
membership and deletion. A locked team may still be renamed. No membership repair UI.

Run `npm run test:teams` for isolated local DB/Storage cases. Set GAP_TEST_APP_URL to a
stable production-mode local server for desktop/phone and application-boundary checks;
use its matching production action manifest. The harness removes only its own cohort,
users and object paths. Browser skips are pending, not acceptance. Hosted migrations,
real team setup, commit/push and deployment require separate release authorization.

Local closeout (2026-10-25): eight focused team entries pass without skips, including
1280px/390px admin creation/member assignment and assignment-mode editing, two teammate
sessions, stale-save draft retention, submission/reload/replacement, shared review/feedback,
and team-scoped queues. SQL/Storage/HTTP checks cover first-save/review races, request
replay, private historical downloads, malformed/forged actions, live access revocation,
locked membership, upload invalidation after membership changes and mode-change rollback.
The existing 12 program/session, 12 Storage, seven grading-reference, eight Viewer, nine
attendance, five test-participant and six multiple-assignment entries also pass with
their available desktop/phone checks and no skips. Five week/activity and five written-
response entries also pass, including scoped review-next and non-saving preview flows.
All 77 unit/docs entries, lint,
typecheck, generated-type consistency and Webpack production build pass. Screenshots
were inspected; the test accounts/cohorts and exact object paths were cleaned up.
Initial duplicated-name browser selection and codegen-schema mismatch were corrected
and rerun; permission-review timeouts were retried without expanding permissions/scope.
Default local Turbopack was not rerun. No real teams were created, no existing assignments
were converted, and no hosted migration, commit/push or deployment was performed.

Authorized release checkpoint (2026-10-25): the dry run listed only team migrations
`202610250002`–`202610250005`; all four are now applied on hosted GAP without seeds,
role or Vault changes. Release preflight preserves submission version timestamps during
ownership backfill (the timestamp-trigger pause is transaction-scoped and locally tested
with rolled-back fixtures). Before/after original-column hashes match for nine submission
attempts, 33 enrollment records, two assignments and nine Storage objects. These are
record totals, not official participant counts. Every attempt has its correct target;
new team tables have RLS, anonymous team mutation and browser privileged upload execution
are denied. There are zero teams and zero Team-mode assignments. Code deployment follows;
real team setup/authenticated hosted acceptance remain separate.

Team production release: `9588070` committed/pushed to main; deployment
`dpl_4DzugZEVsx9WT8CjGJTBmdnNkyzB` reached READY in about 45 seconds with the custom
domain aliases. Hosted Next.js/Turbopack build passes. Live /login returns 200;
logged-out /admin/members and /week/1 stream sign-in redirects; anonymous submission
download returns 401/private-no-store. No runtime error logs were returned; no external
log drains are configured. Build audit still reports one high-severity dependency finding;
the production-only audit returns zero (existing development-tooling follow-up remains
open). No real teams or assignment-mode conversions were performed. Actual signed-in
admin/member team acceptance remains a separate real-user check.

The review overview now reports current submissions received and awaiting review by
week and assignment, not participant completion or cohort outcomes. All submissions
excludes unsubmitted obligations; use Not submitted for those. Official/Test scopes
and review/back/next URLs remain separate and intact. No migration is required for
this UI change; the grading-reference work below has its own local migration.

Local verification (2026-10-25): five week/activity and five test-participant entries
pass with production-mode desktop/phone flows at 1280px/390px. Checks cover received
versus awaiting counts, missing-work filters, test exclusion and scoped review navigation;
screenshots were inspected. A phone-only test initially selected a hidden desktop row;
the selector was corrected to target the visible participant and the suite passed.
All 75 unit/docs tests, lint, typecheck and Webpack production build pass. These checks
use exact disposable fixtures, not real participants. Hosted release remains separate.

## Private grading references — local implementation

Release update (2026-10-25): the user authorized the combined grading-reference/review
inbox release. The hosted dry run listed only `202610250001_grading_references.sql`;
that migration was applied without seeds, role or Vault changes. Code deployment and
hosted smoke verification follow; the local acceptance below is not real admin acceptance.

Hosted release verified: `11db9ff` pushed to main; production deployment
`dpl_9VJTX9mRKcRXHEbj54aajnYUXYha` reached READY in about 33 seconds (Next.js/Turbopack),
with www.180dcdavis.com and existing domains aliased. The migration receipt, both new
tables' RLS, empty references/documents, private 20 MB PDF bucket and service-only
upload RPC grants are verified. Live login returns 200; anonymous admin navigation
uses a streamed login redirect without review content; the new example-download route
returns 401/private-no-store. The runtime-error query returned no entries. No external
log drains are configured. These smoke checks do not prove real authenticated grading
acceptance, which remains pending. No reference content or real submissions were changed.

Build audit follow-up: npm reports one high-severity Zod advisory
(GHSA-mrhx-c7xc-m3w5), version 4.4.3 through development-only ESLint dependencies.
`npm audit --omit=dev` reports zero advisories. Track a separately validated dependency
update; this release did not silently rewrite the lockfile or suppress the finding.

Apply `202610250001_grading_references.sql` locally before running the new admin routes;
do not reset/seed. It creates admin-only reference/PDF metadata and the separate private
PDF-only `grading-examples` bucket (20 MB), without changing assignment briefs or real
work. Existing assignments start without reference rows. No hosted migration is implied.

In Weeks → assignment → Grading reference, save the assignment first. Reference text has
its own Save grading reference action; PDF upload/replace/remove saves immediately.
Members and Viewers never see either. Reviewers use the Rubric/Example tabs and protected
Download example PDF. A stale text save retains input: copy it before reloading to reconcile.
After a page reload an unfinished browser file must be selected again. Cancel/retry
controls retain recoverable failures; committed file history is never deleted in-place.

Run `npm run test:grading` against local Supabase. For HTTP and desktop/phone checks, use
`GAP_TEST_APP_URL=http://localhost:3004 npm run test:grading` with a production server
and matching `.next/server/server-reference-manifest.json`. Tests create/remove exact
fictional fixture IDs only. `npm run db:clean:examples -- --owner <fixture-auth-uuid>`
limits cleanup to that owner; omit the owner only for deliberate local maintenance.
Claims expire after five minutes and revisit even previously removed abandoned paths,
so late transfers are retryable. No ready/current/historical committed PDF is targeted.
Failures are recorded; scheduled hosted cleanup and malware scanning remain deferred.
Implementation checks and acceptance are tracked in `todo.md`; release is separate.

Local acceptance (2026-10-25): 74 unit/docs, seven grading-reference, five assignment-PDF,
12 Storage and 12 program entries pass, including isolated production-mode 1280px/390px
browser flows. Grading checks cover private text/PDF access at SQL, Storage and HTTP
boundaries, concurrent/stale saves, rollback, retries/lost responses, transfer cancellation,
confirmed PDF removal, retained historical bytes, scoped cleanup failure/retry/late files,
unsaved navigation, tab comparison and assignment-specific review-next behavior. The
final pass fixed a cancellation-message race by ignoring results from a canceled task.
Screenshots were visually inspected. Lint, typecheck, generated types, Webpack build and
diff checks pass. Stale development-manifest and mixed-build test attempts were rerun
against a stable production server with `GAP_TEST_ACTION_MANIFEST` set to the production
manifest; do not run a build while a test server is serving its output. Default local
Turbopack was not rerun. Final typecheck also encountered byte-identical generated
` 2.ts` cache duplicates; these were moved out of `.next/types` to a recoverable temp
directory, leaving canonical generated files/source intact, and typecheck passed again.
The upstream filesystem cause was not verified. Fixture cleanup was verified; no real analyst records, hosted
migrations, commit/push, deployments or external configuration changed.

## Workshop attendance — release

Apply `supabase/migrations/202610210006_workshop_attendance.sql` with
`npx supabase migration up --local`, never reset/seed a live program. It adds Workshop
resources and attendance tables/policies/RPCs; it does not change existing materials or
enroll participants. The separately approved hosted migration is applied; deployment
and real-session acceptance remain separate from local verification.

1. Sign in as an active admin; open Attendance and select the cohort/week.
2. Set the workshop date, publish the week and activate the cohort if appropriate, then
   Open check-in. Display the code/local QR, closing time and instructions to confirm.
3. Redisplay or Refresh keeps the open code/window. Close ends it early. Reopen deliberately
   issues another code/two-hour window and can correct the date, retaining all marks.
4. Members use the dashboard/week prompt or scan. A QR uses a URL fragment and same-tab
   sessionStorage through sign-in. It is removed from the address bar and excluded from
   OAuth return URLs. Do not distribute screenshots/logs containing a live code publicly.
5. Search the phone roster to Mark present or confirm Undo. Corrections work after closing;
   Attendance history shows actor/time. Not recorded is not an absence or penalty.

`NEXT_PUBLIC_SITE_URL` must be the reachable application origin to generate useful QR
destinations. On another physical phone, localhost points at that phone, not the developer
Mac; use the deployed site after its separately authorized release. QR images are generated
locally with `qrcode`; there is no external QR provider. Browser time only affects display;
the DB clock and locks enforce the two-hour window. There is no expiry scheduler/realtime
service, automatic percentages or Monday export. Shared codes are not anti-cheating proof.

Run `npm run test:attendance` against local Supabase. For browser/action coverage, use
an isolated app server and `GAP_TEST_APP_URL=http://localhost:3004
GAP_TEST_ACTION_MANIFEST=.next/dev/server/server-reference-manifest.json npm run
test:attendance` (single shell command; remove line breaks). For a production server use
`.next/server/server-reference-manifest.json`. The harness creates uniquely identified
fictional accounts/cohorts, runs desktop/phone flows and deletes only those exact fixtures.
It never resets the DB or writes to Monday. Real Google QR sign-in and physical-camera
acceptance remain manual release checks, separate from automated fixture-session handoff.

Private failure attempts are retained; scheduled retention/maintenance is deferred.
Attendance/history foreign keys intentionally prevent deletion of referenced enrollments
and weeks. Never remove retained real attendance merely to bypass a foreign-key error.

Local verification (2026-10-21): all nine attendance entries pass, including 1280px/390px
browser Workshop save/reload/preview order, QR-prefilled clean login return, manual code,
failed request/lost response recovery, receipt reload and admin mark/Undo. SQL/action tests
cover current authority, privacy, returning cohorts, expiry/reopening, rate limits,
concurrent duplicates/closing, versioned corrections and rollback. The 63 unit/docs,
nine enrollment, 12 program/session, 12 Storage, six assignment, five brief and five written
entries pass; lint, typecheck, generated-type consistency, Webpack build and diff checks
pass. Browser regressions run serially against a production build with its matching action
manifest to avoid development reloads and stale-action IDs. Default Turbopack's earlier
environment limitation remains separately tracked. Exact fixtures are removed; no real
analyst work or hosted configuration changed.

The initial attendance audit found nine affected packages, including pinned Next 16.3.5.
The subsequent approved security update aligns Next/eslint-config-next at 16.4.2 and
updates Sharp, source-map-js and brace-expansion through compatible lockfile fixes.
`npm audit --omit=dev` reports zero vulnerabilities. Full audit still reports five high
findings in the ESLint-only braces → micromatch → fast-glob → Next plugin/config chain.
The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no published
patch. Do not use audit --force: its suggested Next lint-config downgrade would break
the matched supported framework baseline. Keep the tooling follow-up open; no claim of
a zero-finding full audit or protection from every vulnerability is implied.

Release verification (2026-10-21): Next/eslint-config-next 16.4.2 passes all 63 unit/docs,
nine attendance, nine enrollment, 12 program/session, 12 Storage, six assignment,
five PDF-brief and five written-response entries. Desktop/phone checks use isolated
local fixtures. Lint, typecheck, generated types, dependency-tree and Webpack build pass.
The stable React pair is retained; no major toolchain upgrade or codemod was required.

Applied only `202610210006_workshop_attendance.sql` to hosted GAP after an explicit
approval and dry run listing no seeds, role files or Vault updates. Verified its migration
receipt, all five table RLS flags, Workshop constraint, denied anonymous RPC execution
and denied member code-table reads. Before/after counts and content fingerprints match
for nine existing program/roster/work tables; all 26 Auth users remain and new attendance
tables are empty. No one was checked in or enrolled by release verification. Commit/push
is authorized; verify Vercel's automatic deployment and real Google/phone attendance next.

## Local development

### Last active, social preview and week overview — local implementation

Apply `202610220002_last_active.sql` locally without reset/seed. The private activity
table starts empty; no existing identity/history is backfilled or reclassified. Admins
see Last active in Portal access after a visible authorized visit; refresh/navigation
fetches the latest value. Values update at most every five minutes, not continuously.
Do not describe them as online status. Activity failures must not block app use.

`public/brand/gap-social-logo.png` is a static 1200 × 1200 public logo-only image. Root OG/Twitter
metadata uses NEXT_PUBLIC_SITE_URL (localhost fallback only for unconfigured local work).
Regenerate using `node scripts/render-social-preview.mjs`; it centers the unmodified
approved compact dark lockup without additional text or an external image service.
The square composition and Twitter summary card replace the earlier wide headline
graphic, which Slack cropped into an illegible thumbnail. The old PNG remains available
for cached references; metadata uses the new filename to avoid reusing its image cache.
Square-logo verification (2026-10-23): visually inspected the generated logo; anonymous
local production requests verify image HTTP 200, 1200 × 1200 dimensions and matching
OG/Twitter summary metadata. All 71 unit/docs tests, lint, typecheck, Webpack build and
diff checks pass. Separately authorized release: `378de11` was committed/pushed and
production deployment `dpl_CEQtXkQHGJfR2GbCPoaLZYmDCJuV` reached READY. Live anonymous
Slack link/image-crawler checks confirm the new PNG returns HTTP 200 at 1200 × 1200,
with matching OG image and Twitter summary metadata on the custom domain. All 81
available build events have no warnings/errors; the runtime error scan returned no
entries. Actual Slack card rendering/cache refresh remains user verification.
Messaging apps may cache an already-posted preview; repost/refresh in that service after
deployment. No favicon replacement is needed. Public metadata contains no learner data.

Custom-domain check (2026-10-23): anonymous requests using Slack's link-crawler user
agent to both `180dcdavis.com` and `www.180dcdavis.com` return the current OG/Twitter
metadata and the public PNG with HTTP 200; the apex redirects to `www`. An older posted
card still showing “Program | GAP” does not match the currently served OG title.
Slack caches crawler responses for roughly 30 minutes; post a new message after cache
expiry, or try a fresh URL such as `https://www.180dcdavis.com/?preview=20261023`.
This verifies HTTP availability, not Slack's actual rendered card or its cache state.
See [Slack's crawler documentation](https://api.slack.com/robots).

Run `npm run test:week-activity` against local Supabase; set GAP_TEST_APP_URL to the
isolated production server for HTTP/browser checks. Tests own disposable accounts/cohort
and exact cleanup. Hosted migration, commit/push/deployment and real Google acceptance
remain separate; the anonymous metadata test does not establish authenticated acceptance.

Navigation performance: unit tests verify all 14 independent workspace datasets start
concurrently, preserve full pagination, reject failed reads and keep request data isolated.
The week/activity and case browser suites assert queue filtering/search makes no server
navigation requests; week/activity also types a full email rapidly to detect lost input.
Use the stable production-mode test server and matching action manifest. These are local
fixture checks, not hosted latency benchmarks. No protected response caching is introduced;
cohort/resource navigation, reload and successful mutation refresh still authorize/fetch.

Local closeout (2026-10-23): the five-entry week/activity suite passes with no skips,
including wrong-domain/unapproved/inactive/anonymous denial, live admin revocation,
concurrent five-minute throttling, GET/prefetch non-recording, visible desktop/phone visits,
failed recording followed by reload recovery, and cross-assignment review-next/back scope.
The PNG composition is visually inspected and public dimensions/OG/Twitter metadata pass.
All 68 unit/docs entries and program/session, assignment, test-participant, Viewer,
written-response, attendance, Storage, PDF and isolated enrollment suites pass. Lint,
typecheck, generated-type consistency, Webpack build and diff checks pass. The existing
Turbopack environment limitation is separate. Exact fixture-owned records/files were
cleaned up; no hosted migration, real account provisioning, push or deployment is claimed.

Hosted release follow-up (2026-10-23): separately authorized migration
`202610220002_last_active.sql` applied after a dry run listing only that migration,
without seeds/roles/Vault changes. Verified its receipt, empty activity table, RLS and
denied anonymous RPC/direct authenticated reads. All twelve captured application/Storage
table fingerprints match before/after. Auth users remain at 28; that live aggregate
changed during verification, so full Auth row equivalence is not claimed. The migration
contains no Auth or existing-program writes. No timestamps were backfilled or identities
provisioned. Commit `4d91a35` reached production READY
(`dpl_4FL5fGzaFpjLhoTbPaYr1ADkNLQ9`) at `https://gap-khaki.vercel.app`. Live login
metadata advertises the public 1200×630 PNG and Twitter large-image card; anonymous
admin/Explore visits redirect to login. No error-level runtime logs were returned for
the release at verification. These smoke checks do not establish authenticated hosted
Last active or week-review acceptance; verify those with approved real users.

### Test participant verification — local only

Apply `202610220001_test_participation.sql` with `supabase migration up --local`; do not
reset/seed. Existing enrollments default to official (`false`). No account is automatically
marked test and no role changes. Under Members → Edit outcomes, enable Test participant
for a deliberately chosen enrollment; keep participation enrolled to use My program.
Use the test-only review/attendance selectors to exercise saved work without official
totals. Removing the flag includes historical work/marks; it is not a cleanup operation.
Do not delete submissions/enrollments to undo a test flag. Future reporting must exclude
tests explicitly; no outbound sync changes are included.

Run `npm run test:test-participants` on local Supabase; set
`GAP_TEST_APP_URL=http://localhost:3004` against an isolated production server for HTTP
and desktop/phone tests. It owns disposable cohort/accounts/files and exact cleanup.
Hosted migration `202610220001` was separately authorized and applied on 2026-10-22
after a dry run listing only that migration, without seeds/roles/Vault updates.
Fingerprints across ten existing application/Auth/Storage tables are unchanged; all 25
existing enrollments remain official and none are automatically marked test. Anonymous
RPC execution is denied. Local validation passes five focused desktop/phone entries,
65 unit/docs, twelve program/session, twelve Storage, eight Viewer and nine attendance
entries, lint/types/generated types and Webpack build. Commit `452e3a1` reached production
READY (`dpl_2bzeMBExfEA3SN1ndm3HUgpmu4Ke`) at `https://gap-khaki.vercel.app`;
real enrollment classification remains an explicit admin choice. Fixture sessions do
not verify hosted Google sign-in.

### Viewer access — release

Apply `202610210007_viewer_role.sql` then `202610210008_viewer_access.sql` using
`supabase migration up --local`, without reset/seed. The enum must commit before access
functions/policies use it. Regenerate types as usual. This creates no real identities,
enrollments or automatic role changes. Hosted migrations, real board provisioning,
commit/push and deployment require separate approval, not prior attendance-release approval.

Add board users under Members → Portal access → Add roster member, selecting Viewer
and their UC Davis email; do not use Add participant or Monday intake. They use the same
Google/active-roster sign-in, then Explore published active/archived programs and local
practice without submitting/checking in/reviewing/administering or reading private work.
Explicitly change roles before future enrollment; resolve enrolled active/draft participation
before conversion to Viewer, preserving historical records.

Run `npm run test:viewers` on local Supabase. Set `GAP_TEST_APP_URL=http://localhost:3004`
and `GAP_TEST_ACTION_MANIFEST=.next/server/server-reference-manifest.json` for action and
desktop/phone checks against an isolated production server. Fixtures include a fictional
24-participant cohort and disposable accounts/files; cleanup targets exact owned records.
Fixture sessions do not verify real Google OAuth acceptance for newly provisioned board users.

Local verification (2026-10-22): eight Viewer entries pass, including Portal access UI
provisioning, desktop/390px browsing and practice, protected PDFs, live role/deactivation
checks, retained-history denial, manual/Monday enrollment guards and concurrent role/
enrollment attempts. Practice sends zero mutation/upload requests; the 24-participant
fixture's participation/work/attendance snapshots remain unchanged by Viewer creation.
All 64 unit/documentation entries and enrollment, program/session, Storage, attendance,
multiple-assignment, brief and written-response regressions pass. Lint, typecheck,
generated-type consistency, Webpack production build and diff checks pass. The existing
Turbopack environment limitation remains separate; real board-user Google acceptance
is not claimed.

Hosted release (2026-10-22): explicitly authorized the Viewer migration and production
release. Dry run listed only `202610210007` and `202610210008`, no seeds, role files or
Vault changes; both applied successfully. Verified enum, two migration receipts, four
enrollment/role guards and service-only upload wrapper grants. Before/after fingerprints
match across 15 existing application/Auth/Storage tables, including all 24 enrollments.
No real Viewer accounts were provisioned. Implementation commit `6679dc4` reached Vercel
production READY (`dpl_7vsdxWmhmteg6sU9H2zSWwceA9s9`) at
`https://gap-khaki.vercel.app`. Live login returns 200 and anonymous Explore/week/admin
requests redirect to login with private/no-store responses. No error-level runtime logs
were returned for that deployment at release verification. Real board-account sign-in
and authenticated hosted Viewer browsing remain manual acceptance, not proven by the
anonymous smoke checks or local fixture sessions.

1. Install native `fnm` through Apple Silicon Homebrew or the official universal macOS
   release, then `fnm install 24` and `fnm default 24`. Initialize `fnm env --use-on-cd
   --shell zsh` in the shell profile and run `fnm use` in interactive shells. `.nvmrc`
   selects Node 24 in this repository. Login-only automation shells also need initialization.
2. Verify `node --version` reports `v24.x`, then run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Install and start Docker Desktop matching the machine architecture. Run `npm run db:start`
   to start the local Supabase stack and apply migrations on first creation. Automatic
   demo seeding is disabled; a fresh program starts empty.
5. Run `npx supabase status` and place the local API URL and public anon/publishable key in
   `.env.local`. Do not use hosted credentials for this milestone. Existing local databases
   need `npx supabase migration up --local` after pulling new migrations. Do not reset a
   database containing work you want to keep.
6. Run `npm run dev` and open `http://localhost:3000`.

## Environment contract

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Current publishable browser key |
| `NEXT_PUBLIC_SITE_URL` | Public | Environment-specific canonical application origin used for OAuth redirects |

The runtime reads the exact names above, not `NEXT_PUBLIC_SUPABASE_ANON_KEY` or other
integration aliases. Never commit `.env.local` or a privileged Supabase key. See the
[deferred Vercel setup guide](#vercel-environment-variable-cleanup--deferred) for mappings.

## Supabase project configuration — Pending

Hosted schema checkpoint (2026-10-20 Pacific): verified project
`zyriqqhtgijvpecceosy` (GAP) had zero application tables/buckets and one Auth user.
Applied all eight repository migrations through `202609220003` using the pinned CLI:

```bash
./node_modules/.bin/supabase db push --project-ref zyriqqhtgijvpecceosy --dry-run --skip-vault
./node_modules/.bin/supabase db push --project-ref zyriqqhtgijvpecceosy --skip-vault --yes
```

No reset, demo seeds, Vault updates, or local data transfer were performed. Verified
eight migration-history entries, the existing Auth user retained, zero people/roster/
cohort records, no application tables without RLS, and `sync_profile()` present.
The `submissions` bucket is private with a 20,971,520-byte limit and four allowed MIME
types. First-admin provisioning and hosted member/admin/Storage behavior tests remain
pending; schema checks alone are not full production acceptance.

First-admin bootstrap follow-up: after explicit owner confirmation, verified the
exact hosted account had confirmed email and a Google identity, then created its
person and active `admin` roster entry together in one transaction. No cohort,
enrollment, Auth metadata role, or profile was manually created. The next real login
must synchronize the profile and verify admin access; that browser check remains
pending. Keep real bootstrap identities out of committed seeds and SQL scripts.

- Apply schema, functions, indexes, grants, and RLS migrations.
- Use demo seeds only in a disposable local development database, never production.
- Create a private `submissions` bucket with the documented size and MIME restrictions.
- Apply Storage policies from committed migrations.
- Add the two initial professional-development leads to `approved_members` as admins.
- Verify all table and Storage policies with distinct member and admin accounts.

## Enrollment foundation — Local database validation

Two ordered migrations in `supabase/migrations/` create the enrollment-only foundation
and private Monday linking operation. They assume the Supabase roles `anon`,
`authenticated`, and `service_role` exist. Apply them in filename order to a fresh
Supabase database as the migration owner. Existing manually created tables require a
schema reconciliation first; these migrations deliberately do not silently skip conflicts.
Hosted migration application and Supabase Auth/PostgREST verification remain **Pending**.
Do not expose the `private` schema or grant browser roles access to its functions.

For isolated SQL verification, start Docker and run:

```bash
docker run --detach --rm --network none --name gap-enrollment-tests --label gap.test=enrollment -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
docker exec gap-enrollment-tests pg_isready -U postgres
GAP_TEST_CONTAINER=gap-enrollment-tests npm run test:enrollment
docker stop gap-enrollment-tests
```

Wait until `pg_isready` succeeds before running the suite. The container publishes no
ports. The suite verifies its label, creates a uniquely named empty database, supplies
Supabase role fixtures, applies migrations, runs transaction/concurrency/permission tests,
and deletes only that test database. Stopping this `--rm` container removes its disposable
data. Do not point the suite at an existing project database.

Local PostgreSQL tests validate SQL behavior, not Google login, hosted RLS setup, or
Monday permissions. Normal `npm test` runs without Docker; `test:enrollment` retains the
isolated first-two-migration tests. `npm run test:program` requires local Supabase and
creates/removes isolated fictional Auth users and program records. It uses Auth-issued
fixture sessions, not real Google OAuth; never count it as provider verification.

Regenerate types after local migrations with
`npx supabase gen types typescript --local --schema public,private`, saving the result to
`src/lib/supabase/database.types.ts`, then review its diff. Run `npm run test:db-types`
to check consistency against local Supabase. This check passed after the review-receipt
migration.

### Apple Silicon migration verified (2026-09-20)

Intel Docker and fnm caused `EBADARCH` after migration to the M1 Mac. Installed official
Apple Silicon Docker Desktop (verified code signature), universal fnm 1.39.0 in
`~/.local/bin`, and Node 24.21.0 ARM64 with npm 11.19.0. Fresh login and interactive
shells now select native Node. Docker Engine 29.8.0 reports `aarch64`; Supabase CLI 2.117.0
runs natively. No containers were listed after startup; database setup/acceptance remains
pending, not implicitly verified by Docker startup.

The old Docker app and obsolete Intel fnm command link were moved to
`~/Library/Application Support/GAP-toolchain-backup-20260920/` for rollback. Docker data
and settings were not deleted. Existing Intel Homebrew packages and the older universal
system Node remain installed to avoid disrupting unrelated projects; the new fnm takes
precedence. This is a GAP toolchain migration, not a whole-machine Intel software purge.

Reinstalled dependencies from the unchanged lockfile with `npm ci --ignore-scripts` and
moved the old `.next` cache to the migration's temporary directory. Normal Turbopack build,
typecheck, lint, and all 37 unit/documentation tests pass on Node 24. Dependency audit
reports Next.js critical and sharp/js-yaml high advisories; security patching remains a
separate pending change. No hosted configuration was changed.

### Local validation follow-up (2026-09-21)

Local Supabase subsequently applied all migrations and fictional seeds successfully.
Repeating the seed preserved 12 weeks, 2 assignments, and 4 submissions. The 39 unit/docs
tests, 9 isolated enrollment tests, and local Supabase suite (7 scenarios plus parent)
passed, including HTTP layout checks with fixture sessions. Generated-type consistency,
lint, typecheck, and production build passed. Next.js/eslint-config-next were aligned at
16.3.5 and compatible sharp/js-yaml updates resolved the audit findings (zero reported).
These results supersede the initial migration-day pending checks above; they do not
verify protected interactive browser workflows, session expiry, or real Google OAuth.

### Local P5/P7 verification — 2026-10-20

Use the existing local stack and running application; do not reset a database containing
real work. Program verification uses Auth-issued fictional sessions with fixture Google
identities, not a production login bypass or evidence of a fresh real Google OAuth flow.

```sh
GAP_TEST_APP_URL=http://localhost:3000 npm run test:program
GAP_TEST_APP_URL=http://localhost:3000 GAP_TEST_BROWSER=1 npm run test:program
```

The direct-action suite resolves compiled action IDs from the running development
manifest. For a production server, set
`GAP_TEST_ACTION_MANIFEST=.next/server/server-reference-manifest.json`. Keep the app URL
local. Never run multiple copies of the program suite concurrently: its fixture calendar
slots are fixed. Browser checks refuse to overwrite occupied Spring 2098/2099 cohorts,
record their exact newly created IDs, and remove only their fixture records afterward.
The existing API fixtures use Winter/Spring 2999. Screenshots go to an OS temporary
directory printed by the test. Use `GAP_TEST_CHROME` to override the installed Chrome path.

The suite checks all seven admin mutation operations and link submission through actual
HTTP Server Actions, malformed/forged inputs, unchanged records after denial, and live
role removal. Refresh checks use a locally signed expired access token paired with a
real Auth refresh session; they verify the replacement cookie and identity, plus invalid
and revoked refresh rejection. It also tests explicitly scoped member reads with 1,007
historical attempts, multiple cohorts, empty participation, and an admin client.

Final acceptance ran against a local Webpack production build on port 3002 with the
production action manifest: all 12 program test entries passed, including 1280px/390px
cohort creation, roster editing, publishing, draft isolation, failed-save input retention,
link submission, review/feedback, reload, and member/admin sign-out with back/forward and
direct-route checks. The 50 unit/documentation, 12 Storage, and 9 enrollment entries also
passed, along with lint, typecheck, generated-type consistency, and the Webpack build.
This does not configure or validate hosted Supabase, Vercel, or new real Google identities.

Duplicate generated `cache-life.d 2.ts` and `routes.d 2.ts` files under `.next/dev/types`
and `.next/types` interrupted build/type checks. They were moved to OS temporary recovery
folders without application changes; the production build then passed. If these duplicate
artifacts recur, inspect the local filesystem/tooling rather than weakening type checks.
The existing default-Turbopack environment limitation remains separate.

## Demo data cleanup and recovery

Automatic seeding is disabled. `npm run db:seed:demo` explicitly loads the fictional
seed into the fixed local `supabase_db_gap` container; use it only in disposable local
workspaces. Tests and development UI fixtures remain available without live demo records.

`npm run db:clean:demo` inventories and validates seed-only dependencies without deleting.
`npm run db:clean:demo -- --apply` creates a private, git-ignored backup and removes the
verified seed in one transaction. Edited records, real participants, profiles, Monday
mappings, unexpected dependencies, and concurrent changes cause an abort for manual
review. This conservative tool does not clean arbitrary test data or reset Auth.

The local cleanup removed 3 fictional people/roster entries, 2 cohorts, 6 enrollments,
12 weeks, 2 assignments, and 4 submissions. No resources or fictional profiles existed.
The real admin/Auth account was preserved. Backup directory:
`.local-backups/demo-cleanup-1790047481676` (`records.json` and `restore.sql`).

To recover this exact snapshot, inspect the backup and confirm the removed IDs have not
been reused, then run from the repository root:

```sh
docker exec -i supabase_db_gap psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < .local-backups/demo-cleanup-1790047481676/restore.sql
```

Recovery runs transactionally and fails on conflicts; do not truncate or overwrite new
work to force a restore. The backup contains local data: keep it private and uncommitted.
Normal startup does not reinsert demo data. Create the real cohort through admin.

## P6 local Storage

`npm run db:start` now includes `storage-api`; no hosted services were changed. For an
already-running stack, run `npx supabase stop` (without `--no-backup`), then
`npm run db:start`. Apply new migrations with `npx supabase migration up --local`; never
reset a database containing real work. The migrations configure the private bucket,
20,971,520-byte limit, four MIME types, exact-intent INSERT and committed-file SELECT
policies. `SUPABASE_SECRET_KEY` is required server-side for inspection/lifecycle RPCs;
it is the same private local key used by Monday, never a `NEXT_PUBLIC_` variable.

The application reports unavailable Storage without disabling link submission.
Uploads expire after one hour. Failed transfers can resume in-page; after reload,
reselect and start a new intent. A completed transfer whose save failed can retry
finalization without uploading again. Invalid or stale work must be canceled/restarted.

Run `npm run db:clean:uploads` periodically in local development. This command obtains
only local CLI credentials, claims expired/abandoned intents, and removes objects via
the Storage API. It never deletes committed/history objects or edits Storage metadata
directly. Failed cleanup remains in the private ledger for retry after five minutes;
successful tombstones are also revisited to catch late transfers. Deletion of abandoned
objects is permanent; their source files must be reselected if needed. There is no
hosted scheduler or malware scanner; arrange those separately before production rollout.

Use `npm run db:clean:uploads -- --owner <fixture-auth-uuid>` for fixture-only checks;
the scope is passed to both claims and failure receipts. Each invocation handles at
most 100 batches; rerun for larger backlogs. API/network/receipt failures remain retryable.
The test suite exercises the actual scoped command and simulates late-arriving objects;
failure injection also covers the command's shared cleanup runner without touching real work.

Recovery hardening (2026-09-23): cancellation transport failures now give an actionable
message without losing the selected file or blocking a switch to links. Replaying a
committed finalization refreshes views and returns the original receipt. Malformed
descriptor inputs fail validation, and Office parser exceptions reject the upload rather
than escaping its asynchronous validation boundary.

Validation commands (isolated fictional Auth/program records, not real Google accounts):

```sh
npm run test:storage
GAP_TEST_APP_URL=http://localhost:3000 npm run test:storage
GAP_TEST_APP_URL=http://localhost:3000 GAP_TEST_BROWSER=1 npm run test:storage
```

Browser tests use installed Chrome through `playwright-core`; override `GAP_TEST_CHROME`
on non-macOS machines. They exercise desktop (1280px) and phone (390px), create a unique
fictional cohort/participants, and remove those records/files afterward. Do not run
multiple copies of this suite concurrently (the fictional quarter/year is fixed).
Screenshots go to a printed OS temporary directory. API tests cover RLS/intent boundaries,
all formats, replacements/history, concurrency, cleanup, interrupted 20 MB resumable
transfers and expired credentials. Unit tests cover malformed packages/type/size checks.
Fixture sessions are not Google OAuth acceptance. Remaining browser session-refresh and
Monday extended gates are tracked separately. Production build uses the established
`npm run build -- --webpack` fallback while the local Turbopack environment issue remains.

## Google OAuth configuration — Pending

### Local development

`Unsupported provider: provider is not enabled` from `127.0.0.1:54321` means local
Supabase Auth has not enabled Google. Hosted dashboard settings do not configure this
local instance. Google is now configured locally; real sign-in remains unverified.

1. Configure Google Auth Platform branding/audience and create a **Web application**
   OAuth client. If using a testing audience, allow the intended test accounts.
2. Use `http://localhost:3000` as the authorized JavaScript origin and
   `http://127.0.0.1:54321/auth/v1/callback` as the authorized redirect URI.
3. Save credentials in the git-ignored repository-root `.env.local`. The project's
   `npm run db:start` explicitly loads this file for the CLI. Never commit or share secrets,
   or give them a `NEXT_PUBLIC_` prefix:

   ```dotenv
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

4. This section is now configured in `supabase/config.toml`:

   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(OAUTH_CLIENT_ID)"
   secret = "env(OAUTH_CLIENT_SECRET)"
   skip_nonce_check = false
   ```

5. Run `npx supabase stop` followed by `npm run db:start`. Do not use `--no-backup`
   or reset the database for this configuration change. Start a fresh sign-in from
   `http://localhost:3000/login`, not the previous failed authorization URL.
6. Verify with an approved, active UC Davis Google account. A valid Google login alone
   must not grant GAP access; the active roster requirement still applies.

The Google redirect above returns to **Supabase Auth**, not the application's
`http://localhost:3000/auth/callback`. The latter is already in the local Supabase
redirect allowlist. Real sign-in remains unverified until this entire flow succeeds.
See the official [Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
and [local config/secrets guide](https://supabase.com/docs/guides/local-development/managing-config).

### Hosted deployment

1. In Google Cloud, configure an OAuth consent screen for the appropriate audience.
2. Create a Web application OAuth client.
3. Add the Supabase provider callback URI shown in Supabase's Google provider settings
   as an authorized redirect URI in Google Cloud.
4. Add the Google client ID and secret to Supabase Auth → Providers → Google and enable
   the provider.
5. Configure the app to pass `hd=ucdavis.edu` as a sign-in hint only. Server-side domain
   and roster checks remain mandatory.

Do not document guessed callback URLs: copy the exact callback URI from the connected
Supabase project when configuration is performed.

## Supabase URL configuration — Pending

### Callback diagnostics

Failed code-to-session exchanges emit `[auth.callback] Session exchange failed` in
server logs with only the SDK error code and HTTP status. Raw errors/messages,
authorization codes, URLs, cookies, keys, and tokens are not logged. The existing
generic login error and roster authorization remain unchanged.

After deploying this change, start one fresh login and search Vercel runtime Logs
for that marker. Match its timestamp to the Supabase Auth token request. A 401 alone
does not establish the cause; inspect the diagnostic code before changing settings.
Deployment and a real failing-attempt log remain pending verification.

- Set Site URL to the production Vercel origin.
- Allow `http://localhost:3000/auth/callback` for local development.
- Allow the exact production `/auth/callback` URL.
- Add a deliberately scoped Vercel preview pattern only if preview OAuth is required.
- Test sign-in, denied roster access, sign-out, and expired-session refresh.

## Vercel deployment — Pending

### Focused assignment pages and brief formatting — implementation and release

Migration `202610210005_assignment_briefs_and_summaries.sql` adds optional summaries
and explicit plain/Markdown format. Existing content, IDs, files and histories are not
rewritten. Apply locally with `supabase migration up --local`; do not seed/reset.
Hosted migration was applied on 2026-10-21, with the two written-response migrations,
after a dry run showing no seeds/role changes. Verified all three migration entries,
new columns and text RPC. Counts remained two assignments, one PDF document and zero
submissions; brief/work fingerprints were unchanged and no briefs were converted.
Implementation commit `96f4da6` was pushed to `main`; its Vercel production deployment
reached READY at `https://gap-khaki.vercel.app`. Authenticated hosted acceptance and
real SWOT content updates remain separate.
In Admin → Weeks → assignment, write a short Summary and use Instructions formatting
buttons or select Formatted; Preview instructions shows the result. Save the week as
usual. Members open View assignment from the week; admins follow the same path in
Preview as member. [The proposed SWOT brief](examples/notion-swot-assignment.md) is
copy-ready only after content approval, and is not seeded into any real cohort.

Local verification (2026-10-21): 61 unit/docs, six assignment, five written-response,
five brief, 12 program and 12 Storage entries pass. Desktop/phone checks (1280px/390px)
cover formatting authoring/save/reload, compact summaries, full brief rendering, private
PDFs, denied/cross-week/draft routes, preview counts and existing submission/review flows.
Consecutive toolbar selections restore focus at commit rather than in a deferred frame;
summary help is associated by description rather than included in the field name.
Lint, typecheck, generated types, Webpack build and diff checks pass. Screenshots were
visually reviewed at both widths. Fixtures were removed; no real brief was rewritten.
Default Turbopack was not rerun; the earlier environment limitation remains separate.

### Written submissions and editor preview — local implementation

Apply `202610210003_submission_text_type.sql` then
`202610210004_written_submissions.sql`. The enum addition must commit before use in the
second migration. Existing attempts/attachments are retained; never reset or seed.
Hosted migrations were applied and verified on 2026-10-21 with the formatting release
above. The combined production deployment reached READY for `96f4da6`; real
member/admin acceptance remains separate.

Run `npm run test:written` against local Supabase, with `GAP_TEST_APP_URL` pointing to a
local production server for HTTP-action and desktop/phone checks. Writes use exact
disposable fixtures. Members choose Write response or existing file/link methods.
Admins use Preview as member → published week → Preview submission to inspect controls
without saving/uploading. Preview drafts do not survive closing/reloading.

Local verification (2026-10-21): 58 unit/documentation entries, five written-response,
four multi-assignment, five assignment-brief, 12 program, 12 Storage and nine isolated
enrollment entries pass. Written-response browser checks ran at 1280px/390px and covered
reload, review/feedback, stale-save input retention, in-app drafts, escaped text and
preview with zero write requests. HTTP actions reject expired/inactive/unauthorized
sessions and malformed/version-forged input. Lint, typecheck, generated-type checks,
Webpack production build and diff checks pass. Default Turbopack was not rerun; its
previous environment limitation remains separate. Exact fixture accounts/records/files
were removed, including an orphaned test PDF from an initially failed test run. No
hosted records, credentials, Monday records or deployment settings changed.

### Multiple assignments per week

Apply `202610210002_multiple_week_assignments.sql` before deploying collection-aware
pages. This removes only the single-week uniqueness constraint and adds ordering and
an authorized transactional week save; it preserves existing assignment IDs and work.
Do not reset or seed the hosted database. Existing single-assignment clients remain
compatible for single-item weeks, but must reload before saving a multi-item week.

In Weeks, use Add assignment for each required deliverable. Set each title, instructions
and Pacific deadline; save, then attach its own PDF. Select the exact assignment in the
review queue. All assignments must be approved for weekly completion. Adding a new
assignment to a published week changes member completion immediately after saving.

Run `npm run test:assignments` against local Supabase; set `GAP_TEST_APP_URL` to a local
production server to exercise admin collection editing and assignment-specific member
review/progress at desktop/phone widths.

Hosted migration checkpoint (2026-10-21): applied only
`202610210002_multiple_week_assignments.sql` after a dry run, with no seeds or role
changes. Verified migration history, ordering column, collection-save function and
removal of the old uniqueness constraint. Record counts remained one assignment and
zero submissions. Implementation commit `cb4ef58` was pushed to `main` and its Vercel
production deployment reached READY at `https://gap-khaki.vercel.app`. Authenticated
live admin/member workflow acceptance remains a separate manual check.

Local multi-assignment verification (2026-10-21): 56 unit/docs entries, four assignment
suite entries, 12 program entries, five brief entries and 12 Storage entries pass.
Browser checks at 1280px/390px cover admin add/save/remove, assignment selection,
independent member review, 1-of-2 → 2-of-2 approval progress, existing publication/
roster/sign-out and file replacement/recovery/history. Database checks preserve an
existing PDF and assignment IDs, reject unauthorized/forged/duplicate/stale collections,
and roll back protected deletions. Lint, typecheck, generated types, Webpack build,
documentation links and diff checks pass. All writes used isolated local fixtures;
hosted program records were not changed by these tests.

Local preview verification passed at 1280px/390px using an unenrolled fixture admin:
dashboard → published week, disabled submission, locked/unknown routes, and unchanged
enrollment counts. Ordinary members redirect to access-denied; PDF upload/download and
date edits still pass. Next.js may stream a 200 shell before a not-found or redirect;
browser destination/rendered behavior is checked rather than assuming status alone.
53 unit/docs tests, lint, typecheck, and Webpack build pass. Preview deployment remains
pending; no additional database migration is needed.

Admin preview requires no migration: choose a cohort in admin and select “Preview as
member.” Published weeks/PDFs can be inspected without adding an enrollment. Preview
shows no learner submissions and does not change cohort metrics. Drafts stay locked.
Admin navigation offers “My program” only with an enrolled participation in an active
cohort; the profile has no duplicate program return link. The admin logo returns to
admin with cohort context. Both enrolled/unenrolled navigation states pass local
desktop/phone checks alongside the preview, PDF and date workflows.
If the cohort is draft or archived, its warning explains why enrolled members would
not have access. Preview code deployment is tracked separately from hosted schema.

### Assignment briefs and cohort date editing

Migration `202610210001_assignment_briefs_and_cohort_dates.sql` adds the private PDF
bucket, metadata/RLS/Storage rules, authorized upload lifecycle and date-edit function.
Apply locally with `./node_modules/.bin/supabase migration up --local`; hosted
application of this new migration was verified on GAP (2026-10-20 Pacific); UI
deployment follows this checkpoint. Existing
`SUPABASE_SECRET_KEY` must belong to the same hosted project as the public URL/key.

After deployment: edit cohort dates from Members → Manage cohort. For a PDF, save the
week's assignment first, select a file under Assignment PDF, and upload. The attachment
saves immediately. Verify admin download and enrolled-member download after publication.
Keep text instructions/deadline filled. PDFs are up to 20 MB; after reload reselect any
unfinished file. Cancel after an interrupted upload to abandon/delete its pending object.
One-hour expiry revokes upload/finalization authority but does not itself delete bytes.
Scheduled cleanup for abandoned briefs and malware scanning remain follow-up work;
never delete ready/current or superseded document objects as unfinished uploads.

Run `npm run test:briefs` against local Supabase for isolated Storage/database checks.
With a local production server, `GAP_TEST_APP_URL=http://localhost:3004 npm run test:briefs`
also exercises desktop/phone upload, persistence and downloads using disposable accounts.

Local validation completed: five brief-suite entries pass, including invalid PDF
rejection/cancel/retry, 1280px/390px transfer and protected download, inactive/anonymous
download rejection, date-edit persistence, concurrent replacements and expiry. 52 unit/
documentation tests, lint, typecheck, generated-type consistency, and Webpack build pass.
Program regressions: 11 passed and the optional full-story browser entry was skipped;
the brief/date browser checks ran separately. Fixture records/objects are cleaned using
their exact generated assignment/cohort IDs. Hosted migration was applied after a dry run;
verified the private PDF-only 20 MB bucket, document RLS and date-edit function. No seed,
reset, or real participant changes were performed. Live upload/date-edit acceptance is
pending. Vercel redacts sensitive key values from environment reads, so a metadata read
alone cannot verify `SUPABASE_SECRET_KEY`; verify it through the authenticated upload flow.

1. Connect the repository to Vercel.
2. Add all public environment values separately for Development, Preview, and Production
   as appropriate.
3. Deploy and update Supabase URL configuration with the final production origin.
4. Run the production build and smoke-test both roles.
5. Verify private files cannot be opened without authorization.

## Vercel environment-variable cleanup — deferred

Production Monday check (2026-10-20 Pacific): account, legacy board alias, and all
required column settings are populated, but `MONDAY_API_TOKEN` is absent. Add the
server-only token to Vercel Production and redeploy before retrying import. The
legacy `MONDAY_APPLICANTS_BOARD_ID` remains supported; missing the preferred board
name alone is not an error. No Monday connection or import is verified by this check.

**Checkpoint (2026-09-22):** The user reports adding variables and connecting the
Supabase integration in Vercel. Hosted values, configuration and deployment have not
been verified. This is a resume guide, not authorization to remove settings or deploy.
Only variable names/placeholders belong here; never paste credentials into this document.

### Exact names GAP reads

| Required variable | Production value/source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted project's HTTPS API URL; the integration's `SUPABASE_URL` value may be copied here after confirming the project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosted project's publishable key; copy the integration's `SUPABASE_PUBLISHABLE_KEY` value into this exact name |
| `NEXT_PUBLIC_SITE_URL` | Final deployed HTTPS application origin, not localhost and not the Supabase URL |
| `SUPABASE_SECRET_KEY` | Same hosted project's server-only secret key from Supabase API Keys; required for Monday import and P6 file validation |

Setting `SUPABASE_PUBLISHABLE_KEY` alone does not populate the browser variable.
Likewise, `SUPABASE_SERVICE_ROLE_KEY` is not an automatic alias for
`SUPABASE_SECRET_KEY`. Prefer the hosted project's current secret key; legacy
`service_role` keys are also privileged, never publishable keys or JWT signing secrets.
Never give any privileged key a `NEXT_PUBLIC_` prefix. See
[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

The Monday import also reads these exact server-side names:

```dotenv
MONDAY_API_TOKEN=
MONDAY_ACCOUNT_ID=
MONDAY_MEMBERS_BOARD_ID=
MONDAY_EMAIL_COLUMN_ID=
MONDAY_ENROLL_IN_GAP_COLUMN_ID=
MONDAY_COHORT_COLUMN_ID=
MONDAY_MEMBER_STATUS_COLUMN_ID=
```

These are empty placeholders, not values to deploy. Use the accepted-members board's
verified IDs and a token with appropriate read permissions. Board membership establishes
acceptance; membership status is context only, not an acceptance gate.

### Extras to review later

GAP currently does not read the integration-added `POSTGRES_URL`, `POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, or
`POSTGRES_DATABASE`; it uses Supabase clients rather than direct Postgres connections.
It also does not read `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or
`SUPABASE_PUBLISHABLE_KEY` under those names.

After the required names are populated and other consumers are checked, these unused
Vercel variables may be removed. Deleting a variable is not revoking its underlying key:
do not rotate/revoke Supabase keys, disconnect the integration, or delete the database
as part of this cleanup. Leave integration-managed extras alone if removal is restricted.

- `MONDAY_REPORTING_BOARD_ID` is optional preparation only; reporting is not implemented.
- `MONDAY_APPLICANTS_BOARD_ID` is a supported legacy alias. Prefer
  `MONDAY_MEMBERS_BOARD_ID`; remove the legacy variable only after the preferred one is
  configured. Conflicting nonempty values are rejected.
- `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` configure local Supabase startup, not Vercel
  runtime. Hosted Google credentials belong in the hosted Supabase provider settings.

### Ordered resume checklist

1. Verify the intended Vercel project and Production scope. Match the hosted Supabase
   URL, publishable key and secret key to the same hosted project; set the exact GAP
   names above and confirm the production site origin and Monday mappings. Do not copy
   local `127.0.0.1` URLs/local keys into Vercel or overwrite the working `.env.local`.
   Keep Preview/Development scopes separate from production data.
2. Review redundant variables using the list above; remove only confirmed-unused,
   user-managed entries after preserving the required mappings. Leaving extras is fine.
3. Separately verify hosted prerequisites: ordered schema/authorization/Storage migrations,
   private bucket policies, approved roster/admin access, and Google provider setup.
   Copy the exact hosted Supabase provider callback into Google Cloud; set Supabase's
   Site URL and allow the deployed app's `/auth/callback`. Local success does not prove
   any of these hosted steps are complete. Do not seed demo data or reset a live database.
4. Redeploy the intended application revision after configuration changes; public values
   are included in the build. Environment changes do not update an existing deployment.
   See [Vercel environment variables](https://vercel.com/docs/environment-variables).
5. Verify real approved member/admin sign-in, denied unapproved/inactive/non-UC-Davis
   access, member-to-admin denial, sign-out, and protected file downloads. Verify Monday
   preview read-only before deliberately authorizing any production enrollment. Record
   demonstrated results; do not close hosted or session-security gates from env presence.

P6 was subsequently closed out locally on 2026-09-23 with desktop/phone recovery flows,
direct upload-action authorization checks and regression validation. That local acceptance
does not verify hosted setup or alter this deferred environment/deployment checklist.

## Monday.com integration — Pending

### Manual accepted-member import

Use `MONDAY_MEMBERS_BOARD_ID` (preferred); `MONDAY_APPLICANTS_BOARD_ID` is a legacy
alias and conflicting values fail closed. No acceptance-status column is required.
`MONDAY_MEMBER_STATUS_COLUMN_ID` supplies informational status only.
Add a server-only `SUPABASE_SECRET_KEY` from the same local Supabase instance to ignored
`.env.local`; never prefix it with NEXT_PUBLIC or commit it. Missing configuration fails
closed. Apply migrations and regenerate types before using Sync from Monday in Members.
The reader uses API version 2026-04, bounded retries, timeouts, and full pagination.
Account 36481323 and board 18426968533 column types were verified read-only. No real
members were enrolled during verification and no Monday writes are implemented.

Run rollback-only SQL checks:
`docker exec -i supabase_db_gap psql -X -U postgres -d postgres < scripts/verify-monday.sql`.
Browser and extended concurrency/failure acceptance remain pending; P5/P7 gates stay open.
Earlier applicant-board/acceptance-status instructions below are superseded by this
accepted-members intake; outbound reporting/result configuration remains future work.

`.env.example` includes optional, server-only preparation placeholders. Save actual
values in ignored `.env.local`: `MONDAY_API_TOKEN` for a personal API token,
`MONDAY_ACCOUNT_ID`, `MONDAY_APPLICANTS_BOARD_ID`, and optional
`MONDAY_REPORTING_BOARD_ID`. Applicant mappings use internal column IDs in
`MONDAY_EMAIL_COLUMN_ID`, `MONDAY_ACCEPTANCE_STATUS_COLUMN_ID`,
`MONDAY_ENROLL_IN_GAP_COLUMN_ID`, and `MONDAY_COHORT_COLUMN_ID`.
Leave unknown values blank. These names are proposed adapter configuration, not active
runtime requirements; filling them in does not enable enrollment or reporting.
Acceptance values, cohort mapping, result columns, and reporting fields still need
verification before integration. Monday app client/signing secrets are not personal API
tokens; app/OAuth credentials require a separately selected adapter flow.
Personal tokens inherit their owner's permissions; use an appropriately restricted
account. Never commit tokens or expose them through `NEXT_PUBLIC_` variables.
See [Monday authentication](https://developer.monday.com/api-reference/docs/authentication).

- Confirm the application form, recruiting board, club roster, cohort records, and their
  owners. Monday form intake is the expected direction, not verified configuration.
- Configure an unchecked-by-default “Enroll in GAP” checkbox on applicant records and
  restrict enrollment approval to authorized GAP leads. Acceptance alone must not trigger
  provisioning. Verify the permission mechanism before enabling the integration.
- Configure separate enrollment result/timestamp/error fields and map the target cohort.
  Verify invalid requests grant no access, successful requests provision member access,
  retries preserve history/roles, and unchecking does not revoke or delete anything.
- Confirm which leaders can see individual progress and where aggregate club reports go.
- Map approved fields using [the product reporting scope](product-spec.md#mondaycom-recruiting-and-club-reporting--planned)
  and [the data contract](data-model.md#monday-reporting-contract--planned).
- Select and verify server-side credentials, transport, sync frequency, external-record
  mapping, retries, and reconciliation before adding exact environment/setup instructions.
- Verify duplicate delivery, returning applicants, prior-cohort retention, email changes,
  unavailable Monday service, stale reports, and enrollment/access boundaries.
- Verify exported summaries exclude files, submitted URLs, written feedback, reviewer
  notes, private file links, and credentials. Confirm GAP links require authorization.

No Monday form, board, automation, credential, or sync has been configured by this work.

## Validation commands

The repository provides:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`NEXT_PUBLIC_SITE_URL` is `http://localhost:3000` locally and the final deployment origin
in production. A Vercel preview origin is used only if preview OAuth is deliberately
enabled. Never run a formatter in write mode merely to inspect the repository.

## npm build warnings

`vercel.json` runs locked installs with `npm ci` and keeps the existing `npm run build`.
Both commands remove only inherited `npm_config_cache_dir` and `NPM_CONFIG_CACHE_DIR`:
these map to unsupported npm `cache-dir`, not the supported `cache` setting. No matching
project environment variable or repository npm configuration was found during the
2026-10-23 check; the exact upstream injector is unverified. Valid npm cache settings
and other warnings remain enabled. No dashboard environment variables need removing.

`package.json` approves only `unrs-resolver@1.12.2` for dependency install scripts.
Its reviewed postinstall uses `napi-postinstall` to locate the platform-native resolver
and recover a missing binding from npm; it supports ESLint's import resolver. Keep
optional dependencies enabled. This is version-specific approval, not a blanket trust
setting. After dependency updates, run `npm install-scripts ls` and review newly pending
scripts before approving an exact version. See [npm install-script policy](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/).

These repository settings take effect on a subsequent deployment containing them;
local verification alone does not establish warning-free hosted build logs.
Local validation (2026-10-23): isolated offline `npm ci` installed 436 packages with
neither warning, the native resolver loaded, and no unreviewed install scripts remained.
All 70 unit/documentation tests, lint, typecheck, Webpack production build and diff
checks pass. The default hosted Turbopack build and its logs require a later release;
no dependencies, lockfile resolutions, credentials or hosted settings changed.

Separately authorized release (2026-10-23): commit `8851c92` was pushed to `main` and
production deployment `dpl_GDrsxGSeDsU56ZXWZzhrPWrbxGX6` reached READY, including the
default hosted Turbopack build. All 81 available build events contain neither npm warning;
the custom install/build commands executed as configured. Custom domains are aliased.
Slack's image-crawler user agent receives the branded PNG (HTTP 200, 47,870 bytes,
1200 × 630). Actual Slack card refresh remains a manual check, not a deployment failure.

## Troubleshooting record

When resolving a recurring operational issue, add a short entry with symptoms, verified
cause, safe resolution, and date. Never include tokens, secrets, private submission URLs,
or personal data.

## Local eight-case challenge verification

Run `npm run test:cases` against local Supabase; optionally set
`GAP_TEST_APP_URL=http://localhost:3004` against a matching production build to exercise
Chrome at desktop and phone widths. The harness rejects non-local targets, provisions
isolated fixture identities/cohorts, and deletes only its exact records afterward. Fixture
sessions do not verify real Google OAuth. The migration is additive; never reset/seed the
live local program. Hosted migration/release and real Week 2 setup remain separate.
To configure an assignment: save Individual mode, keep its week unpublished, expand
Assignment workflow, select Eight-case challenge, inspect/edit the prefilled content and
save its workflow. Keep a short introduction in the ordinary Instructions field, which
the existing week publication validation still requires. Detailed exercise directions
live in Challenge overview. Publish through the existing week editor once ready. Content locks
when a participant saves their first case; completion needs explicit Finish challenge.

Local evidence: six case-harness entries and nine guided-harness entries passed without
skips, including 390px/1280px case comparison, setup/save/reload, input retention/retry,
Finish and non-writing admin preview. 84 unit/documentation tests, lint, TypeScript,
generated-type consistency and the Webpack production build passed. This is local fixture
evidence only; hosted and real Google acceptance remain separate release checks.

Final program/session (12), private Storage (12), Teams (8) and manual completion (7)
entries also passed without skips, including their browser checks. Multiple-assignment
and Viewer database regressions passed; Viewer browser checks were not rerun in this
change. For production-build program checks, set
`GAP_TEST_ACTION_MANIFEST=.next/server/server-reference-manifest.json` to avoid a stale
development action manifest. A transient Teams confirmation timeout passed on rerun.
The separate legacy enrollment harness could not start without its labeled disposable
PostgreSQL container (`GAP_TEST_CONTAINER`); it was not redirected to the live local DB.
