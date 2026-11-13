# GAP Design System

**Status:** Active
**Last updated:** 2026-11-13
**Source of truth for:** Brand use, visual tokens, UI patterns, responsive behavior, and accessibility

## Direction

### Admin PDF reading

Use one compact review header and two viewport-bounded desktop panes: the larger
Submitted work pane and Feedback/Rubric/Example tools, with Feedback selected initially.
Keep save actions outside the tools scroller. Avoid nested file cards and repeated
filenames/timestamps. Phones show a Submitted work/Review switch; both panes remain
mounted to retain reading position, feedback, decision and reference state. History
replaces the visible document area without discarding the current reader.
The reader has a bounded scrolling viewport, compact wrapping controls with 44px targets,
labeled page/search inputs, visible focus and native text selection. Reveal the search row
with Find or the reader’s keyboard shortcut. Example PDF text uses a separate Written
example disclosure so it cannot push the reader out of view. Expand uses a native
modal with contained focus, Escape/Close, and focus restoration. Preserve the controller,
reading state and unsaved feedback through expansion/tab changes. Errors offer Retry
and Download without resetting the review. See ADR 0027 for privacy and lazy loading.

### Team assignment instructions

Standard Team assignment Instructions contains an optional Team briefs disclosure with one
labeled team selector and one safe formatted editor. Official/Test and Brief added/No brief
appear in options. Save team brief is independent, retains selection and preserves failed
edits; team switching confirms dirty input. Clear brief requires confirmation and explicit save.
Members read common instructions then their own long brief with heading jumps in Instructions;
Workspace retains submission controls. Both views remain mounted. Admin preview alone has a
Sample team selector; Explore has no real brief selector/content. Flat Markdown tables use
semantic headers/cells in a labeled, focusable overflow region, scrolling horizontally on
phones without overflowing the page. Keep HTML and unsafe URLs inert.

### Spreadsheet investigation presentation

Reuse Instructions / Workspace with a bounded reading column. The workspace pairs one
selected stage with the conclusion form on desktop and stacks them on phones. Stage
buttons wrap, have 44px targets and expose the current step. Opened hints use disclosures;
Reveal next hint is the primary stage action, with optional reveals as secondary actions.
Keep name/evidence mounted while changing stage or view. Save draft and Submit conclusion
are explicit. Retry/conflict errors retain input; hint refreshes do not advance the local
draft version. Formula text uses literal, safely escaped inline code with wrapping and
normal text selection/copy, preserving quotes, brackets and dollar references.

Activity setup uses Setup / Stages and hints and edits only one selected stage/hint.
Private answer/guidance labels stay explicit. Review snapshots and assignment-level insights
are compact disclosures using “opened,” never implying reading, use or grading penalties.

### Public website boundary

The `/landing` starter has an independent public header/main/footer, without portal
navigation, profile controls or dashboard cards. Initially reuse Montserrat and approved
logos, with a simple oversized brand heading, green accent and Open GAP link. Do not
invent marketing facts or add empty navigation. Marketing CSS belongs in locally scoped
CSS Modules with wrapper-scoped variables; never change global body/theme styles for
public-site art direction. Keep visible keyboard focus, a skip-to-content link, 44px
actions and usable narrow/zoomed layouts. Its design may evolve separately from GAP.

### Attendance reporting

Place a quiet **Sync to Monday** action inside the selected week’s attendance panel,
only in Official participants. Disable conflicting controls while syncing. Show concise
checked/already-checked counts and an optional Sync details disclosure for unresolved
participants; avoid persistent explanatory paragraphs.

### Schedule planning

Schedule assignments use a compact title/deadline header and non-sticky Instructions /
Workspace tabs inside a wide (up to 1600px) canvas. One chart toolbar combines Original /
Revised, Project brief and Overview / Weeks / Days zoom. Project brief opens an accessible
modal side panel on desktop and full-width dialog on phones; successful disruption reveal
opens it automatically. Dismissal restores focus and retains work. Group the revised-plan
explanation and save/submit actions in one footer.

Day-level schedules use one aligned table/timeline with a sticky two-tier Week 1–10 /
Monday–Sunday header. Desktop rows are 48px; metadata columns are Task 240px, Consultants
128px and Hours 80px. Task names stay single-line while editing; drag the title-column divider for more room. Phones use a 180px sticky
column, stacking consultant/hour controls beneath task names in taller rows. Consultant
selectors show C1, C3 and open labeled Consultant 1–5 checkboxes; hours edit inline.
Add task is the last table row. A direct delete button confirms removal. Keyboard users
can focus Set dates for exact block controls; do not add a permanent task-actions menu.

Use one green bar color, faint day lines, stronger week boundaries and subtle weekend
shading. Task names stay in the left column, never repeated inside bars. Visible fills are
24px tall with 44px interaction areas; selection outlines follow the fill. Resize handles
appear on hover, selection or keyboard focus. Preserve accessible task/range labels.
Default Weeks uses compact day columns; Days expands to 44px cells and full weekday names.
Overview fits ten weeks when space permits. Zoom retains horizontal day position and input,
changes no scheduled data, and is disabled during drag/save. The chart scrolls within its
bounded height with sticky headers and task labels. No calendar, dependencies, milestones,
resource-capacity interface or extra explanatory copy is introduced.

Pointer dragging creates/moves/resizes bars with day snapping and edge scrolling. Escape
or pointer cancellation discards the gesture; pending saves disable changes. Delete or
Backspace removes an explicitly selected block only when focus is on the bar/chart, never
while typing in inputs or using assignment menus. Announce removal and return focus to the
chart without automatically selecting/deleting another block. Explicit block controls
remain available for touch and keyboard alternatives to dragging. Add task focuses its name;
populated-row removal confirms. Phone charts scroll horizontally, retain sticky labels and
never cause page overflow. Headers allow native horizontal swipe scrolling. Read-only
comparison opens Revised and retains accessible full-range labels and staffing/effort text.
Legacy format-1 schedules keep their existing week-cell presentation. Activity setup uses
Instructions / Original scenario / Private disruption / Starting schedule; published or
started settings are read-only. Keep copy limited to essential state and recovery actions.

### Interface copy

Omit the routine file-reselection reminder beneath submission file pickers.

The admin week editor uses Overview / Assignments / Materials navigation rather than
stacking every form. Assignments use a compact ordered selector (sidebar on desktop,
labeled native select on phones) and one visible assignment, with Details / Instructions /
Activity setup / Grading reference sections. Guided setup shows one common brief or one
team direction at a time; readiness appears in the team selector. Challenge setup shows
Overview / Cases / Closing reflection and one selected case. All navigation is local,
keyboard-accessible and preserves draft input, selected files and in-progress transfers.
Keep week publication/save controls visible; activity, direction, reference and PDF saves
remain independent and labeled at their own controls. Existing grading/workflow hash links
reveal the matching assignment section. No new explanatory copy or activity library page.

Keep interface copy action-focused. Remove subtitles that repeat a page heading,
bookkeeping explanations (count denominators, retained records, separation of queues)
and repeated descriptions of obvious controls. Status labels and selected Official/Test
scope carry their meaning without a paragraph beneath them. Empty states may be a
single clear heading; add a next step only when it helps the user recover or proceed.

Keep authored learning content, deadlines, file/field limits, actionable errors,
publication/access blockers, explicit preview/no-save labels, team-sharing context,
approval/locking requirements and warnings about unsaved work or irreversible changes.
Explain consequences at the relevant decision, not persistently across the screen.
Do not hide essential instructions in tooltips or add a help control for every removed note.

Activity assignments use Instructions / Workspace navigation on the same route, with a
roomy desktop workspace and bounded reading column. Long authored briefs have scoped
heading jumps beside the text on desktop and above it on phones, without internal scroll
boxes. New work starts in Instructions; saved work resumes Workspace. Keep inactive views
mounted behind hidden wrappers to retain drafts, selected files and active transfers.
Guided workspace uses a compact three-step navigator (Research / Direction / Final document).
The recommendation and action controls lead the Direction step; general explanations live
in Instructions. Final document leads with submission controls and Read final-document brief.
Team research uses labeled textareas and explicit
save/reveal language, not graded-submission language. Research helper copy identifies
shared answers and the editing cutoff at final submission;
the internal original snapshot is not presented as a restriction on editing. Direction
approval and missing-setup notices remain inline. Admin setup is a focused activity section inside the assignment editor with
independent saves and readiness per team. Direction requests shows only pending alternatives,
with team/company/week/assignment, proposed question, decision note and decision actions.
Recommended selections appear only under collapsed Team project progress, labeled Using
your recommended direction. Show current questions/research before optional History;
avoid presenting normal progress as an actionable request. Phone layouts wrap actions
and preserve 44px controls. Preview is clearly read-only and offers an explicit sample team.

Manual completion stays in existing review rows/cards: a quiet 44px Mark complete action
for missing Individual work, confirmed with the person and assignment. Complete rows
show “Manually completed,” its Pacific timestamp and confirmed Undo completion. Do not
add a score, synthetic attachment or new hero card. Members see the existing Complete
badge with a short GAP-lead credit notice instead of a submission button.

Teams use one restrained management panel with a labeled team selector in its header,
member count/scope and lock explanation below. The default view lists assigned participants;
Edit members reveals the checkbox roster with assigned participants first and explicit
Save/Cancel. Rename and confirmed Delete live behind Team actions. Add team opens compact
numbered creation controls rather than a permanent name field. Admin-only setup shows unassigned
participants without turning them into the default roster.
Locked membership is explained, not silently disabled. Member team assignments show
one compact team/name list and one-submission guidance above the existing workspace.
Review rows use team names and expandable teammate lists; queue counts stay submission-
focused. Actual submitters are identified on shared work records. No team-picker for members.

Grading references use one restrained collapsible panel, explicitly labeled Admins only.
In the assignment editor it contains separately labeled Rubric/Example response formatting
controls, an independent Save grading reference action and a distinct private example PDF
section. On review, Rubric/Example tabs sit above Feedback and decision in the existing
right column; mobile stacks submitted work → reference → feedback. A bounded, keyboard-
focusable text region prevents long guidance from dominating the page. Empty references
use a quiet Add grading reference link rather than another empty card. Tabs have arrow/
Home/End keyboard operation and retain review input. No score widgets or new queue filters.

Viewer Explore retains member typography, modules, locked icons, materials and focused
assignment pages. Label the switcher “Browsing cohort” and profile “Viewer.” Omit personal
progress, submission badges, overdue and attendance prompts. Use “Try submission preview”
with explicit local-only/no-save messaging and retain cohort context through content links.

Attendance uses compact green prompts without replacing Continue. Week selectors show
date/state/count; a large monospace code and local QR share a neutral panel, stacking on
phones. Searchable rows use 44px Mark present/Undo targets, confirmed Undo and non-absence
wording. A centered member card has one heading, labeled code input, explicit confirmation,
inline alerts and a timestamped receipt. Member screens never reveal the expected code.

Present check-in uses a viewport-filling accessible modal above the admin shell, with
optional browser fullscreen. Use a large uncropped QR on white, high-contrast six-character
code, workshop title and closing date/time; omit sign-in instructions and footer copy. Pair QR/code
on wide screens and stack on phones; allow scrolling at short heights/zoom. Keep an exit
button visible in the header, trap focus natively and restore focus to the launch button
on exit/Escape. No roster, correction controls, new session or automatic attendance writes.

GAP, the Growth Analyst Program, is an internal consulting-firm analyst development
portal: clean, modern,
professional, restrained, and warm. Favor strong typography, whitespace, thin borders,
clear hierarchy, and a single green accent. Avoid school-LMS styling, excessive cards,
decorative analytics, gradients used as spectacle, and visual clutter.

## Brand authority

1. `design_references/180DC Brand Identity Design Guide Draft (1).pdf` is the primary
   UC Davis visual guide.
2. `design_references/180DC Brand Guidelines 2024.pdf` governs global logo handling and
   voice where it does not conflict with the UC Davis guide.
3. The UC Davis guide wins on conflicting palette and typography choices.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Charcoal | `#434343` | Primary text, dark surfaces, headings |
| Brand green | `#55B441` | Primary actions, selected states, highlights |
| Deep green | `#519D39` | Hover/pressed states and restrained secondary accents |
| White | `#FFFFFF` | Main backgrounds and reversed text |

The supplied brand greens do not meet WCAG AA contrast with white for normal-size text.
Use derived action green `#2F7328` for primary controls and `#275F22` for their hover
state. Keep the supplied greens for brand accents, progress, and selected surfaces.

Implementation may add neutral tints derived from charcoal and white for page
backgrounds, muted text, borders, and disabled states. Status colors may add accessible
amber and red only when semantic meaning requires them. Green must not communicate an
error or overdue state.

## Typography

- Use Montserrat through `next/font/google` for MVP display and interface text.
- Proxima Nova is the preferred display face only if licensed font files are supplied and
  can be self-hosted through `next/font/local`.
- Do not fetch fonts through stylesheet links.
- Use bold, compact display headings; readable body sizes; and restrained uppercase
  tracking for section labels.
- Do not copy the PDF's print point sizes literally into the responsive web UI.

## Logo assets

Social-link thumbnails use only the approved compact dark UC Davis lockup, centered
with clear space on a neutral 1200 × 1200 square. No extra headline, tagline, footer or
decorative rule: square messaging-app crops must preserve the entire logo. Use the
square Twitter summary card; the favicon remains unchanged.

Original approved assets live in `design_references/Official Logos/` and must remain
unchanged. Runtime copies should be normalized into `public/brand/` with predictable,
descriptive filenames.

| Runtime asset | Source use |
| --- | --- |
| `180dc-uc-davis-primary-dark.png` / `-light.png` | Full branch lockup for spacious light/dark surfaces |
| `180dc-uc-davis-compact-dark.png` / `-light.png` | Short branch lockup for compact light/dark surfaces |
| `180dc-uc-davis-landscape-dark.png` / `-light.png` | Horizontal navigation and page headers |
| `180dc-globe.png` | Compact mark where branch identity is already established |

- Use the full black-text UC Davis lockup on light sign-in or presentation surfaces.
- Use the matching white-text lockup on dark surfaces.
- Use a short UC Davis lockup for compact navigation.
- Use the globe only for favicon, avatar-like, or small-space treatment where the full
  branch identity is already visible elsewhere.
- Never recolor, distort, shadow, redraw, or add elements to a logo.
- Preserve transparency, aspect ratio, and clear space. Transparent canvas cropping is
  allowed if no visible pixels are changed.
- Provide meaningful alt text when the logo communicates identity; use empty alt text
  when nearby text repeats the complete name.

## Core UI patterns

- **Multiple assignments:** the week editor has an “Assignments” section with an ordered
  selector and one visible assignment editor. Details, instructions/PDF, activity setup
  and grading references have separate sections. Keep a visible Add assignment action
  and the common week save bar.
  Members see compact assignment cards, followed by shared materials. Each card has
  title, deadline, optional summary, status icon/text and View assignment. Module rows
  show earned completion counts (approved work or explicit admin credit), such as “1 of 3 assignments complete.”
  Queue dropdown labels include week number and assignment title.

- **Admin member preview:** expose “Preview as member” beside the cohort switcher.
- **Admin navigation:** “Preview as member” is the default program-facing action.
  Show “My program” only for admins with enrolled participation in an active cohort.
  Omit the duplicate profile return link; the admin logo returns to the admin workspace.
  Keep a visible read-only banner across preview dashboard/week navigation. Reuse the
  member layout and retain the selected cohort in links. “Preview submission” opens the
  shared editor with local inputs, a preview-only notice and disabled save/upload.

- **Assignment brief:** place a labeled PDF upload panel below the assignment editor.
  Show current filename/download, selection, upload progress, retry/cancel after failure,
  and immediate-save/publication guidance. Members get a quiet download action beside
  instructions. Use existing controls and responsive wrapping.
- **Formatting links:** use a compact inline editor beneath the toolbar with labeled
  Link text and Web address fields, Insert link and Cancel. Avoid browser prompts.
  Stack fields on phones; focus the missing field on open, support Enter to insert and
  Escape to cancel, and return focus to the instruction text. Keep validation errors
  beside the fields and preserve input on failure.
- **Cohort dates:** Members → Manage cohort shows start/end dates, Save dates, and a
  cancel-edits action with the existing unsaved-change safeguards.

- **Cohort switcher:** quiet label above a 44px trigger showing cohort, state badge,
  and chevron. A bordered disclosure groups choices by Active, Draft, Archived (newest
  first). Use native buttons with Tab/Enter/Space, selected-state semantics, Escape with
  focus return, and outside-click dismissal. Fill available phone width and bound list
  height. Preserve the existing unsaved-change confirmation before switching.

- **Sign-in:** one centered white card capped at 420px on the neutral canvas, using the
  shared border, radius, and minimal shadow. Place the approved dark full UC Davis logo,
  welcome heading, concise access note, and full-width Google action inside. Use 24px
  phone/32px desktop padding and 16px outer gutters. Auto vertical margins center when
  space permits without clipping on short screens. Keep OAuth errors above the button
  as alerts; disable the button with “Connecting…” while pending. No extra login methods.

- **Application shell:** compact brand header, clear page title, profile control, and
  minimal navigation. Use one vertically centered row for logo, navigation, and profile
  on large screens. Below that breakpoint, keep logo and profile together with navigation
  on a horizontally scrollable second row.
- **Route loading:** center the approved dark landscape UC Davis logo on the neutral
  viewport, with one small green pulsing indicator underneath. Keep the logo static;
  disable animation for reduced motion. Announce “Loading GAP” to assistive technology
  without visible corner text, helper copy, fake progress or a blocking client overlay.
  Preserve logo aspect ratio and allow short screens to scroll without clipping.
- **Primary action:** solid brand green with white text and deep-green hover.
- **Secondary action:** white/neutral surface with charcoal border and text.
- **Interaction feedback:** enabled buttons, links, disclosures, selects and choice/file
  inputs use a pointer cursor; disabled controls use not-allowed. Text actions use the
  shared `action-link` treatment: darker action green and underline on fine-pointer hover,
  keyboard focus and press. Keep visible keyboard outlines, 44px targets and existing
  button/card background feedback. Color transitions are brief and respect reduced motion;
  no scaling, bouncing or layout shifts. Hover is enhancement, never required on touch.
- **Cards:** white or near-white, subtle border, modest radius, minimal shadow.
- **Status badges:** short text labels with icon/color as redundant cues; never color
  alone.
- **Submission outcomes:** lead with one plain-language result, place reviewer feedback
  directly beneath a single Feedback heading, and connect file metadata and actions in
  one submitted-work record. Place the icon-free status badge beside Feedback instead of
  repeating status labels or helper copy. Use a single bordered attachment tile and
  standard button hierarchy; avoid alert-like filled feedback boxes. Revision feedback
  uses an amber editorial rule and prominent reviewer text, with review metadata demoted
  beneath it. Every retained historical attempt provides a quiet view action.
- **Progress:** thin linear bar plus a textual value such as `2 / 6 modules complete`.
- **Forms:** visible labels, help/error text, clear focus rings, and full-width controls on
  small screens.
- **Tables:** quiet dividers and sticky/clear headers; use horizontal scrolling or cards
  on narrow screens.
- **Empty/error states:** concise explanation and one useful next action; no fake data.

## Component conventions

- Shared primitives live under `src/components/ui`; product-aware presentation belongs in
  a domain folder such as `src/components/program`.
- Prefer explicit variants and native HTML attributes. Do not add polymorphic component
  APIs or a component dependency until a concrete interface requires one.
- Buttons and button-styled links are separate components so their semantics remain clear.
- Server Components are the default. Keep interactive client boundaries narrow, as with
  the profile menu.
- `/dev/ui` is the non-production review surface for tokens, primitives, shell variants,
  and representative states. Assignment lifecycle state changers belong only on this
  design-guide surface and never appear in member-facing program routes.

## Responsive behavior

- Design student pages mobile-first in behavior even when composing desktop-first.
- Cards stack, deadlines stay near assignment titles, and submission controls remain
  thumb-friendly on small screens.
- Week detail pages are scannable overviews; never expand full assignment briefs inline.
  Dedicated assignment pages use a centered `max-w-3xl` reading column, open brief and
  compact submission panel beneath it. Do not stretch a sidebar alongside long text.
  Keep heading hierarchy, restrained bold, real list markers and generous paragraph rhythm.
  Admin instruction controls use labeled formatting buttons, a plain/formatted choice,
  an editable source textarea and a rendered preview; all controls remain keyboard accessible.
  Workshop slides and references follow in one quieter, full-width materials list, with
  the presentation first and ordered references beneath it.
- Do not enlarge short status copy to fill the assignment body or hide instructions after
  submission. Written feedback, revision controls, current work, and history belong on a
  focused submission-review page reached through `View feedback` or `View submission`.
- On the review page, real reviewer feedback may own the wide column. Awaiting-review
  states remain compact instead of manufacturing an empty feedback region. Compose the
  review as an open page with a bordered submitted-work record, a full-width revision
  editor when active, and quiet history beneath rather than one enclosing card. Treat it
  as a child detail of its week by retaining week context, page-title scale, spacing
  rhythm, and the same submitted-work record at a roomier density.
- Avoid fixed widths that cause horizontal overflow.
- Components inside narrow desktop panes must use their actual available space rather
  than global viewport breakpoints. Keep attachment metadata above its actions when a
  sibling column constrains the component width.
- Admin pages may prioritize desktop density but must remain operable on mobile.
- Member titles share a 32px mobile/36px desktop scale with admin titles. The dashboard
  leads with one next-step feature and places progress beside the module-list heading.
  Assignment submission panels use compact attachment metadata; submission review retains the
  roomier bordered record and prominent feedback. Materials have a direct anchor from
  the week introduction. Status labels distinguish awaiting review from complete.
- Submission editors show file formats and the 20 MB limit before selection. Opening an
  editor focuses its heading; cancelling restores focus to the action that opened it.
  Unavailable sample-file actions display an adjacent explanation.
- Standard file selection includes PNG/JPEG/WebP screenshots; Guided controls still list
  documents only. Admin Submitted work displays still images at their natural aspect
  ratio within the column/viewport, with Download original file retained. Preview errors
  offer Retry image preview and download; neither resets feedback nor disables grading.
  Historical images load only when their disclosure is opened. Do not embed documents,
  show private images in public/member-preview projections, or add a gallery/lightbox.
- Offer Write response, Upload file and Submit link. Stack choices in narrow desktop
  rails; wide editors can use three columns. Written responses use a labeled multiline
  textbox, 20,000-character counter and plain-text/draft guidance. Review preserves line
  breaks, wraps unbroken strings and renders escaped text, never Markdown/HTML.
- Admin pages use the same editorial headings and restrained surfaces as member pages,
  with a persistent cohort context bar beneath the primary header. Operational queues
  lead; cohort outcome summaries remain secondary and use counts plus transparent
  denominators rather than charts. Submission tables become per-member cards on narrow
  screens, and long editors use clearly separated sections with a sticky save area.
- Admin page titles use a compact `text-3xl` to `text-4xl` scale. Review queues default
  to awaiting-review work and expose mutually exclusive status filters, member search,
  and the selected assignment before the table. Submission review follows reading order:
  submitted work, feedback, decision, then save actions. Member and access records stay
  readable until an explicit edit action opens their controls.
- All admin deadline fields are labeled Pacific time. Repeated daylight-saving times
  require an explicit PDT/PST choice, and nonexistent spring-forward times are rejected.

## Accessibility baseline

Admin overview is a week-first review inbox: one restrained bordered panel, week/scope
header, compact received/awaiting submission counts and ordered assignment counts,
then an integrated queue toolbar. Remove repeated week descriptions and completion heroes.
Summary counts use Montserrat at body size (14px), not a separate oversized display line.
Numbers inherit their labels' font/weight; awaiting-review phrases and filter labels use
semibold rather than mixing large bold and light text. Allow wrapping on phones.
Avoid disconnected assignment dropdowns, floating search and four competing summary
cards. Assignment drill-down returns to All assignments. Keep visible search labels,
44px actions and per-person/assignment cards on phones. Cohort outcomes/advancement
belong in Members, not even a secondary disclosure on the review page. Portal access
Last active uses quiet Pacific timestamp text or —.

Test participation is an explicit checkbox within participant Edit outcomes, separate
from lifecycle controls. Read-only rows label test records; removal confirms inclusion
in official totals. Review/attendance selectors distinguish Official participants from
Test participants only, with test review labeling and official summaries unchanged.

Dashboard overview refinements: use a slim continuation header inside the module panel,
with a quiet sentence-case label, week number only, and one Continue button; leave the
full week title in the module row to avoid repetition. Open workshop check-in uses a
compact neutral outlined link with a green availability dot, explicit Open text and
44px minimum target. Place it beside the dashboard greeting on desktop, below on phones;
on week pages retain it below the introduction. Do not use a full-width green banner.
Put the module heading
and progress above the shared panel. Use a subtle neutral fill and bottom divider for
the continuation header, without a separate card or shadow. Show a compact caught-up
message there when appropriate. Stack only as needed on narrow screens. Do not
include an assignment or feedback panel. Module rows place week numbers beside titles and use distinct icons:
check for complete, clock for awaiting review, revision arrow for requested changes,
forward arrow for available work, and lock for upcoming modules. Retain text labels.

- Meet WCAG AA color contrast for text and interactive controls.
- Provide visible keyboard focus and logical focus order.
- Use semantic headings, links, buttons, labels, tables, and status announcements.
- Ensure targets are at least 44 by 44 CSS pixels where practical.
- Do not hide essential information behind hover.
- Respect reduced-motion preferences and use motion only to clarify state.

## Eight-case challenge presentation

Admin case progress replaces grading filters with a compact status toolbar and searchable
participant rows: name/email, status, saved count or finished timestamp, and View answers.
Completed participants appear first, followed by in-progress and not-started participants.
Use the same row layout stacked on phones; no plain unstructured roster or grading buttons.
On wider screens use consistent name, status and action grid tracks across rows so long
completion timestamps do not shift badges relative to saved-case counts. Wrap metadata
without truncation and retain the stacked phone layout.
Response detail shows participant identity/status, a wrapping case navigator, scenario,
and Participant response / Reference approach side-by-side on desktop and stacked on phones.
Reference text is one possible approach; answers are escaped plain text. Keep the read-only
label, previous/next actions and context-preserving back link. No scoring or review decision.

Use the existing member assignment typography, neutral cards and green primary action.
A compact wrapping case navigator and the shared green progress indicator show saved cases.
The overview lives in Instructions, not ahead of the task. Save reveals Your saved
response and Reference approach side-by-side only on roomy desktops (1280px and above);
smaller screens use full-width comparison controls, initially showing the reference.
Use balanced sections, not a tall narrow shaded sidebar. Next/Finish and Edit response
sit above long comparison content. Keep the scenario above the form and bound form width.
Label references as one possible approach, not an answer key. Fields have visible labels,
radio options have generous targets, errors retain input, and Finish confirms the final
read-only transition. Preview clearly labels its local-only behavior.

Gantt direct editing: all five consultant selections display All. Task titles use a single-line
inline field; the desktop title-column separator resizes by pointer or arrow keys (200–600px).
Task drag handles reorder the saved row array; Up/Down keys provide an alternative.
Rows expose direct confirmed deletion. Exact date controls are a keyboard-focusable Set dates
alternative, without a permanent row-actions menu. Programmatic deletion focus does not draw
an outline around the chart. Single-day blocks keep a minimum 44px grab width; moving a block
vertically transfers its stable ID to the destination task, retaining that task's staffing/hours.
