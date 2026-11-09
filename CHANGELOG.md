# Changelog

All meaningful changes to GAP are documented here. This project follows the structure of
Keep a Changelog without assigning versions until the first release.

## Unreleased

- Added optional private formatted briefs per team on Standard Team assignments, with
  independent versioned admin saves and sample-team preview. Members get their own brief
  beneath shared instructions in a focused Instructions / Workspace view. Added safe,
  responsive Markdown tables; submissions and grading remain unchanged.

- Added reusable Individual spreadsheet investigations with private progressive/optional
  hints, saved conclusions, server-checked suspect names and ordinary admin-reviewed
  submissions. Review retains per-attempt hint snapshots; assignment-level insights keep
  Official/Test opens separate. Added draft-week setup and zero-write previews without
  configuring real Week 3 content or publishing the admin answer-key workbook.

- Resolved all nine dependency audit findings with transitive Zod 4.6.7 and a scoped
  minimatch 11.0.4 override for TypeScript lint tooling. Framework/runtime versions stay
  unchanged; the full dependency audit now reports zero vulnerabilities.

- Added Android Ultra HDR v1 JPEG compatibility alongside Apple HDR support, including
  verified legacy Pixel boundaries, private previews and unchanged original downloads.
  Unrelated images, malformed containers and extra video remain unsupported.

- Added compatibility for iPhone JPEGs containing one validated Apple HDR gain map.
  Private previews show the main photo; original downloads retain the complete file.
  Unrelated multipicture files and malformed auxiliary data remain rejected.

- Raised the still-image upload and protected-preview limit from 20 to 50 megapixels;
  the 20 MB file limit and existing format/container checks remain unchanged.

- Fixed valid links being rejected when selected text included a trailing line break.
  The formatting toolbar now uses inline Link text/Web address fields with explicit
  insertion, cancellation and recoverable validation instead of a browser prompt.

- Added Standard-assignment PNG/JPEG/WebP screenshot uploads and private inline admin
  image previews with retry/download recovery. Guided projects remain document-only;
  original files/history and manual Complete/Request revision behavior are unchanged.

- Added an independently styled public website starter at `/landing`, with approved
  branding, an Open GAP link and noindex metadata/headers. Public visits skip GAP session
  refresh and activity tracking; existing portal URLs and authentication stay unchanged.

- Refocused case and guided assignments into separate Instructions and Workspace views,
  preserving authored content and saved workflows. Added navigable briefs, a roomy case
  comparison with smaller-screen view controls, and easy-to-reach final submission.
- Separated pending alternative-direction requests from read-only team project progress.
  Recommended selections are explicitly labeled and require no new approval.

- Aligned case-progress status badges and View answers links in consistent columns,
  preventing completion timestamps from shifting the badge; phone rows remain stacked.

- Made review-queue filters, assignment drill-down and search update locally without
  refetching the admin page. Parallelized independent admin/member data reads and week
  activity setup reads, retaining live authorization, pagination and private-data scope.

- Replaced the corner “Loading GAP” text with a centered UC Davis logo and restrained
  green loading indicator, with screen-reader status and reduced-motion support.

- Added admin case-progress filters with accurate Complete/In progress/Not started counts,
  searchable participant rows and read-only per-case responses/reference comparison.
  Exercises remain separate from graded submissions; no scores or completion changes.

- Added consistent pointer cursors for enabled controls and clearer hover/focus/press
  feedback on review-queue text actions, without motion or changes to review behavior.

- Reorganized admin week editing into Overview, Assignments and Materials, with a focused
  assignment selector and Details, Instructions, Activity setup and Grading reference
  sections. Guided briefs/team directions and challenge cases are edited individually.
  Section switches retain text, selected PDFs and transfers; existing independent saves,
  review edit links and publication behavior remain intact. No database changes.

- Reduced explanatory UI clutter across admin review, attendance, Members, Teams,
  workflow editors, previews and member learning/submission screens. Removed redundant
  count/retention notes and subtitles; kept status, scope, learning content, actionable
  errors, limits and safety warnings. Empty review queues now use a single clear heading.

- Simplified attendance presentation by removing sign-in instructions and footer text,
  retaining the closing date/time, QR/code labels and existing fullscreen/exit behavior.

- Added Present check-in to admin Attendance: a standalone large QR/code presentation,
  optional browser fullscreen, Escape/exit and full-window fallback. Existing session,
  code, closing time and recorded attendance remain unchanged.
  Desktop/phone fullscreen/fallback, focus return, short viewport and expired-state
  checks pass locally with the full nine-entry attendance suite; no hosted changes.

- Added the Individual Eight-case challenge workflow with supplied editable scenarios,
  private save-to-reveal reference approaches, durable answers, optimistic conflicts and
  duplicate-safe retries. Finish challenge locks answers and completes progress without
  document submissions, scores or grading queue entries. Existing assignments remain
  unchanged; hosted migration and real Week 2 configuration are separately authorized.
  Local case/guided/program/Storage/team/completion browser suites pass, alongside
  84 unit/docs checks, lint, types, generated types and the Webpack production build.
  Separately authorized hosted migration `202610290003` is verified with unchanged
  existing work/attendance fingerprints and empty private exercise configuration/runs.

- Clarified guided research saves: each save updates current team answers, which remain
  editable until the final submission. Expanded regression coverage to check all three
  updated answers are shared; the separate admin history snapshot remains unchanged.

- Added a local Guided project workflow for Team assignments: shared original/working
  research, server-side recommendation reveal, admin-approved alternatives and a gated
  final document. Independent setup and direction approvals stay outside grading counts;
  existing Standard assignments are preserved. Nine local guided checks, desktop/phone
  flows and team/program/upload/completion/Viewer/assignment regressions pass, alongside
  82 unit/docs tests, lint/types/generated types and Webpack build. Real recommendations
  remain explicitly admin-configured; authenticated hosted acceptance stays separate.
  Authorized hosted migrations `202610290001`/`202610290002` are now verified; all
  existing assignments remain Standard and no real recommendations were created.

- Added local admin Mark complete/Undo completion for legacy Individual assignments
  without submissions. Separate audited credit clears missing-work warnings and counts
  toward progress without inventing attempts or sharing another participant's work.
  Existing review history and next-week Team submissions remain unchanged.
  Local grant/undo desktop/phone and authorization/race checks pass, alongside program,
  upload and team regressions. Authorized hosted migration `202610280001` is verified;
  no real completion credits were automatically granted.

- Simplified Teams into a selector-header panel with a read-only assigned roster,
  explicit membership editing, secondary rename/delete actions and numbered Add team
  suggestions. Existing teams and locks are preserved; naming conflicts require a new
  confirmation. Review counts now share compact Montserrat body typography.

- Added a reusable GAP release skill and compact operations runbook, separating
  code-only deployments from conditional migration/backfill checks and avoiding
  duplicate Git-triggered/CLI deployments. No hosted changes are part of this update.

- Added local admin-assigned cohort teams and opt-in team assignments with one shared
  submission/review, teammate feedback/history/private files and per-person completion
  derivation. Stable targets, request receipts and serialized version checks protect
  simultaneous saves; existing individual work is preserved. Eight local team checks,
  desktop/phone flows, 77 unit/docs and program/Storage/grading/Viewer/attendance regressions
  pass, along with lint/types/generated types and Webpack build. Hosted rollout and real
  team provisioning remain separate.
  Authorized release `9588070` is live on www.180dcdavis.com; all four hosted migrations
  are verified with original submission/enrollment/assignment/file fingerprints preserved.
  Anonymous route/download protections pass; real team setup remains admin-controlled.

- Refocused the admin review inbox on received/awaiting submission counts by week and
  assignment. Removed participant completion and cohort outcomes from that page; All
  submissions excludes missing work while Not submitted remains separately available.
  Released with grading references in `11db9ff`; hosted migration applied and production
  deployment reached READY on www.180dcdavis.com. Anonymous route/privacy smoke checks
  pass; real authenticated admin acceptance remains pending.

- Added local admin-only assignment grading references: independently saved formatted
  rubrics/model responses, private example PDFs, protected downloads and a comparison
  panel beside submission review. References are excluded from learner/Viewer previews;
  no scoring or review-status changes. Seven grading entries and desktop/phone flows
  pass alongside 74 unit/docs and existing PDF, Storage and program regressions. Lint,
  types, generated types and Webpack build pass. Hosted migration/deployment are separate.

- Replaced the wide social graphic with a square, logo-only preview using the approved
  compact UC Davis lockup, preventing clipped headlines in Slack's thumbnail layout.
  Release `378de11` is live; public image and metadata pass Slack-crawler HTTP checks.

- Added version-specific approval for the reviewed native resolver install script and
  reproducible Vercel installs; strip only unsupported npm cache-dir environment aliases
  from install/build commands without suppressing other warnings. Production release
  `8851c92` reached READY with neither warning in the hosted build logs (2026-10-23).

- Added a branded static social-link image and OG/Twitter metadata, admin-only Last
  active from visible authorized visits (no historical backfill), and a week-first
  admin overview with all-assignment completion/progress and scoped review drill-down.
  Activity remains private and nonessential; official/test histories remain separate.
  Five focused local entries and desktop/phone flows pass alongside existing regressions,
  68 unit/docs checks, lint/types/generated types and Webpack build. Hosted changes,
  push/deployment and real Google acceptance remain separate.

- Added local admin-managed Test participant flags independent of roles/lifecycle.
  Test enrollments retain real submission/feedback/file/check-in workflows but do not
  contribute to official totals, default review queues or attendance present counts.
  Separate test review/attendance views retain history; hosted release remains pending.

- Simplified dashboard continuation to the week number, leaving full titles in module
  rows. Moved open workshop check-in beside/below the greeting as a compact neutral
  action instead of a competing full-width green banner; week prompts share the styling.

- Added local Viewer access: published active/archived programs and non-saving assignment
  practice without enrollment, cohort metrics, review/attendance obligations or private
  learner/admin data. Added Portal access roles, separate read/participation permissions
  and guarded enrollment/role transitions. Eight isolated Viewer entries, desktop/phone
  practice with zero write requests, existing regressions and local build/type/lint/docs
  checks pass. Separately authorized hosted Viewer migrations are applied with unchanged
  existing record fingerprints and 24 enrollments. Real board provisioning/Google acceptance
  remains separate.

- Updated Next.js and eslint-config-next to matched stable 16.4.2 and applied compatible
  Sharp/source-map-js/brace-expansion security fixes. Production dependency audit is clean;
  five development-only braces/lint-chain findings have no compatible upstream patch and
  remain tracked. No forced framework downgrade or unrelated major upgrade.

- Added Workshop materials and week-based attendance locally: static two-hour check-in
  code/local QR, explicit member confirmation and receipts, dashboard/week prompts,
  phone-friendly admin marking/Undo and correction history. Private codes, live enrollment
  checks, attempt limits and session locks protect attendance independently of assignments.
  Nine attendance entries and desktop/phone flows pass with unit/docs and program,
  enrollment, Storage, assignment, PDF and written-response regressions. Lint, typecheck,
  generated types, Webpack build and diff checks pass on Next 16.4.2. The separately
  approved hosted migration is applied with unchanged existing record fingerprints;
  deployment/physical-camera/real Google QR acceptance remains separate.

- Added compact week assignment cards and focused assignment pages with full briefs,
  PDF downloads and submission controls beneath the instructions. Added optional summaries
  and opt-in restricted brief formatting with an admin toolbar/preview. Existing prose,
  submission-review links and histories remain intact. Hosted migrations are applied
  with unchanged content fingerprints; the production deployment reached Vercel READY.

- Added plain-text responses alongside files/links with inline review, retained history
  and version-checked replacement. Added local-only admin editor preview without
  enrollment, uploads or saving. Hosted migrations are applied with the assignment release.

- Added ordered multiple assignments per week with independent deadlines, PDFs,
  submission histories and reviews. Weeks complete only after all assignments are
  approved, with partial counts displayed. Added transactional collection saves and
  retained-ID migration. Applied the hosted migration without seeds and verified
  unchanged assignment/submission counts. Pushed and deployed to production (Vercel
  READY); authenticated live workflow acceptance remains separately tracked.

- Replaced the admin member-portal shortcut with conditional “My program” for enrolled
  admins; removed the duplicate profile return link and kept admin logo navigation in admin.

- Added admin-only member preview for a selected cohort, sharing dashboard/week layouts
  with locked drafts and disabled submission controls, without enrollment or metric changes.

- Added direct private PDF assignment briefs, protected downloads beside instructions,
  and version-checked replacement. Added cohort start/end editing under Manage cohort
  without changing assignment deadlines. Applied the new migration to hosted GAP;
  real hosted workflow acceptance remains pending.

- Diagnosed hosted Monday configuration as missing its API token.

- Applied the eight existing migrations to the empty hosted GAP project without
  demo seeds or reset. Verified RLS flags, private submissions bucket settings, and
  preservation of the existing Auth user. Provisioned the owner-confirmed first hosted
  admin; real admin login and hosted workflow acceptance remain pending.

- Added minimal server-side OAuth callback diagnostics (SDK error code and status only)
  to investigate hosted session-exchange failures without logging credentials or URLs.

- Scoped member reads to the signed-in person's selected active cohort and retained
  attempts instead of loading the admin workspace. Added malformed-input guards for
  non-upload actions and local regression coverage for direct action authorization,
  session refresh/revocation, and histories beyond the API page limit.
- Completed local production-mode desktop/phone publishing, roster, submission/review,
  recovery, and sign-out verification. Fixed browser-test selector/navigation races and
  reconciled P5/P7 local acceptance separately from pending hosted configuration.

- Hardened P6 recovery: safe malformed-input rejection, contained Office parsing errors,
  reliable cancellation-failure messaging, and view refresh on idempotent save retries.
  Added owner-scoped/bounded cleanup and regression coverage for late uploads, cleanup
  failures, concurrent review/replacement, and browser save-response loss.

- Documented deferred Vercel environment setup: required names, integration aliases,
  optional settings, hosted prerequisites, and an ordered resume checklist. Preserved
  the local P6 checkpoint; no credentials, configuration, or deployments changed.

- Added private PDF/DOCX/PPTX/XLSX submissions up to 20 MB, resumable direct uploads,
  progress/cancellation/retry, bounded file-format validation, atomic version-checked
  finalization, and authenticated current/historical downloads. Local Storage is enabled;
  abandoned uploads have an idempotent local cleanup command. No hosted changes or malware
  scanning are included. Added isolated Storage/API/browser coverage and upload-lifecycle ADR.
- Recorded user-confirmed Monday reload persistence, repeat-import linking, and analyst
  access separately from still-open automated Monday/session-security acceptance checks.

- Added a manual Monday accepted-member import panel, paginated read-only adapter,
  explicit cohort mapping, and private expiring batches with service-only processing
  and atomic enrollment receipts. Extended acceptance testing remains pending.

- Added empty, server-only Monday token and board/column mapping placeholders to the
  environment example. Configuration preparation only; no live integration is enabled.

- Replaced the admin cohort dropdown with a compact grouped switcher, state badge,
  mobile-sized targets, and keyboard/outside-click dismissal; navigation guards remain.

- Refreshed login as a centered branded sign-in card with a full-width Google button,
  pending feedback, and inline error styling. Authentication and access rules are unchanged.

- Recorded a deferred phone-friendly admin attendance tracker: tap-to-mark presence,
  undo, search, and persistent meeting records. Planning only; no attendance code or
  schema changes were made.

- Removed verified local demo program records with a private recoverable backup while
  preserving real admin access. Disabled automatic demo seeding, retained explicit
  demo/test fixtures, and documented the remaining private-file P6 backlog.

- Enabled the local Google provider with private `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET`
  references; local Supabase startup now explicitly loads `.env.local`. Real Google
  sign-in acceptance remains pending.

- Recorded passing local P5 database, enrollment, generated-type, and automated checks;
  kept interactive browser/session-expiry and real Google OAuth acceptance open.
  Documented local Google provider setup and the disabled-provider error separately
  from hosted configuration. Updated Next.js and audited dependencies, and added
  paginated workspace reads with regression coverage.

- Verified GAP's Apple Silicon development setup: native Docker, fnm/Node 24, refreshed
  lockfile-installed dependencies, and a passing default Turbopack production build.
  Preserved old tooling for rollback and left Docker data and unrelated Homebrew tools intact.

- Added the in-progress P5 local Supabase content/submission schema, live-roster access
  checks, Google sign-in routes, protected data reads, and transactional link/admin saves.
  Files remain disabled until P6. Full local and Google OAuth acceptance is pending.
- Preserved replacement version tokens while forms are open and added transactional
  review receipts to prevent concurrent saves from silently adopting newer versions.
  Fixed week-editor saved-state tracking and cohort-creation pending state.

- Added the Monday-ready enrollment database foundation: private application links and
  atomic, duplicate-safe provisioning that preserves roles, inactive access, and cohort
  history. Added isolated SQL concurrency, rollback, and permission tests. No live Monday
  connection, public enrollment endpoint, or mock-admin integration is enabled.

- Documented the planned Monday.com recruiting and club-reporting integration: expected
  application-form intake, Supabase ownership of GAP records/files, per-person and cohort
  summaries, and pending external/sync setup decisions. No integration is deployed.
- Approved a lead-controlled “Enroll in GAP” checkbox in Monday as the enrollment request;
  acceptance alone grants no access. Documented eligibility, separate result reporting,
  duplicate-safe processing, and non-destructive unchecking. Configuration is still pending.

- Integrated continuation into the module panel beneath a shared heading and progress
  indicator, with a compact caught-up state in the same header position.

- Simplified the dashboard hero into a slim continuation bar; assignment and feedback
  summaries now stay on their dedicated week and submission pages.

- Made Continue Week the dashboard's primary action, with feedback and assignment
  actions presented as secondary links.

- Restored distinct module status icons and replaced the dashboard next-step panel with
  a paired week and assignment overview, keeping full feedback on the review page.

- Refined member pages with one dashboard next-step feature, progress beside modules,
  consistent headings, direct materials navigation, and quieter submission-rail metadata.
- Shared member submissions and drafts across client navigation, preserving prior attempts
  and other assignments when revising work. Added explicit awaiting-review labels,
  visible sample-file feedback, draft cancellation confirmation, and editor focus handling.

- Locked completed submissions in the member workspace: finished work now offers only
  the view action, while awaiting-review and revision-requested work remains replaceable.

### Added

- Mock admin workspace with URL-preserved cohort and queue context, mutually exclusive
  review filters, search, review-next flow, responsive member cards, submission history,
  explicit participant/access editors, structured week publishing, and cohort outcomes.
- Pacific wall-clock deadline conversion with daylight-saving gap and ambiguity checks,
  plus unsaved-change protection for admin week and review detail workflows.
- Admin-specific DTOs, validation, authorization checks, selectors, fictional fixtures,
  and dependency-free domain tests designed for later Supabase replacement.
- Structured documentation system for product, design, architecture, data, operations,
  ideas, and durable decisions.
- AI contributor workflow and definition of done in `AGENTS.md`.
- Phased implementation tracker for the full MVP.
- Public environment-variable example and dependency-free foundation checks.
- Normalized official brand assets and branded application icons.
- Node.js 24 LTS runtime pinning and `fnm`-compatible project selection.
- Montserrat-based Tailwind theme tokens, accessible UI primitives, and responsive member
  and admin application-shell variants.
- Typed Fall 2026 mock program data, submission-history fixtures, and deterministic state,
  completion, selection, and Pacific-time formatting helpers.
- Non-production component lab for reviewing the visual system and representative states.
- Dependency-free domain-state tests using Node's built-in TypeScript stripping.
- Interactive week-progress and local file-selection previews in the component lab.
- Mock-backed student dashboard with program progress, priority revision work, feedback,
  and a protected six-module catalog.
- Published-week route scaffold with draft and malformed-route denial.
- Pure dashboard view-model and safe published-week lookup with edge-state tests.
- Fall, Winter, and Spring cohort domain contracts with permanent people, explicit
  enrollments, advancement decisions, promoted responses, and fictional cohort history.
- Transparent cohort advancement, offer-yield, and end-to-end conversion selectors.
- Accepted cohort-history architecture decision and cohort-aware Supabase schema plan.
- Current cohort context in the analyst profile dropdown.
- Simplified dashboard status with one clear completed-program progress indicator.
- Complete mock week workspace with workshop materials, resources, assignment state,
  file/link replacement, feedback, and retained submission history.
- Pure cohort-scoped week-detail, submission validation, and immutable replacement helpers.
- Focused member submission-review route for feedback, revision, current work, and history.

### Changed

- Unified week presentations and references into one materials list, simplified the
  assignment hierarchy, and clarified the revision-requested next action.
- Reworked submission review into an open, state-aware layout with compact awaiting-review
  content, a full-width revision editor, and quieter retained history.
- Emphasized reviewer feedback, enlarged current submitted-work controls, and added view
  actions for every retained submission attempt.
- Aligned submission review with its parent week through shared header scale, spacing,
  week context, and a reusable submitted-work record.
- Made the program dashboard the member home, shortened week routes to `/week`, moved
  the retired public splash to development-only `/dev/info`, and made the header logo
  the home control while preserving old `/program` links with permanent redirects.
- Moved assignment lifecycle preview controls out of member-facing week and submission
  routes and into the non-production component lab, leaving the real workspaces driven
  solely by their current submission data.
- Kept assignment instructions in the wide week-page column across every submission state
  and reduced the submission rail to status, current-work metadata, and one next action.
- Reframed week detail pages around the assignment workflow, with progressive submission
  controls, a full-width desktop workspace, and quieter workshop and resource references.
- Simplified submission review into an outcome-first status, prominent feedback, compact
  current-file metadata, and an always-visible timeline of prior attempts.
- Recast reviewer feedback as an editorial note and joined current-file metadata with its
  view and revision actions in one cohesive submitted-work record.
- Reconnected the editorial review treatment to the shared UI kit with icon-free status
  badges, a restrained attachment tile, and standard secondary and primary controls.
- Repaired the submitted-work tile so metadata keeps its full row and equal-width actions
  no longer compress filenames or timestamps inside the desktop review pane.
- Reduced completed submission states to one Feedback heading, one adjacent status badge,
  and the reviewer comment without repeated labels or instructional copy.
- Split assignment workspaces into automatic preparation and review modes, with a
  development-only four-state preview control for visual and interaction testing.
- Replaced ambiguous reviewed/needs-revision outcomes with submitted,
  revision-requested, and completed states; review remains timestamped metadata.
- Official UC Davis logo assets are now treated as available production brand sources.
- Reworked the holding page around the Growth Analyst Program name and UC Davis brand
  palette.
- Confirmed Next.js 16.3.0 as the current secure stable release while retaining React
  19.2.
- Updated the branded holding page to consume the shared Phase 1 design tokens.
- Refined the application header into a single desktop row with an adaptive two-row mobile
  layout, standardized showcase previews on Aydin Merchant, and presented the member role
  as Analyst in the interface.

### Fixed

### Security
