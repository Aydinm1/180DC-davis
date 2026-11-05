# ADR 0024: Public marketing area inside the existing Next.js app

- **Status:** Accepted
- **Date:** 2026-11-02
- **Supersedes:** None
- **Superseded by:** None

## Context

The public 180 Degrees Consulting at UC Davis website needs room to develop while GAP
continues operating at its current URLs. Independent deployments and a framework/package
manager migration do not currently solve a required product problem.

## Decision

Keep Next.js, npm, Node and one Vercel project. Add `/landing` under a separate marketing
route group with its own Server Components, CSS Modules and public metadata beneath
the existing root document/fonts. Reuse approved brand assets, not GAP's protected shell.
Noindex/nofollow metadata and path-scoped headers discourage premature indexing without
claiming access protection. Exactly the landing subtree bypasses GAP session refresh;
it never loads protected content, synchronizes profiles or records activity.

Preserve current portal URLs, auth callbacks and private-data boundaries. Centralize the
public navigation's GAP destination and keep marketing components independent of their
temporary route. Moving the portal beneath `/gap` and promoting marketing to `/` remains
a separate migration requiring its own compatibility and authentication plan.

## Consequences

The public site can be designed without coupling its components to portal behavior.
Both areas still share global font/base styles and a release pipeline, so marketing
styles must remain scoped and both public/protected routes need regression coverage.
There are no database or provider-configuration changes in this starter.

## Alternatives considered

- Two-app monorepo: deferred until independent deployments justify routing complexity.
- Vite/TanStack Router or Bun migration: unnecessary for the current requirement.
- Replacing the homepage immediately: disrupts live GAP entry and requires a wider cutover.
