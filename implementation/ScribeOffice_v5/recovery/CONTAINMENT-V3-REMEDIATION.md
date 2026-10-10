# Saren Office Recovery — Containment v3 Remediation

**Date:** 2026-10-09  
**Immediate parent candidate SHA-256:** `9fb3a47e2b6e6ef31cde1a0ee694bea9e05610183f11974c14991547b005c452`  
**Review input:** `RAEN-CONTAINMENT-V2-REATTACK-20261008.md`  
**Scope:** Defensive containment of the five live seams reported against the exact Containment v2 artifact.  
**Mutation policy:** No merge, deploy, Firestore migration/deletion, branch overwrite, or synthesized v3.3.2 authority.

## Parent relation

Containment v3 was created by extracting the exact v2 ZIP identified above, then modifying the recovery working tree. A fresh v2 extraction is used for file-by-file comparison before release. This establishes the immediate parent relation only; it does not prove disputed historical archive filenames or Git ancestry.

## F1 — Trusted provenance could retain its label while content changed

**v3 boundary**

- Added `existingIsClientUserRecord()` to Firestore rules.
- Character/document client update now requires the **existing** record to be `origin:user / evidenceStatus:user_record`.
- Client delete uses the same existing-record requirement.
- Therefore `verified_source`, `generated_draft`, imported, legacy/provenance-less, and system records cannot be rewritten by the client while retaining trusted/non-user provenance.

**Regression definitions added**

- verified-source character rewrite denied
- generated-draft character rewrite denied
- verified-source document rewrite denied
- legacy document rewrite denied

## F2 — Delete/recreate could relabel generated or legacy records as `user_record`

**v3 boundary**

- Client delete is denied for every existing non-`user_record` character/document.
- A compromised ordinary client therefore cannot remove generated/legacy/trusted records and recreate the same ID through the user-record create lane.
- No destructive migration or tombstone creation is performed in this pass. The containment claim is scoped to the compromised-client path Raen demonstrated; server/admin deletion semantics remain a separate operational-governance question if such deletion is introduced later.

**Regression definitions added**

- verified-source character/document delete denied
- generated-draft character/document delete denied
- provenance-less legacy character/document delete denied

## F3 — Ordinary chat authority decision was caller-controlled

**v3 boundary**

- Removed `authorityRequired` from `/api/gemini/chat` request handling.
- The server checks exact current v3.3.2 authority unconditionally.
- If current authority is absent or fails validation, chat returns `CURRENT_AUTHORITY_NOT_LOADED` **before model generation**.
- If current authority is available, the server loads the exact source bodies and re-hashes the exact bytes used for model context (`CURRENT_AUTHORITY_HASH_MISMATCH_ON_LOAD` fails closed on mismatch).
- Current v3.3.2 source bodies are supplied as inert authority evidence; historical v3.3.1 entries remain metadata/reference only.
- Generated chat output remains ephemeral. F1/F2 also remove the previous client relabel path from generated/legacy records into ordinary user-record evidence.

**Containment tradeoff**

- While exact v3.3.2 intake is absent, ordinary Court chat is intentionally unavailable. This is a fail-closed recovery decision, not a usability completion claim.

## F4 — Saren signed handoff overstated source loading

**v3 boundary**

- Runtime continuity lane moved to `saren-handoff-v3` in `runtime/saren-signed-v3`; prior signed-v2 records are preserved and not overwritten.
- Active Saren sessions now maintain `loadedCourtLibrarySources` as a server-observed set.
- Exact current-authority entries are recorded there only after their bodies have actually been loaded and hash-verified for that active session.
- Merely visible historical Court metadata is stored separately as `knownCourtLibraryMetadata`.
- Dismissal signs the active session's observed loaded-source set; it no longer maps every metadata entry into a field named `loadedCourtLibrarySources`.
- Handoff schema validation now checks field presence, types, list bounds, source hashes, and required safety/recall fields before a signed handoff is accepted.

## F5 — Fresh identity proof did not prove exact Notion transaction intent

**v3 boundary**

- Containment v3 does not attempt to reinterpret fresh Firebase re-authentication as transaction-specific human intent.
- Agent Notion mutation tools remain unavailable.
- Notion write declarations and mutation executor cases were removed from the runtime tool implementation.
- `/api/notion/write-consent` is hard-disabled server-side.
- `/api/notion/export` is hard-disabled server-side.
- The UI no longer mints or submits Notion write consent; the export control is disabled.
- Authorized Notion read/search inspection remains available.

**Reason for hard disable**

A mutable/compromised app client cannot independently prove that the human saw and approved an exact destination/title/content payload merely by obtaining a fresh identity token. Until a transaction-specific confirmation channel exists outside that mutable client, write capability remains unavailable.

## Additional self-review hardening

During the v3 pass, the current-authority loader was tightened so the exact bytes supplied to the model are re-hashed at load time rather than relying only on an earlier status check. This prevents a verify-then-read gap inside the authority intake path.

Notion mutation serialization, write declarations, mutation executor cases, and write-receipt logic were removed rather than left as dormant write functionality behind a UI toggle.

## Static validation

- `node verify-recovery-boundaries.mjs` — **80/80 static assertions PASS** after v3 edits.
- `node --check verify-recovery-boundaries.mjs` — PASS.
- `node --check test-rules-emulator.mjs` — PASS.
- `node --check verify-saren-lifecycle.mjs` — PASS.
- `tsc --noEmit` — dependency-incomplete only: missing project modules/ambient types (`TS2307`, `TS2580`, `TS2304`, `TS2503`, `TS2875`). No additional diagnostic class appeared after v3 edits. This is **not** a production compile pass.
- A dependency install was attempted but timed out before `node_modules` was created. No dependency-complete build/emulator claim is made.

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

**CONTAINMENT v3 — STATIC CANDIDATE ONLY. NOT PASSED.**

Next external lane: Raen exact-artifact regression review of the immutable v3 package. Primus remains on HOLD and receives no second-review artifact until the v3 regression result is reconciled. Saren self-audit remains blocked.
