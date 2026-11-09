# GAP Application Architecture

Monday manual intake uses server actions behind live admin authorization. A server-only
Supabase secret invokes the service-only batch RPC; no browser has provisioning RPC
access. Private owner-scoped previews store source rows and cohort mappings, expire in
15 minutes, and recheck Monday before confirmation. Per-item transactions preserve
successful receipts through retries. No background jobs or Monday writes are involved.
See [ADR 0008](decisions/0008-monday-member-import.md).

**Status:** Active
**Last updated:** 2026-11-09
**Source of truth for:** Routes, application boundaries, auth/data flow, and mutation patterns

## Stack and principles

The review inbox derives received/awaiting totals from current person × assignment
queue rows, separately per official/test audience. All submissions omits rows without
a submission; missing obligations remain available through Not submitted. The existing
completion selector is retained for callers/tests, but completion/outcome metrics are
not presented on the review overview. No data model or mutation contract changes.

Private grading references use explicit admin page props, not the broad workspace or
shared member Assignment contract. Admin edit/review routes load only the relevant
assignment IDs through a user-scoped RLS loader in `src/lib/grading/`. Client editors
save reference text independently; safe formatting reuses the instruction renderer and
toolbar with distinct labels. Local feedback state is not remounted when switching tabs.
Server Actions check live admin authorization; ordinary text saves use a user-scoped RPC.
Only inspected PDF preparation/finalization/cancellation/removal use the privileged Storage
client and narrow service-only RPC. File bytes transfer directly through authenticated
resumable Storage, never through Server Actions. `/api/grading-examples/[id]/download`
looks up the authorized committed row and streams a user-scoped attachment, no-store.
The local cleanup command uses Storage API deletion after a service-only abandonment claim.
See [ADR 0019](decisions/0019-private-assignment-grading-references.md).

Viewer Explore has a dedicated user-scoped published-content loader and role-checked
layout/data boundary, never the broad admin workspace or admin-preview loader. Portal
entry redirects Viewers before loading participation. Shared content components accept
a browsing variant; practice has no member workspace, mutation requests or enrollment.
Content and participation privileges are separate DB helpers; participant actions also
call `requireParticipant`. Normal own-profile synchronization is not participation.

Attendance uses user-scoped clients and typed actions in `src/lib/attendance/`, without
a service-key client or new public API. Its generic landing sits outside the protected
portal layout to capture QR fragments before login. Anonymous output contains no workshop
details; authorized reads fetch matching enrollment/context and own receipt. Codes are
only serialized to admin screens; `qrcode` generates PNGs server-side, not externally.
The admin-only presentation component reuses that authorized session/code/QR projection
inside a native modal dialog. Browser fullscreen is an optional client capability, with
a full-window fallback; no new route, API, code generation or mutation is involved.
Tab storage carries pending input across same-tab sign-in; OAuth returns use a clean path.
Actions/DB transactions independently check live access. Refresh/revalidation provide
updates without shared protected caching or realtime.

- Next.js 16.4.2 stable App Router, React 19.2, TypeScript strict mode, and Tailwind
  CSS 4 on Node.js 24 LTS.
- Production dependencies use stable/LTS release channels. Keep Next.js and
  `eslint-config-next` versions identical and keep React/React DOM versions identical.
- Supabase directly for Postgres, Auth, and Storage; no ORM or alternate backend.
- Vercel-compatible deployment.
- Prefer Server Components for protected reads and initial rendering.
- Add Client Components only for browser interaction, local state, file selection, or
  progressive form feedback.
- Keep application code straightforward; avoid generalized LMS abstractions.

## Route map

| Route | Access | Purpose |
| --- | --- | --- |
| `/landing` | Public; no GAP session work | Independent public website starter; noindex/nofollow |
| `/` | Active member/admin | Student dashboard and portal home |
| `/login` | Public | Google sign-in and access explanation |
| `/explore` | Active Viewer/Admin | Published active/archived program browser |
| `/explore/week/[weekNumber]` | Active Viewer/Admin | Selected-cohort workshop/resources |
| `/explore/week/[weekNumber]/assignments/[assignmentId]` | Active Viewer/Admin | Published brief/PDF and non-saving practice |
| `/attendance/[sessionId]` | Generic public shell; authorized member details | Explicit QR/manual check-in and receipt |
| `/admin/attendance` | Admin | Selected-cohort sessions, local QR and roster corrections |
| `/auth/callback` | Public callback | Exchange OAuth code and validate access |
| `/access-denied` | Public | Explain domain, roster, or inactive access failure |
| `/week/[weekNumber]` | Active member/admin | Published week detail |
| `/week/[weekNumber]/assignments/[assignmentId]` | Enrolled active member/admin | Complete brief and submission workspace |
| `/week/[weekNumber]/submission` | Active member/admin | Own submission review and history |
| `/dev/info` | Development only | Retired public-information page reference |
| `/admin` | Admin | Overview and submission matrix |
| `/admin/submissions/[id]` | Admin | Submission review and history |
| `/admin/cases/[assignmentId]/[enrollmentId]` | Admin | Read-only participant case responses/reference comparison |
| `/admin/weeks` | Admin | Week listing and publication state |
| `/admin/weeks/[id]` | Admin | Week, assignment, and resource editing |
| `/admin/members` | Admin | Approved-roster management |
| `/api/submissions/[id]/download` | Active individual owner/authorized teammate/admin | Private current/historical file attachment |
| `/api/submissions/[id]/image` | Same live RLS as downloads | Private, bounded metadata-free PNG preview |

In Next.js 16, dynamic `params`, `searchParams`, `cookies()`, and `headers()` are async.
Use the installed documentation rather than legacy examples.

## Supabase clients

- Use `@supabase/ssr` and `@supabase/supabase-js`.
- Provide a browser client for Client Components and a cookie-aware async server client
  for Server Components, Server Actions, and Route Handlers.
- Use root `proxy.ts` to refresh auth tokens with `getClaims()` and propagate updated
  cookies. Proxy is an optimistic navigation layer, not the authorization boundary.
- Never use deprecated `@supabase/auth-helpers-nextjs` patterns.
- Do not expose or require a service-role key in browser code. Prefer user-scoped clients
  protected by RLS for runtime operations.

## Authentication and authorization flow

`/admin/preview` and `/admin/preview/week/[weekNumber]` require live admin authorization
at both layout and data boundaries. They reuse the user-scoped admin workspace read,
then map only the selected cohort's catalog/published payload into member view models.
An in-memory `admin-preview` enrollment context satisfies the existing pure selectors;
it is never saved or passed to a mutation. Real enrollments, attempts and feedback do
not enter preview DTOs. Shared week rendering offers a local-only editor preview:
explicit preview mode isolates drafts from the member provider and guards submit/upload
handlers in addition to disabling save. Typing/selecting files sends no mutation/Storage request.
Preview navigation retains its cohort query; normal member reads remain enrollment-scoped.

1. The user initiates Google OAuth with an allowed callback URL.
2. `/auth/callback` exchanges the code for a cookie-backed session.
3. Server-side logic verifies identity, normalizes the authenticated email to lowercase,
   checks `@ucdavis.edu`, and checks an active approved-roster record.
4. Profile data is created or synchronized from the roster without trusting editable
   user metadata for roles.
5. Protected layouts load a minimal current-user DTO and redirect unauthorized users.
6. Every Server Action/Route Handler repeats authentication and role/ownership checks.
7. Database and Storage RLS enforce the same policy independently.

## Data access and mutations

The public website uses the `(marketing)` route group under the existing root document
and fonts. Its Server Components live in `src/components/marketing`, with CSS Modules
and no protected shell/provider/data imports. Public-only assets belong in `public/marketing`;
approved logos remain shared in `public/brand`. The thin `/landing` page renders a
path-independent starter, and marketing's Open GAP destination lives in one site config.
Marketing overrides inherited GAP metadata; `next.config.ts` adds indexing headers for
exactly `/landing` and descendants. The proxy exits before Supabase configuration/client/
cookie work for that subtree, never similarly named paths such as `/landing-other`.
Ordinary anchors avoid speculative portal prefetch. No new API, schema, runtime or
deployment project is introduced. See [ADR 0024](decisions/0024-public-marketing-boundary.md).

Case and guided assignment Instructions/Workspace views are local client state, not
new routes or server reads. Native hidden wrappers retain guided step/submission DOM
while removing inactive controls from layout and keyboard traversal. BriefReader uses
scoped heading anchors from the existing restricted parser; default brief rendering and
authored stored text remain unchanged. Read-only preview projections stay unchanged.
The admin guided panel derives pending alternatives and team progress from the existing
authorized DTO. Only active, unfrozen pending alternatives expose decisions; recommended
selections never need an approval. Current week/audience filters match the review overview.
Decision edits retain note/version/request identity through failures; no schema, RPC,
submission eligibility or public action contract changes.

Independent workspace datasets are fetched concurrently after authorization through
`readWorkspaceRows`, preserving deterministic pagination and fail-closed errors.
Member reads retain enrollment/cohort scoping and run independent requests in parallel
at each dependency boundary; no service key or cross-request cache is added. Week edit
references and activity configurations also load concurrently after the week is known.
The admin review overview already contains its cohorts/weeks/queues. Its week, assignment,
audience, status and search controls use Next-integrated native history replacement to
filter that snapshot locally, not a Server Component navigation for each click/keystroke.
A small synchronous query subscription preserves controlled input during rapid typing;
browser history and Next search-parameter consumers stay in sync without a data cache.
Links, reloads and mutations still fetch/authorize normally; successful saves still refresh
the snapshot. URL context, direct links, review-next and back navigation remain intact.

The admin week editor uses local section and selected-assignment state; inactive panels
remain mounted behind native `hidden` wrappers, retaining independent editor state and
upload tasks while removing controls from layout/keyboard navigation. Section switches
perform no mutations or route navigation. `#grading-<assignment>` and
`#guided-<assignment>` reveal the corresponding assignment/section. PDF selection/busy
state participates in the existing unsaved-navigation guard. Existing authorized loaders,
action contracts, week save payload and independent activity/reference saves are unchanged.
This visual organization introduces no schema or migration changes.

Guided project code lives in `src/lib/guided/`. Shared assignment contracts contain only
the safe workflow discriminator. Protected assignment pages request separate, user-scoped
RPC projections; ordinary module loaders never include private recommendations, research
or approvals. Common formatted instructions use the existing safe renderer. Small client
forms preserve unsaved input and stable retry IDs, with independent admin workflow/team
saves. No new public API or privileged application client is introduced.
Admin overview loads separate project-direction request props, not submission rows;
review receives only its assignment/team context. Explore explicitly strips team data
even when an admin is browsing; sample-team state is limited to live-admin preview.
Final submission/upload operations retain their existing interfaces and transactional
version checks, with additional database eligibility/freeze guards.

Manual completion uses an admin Server Action with runtime UUID/action validation and
the user-scoped completion RPC. Completion credit is a separate read model, not an
attempt. Admin queues join active credit by assignment/enrollment; member reads scope
credit to the chosen enrollment and published assignments, attaching only its receipt
ID and timestamp to member assignment DTOs. Shared completion selectors honor credit;
received counts still require real attempts. Writes refresh protected views after
success, with confirmation/retry and explicit undo. The RPC/submission gate and insertion
guard prevent concurrent link/file/text saves from bypassing credit.

Shared ownership: cohort teams and memberships are read only into the authorized admin
workspace. Members first resolve their own enrollment, then `my_team`; their loader
explicitly fetches that team's attempts in addition to their own individual history.
No broad admin loader or service-key reads are used. Minimal team context reaches team
assignment DTOs only; Explore and admin preview receive mode but no real team roster/work.
Pure `submissionBelongsTo` selectors derive member progress from shared attempts without
copying rows or inventing an individual owner. Admin rows use owner keys (team or
enrollment); team names and member disclosure replace the individual queue cell.

`saveTeam` repeats admin authorization/runtime validation and calls user-scoped manage_team.
Its additive success ID selects newly created teams; a safe name-conflict code lets the
client refresh its numbered suggestion without automatically retrying creation. Team
selection is local to the cohort panel, ordered by name with official teams first;
successful mutations refresh the workspace while preserving that selection.
Text/link actions preserve their existing interfaces with an optional retry request ID,
calling submit_response; editor retries retain their ID for the same payload/base version.
File operations retain prepare/finalize/cancel and protected submission-ID download routes.
Actual submitter and owning target are distinct. Review-next/back retains week, assignment,
search and Official/Test scope. Existing mutation wrappers preserve older API entrypoints.

Visible protected layouts mount a client ActivityRecorder: pathname/visibility events,
no interval and no storage of page identifiers. The best-effort no-argument action
authorizes with requireUser and calls user-scoped record_activity; DB repeats live
authorization and timestamp/throttle rules. Do not record in middleware, requireUser,
sync_profile or OAuth callbacks. Admin workspace alone loads paginated admin_activity
into optional roster lastActiveAt; no activity read enters member/Viewer data loaders.

Week overview uses buildWeekQueue/selectQueueWeek: published selected-cohort weeks,
explicit all-assignment aggregation and approved-only per-person completion. Preserve
the existing single-assignment selector for its callers. Review links omit assignment
in all-week mode and preserve filter/search/audience; next review uses that same scope.

Enrollment DTOs retain `isTest` from the nonnull database flag. The live-admin-only
`saveAdmin('enrollment_test', {id,isTest})` validates UUID/boolean and calls the narrow
`set_test_participation` RPC, then revalidates member/admin layouts. No authentication or
learning-policy bypass is added. Shared cohort metrics and queue selectors exclude tests
by default; explicit test queues and attendance views preserve real workflows. Summary
cards/present counts remain official in test views. Persist classification per enrollment,
not person, so returning cohorts can have independent classifications. See ADR 0017.

Week pages render compact assignment summaries/statuses, not full briefs or forms.
Dedicated assignment pages resolve the ID within `readWeek`'s enrollment/cohort-scoped,
published detail; cross-week/unknown/draft IDs are not found. Preview has the equivalent
`/admin/preview/week/[weekNumber]/assignments/[assignmentId]?cohort=...` route under live
admin authorization and keeps cohort context. Existing review URLs remain unchanged.
Server-rendered briefs use a dependency-free, restricted Markdown parser producing
typed text/heading/list/link tokens and React elements. No HTML injection APIs or HTML
parser are used. HTTP(S) links are allowlisted; images/raw HTML are literal text.
Format defaults to plain so existing prose is never silently reinterpreted. The same
renderer drives the client admin preview; the toolbar inserts the documented subset.
The shared link editor captures the text range, validates explicit label/HTTP(S) input,
and refuses insertion if the underlying instructions changed while it was open.
Link insertion remains a local draft change using the existing week/reference saves.

Runtime weeks expose `assignments` arrays ordered by database `sort_order,id`.
`assignmentsForWeek` accepts a legacy single field only for existing fixtures and
development examples; live reads populate the collection. Week detail and preview
render independent workspaces keyed by assignment ID. Review links use
`/week/[weekNumber]/submission?assignment=<id>`; a missing selector keeps the historical
first-assignment link behavior, and an unknown/cross-week selector is not found.
Admin queue links retain both week and assignment selection. State selectors count a
week once, only when every current assignment is approved; sibling submission/feedback
history never merges. Full week saves call the authorized transactional collection
operation through the existing server action interface.

Assignment-brief preparation/finalization/cancellation lives in server-only actions;
PDF bytes transfer directly to Storage through authenticated TUS with bounded retries
and progress. Finalization uses the server credential to inspect the exact reserved
object with bounded size and PDF signature checks, then a service-only transaction
publishes the attachment. These checks are format validation, not malware scanning.
`/api/assignment-briefs/[id]/download` resolves metadata with a user-scoped client and
streams an authorized attachment with private/no-store/nosniff headers. Draft documents
never appear in member DTOs. Member queries limit documents to their published
assignment IDs; only current ID/name pairs reach rendering components.

Cohort date edits pass through `saveAdmin('cohort_dates', ...)`, strict runtime calendar
validation, and a dedicated authorized database function. Successful writes refresh
member/admin views; failures retain the date input and existing navigation warnings.

- Put server-only data access in a small `src/lib` layer and mark privileged modules with
  `server-only` where appropriate.
- Return narrow DTOs to Client Components; never pass entire private rows unnecessarily.
- Use Server Actions for first-party form mutations when practical and Route Handlers
  where file transfer or OAuth callbacks require HTTP semantics.
- Validate all form data and URL parameters on the server.
- Revalidate only the affected routes after successful mutations.
- Treat every Server Action as externally callable and authorize within it.
- Surface safe, actionable errors to users while avoiding secrets or raw database errors.

## Mock-to-Supabase progression

### P6 file flow

The existing submission editor prepares an intent via an authenticated Server Action,
then dynamically loads `tus-js-client` and sends file bytes directly to authenticated
Storage using 6 MB chunks, progress, and bounded retries. It never sends file bytes
through a Server Action. The task retains its TUS transfer and selected File only in
the current page session; cancel aborts transfer and abandons the intent. Reload requires
reselection. Upload failures do not alter the current attempt or block link submission.

Finalization uses a server-only Supabase client to fetch the exact reserved object with
a bounded 20 MB read. It verifies bytes/MIME/extension, PDF header/end marker, or a
bounded Office ZIP/XML package (entry count, total expansion, required main-part type,
relationships and valid XML; no DTD/entities). This is format validation, not malware
scanning. Browser callers cannot invoke the service-only commit RPC to bypass inspection.
Still PNG/JPEG/WebP submissions additionally use direct-dependency Sharp to verify format,
page count and full decoding under a 50-megapixel limit and ten-second processing timeout.
Explicit PNG animation-control and JPEG container checks supplement decoder metadata.
JPEG MPF tables may describe exactly one primary image plus one Apple/Android HDR gain map.
Parse bounded TIFF offsets/counts and namespace-checked XMP auxiliary identification;
require contiguous nonoverlapping JPEG ranges covering the complete file. Decode both
images sequentially with the existing pixel/timeout limits; the gain map must not exceed
the primary dimensions (at most 100 MP total). Preview only the oriented primary image;
downloads retain the complete original. Reject unrelated/nested/malformed multipicture data.
Android Ultra HDR v1 requires matching namespaced version identifiers in both images
and two ordered Google container items (Primary/GainMap), JPEG MIME types and matching
auxiliary byte length. Coexisting ISO metadata is not interpreted; ISO-only containers
are unsupported. Some early Pixel encoders undercounted the primary MPF length: only
Android-identified files may use the verified secondary offset as the primary boundary.
A bounded JPEG marker/entropy scan requires one complete image per range with no junk,
gaps or extra images; Sharp still fully decodes both. HDR radiometric metadata is never
used for preview rendering; the primary SDR image is displayed.
Client/Server Action preparation, the upload RPC, Storage intent policy and finalization
retain workflow restrictions; Guided insert guards also reject nondocument file MIME types.
The RPC repeats live authority/version checks and commits metadata/history atomically.
Retryable infrastructure failures retain the upload; invalid/stale work is abandoned for
cleanup. Success alone refreshes member/admin views.
Committed retries also revalidate views when the original success response was lost.
Cancellation owns its UI message after detaching the transfer, preventing a late transfer
rejection from hiding cancellation failure. The selected File remains available and the
user can switch to link submission even if abandonment could not be confirmed.

Download routes resolve submission IDs under user-scoped RLS and stream the derived
Storage path using the session credential. Responses are attachments with original
filenames, private/no-store and nosniff headers. Downloading has no review side effect.
Admin PDF readers use `/api/submissions/[id]/pdf` and `/api/grading-examples/[id]/pdf`:
live verified active Admin authorization precedes user-scoped metadata and session-authenticated
Storage reads. Bounded full-file reads verify signatures and return private inline bytes.
The lazy PDF.js client uses locally copied version-matched assets and isolated CSS;
one controller survives inline/modal presentation and reference-tab changes. Historical
PDFs are explicit-open only. Old controllers/fetches are canceled on navigation.
No scripting/XFA/forms/actions, external viewers, range fetching or stored previews.
Other documents retain Download. Image previews resolve IDs through the same user-scoped
RLS and authenticated Storage fetch, bounded by stored size and 20 MB. Sharp auto-orients
and creates a fresh PNG inside 1600 × 1600 without enlargement/metadata. Responses use
private/no-store, nosniff, same-origin resource policy and restrictive CSP, including errors.
The admin image component uses a native image request, never the shared Next image optimizer;
local retry state does not remount feedback. Stored MIME enters optional typed file DTOs,
while missing-MIME historical PDFs require `.pdf` names plus server signature verification.
Fictional files remain download notices. There are no persistent
signed URLs, public previews, preview-storage objects or Monday exports.

### P5 implementation status

Protected runtime pages now read through `src/lib/supabase/data.ts` using user-scoped
cookie clients. Missing configuration routes to `/setup`; there is no runtime mock
fallback. Fixtures remain for tests and development previews. The member cohort is the
latest active cohort with enrolled participation. No qualifying cohort shows the empty
program state. Server Actions save links and admin records, then revalidate protected
views. Drafts remain session-local; saved attempts come from server reads.

Member reads do not reuse the admin workspace loader. After live authorization they
query only the authenticated person's enrolled participation, choose the latest active
cohort using the shared quarter ordering, and retrieve that cohort's published weeks,
their resources/assignments, the selected enrollment's complete individual attempt history,
and explicitly scoped shared team attempts when assigned.
Draft cards still come only from `week_catalog`. This explicit scope also applies to
admins opening the member portal, regardless of their broader RLS permissions. No
qualifying enrollment short-circuits to the empty state without program-wide queries.
All list reads retain deterministic pagination and fail on incomplete results.

Non-upload actions reject malformed top-level payloads before database calls; link/text
actions also validate identifiers and paired replacement-version fields. Live authority
is checked before validation and again by the database functions. Invalid requests
return the existing safe error contract without clearing client drafts.

`saveText` validates plain text and calls user-scoped `submit_text`. Row mapping retains
the text discriminant; a shared escaped-text component renders current/history responses
without interpreting HTML. Both form and database enforce the 20,000-character limit.

The following prototype history describes the earlier UI stages, not current persistence.
Local P5 core and session-security acceptance passed on 2026-10-20, including
production-mode desktop/phone publishing, enrollment, review, reload, and sign-out.
Hosted setup and broader responsive/accessibility acceptance remain separate. See
[ADR 0007](decisions/0007-authentication-in-p5.md) for bringing authentication forward.

The interface is built first against typed repository-local mock data. Page-level DTOs and
status helpers should remain stable when mock repositories are replaced by Supabase data
access. Do not maintain a production runtime switch between mock and live data unless a
concrete need emerges.

- Domain contracts and pure selectors live in `src/lib/program`; mock fixtures are a
  separate module in that domain.
- File, link and plain-text submissions use a discriminated union, and persisted submission status
  excludes deadline-derived display states.
- Draft program items contain catalog fields only. Published detail objects carry
  descriptions, resources, slides, and assignments.
- Time-sensitive selectors accept an explicit `now`. Mock previews use a fixed clock so
  visual states and tests do not change with the real date.
- The `/dev/ui` component lab calls `notFound()` in production and is never a user-facing
  application route.
- The student dashboard consumes a narrow `ProgramDashboardViewModel` built by pure
  selectors. Pages do not independently derive completion, priority work, feedback, or
  module presentation state.
- During Phase 2, published-week links resolve to the final dynamic route shape with a
  minimal read-only scaffold. Draft and malformed week routes return not found; Phase 3
  replaces the scaffold body in place.
- Dashboard repositories supply an explicit cohort and the current person's enrollment.
  Identity, login authorization, and cohort participation remain separate so archived
  history survives access deactivation.
- Week and member submission-review pages render scoped learning data on the server and
  pass narrow assignment DTOs into client submission controls. A member provider beneath
  the portal layout owns enrollment-scoped attempts and assignment drafts across client
  navigation. Dashboard selectors and both submission surfaces consume that state.
  Replacement only supersedes the matching assignment/enrollment's current attempt.
  The server validates published assignment routes; current-submission existence is
  resolved in the client workspace so newly submitted work can be reviewed immediately.
  Attempts and drafts reset to fixtures on reload; drafts containing input warn before
  unload and require confirmation when explicitly cancelled. The same immutable
  replacement contract will move behind Supabase.
- Phase 4 admin routes share a layout-scoped client workspace seeded from typed mock data.
  It owns selected-cohort context and immutable mock mutations across admin navigation,
  then resets on reload. Admin DTOs retain draft content separately from member-safe
  `ProgramWeek` objects so later repository replacement does not weaken draft isolation.
- Admin queue context is represented in URL query parameters (`cohort`, `week`, `status`,
  and `q`) so review-detail navigation can return to the same operational view. Detail
  resolution always checks both the record identifier and selected cohort. This remains
  prototype state: mutations do not propagate into the separately seeded member routes.
- Pacific wall-clock conversion is centralized in `src/lib/program/admin.ts`; it rejects
  daylight-saving gaps and requires disambiguation for repeated PDT/PST times before
  producing a UTC timestamp.

## Monday.com ownership and synchronization — Planned, not implemented

See [product scope](product-spec.md#mondaycom-recruiting-and-club-reporting--planned)
and [ADR 0004](decisions/0004-monday-recruiting-and-gap-reporting.md).
Monday owns recruiting and the club directory; Supabase owns GAP records and files.
The boundary is field-specific: accepted-participant identity/cohort context enters GAP,
while GAP-derived summaries return to Monday. Do not make both systems independent
editors of the same progress or outcome fields.

Keep integration credentials and synchronization work on the server. External identity
mapping must connect Monday person/application/cohort records to GAP people/enrollments.
Retries must not duplicate people or enrollments, and a sync failure must not interrupt
learning, submissions, or review in GAP. Show the last successful synchronization time
so stale reports do not appear current. The private application-link schema and atomic
enrollment operation are implemented in migrations; transport, scheduling, checkbox
results, and live synchronization remain pending.

The [enrollment operation](data-model.md#enrollment-operation--implemented-not-connected-to-the-portal)
remains a private SQL entry point. The P5 admin mutation wrapper verifies live roster
authority before invoking it through a user-scoped client; no mock-admin wiring or
Monday/public enrollment endpoint is added. Future Monday adapters must authorize their
callers before using it. The function handles atomic
provisioning and duplicate-safe linking; the adapter owns external approval checks and
reporting failures back to Monday. See [ADR 0006](decisions/0006-monday-ready-enrollment-foundation.md).

Monday acceptance alone never provisions access. A lead-controlled “Enroll in GAP”
checkbox requests server-side enrollment under the
[approved trigger](product-spec.md#enrollment-approval--approved-not-implemented)
and existing approved-roster rules. Validate the authorized request, current acceptance,
identity, and cohort before provisioning. Record the enrollment result separately from
the checkbox, and make retries safe without resetting existing history or access roles.
Unchecking is not a revocation mechanism.
Outbound GAP links still require ordinary GAP authorization; never export signed file
URLs, credentials, or private submission payloads into club reporting.

## Time and derived state

- Store deadlines and submission times as UTC-backed `timestamptz`.
- Display program deadlines in `America/Los_Angeles` with explicit date, time, and zone.
- Centralize derived state logic described in `product-spec.md` so dashboard, week, and
  admin views cannot disagree.

## Error and loading boundaries

- Add route-level loading UI for protected data views.
- Use not-found behavior for unknown weeks/submissions without leaking private records.
- Distinguish authentication failure, roster denial, validation failure, and transient
  backend failure.
- Never cache authenticated responses in a way that could share sessions between users.

## Assignment/team instruction boundary

`lib/teams/brief-data.ts` reads user-scoped private brief projections; the Standard Team
assignment detail loads them separately from ordinary week/dashboard DTOs. Even admins
using the normal member route pass only that route's actual team brief to the client.
Explore skips private reads entirely. Admin week edit loads optional briefs alongside other
independent configurations after authorization. `TeamBriefEditor` owns its separate save,
selected team, optimistic version, retained draft and stable retry UUID; its dirty state
participates in the existing week navigation guards.

`TeamAssignmentInstructions` keeps Instructions / Workspace mounted while switching locally.
The long private brief uses the shared scoped-heading reader. Admin-only preview receives
all cohort-team briefs for its sample selector; normal members receive only their own.
No submission ownership, upload gate, queue or completion contract is widened. Markdown
table parsing/rendering stays in the safe brief module with escaped text cells and no HTML.

## Spreadsheet investigation boundary

`lib/investigations` owns typed validation/projections, live authorized user-scoped RPC
reads and Server Actions. Its supplied template is server-only and passed to the editor
only after admin authorization; no template body or answer key enters member bundles.
AssignmentContent uses a dedicated investigation flow instead of the generic submission
editor. Participant payloads contain only common instructions, hint metadata/opened bodies,
their draft and current receipt. Admin preview receives configuration only under live
admin authority; Explore practice substitutes fictional local content and sends no writes.

Draft/reveal/submit are separate operations. Client retries retain a request UUID for an
identical operation. Reveals refresh hint state without overwriting fields or advancing the
client's draft version, so another device's draft still produces a recoverable conflict.
Only checked submit creates an ordinary text attempt; existing review/count/completion
logic is reused. The member history page is read-only for this workflow and links back to
the conclusion workspace for replacement. Admin review separately loads per-attempt private
snapshots; lazy assignment-level insights recheck admin authority on every request.
No broad workspace payload, shared cache, public Storage URL or extra upload path is added.

## Eight-case exercise boundary

`lib/cases` owns typed runtime validation, authorized server reads/actions and the
server-only supplied challenge template. The admin week editor fetches private editable
content only after admin authorization. AssignmentContent branches on `workflow=cases`
and loads a user-scoped RPC projection; standard submission routes redirect exercises
to their assignment screen. The small client exercise flow saves explicit responses,
retains failed input, reveals returned references and uses versioned, stable request IDs.
Preview is local-only; no case mutation or upload action is sent. Member dashboard/week
loaders fetch enrollment-scoped paginated completion projections, not private answers.
Admin progress uses a separate projection; grading queues exclude exercise obligations.
No service-key content reads or shared caches are introduced.

Admin case progress uses the existing enrollment-scoped aggregate projection, not document
submission counts; `caseStatus` and `q` drive its own filters. Response detail repeats live
admin authorization, validates identifiers and assignment/week/enrollment cohort scope, then
calls the existing user-scoped `read_case_exercise` RPC with the selected enrollment.
Answers are fetched only on detail navigation, never added to the roster/workspace DTO.
The page is read-only; cohort switching leaves the old participant route for the overview.
