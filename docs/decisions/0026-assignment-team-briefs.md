# ADR 0026: Private per-team assignment instructions

**Status:** Accepted
**Date:** 2026-11-09

## Context

Week 3 teams need different long-form project briefs while using ordinary shared submissions.
Guided-project research/approval gates are unrelated to these instructions. Putting all teams'
text in common published content would expose it to other teams and Viewer/Explore users.

## Decision

Add optional assignment/team-keyed formatted instruction records in a private RLS table,
with no direct table grants and narrow user-scoped read/admin-save RPCs. Match current
enrollment, cohort, role, publication and Official/Test team scope before member reads.
Keep these records out of shared week/dashboard/Explore payloads. Admin preview may select
sample teams; admin participants on normal member routes still receive only their actual
team's brief. No public file URLs, new workflow or submission type are needed.

Save independently with optimistic versions, DB timestamps/actor and stable last-request
retry recovery under the existing submission lock order. Explicitly clear nonempty briefs
before converting assignment mode/workflow. Content-only cascade deletion follows existing
authorized unused-assignment/team deletion; no student work is touched or backfilled.

Use Instructions / Workspace and scoped heading jumps for long briefs. Extend the existing
safe renderer with flat Markdown tables, escaped inline cells and phone overflow containment.
Raw HTML/embeds/unsafe links remain inert. No new editor dependency is added.

## Consequences

Each team's instructions can evolve independently of common content and submissions.
Briefs add no readiness, grading, membership-lock or completion gate. They describe current
instructions, not immutable submission/rubric snapshots; prior versions are not presented as
historical grading references. Shared submission, revision and approval behavior is unchanged.
Real assignment content and hosted release remain separate authorized work.
