# ADR 0035: One instruction source per assignment workflow

**Status:** Accepted
**Date:** 2026-11-23

## Context

Structured activities already render their own configured instructions, while publishing
also required nonempty ordinary assignment instructions that members never saw.

## Decision

Standard assignments retain the main Instructions editor. Guided projects, cases,
investigations, schedules and Slide Swap use their activity configuration exclusively.
Hide the redundant editor; preserve historical text and attachments. At publication,
use the persisted locked workflow to waive only the ordinary instruction requirement.
Client claims about workflow cannot change that requirement. Existing activity readiness,
permissions, submission-mode/history locks and publication gates remain intact.

## Consequences

Admins configure one visible instruction source, with no placeholder text required.
Converting back to Standard requires main instructions before publication. No existing
content is migrated or deleted, and real assignments are not configured automatically.
