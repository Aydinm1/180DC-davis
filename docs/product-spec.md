# GAP Product Specification

**Status:** Active
**Last updated:** 2026-11-05
**Source of truth for:** Product scope, workflows, states, and acceptance criteria

## Product goal

GAP, the Growth Analyst Program, is a lightweight internal analyst-development portal for
180 Degrees Consulting at UC Davis. It supports a six-week professional development
program and prioritizes the
loop:

> learn → submit → review → receive feedback

It should feel like a restrained consulting-firm training portal, not a school LMS.

## Public website starter

`/landing` is a public, unindexed website starter for 180 Degrees Consulting at UC Davis.
It has its own shell, approved logo, brand heading and Open GAP link to the existing `/`.
It does not require or refresh GAP sessions, load private program content, synchronize
profiles or record Last active. Public access also works with expired/invalid GAP cookies.
Noindex/nofollow metadata and response headers discourage indexing; they do not restrict access.
The starter contains no speculative clients, people, outcomes or recruiting information.

GAP retains its existing URLs and access rules. Moving GAP to `/gap` and making marketing
the homepage is a separately planned future migration, not part of this starter.

## Users and access

- **Member:** an active approved member who signs in with a UC Davis Google account.
- **Admin:** an active approved member with responsibility for content, roster, and
  submission review.
- **Viewer:** an approved observer who browses published content without cohort
  enrollment, student obligations or administrative/private learner access.
- Authentication requires Google through Supabase Auth and a verified email ending in
  `@ucdavis.edu`.
- Authentication alone never grants application access. The normalized authenticated
  email must match an active approved-roster entry.
- The approved roster is authoritative for role and access.

## Program model

- Fall 2026 is the active MVP cohort. The durable model supports Fall, Winter, and Spring
  cohorts identified by quarter and calendar year.
- A permanent GAP person may have multiple cohort enrollments. Login access can be
  deactivated without erasing historical participation.
- The program contains exactly six ordered modules:
  1. Consulting Fundamentals
  2. Research & Problem Solving
  3. Client Communication
  4. Data & Insights
  5. Building Recommendations
  6. Final Case
- A week is either `draft` or `published`.
- Members see all six week numbers and titles. Draft weeks appear as locked upcoming
  cards; their description, slides, resources, assignment, and deadline remain hidden.
- Each week supports an ordered collection of assignments. Each has its own title,
  instructions, PDF brief, deadline, submissions, feedback, and retained history.

## Member workflows

### Last active and link previews

Portal access shows one admin-only Last active timestamp per person, formatted in
Pacific time. Until tracking observes a visit, show —; never backfill from profiles or
Auth. A visible authorized protected-page visit records database time at most once per
five minutes. No first-access status, activity filter, heartbeat or online indicator.
Failure to record must not block GAP. No page, device or IP history is collected.

Public link previews use the approved logo, Growth Analyst Program title and neutral/
green branding. The static image and generic metadata require no login and reveal no
private content. Existing favicon remains unchanged.

### Week-first admin overview

The review overview defaults to the latest published week with assignments and All
assignments. A compact week panel leads with received-submission and awaiting-review
counts, followed by ordered assignment rows with their received/awaiting counts and
drill-down. Do not show participant completion percentages, advancement, promotion or
cohort-outcome summaries on the review page; outcome management remains in Members.
Received counts include one current attempt per enrolled person × assignment, regardless
of review status, not retained historical attempts. All submissions excludes missing work;
Not submitted is a separate filter for outstanding obligations. Official counts exclude
test enrollments; test views show only test submissions, identified by the selected Test scope.
Week, assignment when selected,
status, name/email search and audience persist through review/back/next navigation.
No work awaiting review does not mean week completion; this is a calculation rule, not
persistent explanatory UI copy. Empty queues say “No submissions awaiting review.” Search and status controls sit
inside the queue toolbar; participant and week selectors belong in the panel header.

### Test participation

Admins can mark an enrollment **Test participant** under Members → Edit outcomes.
It is a separate checkbox, not a fourth enrolled/completed/withdrew status or portal role.
Test participants retain ordinary authorized student submission, review/feedback, file,
history and attendance behavior. Admins can keep their role and use My program to test.
Official cohort/active/outcome/review/attendance totals exclude them without hardcoded
counts; normal queues hide test work. Admin review and attendance offer a Test participants
only view. Test reviews use normal decisions and preserve test-only back/next context.
Changing the flag preserves all history; removing it requires confirmation because the
enrollment and its retained work then contribute to official totals. Members cannot
self-designate as test. Viewer, inactive and withdrawn restrictions remain unchanged.

### Viewer browsing

Provision board viewers under Members → Portal access → Add roster member → Viewer,
not cohort participants or Monday intake. Adding access creates no enrollment, review
item or attendance entry; metrics derive from enrollments rather than approved identities.
Enrollment requires changing Viewer to Member/Admin first. Converting a currently enrolled
active/draft participant requires explicitly resolving participation; never delete history.

Viewers entering `/` go to `/explore`, also accessible to admins. Reuse member styling and
the cohort switcher; choose the latest active cohort, then latest archived. Draft cohorts
are unavailable. Published weeks expose descriptions, slides, ordered resources, assignment
instructions/current PDFs; draft cards expose catalog fields only. No student work,
feedback, directories, attendance/codes or admin controls. Omit personal progress, completion,
overdue warnings and submission badges. Ordinary members retain their enrolled-program scope.

Try submission preview opens the existing text/file/link editor with saving/uploading
disabled. Explain that nothing is submitted and local practice resets on leaving the
assignment. Retain verified UC Davis Google/active-roster rules and enforce role changes/
deactivation on subsequent requests, including direct actions and protected downloads.

Admins can open “Preview as member” for the selected cohort without enrollment.
Admin navigation shows “My program” only when the admin has enrolled participation in
an active cohort, and omits the generic member-portal/profile return links otherwise.
The read-only preview shares the member dashboard/week presentation, uses a sample
member with no submissions, keeps drafts locked, and allows published assignment PDF
downloads under existing admin authorization. “Preview submission” opens the shared
editor with local typing/file selection/link entry and a visible preview-only notice.
Saving and uploading are disabled; preview drafts are component-local, separate from
member drafts. No attempts, uploads, enrollments or progress are created. Preview never
impersonates a learner or shows real learner work. Draft/archived cohorts show an access warning.

### Dashboard

The dashboard answers, in order:

1. What should I work on now?
2. What is due next or overdue?
3. Have I submitted it?
4. What feedback did I receive?
5. How far through the program am I?

It includes the program term, a thin Continue where you left off header attached to the
module panel, completion progress
beside the module list, and all six modules. The bar contains the current learning week's
number and one Continue action opening that week; the full title appears only in its
module row. An open workshop check-in is a secondary compact action beside the greeting
(below it on phones), not a full-width banner competing with Continue. Assignment details, deadlines,
and feedback summaries belong on the week and submission pages, not the dashboard.
Awaiting-review work remains visible in module status but is not a next-step priority.
Approved (`completed`) assignments or explicit admin completion credit count toward completion. A week is complete
when it has at least one assignment and all its assignments are approved or credited. Show partial
progress such as “1 of 3 assignments complete”; a no-assignment week has no automatic
completion event. Draft assignments remain hidden with their draft week.

### Week detail

Admins may attach one current PDF assignment brief (up to 20 MB) directly in the week
editor after saving its assignment. Uploading saves the attachment immediately,
independently of text edits; replacing a published brief updates what members download.
Members download the current brief beside the instructions only when the week is
published and their active cohort enrollment grants access. Draft briefs stay private.
The text instructions and submission deadline remain required. Briefs are separate from
member submissions and do not affect review/completion state.

On Members → Manage cohort, admins may edit start/end dates after creation. Dates must
be valid calendar dates with end on or after start. Changing these dates does not change
the cohort's quarter/year, participation history, or assignment deadlines.

A published week provides:

- number, title, and description;
- workshop presentation link;
- ordered resources with title, optional description, type, and URL;
- compact, ordered assignment cards with title, localized deadline, optional summary,
  status icon/text, and one View assignment action;
- materials below the assignment cards.

Each assignment opens its own page with back-to-week navigation, title, deadline,
optional summary/PDF download, complete instructions and a submission workspace below
the brief, not in a stretched side column. Existing submission-review URLs remain valid
and link back to their assignment; feedback, revisions and history stay on that page.
Admin preview uses the same assignment layout with non-mutating submission controls.

Admins may write a separate optional summary (up to 300 Unicode characters), never an
automatically truncated brief. Existing assignments without summaries show no teaser.
Instructions remain plain text unless an admin explicitly chooses formatting or uses
the toolbar. The restricted Markdown subset supports section headings, bold, flat
bulleted/numbered lists and HTTP(S) links. Raw HTML, images, embeds, arbitrary styles,
and unsupported syntax are not interpreted. Unsafe links remain inert literal text.
The admin editor offers a toolbar, format choice and rendered preview; instructions
are limited to 50,000 Unicode characters. This does not add rich text to member responses.
The Link tool opens inline Link text and Web address fields, using the selected text
or URL as a starting point. Surrounding selection whitespace stays outside the link.
Insert link applies the change; Cancel/Escape leaves the instructions unchanged.
Invalid inputs remain editable with a specific error. Adding a link never saves the week.
See [proposed Notion SWOT formatting](examples/notion-swot-assignment.md); applying it
to real content requires approval of the full brief, not an automatic migration.

### Submission rules

### Manual completion for legacy individual assignments

For early assignments where one person submitted on behalf of teammates before team
setup, admins may grant completion to an enrolled participant with no current submission.
In Review queue → choose the assignment → Not submitted, use Mark complete and confirm
the named person/assignment. Complete shows the manual timestamp and confirmed Undo completion.
Credit applies only to that assignment/enrollment, not the entire week or cohort. A week
completes only when all its assignments are approved or explicitly credited.

Members see Complete, the grant timestamp and “Your GAP lead marked this assignment
complete. No submission is required.” Dashboard progress/continuation and missing-work
filters honor credit. Received/awaiting totals still count actual submissions only.
No attempt, file, feedback or teammate-access grant is created. Existing work must be
reviewed normally. Granting is limited to published Individual assignments in active
cohorts and currently enrolled, active non-Viewer roster identities. Test credit remains
separate from official counts. Team-mode work continues through normal shared review.
Undo removes only the credit and restores the ordinary unsubmitted state. Both grant
and revoke are audited; existing work/history is never rewritten. Submitted work racing
with a grant wins or fails transactionally, and uploads cannot commit after a grant.

### Admin-assigned teams

#### Guided project assignments

Team assignments optionally use a reusable Guided project workflow. Only the final
document counts as a submission/completion obligation. Admins save the assignment as
Team, enable the guide while its week is a draft, and independently configure formatted
overview/direction/final instructions plus each team's company, direction title and
scope/sources. The default instructions follow the approved 10-K consulting exercise;
no company-specific direction is generated. Publication requires recommendations for
all populated official teams. New or unconfigured teams see a preparation notice.

Members share three steps: two risks/citations and an initial consulting question;
selection of the revealed recommended direction or an alternative approval request;
then one final document/file link using existing shared review/history. The first
research save retains an immutable original and locks team membership; working research
remains editable until the first final submission. Recommendations never reach members
before research is saved. Revealed recommendations cannot be edited, but missing setup
may be filled later. Alternative proposals include risk/citation, direction, question
and feasible evidence plan. Admins approve or request changes (note required); revised
approved proposals require fresh approval. Teams can return to the recommendation.
Pending/change-requested teams may prepare, but cannot submit or finalize an upload.
The first final attempt freezes research and direction; ordinary document revisions
remain available. Textbox submissions are unavailable for this workflow.

Direction requests contain only current pending alternative proposals requiring a decision,
separate from graded submissions and filtered by cohort/week/assignment and official/test
scope. Choosing the recommended direction needs no approval and never enters this inbox.
A separate collapsed Team project progress section lists populated teams, their current
question and explicit direction state, with current research before historical snapshots.
Admins approve/request changes with existing decision notes; no general commenting or new
approval gate is introduced. Final review shows the confirmed direction. Admin member preview
offers a read-only sample-team selector; Explore exposes common instructions and generic
practice only, never real team research, directions or approvals.

See [ADR 0022](decisions/0022-guided-team-projects.md).

Case challenges and guided projects separate Instructions from Workspace on the existing
assignment route. New work opens Instructions with Start assignment; saved work resumes
Workspace. Switching views retains drafts and mounted submission controls. Guided reading
has Overview/Choosing a direction/Final document briefs with heading jumps; working steps
remain Research/Direction/Final document. The final submission is accessible without
scrolling through its full brief. Case save/reveal compares response/reference side by
side on roomy desktops and in full-width views on smaller screens; Next/Finish stay above
the comparison. Authored content and existing save, reveal, approval and completion rules
remain unchanged; previews retain existing no-save and privacy boundaries.

Admins create cohort teams and assign enrolled participants in Members → Teams. Members
cannot choose, join, leave, create or edit teams. Each cohort enrollment belongs to at
most one team; official/test teams cannot mix. Teams are reusable across assignments.
The Teams panel defaults to the first official team (or first test team when no official
team exists). Its header selects the team; membership is read-only until Edit members.
Renaming is a secondary explicit action. Add team suggests one number above the highest
existing numbered team in the cohort, across official/test scopes, starting at Team 1.
Existing names are preserved; no bulk creation or automatic renaming occurs. A conflicting
name refreshes the suggestion and requires confirmation again. Successful creation selects
the new team; saves retain selection. Membership Save/Cancel, navigation warnings and
existing submission locks remain enforced.
Individual is the default assignment submission mode. Team mode requires one shared
submission and one review, visible with history/feedback to authorized teammates. Any
teammate can submit/replace actionable work; record who submitted. No designated captain.
Mode cannot change after submission or upload history. Existing work stays individual.

Unassigned members see instructions to contact their lead, not an individual fallback.
Admins see unassigned setup issues separately from missing team work. Queue counts count
each team-assignment once; shared approval satisfies that assignment for each participating
teammate. Attendance and advancement remain individual. Deactivation/withdrawal removes
team-work access without erasing history. Membership/deletion locks after first committed
team work; names remain editable. Later membership correction/conversion is deferred.
Concurrent saves/reviews are serialized and version-checked; one succeeds, stale callers
retain drafts/files and must refresh. Request IDs and upload receipts make successful retries
duplicate-safe, not permission to overwrite newer work. Private team files retain history.

- A submission is exactly one of `text`, `file`, or `link`; no combined attachments.
- Written responses are nonblank plain text, at most 20,000 Unicode characters. Preserve
  paragraphs/line breaks; normalize CRLF/CR to LF. Render escaped text directly in
  member/admin review and history, never HTML. No rich text or autosave is included.
  Drafts survive in-app member navigation, switching methods and failed saves, but not
  reload. Warn on unloading unsaved input and confirm explicit cancellation.
- Links must be valid `http` or `https` URLs. Google Docs, Slides, Sheets, Canva, and
  other relevant providers are accepted without a provider allowlist.
- Standard assignment files may be PDF, DOCX, PPTX, XLSX, PNG, JPG/JPEG or WebP;
  Guided projects remain document-only and case exercises accept no file submissions.
  Images must be still/single-page, decode correctly and not exceed 50 megapixels.
  JPEGs may contain one explicitly identified Apple HDR or Android Ultra HDR v1 gain map for the same photo;
  validate its container and pixels, render only the primary photo, and retain the original
  download. Unrelated multipicture images and malformed auxiliary data remain unsupported.
  Android v1 metadata may coexist with ISO metadata; ISO-only and extra-video containers
  are not included in this compatibility change. Previews use the primary photo without
  reconstructing HDR brightness.
  Reject SVG, GIF, HEIC and other unsupported formats. Files must be nonempty and not exceed
  20 × 1024 × 1024 bytes. Private downloads are available to the active owner and admins,
  including previous attempts. Documents remain download-first. Admin review displays
  private orientation-correct image previews with download access; failed previews offer
  Retry without clearing feedback or blocking a decision. Images remain ordinary `file`
  submissions, one per attempt, with normal review and no automatic completion.
- Uploads show progress, checking/saving, retryable errors, and cancellation. An uploaded
  object is not a submission until validation and atomic finalization succeed. The
  selected file is retained for recoverable failures only in the current page session;
  after reload, reselect it. Link/text submission remains available if Storage is unhealthy.
- If cancellation cannot be confirmed, explain the one-hour expiry and retain the file
  selection; allow starting again or switching to a link. Retrying a lost save response
  must return the existing submission rather than create another attempt.
- Basic document-format validation is not malware scanning. No hosted cleanup schedule,
  online document editing, or Monday file export is included.
- Resubmitting creates a new submission record and supersedes the former current record.
  Historical records and timestamps are retained.
- Members may replace work while it is awaiting review and must revise work when a
  revision is requested. Once an admin marks a submission complete, it is closed to
  member replacement unless an admin requests a revision.
- Review is metadata, not a submission outcome. Both `revision_requested` and `completed`
  carry `reviewed_at` and `reviewed_by`; requesting a revision requires written feedback.
- A student may submit before or after the deadline; the real timestamp is always shown.
- Members may view their individual submissions and authorized shared team work/feedback,
  never outsiders' or teammates' individual work.

## Assignment and module states

Evaluate display state in this precedence order:

1. `revision_requested`
2. `completed`
3. `submitted`
4. `overdue`: deadline passed and no current submission
5. `due_soon`: no current submission and deadline is within 72 hours
6. `upcoming`

`Overdue` is derived and is never stored as a submission status. Submitted work is awaiting
review and does not count as approved. Missing, submitted, or revision-requested work
keeps its week incomplete. Review and replacement operate on an individual assignment.

The editor adds/removes assignments independently and saves the full week atomically.
An assignment with submissions, upload intents or PDF references cannot be removed.
Adding an assignment to a published week makes it required immediately and can return
a formerly complete week to partial completion. The review queue explicitly selects an
assignment, including when several belong to the same week.

## Admin workflows

Week editing is sectioned into Overview, Assignments and Materials. Select one assignment
to edit Details, Instructions/PDF, Activity setup or its private Grading reference.
Guided common briefs/team directions and individual cases are configured one at a time.
Changing sections or assignments retains unsaved input; it does not save or discard work.
Week content/publication saves, activity/team-direction saves, grading-reference text saves
and immediate PDF uploads retain their separate behavior. Leaving the editor warns about
unsaved work/selected PDFs. Existing cohorts, assignment order, workflow eligibility,
history and authorization are unchanged. Activities belong to each assignment's cohort/week,
not to a hardcoded week number; cross-quarter copying remains a separate feature.

- View total active members and current-assignment counts for submitted, outstanding,
  and awaiting review.
- Filter a submission matrix by week and open a member's current submission.
- View/download a private file or open a submitted link.
- Return work to awaiting review, request a revision with written feedback, or mark the
  review complete with optional feedback.
- View retained resubmission history.
- Create and edit weeks, presentations, assignments, deadlines, and ordered resources.
- Manually publish or return a week to draft.
- Add, edit, activate, deactivate, and assign roles in the approved roster.
- Create and archive cohorts, manage GAP participant rosters, and record participation,
  advancement decisions, and promoted responses.
- View restrained cohort counts plus advancement, offer-yield, and end-to-end conversion
  percentages with transparent denominators.

## Monday.com recruiting and club reporting — Planned

Monday.com is the intended home for club applications, recruiting stages, acceptance
decisions, and club member records. Application intake is expected to use a Monday form;
the actual form and boards have not been selected or verified.

Supabase remains authoritative for GAP enrollment, access, program content, private
files, submissions, feedback, participation, advancement, and promotion responses.
The intended flow is application in Monday → recruiting review and acceptance in Monday
→ lead checks “Enroll in GAP” → participant enrolled in GAP → GAP progress and outcomes
summarized back in Monday.
Acceptance into GAP, completion of GAP, promotion, and joining the club are separate
milestones. An application alone never grants portal access.

The planned initial reporting set is:

| Level | Information |
| --- | --- |
| Person per cohort | Name/email linkage, cohort, participation status, submissions versus assignments due, approved count, awaiting-review count, outstanding revisions, advancement decision, promotion response, authenticated GAP record link, last successful sync time |
| Cohort | Applicants, accepted applicants, starters, completed participants, withdrawals, promoted participants, joined participants, pending decisions/responses, assignment submission rate for work due, advancement rate, offer yield, starter-to-member conversion |

Applicant and acceptance counts come from Monday. GAP supplies program progress and
outcomes. Preserve each application cycle and cohort participation when a person returns;
do not overwrite a previous cohort's history.

Individual progress is intended for relevant club leadership; broader club reporting
uses cohort totals. Keep original files, submitted document URLs, submission history,
written feedback, and reviewer notes inside GAP. Monday links to authorized GAP pages,
not directly to private files.

### Enrollment approval — Approved, not implemented

The underlying private database enrollment operation is implemented and locally tested;
the checkbox workflow described here is not configured or connected to the portal.

Use an “Enroll in GAP” checkbox on the accepted-members board, unchecked by default.
An authorized GAP lead checks it once the accepted applicant and target cohort are ready.
“Accepted” alone does not enroll someone or grant portal access. The checkbox requests
enrollment; a separate result must show pending, enrolled, or failed, with a successful
enrollment timestamp or an actionable error. Do not treat a checked box as proof of access.

Enrollment requires presence on the accepted-members board, checked approval, explicit
GAP admin confirmation, a mapped target cohort, and an eligible UC Davis
identity under the existing roster rules. Invalid requests grant no new access. Successful
processing creates or links the person, cohort enrollment, and approved member access;
it does not grant administrator privileges. Repeated requests must not duplicate records
or reset existing participation/outcome history.

Unchecking the box does not withdraw someone, revoke access, or delete history. Those
remain explicit GAP administration actions. See [ADR 0005](decisions/0005-explicit-gap-enrollment.md).

Open decisions before implementation: exact Monday boards/columns and audience,
synchronization timing, and final field mappings.

The first adapter is manual and read-only toward Monday: admins preview checked members,
map each dropdown choice to an active/draft GAP cohort, then confirm eligible rows.
Membership Status is context only, never acceptance or automatic revocation. Results
appear in GAP. Each external item represents one cohort participation; returning members
use new items. Automatic sync, Monday result fields, and reporting remain deferred.

## Explicitly out of scope

### Approved exception: week workshop attendance

Workshop joins Guide, Template, Reading and Video in ordered Materials. Preserve existing
materials and the separate presentation link. Admin Attendance retains selected cohort,
showing week dates/state/present counts. One workshop session maps to each week. Active
cohorts/published weeks can open a static six-character code/QR for two hours (DB time),
redisplay unchanged, or close early. Deliberate reopening renews date/code/window but
retains marks. A searchable phone roster supports Mark present and confirmed Undo,
including historical corrections with actor/time/history. States are Present/Not recorded.

Admins can choose Present check-in for a standalone full-window code/QR presentation,
requesting browser fullscreen when supported. It shows the selected week, large unchanged
code, QR and closing date/time, without extra sign-in/footer copy, navigation or roster
data. Exit presentation or Escape returns to the same attendance screen without changing
the session or attendance. A denied/unsupported fullscreen request keeps the full-window
modal usable. An expired session replaces the code/QR with Check-in closed.

Open prompts supplement Continue and appear on the matching week. Members explicitly
confirm at `/attendance/[sessionId]`; scans/GET never mark attendance. Logged-out scans
see generic sign-in. Fragment codes are captured in tab storage and removed from the
address bar, never included in OAuth returns. Authorized receipts survive retries/reload.
Closed, wrong-cohort, invalid-code and save-failure states are actionable. Ten failed
attempts per person/session in five minutes temporarily block attempts.

Only current approved UC Davis Google members enrolled in the matching active cohort and
published week can self-check-in. Codes/classmate records remain private. Attendance is
independent of assignments: no inferred absence/lateness, penalties, percentages, GPS,
device tracking, Monday sync or realtime. See
[ADR 0015](decisions/0015-week-workshop-attendance.md); local and hosted acceptance are
tracked separately in `todo.md`.

### Current implementation boundaries

Do not add grades, scores, quizzes, scored rubrics, discussion boards, chat, email,
certificates, announcements, peer review, self-organized teams, calendars, notifications, analytics,
leaderboards, study metrics, Google Drive editing, live documents, or AI features.

The cohort outcome summaries and planned Monday reporting set above are the approved
operational-reporting exceptions. Do not expand GAP into charts, engagement analytics,
or a full-club CRM.

### Private grading references

Admins may attach reference-only grading guidance to each assignment: optional rubric
and model-response text (50,000 Unicode characters each, using the existing safe heading,
bold, list and link formatting), plus one current example PDF up to 20 MB. These are
private to current active admins, not visible to Members, Viewers or member previews.
No points, criterion ratings or automatic review decisions are introduced.

Within the week editor, a collapsible Grading reference section saves text independently
from the week. Save an assignment before adding its reference; upload/replace/remove PDF
actions save immediately and require their own explicit controls. Removing/replacing a
PDF retains committed history; text edits have stale-save protection and preserved input.
Review shows Rubric/Example tabs in one collapsible panel above Feedback and decision,
alongside submitted work on desktop and after it on phones. Empty references show a quiet
Add grading reference link. Tab changes retain unsaved feedback; editing respects existing
unsaved-review safeguards. PDFs remain download-first; no embedded viewer is introduced.
See [ADR 0019](decisions/0019-private-assignment-grading-references.md).

## MVP acceptance criteria

- An approved member can sign in, navigate six weeks, access published material, submit
  a file or link, replace actionable work, and view status and feedback.
- An admin can manage the roster and week content, inspect all submissions, preserve
  history, provide feedback, and set review status.
- The admin review queue opens on awaiting-review work, keeps queue filters mutually
  exclusive, and returns reviewers to their prior cohort/week/filter/search context.
  A review can be saved in place or saved while advancing to the next awaiting item.
- Draft weeks may be saved incomplete. Publishing requires the member-facing title,
  description, valid resources, and complete assignment fields; assignments with any
  submission history cannot be removed.
- An unapproved, inactive, non-UC-Davis, or anonymous user cannot access protected data.
- Draft content and other members' submissions remain inaccessible even through direct
  Supabase requests.
- Student dashboard and week pages work well on mobile; admin pages remain usable with
  responsive cards or horizontal table scrolling.

## Individual eight-case challenge

An Individual assignment may use the Eight-case challenge workflow. Admins initialize
and edit eight scenarios/reference approaches while the week is a draft; the supplied
challenge is a template, not automatic Week 2 configuration. Members select a mathematical,
process or decision decomposition and write a framework and first investigation/why.
Save & reveal shows their response and a reference approach, explicitly one possible
answer. Next unlocks the following case. Answers remain editable until Finish challenge,
which freezes them and automatically completes the assignment after all eight cases.
Only finishing counts as completion; no score, document upload or review obligation is
created. Saved work and completed responses remain available across visits. Admins see
completion progress separately from review counts. Viewer practice does not expose real
responses or hidden reference approaches. Selecting a case assignment in admin shows
All participants / Complete / In progress / Not started with accurate counts and name/email
search, separate from graded-submission filters. Complete requires Finish, not merely
eight saved answers. Admins can open each participant's read-only responses, one case at
a time, beside the reference approach; no grade, feedback or completion mutation is added.
Official/test scope and search/filter context persist when returning. Existing Standard and Team workflows remain
unchanged. See [ADR 0023](decisions/0023-individual-case-exercises.md).
