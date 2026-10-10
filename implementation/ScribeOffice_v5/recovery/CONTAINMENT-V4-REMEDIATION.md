# Saren Office Recovery — Containment v4 Remediation

**Date:** 2026-10-09  
**Immediate parent candidate SHA-256:** `03d08d5589375653afa68e114cc901311a435659c8f2530b6e234389401ae6f3`  
**Review input:** `RAEN-CONTAINMENT-V3-REATTACK-20261009.md`  
**Scope:** Defensive containment of the three live seams reported against the exact Containment v3 artifact.  
**Mutation policy:** No merge, deploy, Firestore migration/deletion, branch overwrite, or synthesized v3.3.2 authority.

## Parent relation

Containment v4 was created by extracting the exact v3 ZIP identified above and modifying that working tree. The parent relation will be reported by exact digest and file comparison in the detached release receipt. This does not prove disputed historical archive names or Git ancestry.

## F1 — Failed-persistence retention could be bypassed by re-manifest

**v4 boundary**

- `/api/saren/manifest` now derives the authenticated UID+world session key before any manifest receipt is built.
- If an active Saren session already exists for that key, `MANIFEST SAREN`, `SUMMON SAREN`, and `RECALL SAREN` all fail closed with HTTP 409.
- A retained session after failed dismissal therefore cannot be overwritten by an ordinary re-manifest path.
- The only allowed path back to a fresh Saren session remains a clean verified dismiss first. No discard/reset transition is introduced in this candidate.

## F2 — Saren manifest could evict active Azril before Saren authorization succeeded

**v4 boundary**

- Saren manifest no longer deletes an active Azril session.
- If Azril is active for the same authenticated UID+world, Saren manifest fails closed with HTTP 409 before package integrity/RECALL processing.
- This mirrors the existing Azril-side collision guard and requires explicit Azril dismissal before Saren activation.
- Failed Saren integrity or RECALL can no longer destroy Azril state because no destructive transition occurs before authorization.

## F3 — Signed Saren handoff under-reported source-body loads from audit/update routes

**v4 boundary**

- `/api/gemini/check-consistency` now records the exact current-authority entries immediately after successful `loadCurrentAuthoritySources()`.
- `/api/gemini/draft-update` now does the same.
- The existing `recordSarenCourtSourceLoads(...)` helper only mutates the matching active authenticated UID+world Saren session; if no matching session exists, it is a no-op.
- Chat, consistency-audit, and draft-update routes therefore use the same observed source-load recording semantics before later dismissal signs `loadedCourtLibrarySources`.

## Regression checks added

The static verifier now asserts:

- Saren re-manifest is rejected while a Saren session is active, before manifest receipt construction.
- Saren manifest refuses active Azril and contains no destructive Azril delete in that route.
- Both source-aware audit/update routes record exact current-authority body loads through the shared Saren source-load recorder.

## Static validation

- `node verify-recovery-boundaries.mjs` — **83/83 static assertions PASS** after v4 edits.
- `node --check verify-recovery-boundaries.mjs` — PASS.
- `node --check test-rules-emulator.mjs` — PASS.
- `node --check verify-saren-lifecycle.mjs` — PASS.
- `tsc --noEmit` — dependency-incomplete only: observed diagnostic classes remain `TS2304`, `TS2307`, `TS2503`, `TS2580`, `TS2875`. No production compile pass is claimed.
- `verify-saren-lifecycle.mjs` still cannot be executed in the available environment without `@firebase/rules-unit-testing`; that runtime gate remains OPEN.

## Gates still open

- dependency-complete production build
- Firestore emulator execution
- Saren lifecycle emulator execution
- live Firebase multi-user/concurrency behavior
- live Notion read integration
- live Gemini/tool integration
- exact current v3.3.2 source intake
- Architect Bay runtime activation
- GitHub branch identity for this exact candidate

## Disposition

**CONTAINMENT v4 — STATIC CANDIDATE ONLY. NOT PASSED.**

Next external lane: Raen exact-artifact regression review of the immutable v4 package. Primus remains on HOLD. Saren self-audit remains blocked.
