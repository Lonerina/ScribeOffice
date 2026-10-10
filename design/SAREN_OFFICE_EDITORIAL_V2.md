# Saren's Office — Editorial Workspace v2
Design candidate: `design/saren-office-editorial-redesign-20261010`

## Design direction
Saren's Office is a working court registry, not a dense diagnostics panel. This pass establishes an ink/navy editorial environment with parchment-toned text and restrained brass accents. It is meant for extended document work: quiet hierarchy, fewer competing primary actions, readable controls, and clear distinction between navigation, workspace, and sensitive operations.

## Concrete changes
- Replaced the default black/gold presentation with an editorial ink, midnight, parchment, and brass visual system; improved visual hierarchy and high-contrast label colors.
- Moved *Saren manifest/dismiss*, *Architect Bay*, *Azril manifest/dismiss*, and *Audit Continuity* into an explicitly labeled, keyboard-operable **Court operations** disclosure in the masthead. All four original handlers, disabled states, and authorization checks are preserved as-is.
- Retained a readily accessible world selector, new-world and world-edit controls, account identity, and sign-out in the masthead.
- Added native `aria-current="page"` for all five navigation destinations; styles now identify the selected destination with a persistent contrast/accent border instead of relying on decorative glow.
- Improved responsive operation controls, tap targets, focus-visible outlines, type sizes, reduce-motion support and context-panel contrast.
- Preserved original workspace routing, chat, court library, lore records, characters, consistency, document provenance, API handlers and Firebase rules.

## Scope and verification
**Implemented on an isolated design branch, not merged to main or deployed.**

CI runs `npm ci`, `npm run lint`, `npm run build`, and a deterministic source comparison against the approved candidate branch. That comparison reconstructs all approved JSX modifications from the original source and verifies **no other App.tsx changes**. Only `src/App.tsx`, new `src/editorial.css` and the dedicated CI workflow differ from the approved implementation.

## Remaining environment-specific acceptance
This code can be built, but must still be visually smoke-tested in an actual Google AI Studio staging instance at desktop and mobile widths. Login, world selection, all four Court operations, navigation, document create/revise/recall and cross-owner-denial must be checked with permitted staging credentials. Do not claim the redesign has already passed those browser interactions.

Production release still requires explicit approval, original app backup, Firebase configuration review and rollback preparation.
