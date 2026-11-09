# GAP MVP Implementation TODO

**Status:** Active
**Last updated:** 2026-11-09

Legend: `[ ]` pending · `[~]` active · `[x]` complete

This file tracks approved work. Product and technical rules live in `docs/`; completion
requires implementation, validation, documentation, and changelog agreement.

## Current checkpoint — 2026-10-20

- [x] Audit current access controls, private files, privileged operations and recent
  assignment workflows; compare hosted schema/Storage read-only, scan current dependencies
  and local public artifacts, and rerun security regressions. Record confirmed findings
  separately from hardening suggestions; preserve the unreleased PDF work and production.
  Hosted application functions/policies and private Storage match audited local definitions;
  68 authenticated regression entries, four new read-only security-schema checks and 121
  unit/docs checks pass without skips. Lint/typecheck/diff pass; dependency audit and local
  public artifact secret scan are clean. Report: docs/security-audit-2026-11-09.md.
  One medium resource-abuse/cleanup gap and two low hardening items remain proposed fixes,
  not applied runtime/schema changes. No migration, production data changes or release.

- [x] Implement admin-only PDF reading for submitted/history/example PDFs: private bounded
  endpoints, locally bundled PDF.js, continuous pages/search/zoom and expanded reading
  without lost feedback. Verify access, worker/assets, desktop/phone and existing grading
  regressions locally. Six PDF, seven grading, nine team and 13 Storage entries pass
  without skips, including desktop/phone; 121 unit/docs, lint, typecheck, generated types,
  audits (zero vulnerabilities), Webpack build and diff checks pass. Fixture files/records
  cleaned; real files unchanged. Default local Turbopack hits a fetch panic; hosted
  bundler/worker and real Google acceptance remain release checks. No migration, commit,
  push or deployment performed or authorized.

- [x] Add optional formatted per-team briefs to Standard Team assignments, independent
  versioned admin saves, retained selection/edits and sample-team preview. Own-team
  reads exclude other teams, drafts, Viewer/Explore and revoked identities. Long briefs
  use Instructions / Workspace with heading jumps; no-brief assignments retain their
  existing layout. Safe flat Markdown tables support the supplied Warby Parker text.
  Six local brief entries, nine team regressions, six assignment regressions and 118
  unit/docs checks pass without skips. Desktop/phone views, stale edits, forged actions,
  table focus, local draft retention and the actual supplied document were verified in
  disposable fixtures; screenshots inspected and fixtures cleaned. Lint, typecheck,
  generated types, Webpack build and diff checks pass. Hosted migration `202611080002`
  applied and verified on 2026-11-09 under separate release authorization. Real Week 3
  configuration and real Google acceptance remain separate.

- [x] Implement reusable Individual spreadsheet investigations: four stages/fifteen private
  progressive/optional starter hints, saved drafts, checked names, ordinary reviewed text
  attempts, per-attempt hint snapshots and Official/Test insights. Nine local investigation
  entries pass without skips, including database/Storage/forged-action boundaries,
  concurrent drafts and hint/submission races, name normalization/retries, snapshots,
  desktop/phone setup, keyboard controls, failed-save recovery and zero-write previews.
  116 unit/docs checks, thirteen Storage entries, nine Guided entries, seven case entries
  and fourteen program entries pass without skips. Lint, standalone typecheck, generated
  types, Webpack production build and diff checks pass; screenshots inspected and exact
  disposable fixtures cleaned. Hosted migration `202611080001` applied and verified on
  2026-11-08 under separate release authorization. Real Week 3 configuration/publication
  and real Google acceptance remain separate; await the student workbook URL and
  admin-configured accepted name before publishing the assignment.

- [x] Resolve all nine dependency findings with Zod 4.6.7 and a scoped typescript-estree
  minimatch 11.0.4 override. Clean locked install and full/production audits report zero
  vulnerabilities; dependency tree is valid and no install scripts need new approval.
  111 unit/docs checks pass, including real type-aware project-service glob matching
  and rejection; lint, standalone typecheck, Webpack build and diff checks pass.
  Stable runtime/framework versions preserved. No schema, hosted or release changes.

- [x] Extend bounded HDR JPEG support to Android Ultra HDR v1. Published Pixel sample
  and supplied iPhone photo pass local validation and metadata-free oriented previews.
  110 unit/docs checks and thirteen Storage entries pass without skips, including
  current/legacy offsets, complete JPEG boundaries, forged identities/directories,
  both platforms' private uploads/downloads, duplicate-safe finalization and desktop/
  phone Android-HDR replacement/review/retry/history. Lint, typecheck, Webpack build
  and diff checks pass; disposable local fixtures cleaned. Pending iPhone/50 MP edits
  preserved. No schema, real program records or release changes. Physical Android
  file-picker acceptance remains unverified; ISO-only/extra-video files are unsupported.

- [x] Accept bounded Apple HDR gain-map JPEGs without allowing unrelated MPF images.
  Exact supplied photo passes local inspection and an oriented metadata-free 1200×1600
  preview, without uploading or copying it into fixtures. 109 unit/docs checks and
  thirteen Storage entries pass without skips: synthetic big/little-endian HDR,
  malformed tables/XML/auxiliary pixels, private original downloads, browser HDR
  replacement/preview on desktop/phone, retry/history and live access denial. Lint,
  typecheck, Webpack build and diff checks pass. Exact disposable fixtures cleaned.
  Preserve 50 MP cap; no schema, real program data or release changes.

- [x] Raise image decoding/preview limit to 50 MP. 107 unit/docs checks pass, including
  24/48 MP JPEGs, the exact 50 MP boundary, upload/preview over-limit rejection and
  unchanged 20 MB/format/container restrictions. Lint, typecheck, Webpack build and
  diff checks pass. Supplied iPhone JPEG was read locally only: resolution now fits,
  but its MPF container then failed the separate check (resolved by the HDR item above). Personal photo
  not copied into the repo or uploaded. No schema or release changes.

- [x] Repair assignment-toolbar link insertion: reproduced selected-newline rejection
  at 1280px/390px, then replaced the browser prompt with inline label/address inputs.
  Six assignment/browser entries and 107 unit/docs checks pass without skips, including
  the exact feedback URL, trailing newline, selected URL, keyboard focus/Enter/Escape,
  unsafe URL rejection, cancel, stale draft retention, preview and save/reload.
  Desktop/phone screenshots inspected; lint/typecheck, Webpack build and diff checks
  pass. Disposable local fixtures cleaned; no real assignments or hosted/release changes.

- [x] Support Standard-assignment PNG/JPEG/WebP submissions and protected admin previews;
  preserve document-only Guided work, case restrictions, private upload lifecycle and
  pending landing edits. Verify bounded image inspection, RLS/Storage/HTTP access,
  desktop/phone review/retry/history and affected regressions. 107 unit/docs, thirteen
  Storage, nine team, nine guided, five brief, seven grading and seven case entries pass
  without skips. Actual image uploads, interrupted-transfer retries, preview retry with
  retained feedback, orientation/metadata removal, immutable originals/history and live
  owner/team/admin/Viewer denial verified; screenshots inspected. Guided preparation and
  forged-finalization image denial pass. Fixture enrollment/history assumptions were
  corrected to retain existing Viewer and historical individual-download rules.
  Local migration, generated-type consistency, lint/typecheck, Webpack build and diff
  checks pass; ignored duplicate generated Next types were moved aside for typecheck.
  Install-script review reports no unreviewed scripts. Exact local fixtures cleaned.
  Hosted migration, real Week 3 configuration, commit/push and deployment remain separate.

- [x] Add an independently styled, public `/landing` starter in the existing Next.js
  app; retain npm/Node, GAP routes and sign-in. Bypass session work only for the landing
  subtree, isolate public branding and noindex metadata/headers, and verify anonymous,
  signed-in and expired-session visits plus protected-route regressions. 104 unit/docs,
  fourteen program/session, eight Viewer and five week/activity entries pass without
  skips. Public HTML is identity-independent; cookies/activity remain unchanged, no
  speculative portal requests occur, and scoped CSS leaves GAP unchanged after navigation.
  Desktop/390px/320px, keyboard focus/skip navigation, no-JavaScript rendering and metadata/
  subtree-header checks pass; screenshots inspected. Lint/typecheck, Webpack build and
  diff checks pass. Exact local fixtures cleaned. Local evidence is not hosted or real
  Google acceptance. No dependencies, schema, provider settings, commit or deployment changed.

- [x] Focus case/guided assignment Instructions and Workspace; preserve authored content,
  drafts/files/transfers, existing reveal/approval/submission/completion semantics and
  private/no-write previews. Separate actionable alternative requests from populated-team
  progress; recommended paths need no approval. 101 unit/docs, seven case, nine guided,
  six assignment, five week/activity, twelve program/session and eight Viewer entries
  pass without skips. Desktop/tablet/phone screenshots inspected; keyboard heading jumps,
  zero-write view switches, unsaved input, selected files and an actively paused/resumed
  upload verified. Failed/stale decisions retain notes and require explicit refresh/review.
  A label association and stretched comparison card found during verification were fixed;
  the transfer harness was corrected for small-file POST uploads and rerun successfully.
  Generated-type consistency, lint/typecheck, Webpack production build and diff checks pass.
  Exact disposable fixtures cleaned; local evidence is not hosted/real-Google acceptance.
  No schema, real content, commit/push or deployment changes.

- [x] Align case-progress badges/actions across completion timestamps and saved counts.
  98 unit/docs and seven case entries pass without skips; desktop badge/link column
  coordinates are asserted, 1280px/390px screenshots inspected, and filtering/answer
  navigation remain unchanged. Lint/typecheck, Webpack build and diff checks pass;
  exact fixtures cleaned. Styling only; no release or real data changes.

- [x] Optimize confirmed navigation bottlenecks: local URL-preserved review filtering/
  search and parallel independent workspace/member/week-activity reads. 98 unit/docs,
  five week/activity, seven case, twelve program/session, six assignment and nine guided
  entries pass without skips, including desktop/390px navigation, rapid typing without
  dropped input, zero filtering navigation requests, review/back/reload, live revocation,
  failed reads and complete pagination. Generated types, lint/typecheck, Webpack build
  and diff checks pass; screenshots inspected and exact fixtures cleaned. An initial
  rapid-typing synchronization failure was fixed and rerun; the optional program browser
  check was explicitly enabled on the final run. Local evidence is not a hosted latency
  benchmark. No shared protected cache, authorization/schema or deployment changes.

- [x] Replace corner loading text with a centered approved logo and subtle indicator.
  94 unit/docs checks, lint, typecheck, Webpack build and four loading-browser entries
  pass without skips. Actual component/built-CSS fixtures verify 1280px/390px/short
  320px layouts, logo loading/aspect ratio, status and reduced motion; screenshots
  inspected. No auth/data changes, migration or deployment.

- [x] Replace case exercises' grading-filter/unstyled roster with proper progress filters
  and a protected read-only per-participant/per-case response view. Verify finished versus
  saved progress, official/test scope, preserved navigation, privacy and no case writes.
  Seven case, six assignment and five week/activity entries pass without skips, including
  desktop/390px comparison, finished versus eight-saved answers, filtering/search/back,
  test scope, unauthorized/revoked-admin/forged-route denial and unchanged case fingerprints.
  Screenshots inspected; exact fixture cleanup verified. 93 unit/docs checks, lint,
  typecheck, generated types, Webpack build and diff checks pass. A duplicate generated
  routes type was moved aside before the standalone typecheck passed. Fixture sessions
  are not hosted/real Google acceptance. No schema changes, commit or deployment.

- [x] Improve clickable affordances: pointer cursors on enabled controls and restrained
  hover/focus/press feedback on review actions, preserving disabled and touch behavior.
  91 unit/docs checks, lint, typecheck, Webpack build and diff checks pass. Three built-CSS
  browser entries verify desktop hover/focus, unchanged target geometry, disabled controls,
  reduced motion and phone touch without hover. No program-data writes or release.

- [x] Section the admin week editor: Overview/Assignments/Materials, one selected
  assignment with Details/Instructions/Activity setup/Grading reference, focused guided
  briefs/team directions and one case editor. Preserve drafts/uploads, independent saves,
  publication and review edit links. 90 unit/docs tests plus assignment (6), guided (9),
  cases (6), grading (7), briefs (5), attendance (9), program/session (12) and teams (8)
  entries pass without skips. Desktop/390px checks cover section/assignment switches,
  retained text/files, individual case editing, independent saves, recovery, reload,
  private downloads, review edit links and keyboard controls; screenshots inspected.
  Lint, typecheck, generated types, Webpack build and diff checks pass. Fixture-only
  writes/cleanup; not real Google or hosted acceptance. No schema changes or release.

- [x] Audit member/admin microcopy: remove redundant subtitles and bookkeeping notes,
  keep actionable guidance and safety warnings. 88 unit/docs checks and local attendance
  (9), guided-project (9) and case (6) suites pass without skips, including desktop/phone
  workflows. Review queue/attendance screenshots inspected; lint, typecheck, Webpack build and diff
  checks pass. Copy-only cleanup; no schema, authorization, grading or release changes.

- [x] Remove redundant attendance-presentation sign-in/footer copy while preserving
  closing date/time, code/QR, fullscreen and keyboard controls. 85 unit/docs tests,
  lint, typecheck, Webpack build and diff checks pass. Browser checks were not rerun
  for this copy-only change; not committed or deployed.

- [x] Add standalone attendance QR/code presentation with browser fullscreen/fallback,
  keyboard exit/focus return and responsive layout. Nine attendance entries pass without
  skips, including desktop/phone viewport coverage, denied-fullscreen fallback, short
  screens, expiry hiding the QR/code, and unchanged session/attendance snapshots.
  84 unit/docs tests, lint, typecheck, Webpack build and diff checks pass. No real
  attendance or prior eight-case implementation changes were discarded; not released.

- [x] Implement and locally verify the Individual Eight-case challenge: editable saved
  answers, private references, explicit automatic completion, preview and queue exclusion.
  Six local case checks pass without skips, including desktop/phone setup, retained-input
  retry, save/reveal, edit/reload, final freeze, zero-write preview and HTTP admin guards.
  Nine Guided project checks pass without skips. 84 unit/docs tests, lint, typecheck,
  generated-type consistency, Webpack build and diff checks pass. Fixture identities are
  not real Google acceptance; no hosted configuration or real assignment was changed.
  Program/session (12), Storage (12), Teams (8) and manual completion (7) entries also
  pass without skips. The standalone enrollment harness still needs its disposable
  labeled test container; Viewer browser checks were not rerun for this change.
- [x] Apply the separately authorized hosted case-exercise migration `202610290003`:
  receipt, private RLS/grants and constraints verified; existing assignments, submissions
  and attendance fingerprints/counts unchanged. No real case configuration/run created.
- [ ] Configure the real Individual Week 2 case assignment and verify signed-in hosted
  member/admin use after release. No real assignment is changed by the template/tests.

- [x] Clarify guided research copy and verify each save updates all current team answers
  until final submission; retain the separate internal history snapshot. Focused local
  DB checks, 82 unit/docs tests, lint, typecheck, Webpack build and diff checks pass.
  Browser checks were not rerun for this copy-only update; hosted signed-in acceptance
  remains a real-user check.

- [x] Implement reusable Guided project Team assignments: shared original/working
  research, private reveal, team recommendations, alternative approval and gated final
  documents (2026-10-28). Nine guided entries pass without skips, including desktop/phone
  setup persistence, retained-input/retry, approval, upload/review/feedback/replacement,
  preview/Explore zero submission/upload writes, privacy, concurrency and exact cleanup.
  Eight team, 12 program/session, 12 Storage, seven completion, eight Viewer and six
  multi-assignment entries pass without skips. 82 unit/docs, lint, typecheck, generated
  types, Webpack production build and diff checks pass. Fixture sessions are not real
  Google acceptance; real participants and assignments remain untouched.
- [x] Apply authorized hosted guided-project migrations `202610290001`/`202610290002`
  (2026-10-28); two receipts, five private RLS tables, restricted grants and four guards
  verified. Guided data is empty and all existing assignments remain Standard.
- [ ] Configure real Week 2 recommendations explicitly and verify authenticated hosted
  acceptance. No real assignment content is automatically changed by the release.

- [x] Add auditable manual completion/undo for legacy missing Individual assignments;
  credit updates progress and missing/complete filters without fabricated attempts or
  shared files/feedback (2026-10-28). Seven completion, 12 program, 12 Storage and eight
  team entries pass without skips, including 1280px/390px grant/reload/undo, permissions,
  concurrency and pending-upload checks. Screenshots inspected; 80 unit/docs, lint,
  typecheck, generated types, Webpack build and diff checks pass; exact fixtures cleaned.
- [x] Apply authorized hosted migration `202610280001`; receipt, RLS and restricted
  write/RPC grants verified (2026-10-28). New credit ledger is empty.
- [ ] Grant real Week 1 completion credits explicitly and verify member acceptance.
  No real participant's completion has been changed locally or hosted.

- [x] Polish review counts and Teams: selector-header/read-only roster, explicit editing,
  secondary rename/delete and numbered creation (2026-10-27). Eight team and five
  week/activity entries pass without skips, including 1280px/390px flows, naming conflicts,
  selection retention, canceled dirty switches, stale saves, locks and review navigation.
  Screenshots inspected; 79 unit/docs, lint, typecheck, generated types, Webpack build
  and diff checks pass. Exact fixtures cleaned; no migration, commit or release performed.

- [x] Persistent local Supabase program, real Google sign-in, and a real approved admin
  are operational; the user completed a real Monday enrollment import successfully.
- [x] Login card and admin cohort switcher are implemented; detailed visual/accessibility
  checks remain listed below rather than implied by implementation.
- [x] P6 closeout: 48 unit/documentation test entries, 12 Storage entries with desktop/phone
  browser coverage, 8 program and 9 enrollment entries pass; lint, typecheck, generated-type
  consistency and Webpack production build pass. Test counts include suite/fixture entries.
- [x] Committed/pushed P6 and deferred deployment documentation through `7bd6e87` to
  `origin/main`; credentials and recovery backups were excluded. Subsequent P5/P7
  scoping, validation, tests, and checklist changes remain uncommitted.
- [x] User confirmed imported-member reload persistence, repeated preview showing Already
  linked without duplication, and real analyst program access/admin denial (2026-09-22).
- [x] Local P5/P7 closeout (2026-10-20): 50 unit/documentation, 12 program, 12 Storage,
  and 9 enrollment test entries pass; lint, typecheck, generated types, and Webpack build
  pass. Production-mode desktop/phone program, refresh, sign-out, and mutation checks pass.
- [ ] Finish extended Monday tests, responsive/accessibility polish, second-lead
  provisioning, and hosted configuration. Local core P5/P6/session verification is
  complete; this is not hosted-deployment acceptance. Attendance local work is tracked below.

## Phase 0 — Documentation and repository foundation

- [x] Capture the repeat release workflow in `docs/release.md` and a reusable
  `gap-release` skill, installed in the local Codex skills directory. Both skill copies
  validate; all 77 unit/documentation tests and diff checks pass (2026-10-25).
  This documentation task does not authorize another release.

- [x] Replace the social-link graphic with a square logo-only thumbnail; visually inspect
  the asset and verify public image/login metadata, 71 unit/docs tests, lint, typecheck,
  Webpack production build and diff checks locally (2026-10-23).
- [x] Commit/push and deploy square logo preview: `378de11` reached production READY;
  live Slack-crawler image/metadata checks pass. No build warnings or runtime errors
  were returned by the release scans. Actual Slack card refresh remains manual.

- [x] Create the documentation map and domain-specific source-of-truth files.
- [x] Add AI contributor reading order, documentation rules, and definition of done.
- [x] Add ADR conventions and record the documentation-system decision.
- [x] Add the changelog and this phased execution tracker.
- [x] Add `.env.example` with Supabase URL, publishable key, and site URL placeholders.
- [x] Add `typecheck` and test scripts without adding unnecessary tooling.
- [x] Normalize approved logo copies into `public/brand/`; preserve originals in
  `design_references/Official Logos/`.
- [x] Replace the starter favicon with an approved compact brand asset.
- [x] Reconcile the existing dark GAP landing experiment with the approved light-first
  design direction without discarding useful work.

### Phase 0 gate

- [x] `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- [x] Documentation links resolve and current git changes are reviewed for accidental
  deletion or secret files.

### Stable toolchain baseline

- [x] Resolve npm build warnings with version-specific resolver script approval and
  Vercel install/build commands that remove unsupported cache-dir environment aliases;
  policy checks, isolated offline clean install/native binding load, 70 unit/docs tests,
  lint, typecheck, Webpack production build and diff checks pass (2026-10-23).
- [x] Verify both npm warnings are absent in hosted build logs: production deployment
  `dpl_GDrsxGSeDsU56ZXWZzhrPWrbxGX6` for `8851c92` reached READY on 2026-10-23;
  all 81 available build events contain neither warning. Hosted Turbopack build passes.

- [x] Standardize the machine and repository on Node.js 24 LTS through `fnm`, `.nvmrc`,
  and the package engine contract.
- [x] Use the current secure stable Next.js 16.3 release with matching
  `eslint-config-next`; retain the current stable React 19.2 pair.
- [x] Regenerate the lockfile and pass clean install, dependency-tree, audit, and complete
  project validation under Node.js 24.

## Phase 1 — Visual system and mock data

- [x] Replace Geist/Arial usage with Montserrat through `next/font` and define Tailwind 4
  theme tokens for the approved palette and neutral scale.
- [x] Build accessible primitives for buttons, badges, progress, cards, fields, errors,
  empty states, and page containers without introducing a broad UI dependency.
- [x] Build the responsive brand header, profile menu shell, and member/admin navigation.
- [x] Create typed view models and realistic Fall 2026 seed/mock data for all six weeks.
- [x] Populate Week 2 with realistic workshop, resource, assignment, deadline, submission,
  and feedback examples.
- [x] Centralize deadline formatting and assignment/module state derivation.
- [x] Add mock roles/states that make member and admin flows navigable before OAuth.

### Phase 1 gate

- [x] Brand assets, type, color, spacing, focus, and contrast match
  `docs/design-system.md` at mobile and desktop widths.
- [x] Mock types prevent invalid file/link and stored-overdue states.
- [x] Lint, typecheck, and production build pass.

## Phase 2 — Student dashboard

- [x] Build `/` with user greeting, Fall 2026 status, current week, progress text,
  and thin progress bar.
- [x] Add the featured continue-learning card for the current actionable published week.
- [x] Show the nearest upcoming or overdue assignment with a semantic status badge.
- [x] Render all six modules in a restrained ordered list/card treatment.
- [x] Show draft weeks as locked number/title cards without leaking protected content.
- [x] Link published modules to their week route and provide useful empty/error states.
- [x] Make the dashboard excellent on small screens with prominent deadlines and
  thumb-friendly actions.

### Phase 2 gate

- [x] Dashboard answers the five priority questions defined in the product spec without
  fake analytics or out-of-scope features.
- [ ] Keyboard, narrow-mobile, tablet, and desktop checks pass.
- [x] Lint, typecheck, and production build pass.

## Phase 3 — Week detail and mock submission flow

- [x] Build `/week/[weekNumber]` using Next.js 16 async `params` conventions.
- [x] Add program back-link, numbered title, description, workshop presentation, and
  ordered resource list.
- [x] Add assignment instructions, explicit Pacific deadline, and derived state.
- [x] Build file selection with PDF/DOCX/PPTX/XLSX and 20 MB validation.
- [x] Build `http`/`https` link submission with clear validation.
- [x] Show submitted timestamp, original filename or URL, view, and replace actions.
- [x] Show admin feedback and completed/revision-requested outcomes when present.
- [x] Keep week instructions primary and move feedback, revision, and history into a
  focused member submission-review route.
- [x] Unify workshop slides and ordered references into one coherent materials list and
  simplify the assignment workspace hierarchy.
- [x] Recompose submission review around open feedback, a compact submitted-work record,
  a full-width revision editor, and quiet retained history.
- [x] Strengthen feedback emphasis, enlarge the current-work record, and make every
  retained submission attempt viewable.
- [x] Unify week and submission-review hierarchy through shared page rhythm and a common
  submitted-work record.
- [x] Preserve mock resubmission history and display current versus prior attempts.
- [x] Add invalid week, locked draft, missing assignment, validation, and failure states.

### Phase 3 gate

- [x] A mock member can learn, submit either method, replace, and view feedback end to end.
- [x] Verify functional submission/replacement controls at 390px in the P6 browser flow.
- [ ] Finish keyboard, screen-reader, and zoom accessibility checks for submission controls.
- [x] Lint, typecheck, and production build pass.

## Phase 4 — Mock admin experience

- [x] Build Fall/Winter/Spring cohort creation, active/archive views, and cohort switching.
- [x] Build cohort rosters with permanent participant history and participation,
  advancement, and promoted-response controls.
- [x] Show transparent cohort starters, advancement rate, offer yield, end-to-end
  conversion, pending, and withdrawn summary values without charts.
- [x] Build admin-only layout and navigation with an obvious return to the member portal.
- [x] Build `/admin` with active-member and mutually exclusive review-state counts.
- [x] Build a week/status/search-filterable submission matrix with URL-preserved context
  and responsive table/card behavior.
- [x] Build `/admin/submissions/[id]` with member, assignment, timestamp, current
  submission, and history.
- [x] Add file/link opening, written feedback, and awaiting-review/revision-requested/
  complete controls.
- [x] Build `/admin/weeks` and `/admin/weeks/[id]` for week, slides, assignment, deadline,
  publication, and ordered resource editing.
- [x] Build `/admin/members` for roster add/edit, role, activation, and deactivation.
- [x] Add validation, unsaved/submitting states, empty states, safe destructive-action
  confirmations, and Pacific daylight-saving deadline handling where needed.

### Phase 4 gate

- [x] Automated admin checks cover mock-role rejection, queue selection/filtering,
  cohort/roster/publishing validation, and Pacific deadline edge cases (2026-09-14).
- [x] Browser-verify authenticated fixture-admin download/review and member feedback at
  desktop and phone widths (P6, 2026-09-23).
- [x] Browser-verify content publishing and roster workflows at mobile and desktop widths
  against the persistent authenticated implementation.
- [x] Replace the hardcoded mock admin identity with server-side authorization before
  claiming members cannot reach or trigger admin behavior.
- [x] Lint, typecheck, and production build pass.

Audit note (2026-09-14): all 36 automated tests, lint, and typecheck pass. The production
build checkbox reflects prior validation, not a new build in this audit. Mock feature
implementation is complete; the browser workflow gate remains unverified. Real admin
authorization depends on the Phase 5/7 backend and authentication work and is not supplied
by the mock-role test.

## Phase 5 — Supabase schema, seeds, and data access

**Local core accepted (2026-10-20):** Migrations, repeatable seed execution, and regression
suites pass; see the current checkpoint for counts. Authenticated desktop/phone publishing,
roster editing, submission, review, feedback, reload, and replacement/history are verified.
Successful expired-token refresh, revoked-refresh rejection, browser sign-out/back/forward
navigation, and direct non-upload action authorization also pass. Broader responsive and
accessibility checks below remain separate polish work; hosted setup is not verified.
Real local Google/admin sign-in worked, and the user confirmed real analyst access and
admin denial on 2026-09-22. Fixture sessions alone do not count as Google-login verification.
Generated types, lint, typecheck, and the Webpack production build pass; the default
Turbopack environment failure remains open below.

- [x] Replace GAP's Intel-only Docker/fnm tooling and reinstall project dependencies for
  Apple Silicon; verify native engine, shell runtime, build, lint, typecheck, and tests.
- [x] Patch the audited Next.js critical and sharp/js-yaml high dependency advisories,
  keeping Next.js and eslint-config-next aligned, then rerun full verification.

### Member refinement follow-up

- [x] Simplify continuation to week number without a duplicate title, and make open
  workshop check-in a secondary compact greeting action; verify desktop/phone layouts,
  navigation, attendance regression, lint/types/build and documentation.
  Verified at 1280px/390px with isolated local accounts: title appears once, check-in
  target is at least 44px, no overflow and both destinations work; nine attendance
  entries, 64 unit/docs entries, lint/typecheck/Webpack build and diff checks pass.

- [x] Attach continuation to the module panel and verify desktop, phone, and navigation.

- [x] Replace the dashboard overview card with a thin continuation bar and remove
  assignment and feedback summaries.

- [x] Prioritize Continue Week on the dashboard and demote feedback to a secondary link.

- [x] Restore distinct module status icons and pair featured week context with a compact
  assignment summary; inspect the rendered desktop dashboard.

- [x] Unify dashboard next-step hierarchy, member heading scale, materials anchors, and
  submission metadata presentation.
- [x] Share member attempts and drafts across dashboard, week, and review navigation;
  preserve unrelated assignments during replacement.
- [x] Clarify awaiting-review status, file/link actions, validation help, and editor focus.
- [ ] Browser-verify the member navigation and draft flow at 375px, 768px, and 1280px.

- [x] Install `@supabase/supabase-js` and `@supabase/ssr` dependencies.
- [x] Add ordered SQL migrations for people, Fall/Winter/Spring cohorts, enrollments,
  outcomes, content, submissions, constraints, timestamps, indexes, and
  private authorization helpers defined in `docs/data-model.md`.
- [x] Add the safe authenticated week-catalog function for locked draft cards.
- [x] Add RLS grants and policies for profiles, roster, weeks, resources, assignments, and
  submissions.
- [x] Add realistic idempotent seed data for six weeks and Week 2 details without shipping
  real personal data; include fictional active Fall and archived Spring cohorts.
- [x] Add generated database TypeScript types and a documented regeneration command.
- [x] Add cookie-aware server and browser clients using async Next.js 16 APIs.
- [x] Implement a narrow server-only data layer and DTOs for member and admin reads.
- [x] Replace mock page reads incrementally while preserving stable view-model contracts.
- [x] Implement validated Server Actions for content, roster, feedback, and status changes;
  authorize inside each action.
- [x] Implement atomic link-submission replacement that retains historical rows.

### Authentication brought forward from P7

- [x] Add token-refresh proxy, Google initiation/callback, safe local redirects, denial,
  and sign-out using cookie-aware Supabase clients.
- [x] Require verified UC Davis Google identity and current active roster authority;
  synchronize profiles without trusting editable metadata or stale profile roles.
- [x] Protect layouts and every mutation, with independent database authorization and
  no shared caching of protected responses or mock-auth fallback.
- [x] Verify local database/RPC and HTTP layout boundaries for anonymous/member/admin,
  inactive/wrong-domain/cross-user access, live role changes, draft isolation, rollback,
  and SDK sign-out using isolated fixture sessions.
- [x] Verify direct upload Server Action rejection for anonymous, inactive, cross-user,
  and expired-session callers independently of layout and RPC checks (P6).
- [x] Verify successful expired-session refresh, browser sign-out/back navigation, and
  remaining non-upload mutation boundaries.
- [x] Verify submit → review → feedback → reload and file/link replacement/history at
  desktop and phone widths using isolated published-program fixtures; test duplicate
  finalization, lost responses, and stale/concurrent saves (P6).
- [x] Complete the full publish → enroll → submit link → review → feedback → reload
  browser story, including publishing and roster/enrollment UI steps at both widths.
- [x] Regenerate types after the review-receipt migration and verify no schema drift.
- [x] Paginate workspace reads; test histories beyond the PostgREST row limit and
  fail rather than return partial data when a page fails.
- [x] Scope member queries to their enrolled participation, selected active cohort,
  published content, and retained attempts—even for admins using the member portal.
  Verify multiple cohorts, empty participation, and 1,007 retained attempts.

### Monday-ready enrollment foundation

- [x] Support durable links between Monday applicants and GAP people/cohort enrollments,
  preserving returning applicants' history through a private application-link table.
- [x] Implement a shared, server-only enrollment operation with duplicate-safe processing
  and preservation of existing roles, access restrictions, and outcomes.

The local P5 schema, policies, and client integration have passed core validation.
The private enrollment operation is called by a live-roster-authorized
admin wrapper, never by the mock identity. Manual Monday preview/map/confirm intake is
now connected and user-tested; automatic sync and reporting remain disconnected.

### Phase 5 gate

- [x] Enrollment migrations apply to a clean local PostgreSQL database; external-link
  uniqueness, repeat/concurrent requests, returning participants, rollback, inactive
  access, role/history preservation, and database authorization boundaries pass.
- [x] Verify enrollment migrations and authorization against the actual Supabase
  environment before connecting a real server adapter; no Monday configuration required.
- [x] Fresh project migration and seed execution succeeds; rerunning fictional seeds
  preserves counts (12 weeks, 2 assignments, 4 submissions).
- [x] Anonymous/member/admin/inactive/cross-user SQL and client policy tests match the RLS
  matrix.
- [x] The portal remains runnable with persistent repositories; HTTP route checks and
  user-operated local admin/Monday workflows provide evidence. Desktop/phone core workflows
  pass; the broader responsive/accessibility matrix remains open.
- [x] Lint, typecheck, tests, and production build pass.

## Phase 6 — Private Storage and live submissions

**Local P6 accepted (2026-09-23):** Private uploads/downloads, retained history,
authorization and recovery checks pass. Desktop (1280px) and phone (390px) browser tests
cover file/link replacement, review/feedback, reload persistence, lost save responses,
interrupted transfer, failed cancellation and link fallback. Direct upload actions reject
anonymous/inactive/cross-user/expired-cookie requests. No hosted configuration or real
analyst records were changed. P5/P7 broader session gates remain separate and open.

### Clean live program / readiness

- [x] Disable automatic demo seeding; retain an explicit local demo-seed command and
  test/UI-preview fixtures.
- [x] Inventory and back up untouched demo records, remove them transactionally, preserve
  the real admin, and verify a repeated cleanup is a no-op. Recovery is in operations docs.
- [x] Subsequently restore only Fall 2026 and its six original week titles as drafts at
  the user's request. Demo people, assignments, and submissions remain removed. The live
  database is no longer empty; keep empty-state verification isolated from real cohorts.
- [ ] Visually verify dashboard/admin empty states after reload in a real browser.
- [x] Verify normal startup keeps demo records absent and backup restoration succeeds
  inside a rolled-back transaction. Confirm the preserved real admin passes authorization.
- [x] Cleanup validation: 40 tests (including documentation links), lint, typecheck,
  diff checks, and Webpack production build pass.
- [ ] Recheck the default Turbopack build: this run hit a CSS-worker port-binding
  permission error even with escalation; the Webpack fallback passed without code changes.
- [x] Update available dependency security fixes: Next/eslint-config-next 16.4.2 and
  compatible Sharp/source-map-js/brace-expansion lockfile updates. Production-only audit
  reports zero vulnerabilities; keep the stable matched framework and React pair.
- [ ] Resolve the five remaining high development-tool findings when an upstream patch
  is available: braces 3.0.3 and its ESLint-only parent chain have no compatible fix.
  Do not use audit --force to downgrade eslint-config-next to 14.x; full audit is not clean.

### Implementation and recovery

- [x] Enable and verify local Storage, private `submissions` bucket, 20 MB limit and four MIME types.
- [x] Restrict inserts to exact unexpired owner intents; restrict reads to live owners/admins
  and committed history. Deny anonymous, inactive and cross-user access and client overwrite/delete.
- [x] Generate unique sanitized paths and preserve original filenames and validated metadata.
- [x] Implement resumable progress/retry, bounded format inspection, atomic version-checked
  finalization and stable receipts; no file bytes pass through Server Actions.
- [x] Implement authenticated no-store attachment downloads for current and historical attempts.
- [x] Preserve stale-save/completed-work restrictions across file/file, file/link and link/file replacement.
- [x] Verify cancellation during transfer, failed cancellation messaging, retained file selection,
  retry after failed/lost save responses and link fallback when transfer is unavailable.
- [x] Add scoped, bounded local cleanup; verify late uploads and repeat runs through the actual
  fixture-scoped command, plus API/network/receipt failure injection in its shared runner.
- [x] Review concurrency, rollback, live authorization, server input validation and private boundaries.

### Phase 6 gate

- [x] A member cannot list, read, overwrite, or delete another member's files.
- [x] An admin can download committed files; unauthenticated URLs cannot access private objects.
- [x] File and link submission/resubmission work end to end at desktop/phone widths.
- [x] Invalid type/oversize, interrupted upload, retry, transactional rollback, lost save
  response and historical download scenarios pass alongside admin/member access tests.
- [x] Unit/docs, Storage, program and enrollment regressions, lint, typecheck, generated types,
  Webpack production build and diff checks pass. Default Turbopack limitation remains above.
- [x] Canonical documentation, upload ADR, changelog and checklist reflect tested local behavior.

## Phase 7 — Google authentication and roster authorization

Authentication implementation and local authorization testing moved into P5. The manual
Google configuration and real sign-in acceptance below remain required; fixture sessions
do not satisfy them. See ADR 0007.

### Manual configuration — not complete until verified

- [x] Add code/status-only callback diagnostics; 51 unit/documentation tests, lint,
  typecheck, and diff checks pass, including failure redirect and log-field coverage.
- [ ] Deploy callback diagnostics and capture a fresh hosted failure before claiming
  production sign-in is fixed.

- [x] Configure Google Cloud OAuth consent/Web client for local login; successful user
  login followed correction of the client ID and organization audience restriction.
- [x] Configure the local Supabase Google callback URI; the real callback completed.
- [x] Enable Google in local `supabase/config.toml` using ignored `.env.local` credentials,
  restart local Supabase, and verify real sign-in. See the local OAuth recipe in
  `docs/operations.md`; enabling a hosted project's provider does not configure local Auth.
- [ ] Separately enable Google in the hosted Supabase project when deploying.
- [x] Set local Supabase Site URL and localhost callback allowlist; verify real local login.
- [ ] Configure and verify the production Site URL and callback allowlist when deploying.
- [x] Provision the first real lead as an active local admin and verify profile synchronization.
- [ ] Provision and verify the second development lead through a safe admin procedure.

### Phase 7 gate

- [x] Real local admin sign-in and user-confirmed analyst access/admin denial work.
- [x] Verify approved member and admin expired-session refresh with real local Auth-issued
  fixture sessions; invalid/revoked refresh sessions return to login. This is not a new
  real Google OAuth verification.
- [x] P6 application boundaries reject anonymous, inactive, cross-user, and expired-session
  upload requests; owner/admin downloads succeed and unauthorized downloads fail safely.
- [x] Anonymous, wrong-domain, unapproved, inactive, and member-to-admin escalation tests
  fail safely.
- [x] Sign-out invalidates protected navigation, including browser back/forward, reload,
  direct protected URLs, and subsequent mutation attempts at 390px and 1280px.
- [x] Local lint, typecheck, existing auth/RLS regressions, and Webpack production build
  pass (2026-10-20); hosted configuration and second-lead provisioning remain open.

## Phase 8 — Final responsive and usability polish

### Admin-assigned teams and shared submissions

- [x] Add cohort teams, individual/team assignment mode, shared submission targets,
  request receipts, teammate reads/files and version-checked team saves/reviews.
- [x] Connect admin team setup, member shared work/history and team-based review queues.
- [x] Verify concurrency, authorization, retained individual work and desktop/phone flows;
  run regressions, generated types, lint/typecheck/build and documentation/diff checks.
  Local closeout (2026-10-25): eight team entries pass without skips, including admin
  team creation/assignment, assignment mode editing, two teammate sessions, stale draft
  retention, review/feedback, protected history and 1280px/390px layouts. All 77 unit/docs,
  12 program/session, 12 Storage, seven grading, eight Viewer, nine attendance, five test-
  participant and six multiple-assignment entries pass with browser checks. Lint,
  types/generated types, Webpack build and diff checks pass; exact fixtures cleaned.
  Five week/activity and five written-response entries also pass with no skips.
  Existing default-local-Turbopack limitation and hosted/real-user acceptance remain separate.
- [x] Apply separately authorized hosted team migrations (2026-10-25): all four
  receipts verified, RLS/grants checked, original submission/enrollment/assignment/file
  fingerprints unchanged. Existing assignments remain Individual; no teams created.
- [x] Commit/push and deploy the authorized team release: `9588070`, production
  `dpl_4DzugZEVsx9WT8CjGJTBmdnNkyzB` READY on www.180dcdavis.com. Login, logged-out
  admin/member redirects and private-download denial pass; runtime error scan returned
  no entries. Production-only dependency audit is clean; existing dev advisory stays open.
- [ ] Set up real teams and confirm authenticated hosted admin/member acceptance.

- [x] Refocus the review overview on week/assignment submission counts; remove completion/
  outcome metrics, keep official/test separation and URL-preserved review navigation,
  and verify counts, All submissions versus missing work, and desktop/phone layouts.
  Local verification (2026-10-25): five week/activity and five test-participant entries
  pass at 1280px/390px, including current-attempt counts, separated scopes, missing-work
  filters and review/back/next navigation. Screenshots visually inspected; 75 unit/docs,
  lint, typecheck and Webpack build pass. Released with grading references below.

### Private assignment grading references

- [x] Implement separate admin-only versioned rubric/example text, optional private PDF
  lifecycle/download/cleanup and independent assignment editor/review comparison controls.
- [x] Verify authorization, formatting, save/reload, stale/concurrent changes, retries,
  cancellation, cleanup, private DTOs and desktop/phone comparison/review navigation.
  Local 1280px/390px checks cover failed text save, lost finalization response, transfer
  cancellation, confirmed removal, unsaved navigation, comparison without lost feedback,
  and next-assignment references. SQL/HTTP/Storage deny non-admins and revoked/inactive/
  wrong-domain access; concurrent writes and cleanup retries preserve committed history.
- [x] Run 74 unit/docs, seven grading, five assignment-PDF, 12 Storage and 12 program
  entries, including browser checks; lint, typecheck, generated-type consistency,
  Webpack production build and diff checks pass. Exact grading fixtures/files removed.
  Earlier stale-manifest/mixed-build test runs were rerun successfully using the stable
  production server and matching action manifest (2026-10-25). Default local Turbopack
  limitation remains separate; hosted/real Google acceptance is not implied.
- [x] Apply separately authorized hosted grading-reference migration (2026-10-25),
  without seeds or role changes. Release code and hosted admin acceptance tracked below.
- [x] Commit/push and deploy grading references plus the submission-focused review inbox
  (2026-10-25): `11db9ff`, production `dpl_9VJTX9mRKcRXHEbj54aajnYUXYha` READY on
  www.180dcdavis.com. Private bucket/RLS/grants and empty reference tables verified;
  live login, anonymous admin redirect and denied example download pass. No runtime
  error logs returned at verification. Real authenticated acceptance remains below.
- [ ] Update the development-only transitive Zod dependency flagged by npm audit
  (GHSA-mrhx-c7xc-m3w5; 4.4.3 through ESLint tooling). Production-only audit reports zero
  advisories; dependency changes and validation are separate follow-up work.
- [ ] Confirm real hosted admin grading-reference editing/review acceptance.

### Branded previews, Last active and week-first admin

- [x] Add static public branded OG/Twitter image, private Last active without backfill,
  visible-page recording, admin Portal access timestamp and protected read/write rules.
- [x] Add week completion/assignment progress overview, all-week queue and scoped
  drill-down/review/back/next navigation; preserve official/test separation.
- [x] Verify activity authorization/throttle/failure cases, public metadata/image,
  desktop/phone queues, empty states, regressions, types/lint/build/docs/diff.
  Local closeout (2026-10-23): five focused entries cover DB/HTTP privacy, no prefetch
  recording, concurrent throttling, desktop/390px timestamps, whole-week cross-assignment
  review-next, test separation and failed-recording retry. Public 1200×630 PNG/metadata
  checks and visual inspection pass. All 68 unit/docs, 12 program/session, six assignment,
  five test-participant, eight Viewer, five written, nine attendance, 12 Storage, five
  PDF-brief and nine enrollment entries pass. Lint/types/generated types, Webpack build
  and diff checks pass; no skipped browser entries count as acceptance. Earlier stopped
  test-server and obsolete-selector failures were resolved, not hidden.
- [x] Apply separately authorized hosted Last active migration (2026-10-23): empty
  activity table, receipt/RLS/grants verified; all 12 application/Storage fingerprints
  unchanged. Auth user count stays 28, but its live aggregate changed during verification.
- [x] Commit/push and verify the authorized production deployment: `4d91a35` reached
  Vercel READY on 2026-10-23. Live OG/Twitter metadata, public 1200×630 image and anonymous
  admin/Explore login protection pass; release error-log scan returned no errors.
  Authenticated hosted activity/week review acceptance remains a real-user check.

### Test participant enrollments

- [x] Add admin-managed test flag, normal member workflows, official metric/queue/
  attendance exclusions, explicit test review/roster views and retained history.
- [x] Verify live permissions, flag persistence/reversal, enrollment retries, submissions/
  files/feedback/check-in and 24 official plus test isolation at desktop/phone widths;
  regressions, generated types, lint/typecheck/build, docs and diff checks.
  Five focused entries pass with desktop/390px flows and zero skips; 65 unit/docs,
  lint, typecheck, generated types and Webpack build pass. Twelve program/session,
  twelve Storage, eight Viewer and nine attendance entries also pass with browser checks.
- [x] Apply separately authorized hosted migration; unchanged fingerprints across ten
  application/Auth/Storage tables, 25 official enrollments and zero test enrollments.
- [x] Commit/push and verify the authorized production deployment: `452e3a1` reached
  Vercel production READY on 2026-10-22; real account classification remains manual.
- [ ] Classify a real enrollment as test only through an explicit admin choice; no
  automatic change to the current admin or other real participants.

### Viewer access for board members — local implementation

- [x] Add separate Viewer enum/access migrations, published-content permissions,
  historical-work denial, enrollment/conversion guards and actionable Monday errors.
- [x] Add Portal access roles, Viewer profile labels, Explore cohort/week/assignment
  routes and local-only practice without enrollment or personal progress/statuses.
- [x] Finish isolated Viewer security/concurrency/browser verification, unchanged participant/
  review/attendance counts, member/admin regressions, generated types, lint/build/diff and docs.
  Eight Viewer entries (desktop/phone), 64 unit/docs entries and all existing enrollment,
  program/session, Storage, attendance, assignment/PDF/written regressions pass locally.
  Real Google sessions for board accounts remain a release acceptance check.
- [x] Apply separately authorized hosted Viewer migrations; verify receipts/guards/grants
  and unchanged data fingerprints across 15 tables, including 24 enrollments (2026-10-22).
- [x] Commit/push and verify the separately authorized Viewer production deployment:
  `6679dc4` reached READY at `https://gap-khaki.vercel.app`; live login and anonymous
  Explore/week/admin redirects pass, with no errors in the release runtime-log scan.
- [ ] Provision real board users and verify their Google/Viewer experience with separate
  account-provisioning authorization.

### Workshop resources and week attendance — local implementation

Supersedes the earlier admin-only planning limitation. One workshop maps to each week;
no percentages, penalties, GPS/device tracking, realtime or Monday reporting.

- [x] Add Workshop resources across the database/type/admin/member/preview contracts,
  preserving manual order, existing materials, slides and publication privacy.
- [x] Implement cohort-preserving admin Attendance, dates, static two-hour code/local QR,
  early close and explicit reopen without resetting attendance. Require active/published.
- [x] Add searchable phone marking, confirmed Undo, present counts, version checks and
  actor/time correction history, including closed-session historical corrections.
- [x] Add member dashboard/week prompts without replacing Continue; generic public QR
  landing, fragment capture/tab storage, clean login return, explicit confirmation/receipt.
- [x] Add live identity/roster/enrollment authorization, private codes/failures/audit,
  unique marks, stable retries, close/check-in locks and ten-failure/five-minute limit.
- [x] Complete local verification: 63 unit/documentation entries, nine attendance,
  nine enrollment, 12 program/session, 12 Storage, six assignment, five PDF-brief and
  five written-response entries pass. Attendance browser checks at 1280px/390px cover
  Workshop selector save/reload, ordered preview/privacy, dashboard/week prompts,
  QR-prefilled same-tab sign-in return, manual code, failed/lost save response retry,
  receipts, admin search/mark/confirmed Undo and reload without overflow. SQL/action
  tests cover live authorization, rate limits, expiry/reopen, returning cohorts,
  concurrent check-in/close, rollback and history. Lint, typecheck, generated types,
  Webpack build and diff checks pass; exact fictional fixtures removed (2026-10-21).
  Initial dev-server/browser contention and an incorrect action manifest were resolved
  by serial production-build tests with the matching manifest; no test skips counted.
- [x] Apply the separately approved hosted attendance migration after a dry run without
  seeds/roles/Vault changes. Verify five RLS tables, private codes/RPC grants, migration
  receipt, empty attendance and unchanged fingerprints/counts for nine existing tables
  and all 26 Auth users. No real people were marked or enrolled by verification.
- [x] Rerun unit/docs, attendance, enrollment, program/session, Storage, assignment,
  PDF-brief and written-response regressions on the security-updated dependency tree;
  lint, typecheck, generated types, dependency tree and Webpack build pass (2026-10-21).
- [ ] Verify the automatic Vercel deployment and real hosted attendance flow after push.
- [ ] Verify real Google QR-return and physical-camera scanning on a reachable released
  origin; automated fixture-session browser handoff is not that manual acceptance.

### Monday accepted-member intake — Implemented, acceptance in progress

- [x] Verify configured Monday account, accepted-members board, and column types read-only.
- [x] Implement manual preview/map/confirm intake with private 15-minute batches and
  service-only enrollment receipts; reader and rollback SQL smoke checks pass.
- [x] Configure server-only local Supabase secret for the adapter in ignored `.env.local`.
- [x] User reports successful real enrollment through the admin import UI (2026-09-22).
  This confirms the happy path, not the full retry/concurrency/browser matrix.
- [x] User confirmed reload persistence, Already linked on repeat import, and analyst
  program access/admin denial; these are user reports, not expanded automated Monday tests.
- [ ] Complete extended import tests: concurrent confirms, cross-admin batches, duplicates,
  returning members, inactive access, retries, stale source, and phone/desktop browser flows.

Live enrollment and synchronization depend on P5 database/client work and P7 real
authentication/authorization. A configured Monday board is not a P5 completion gate.

- [x] Document Supabase/Monday ownership, expected form intake, reporting scope, and ADR.
- [x] Record the lead-controlled “Enroll in GAP” checkbox decision and enrollment safeguards.
- [x] Confirm accepted-members board and identity/checkbox/cohort/status columns; existing
  Monday recruitment automation establishes acceptance. No application-form read is needed.
- [x] Use the configured Enroll in GAP checkbox and explicit GAP-admin confirmation;
  membership status is informational, not acceptance or automatic revocation.
- [ ] Verify Monday-side lead-only checkbox permissions; separate Monday result fields
  and individual-report audience/sync timing belong to the future outbound integration.
- [x] Implement durable application-to-enrollment mapping and atomic server-only provisioning.
- [x] Implement the read-only API adapter, private credentials, legacy board-name alias,
  complete pagination, typed columns, and explicit preview-local cohort mappings.
- [ ] Complete intake failure/retry/non-destructive-unchecking acceptance; background
  checkbox-triggered processing remains deferred, not part of manual confirmation.
- [ ] Export per-person due-work counts and cohort outcomes without private work or feedback.
- [ ] Verify duplicate-safe retries, returning applicants, historical cohorts, stale-sync
  visibility, and continued GAP operation when Monday is unavailable.

### Responsive and usability work

- [x] Add compact week assignment cards, dedicated member/admin-preview assignment pages,
  optional authored summaries and safe heading/bold/list/link brief formatting with toolbar.
  Preserve old review URLs, existing prose, private PDFs, history and non-mutating preview.
- [x] Verify local assignment formatting/navigation security and desktop/phone regressions:
  61 unit/docs, six assignment, five written-response, five brief, 12 program and 12
  Storage entries pass. At 1280px/390px verify author/save/reload, headings/bold/lists,
  safe links/inert HTML, compact overview, cohort-preserving preview, denied routes,
  submission/review and no overflow. Lint, typecheck, generated types, Webpack build
  and diff checks pass (2026-10-21). Exact fixtures removed; no hosted changes.
- [x] Apply the three written-response/assignment-format migrations to hosted GAP;
  verify migration history, columns/RPC and unchanged brief/work fingerprints, with
  no seeds or automatic content conversion (2026-10-21).
- [x] Commit and push the combined assignment/written-response release; Vercel production
  deployment for implementation commit `96f4da6` reached READY (2026-10-21).
- [ ] Verify the released assignment pages, formatting and text submissions using real
  authorized member/admin sessions.
- [ ] Approve the proposed Notion SWOT text before replacing the live brief.

- [x] Add written responses (plain text, 20,000 characters), inline review/history and
  text/file/link replacement with existing authorization/version checks.
- [x] Add local-only admin submission-editor preview without enrollment/upload/saving;
  verify isolated drafts and desktop/phone behavior.
  Local validation (2026-10-21): 58 unit/docs, five written-response, four assignment,
  five brief, 12 program, 12 Storage and nine enrollment entries pass. Browser checks
  at 1280px/390px verify text entry, stale-save input retention, in-app drafts, reload,
  escaped rendering, admin feedback and preview with zero write requests. Expired and
  deactivated sessions are rejected. Lint, typecheck, generated-type consistency,
  Webpack build and diff checks pass; fixtures removed. Hosted work remains separate.
- [x] Apply written-response migrations to hosted GAP with the assignment-format release.
  Production readiness and real admin/member acceptance are tracked separately above.

- [x] Support multiple assignments per week with independent deadlines/PDFs/history,
  assignment-specific review selection, and all-approved week completion; preserve
  existing work and verify rollback, stale collection saves and desktop/phone workflows.
  Local verification: 56 unit/docs, four assignment, 12 program, five brief and 12
  Storage suite entries pass, including browser flows; lint, typecheck, generated-type
  consistency, Webpack build and diff checks pass.
- [x] Apply the multi-assignment migration to hosted GAP without seeds; verify schema
  changes and unchanged assignment/submission counts (2026-10-21).
- [x] Push and deploy multiple assignments to production; Vercel reported READY for
  implementation commit `cb4ef58` (2026-10-21).
- [ ] Verify authenticated live admin/member use of multiple assignments.

- [x] Remove generic admin member-portal/profile return links; verify conditional
  “My program” for active enrolled admins and preview access for unenrolled admins
  at desktop/phone widths. Unit/docs, lint, typecheck and Webpack build pass.

- [x] Add admin-only read-only member preview without enrollment; verify published/
  locked weeks, cohort-preserving navigation, denied non-admins and unchanged counts
  at 1280px/390px. 53 unit/docs tests, five brief/browser suite entries, lint,
  typecheck and Webpack build pass.
- [ ] Deploy member preview and verify it with the real hosted admin account.

- [x] Add private direct PDF assignment briefs and editable cohort dates. Local
  Storage/RLS, concurrent replacements, invalid PDFs, expiry, role revocation,
  protected downloads, and desktop/phone upload/date-edit reload flows pass.
  52 unit/documentation tests, five brief-suite entries, lint, typecheck, generated
  types and Webpack build pass. Program regressions: 11 pass, one optional browser
  entry skipped (new-feature desktop/phone checks ran separately).
- [x] Apply the assignment-brief/date-edit migration to hosted GAP; verify private
  PDF-only 20 MB bucket, document RLS, and authorized date-edit function.
- [ ] Verify deployed assignment PDF upload/download and cohort date edits using real
  admin/member sessions. Add operational cleanup for expired/abandoned briefs.

- [ ] Add missing Production `MONDAY_API_TOKEN`, redeploy, and verify hosted preview.

- [x] Replace the native cohort select with a grouped, badge-labeled cohort switcher
  using existing navigation and unsaved-change safeguards.
- [ ] Browser-verify cohort switcher phone layout, keyboard dismissal, grouping, and
  canceled unsaved-change navigation with multiple cohorts.

- [x] Implement the centered login card with approved logo, shared tokens, full-width
  Google action, pending state, and accessible inline OAuth error; preserve auth logic.
- [ ] Browser-verify login normal/pending/error states on phone/desktop, short screens,
  200% zoom, and keyboard navigation. Do not count HTTP checks as visual verification.

- [ ] Verify assignment-state precedence and consistency across dashboard, week, and admin
  screens.
- [ ] Verify all stored timestamps display correctly in `America/Los_Angeles`, including
  daylight-saving boundaries.
- [ ] Add route loading, not-found, backend failure, and empty states.
- [ ] Audit keyboard operation, focus visibility, semantics, labels, status announcements,
  target sizes, contrast, and reduced motion.
- [ ] Test member flows at narrow mobile, common phone, tablet, laptop, and wide desktop
  widths.
- [ ] Test admin table/card behavior on narrow screens and desktop.
- [ ] Remove obsolete mock-only runtime paths and unused starter assets without deleting
  user-owned brand references.
- [ ] Confirm no excluded LMS features or fake analytics slipped into the interface.

### Phase 8 gate

- [~] Full learn → submit → review → feedback story passes on mobile and desktop:
  P6 submission/review/feedback/history is verified at 390px and 1280px; complete the
  learning/resource-navigation portion and broader responsive/accessibility audit.
- [ ] No known critical accessibility, authorization, data-loss, or responsive defects.
- [ ] Lint, typecheck, complete tests, and production build pass.

## Phase 9 — Setup documentation and release

- [ ] Replace the starter README with product overview, prerequisites, local setup,
  scripts, architecture links, Supabase setup, seed/type commands, and deployment.
- [ ] Finalize `.env.example` and verify it contains placeholders only.
- [ ] Update `docs/operations.md` with exact verified Google, Supabase, Storage, and Vercel
  steps; retain Pending labels for anything not performed.
- [ ] Verify migrations and seed data against a clean Supabase project or documented test
  environment.
- [ ] Configure Vercel environment variables and production deployment.
- [x] Apply all eight migrations to the verified empty hosted GAP project without
  seeds/reset; verify migration history, RLS flags, private bucket settings, and
  preservation of its existing Auth user (2026-10-20 Pacific).
- [x] Provision the explicitly confirmed first hosted admin after checking its verified
  Google identity; create only person and active admin roster entries transactionally.
- [ ] Verify the first hosted admin's real login/profile synchronization; run hosted
  member/admin and private-file smoke tests before declaring production acceptance.
- [ ] Resume [deferred Vercel environment-variable cleanup](docs/operations.md#vercel-environment-variable-cleanup--deferred):
  verify exact hosted variable names/values, review unused aliases, verify hosted
  prerequisites, then redeploy and test authorized access. No configuration changes
  or hosted acceptance are implied by documenting this task.
- [ ] Set final production redirect URLs and run member/admin smoke tests.
- [ ] Review all living docs against the released implementation.
- [ ] Move completed changelog entries from `Unreleased` into the first release section.

### Release gate

- [ ] All 16 requested deliverables are demonstrably functional.
- [ ] Manual external configuration is either verified or called out precisely as remaining.
- [ ] Security/RLS, responsive, accessibility, lint, typecheck, tests, and production build
  checks pass.
- [ ] Repository contains no secrets, real seed-member personal data, or public submission
  files.
