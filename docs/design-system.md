# GAP Design System

**Status:** Active
**Last updated:** 2026-11-01
**Source of truth for:** Brand use, visual tokens, UI patterns, responsive behavior, and accessibility

## Direction

### Interface copy

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

Guided assignments use the existing narrow assignment page, formatted overview and a
compact three-step navigator (Research / Direction / Final document). One current step
is visible; the overview is collapsible. Team research uses labeled textareas and explicit
save/reveal language, not graded-submission language. Research helper copy identifies
shared answers and the editing cutoff at final submission;
the internal original snapshot is not presented as a restriction on editing. Direction
approval and missing-setup notices remain inline. Admin setup is a focused activity section inside the assignment editor with
independent saves and readiness per team. Approval requests use a separate restrained
panel below the review queue, not additional summary metrics. Phone layouts wrap actions
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
A compact wrapping case navigator and accessible progress indicator show saved cases.
Keep the overview in a disclosure. Save reveals two comparison sections: Your saved
response and Reference approach, side-by-side on wide screens and stacked on phones.
Label references as one possible approach, not an answer key. Fields have visible labels,
radio options have generous targets, errors retain input, and Finish confirms the final
read-only transition. Preview clearly labels its local-only behavior.
