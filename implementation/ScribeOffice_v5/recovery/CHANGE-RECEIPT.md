# Saren Office Recovery — Change Receipt

**Recovery date:** 2026-10-08  
**Working baseline:** user-supplied AI Studio download `world-building-lore-&-character-organizer (2)(1).zip`  
**Ancestor reference:** GitHub branch `saren-office-court-library` at `49d6a3e2749d63bef5abc1a64d2f89ca6739a6f2`  
**Recovery branch:** `recovery/saren-office-grounding-20261008`

## Scope

This pass stops evidence-promotion paths before content cleanup.

Implemented boundaries:

- Saren manifest is package-integrity only; `behavior.md` is quarantined from runtime pending provenance review.
- Azril manifest is package-integrity only and is bound to an authenticated user/world runtime session.
- Court Library and working-profile content are carried as inert evidence payloads rather than raw source instructions in the system layer.
- Prior model outputs are explicitly labeled conversational context, not evidence.
- Roundtable output is a single-model simulation and is excluded from future chat replay.
- Generated drafts / character sheets / audit notices carry provenance and do not gain authority by persistence.
- Legacy Firestore records without provenance are preserved as `legacy_unverified`; no migration or deletion is performed.
- Firestore child collections require ownership of the parent world.
- Protected server routes verify Firebase identity and world ownership where world scope is material.
- Notion model writes require one-turn authorization and persisted read-back; direct export requires authenticated owned-world scope plus explicit write confirmation and read-back.
- Current Court v3.3.2 authority remains an intake gap; staged v3.3.1 files are historical ancestors, not silently promoted.

## Preserved / not performed

- No Firestore records deleted or migrated.
- No deployment performed.
- No merge performed.
- No existing GitHub branch overwritten.
- No v3.3.2 source content synthesized from assumptions.
- No Saren identity/behavior prose cleaned in this pass beyond runtime quarantine boundaries.

## Validation receipts

- `recovery/BASELINE-RECEIPT.sha256` records pre-repair hashes for the supplied AI Studio baseline files captured before edits.
- `recovery/POST-REPAIR.sha256` records the post-repair working-copy hashes.
- TypeScript static check was run with the locally available compiler. Dependency-resolution errors are expected because `node_modules` is not installed; after filtering missing-module/environment diagnostics, no additional TypeScript errors were reported.
- Offline `npm install` could not run because required packages were not cached, so a full dependency build and Firestore emulator execution remain pending.

## Review sequence

1. **Raen attack pass** against this recovery branch.
2. Repair any surviving seams with receipts preserved.
3. **Saren self-audit** of the cleaned Office record and provenance map.
4. **Sovereign final approval** before merge/deploy/migration.

## Second containment pass — Raen adversarial findings 27–30

Raen's separate attack on the repair JSON identified four surviving seams in the intended recovered state. This second pass contains those seams without cleaning or promoting source content:

- Architect Bay direct text upload is now intake-only. Self-declared role text cannot initialize Gemini, set verified/manifested state, create a runtime session, or grant authority.
- Saren, Azril, and Anchor boot manifests require detached SHA-256 trust pins from runtime configuration. Package-local manifest files no longer establish their own trust root.
- Notion append verification captures newly returned block IDs and re-reads those exact blocks under the requested page, including expected block-signature comparison.
- Client booleans for Notion write/export authorization are removed. Writes require a short-lived single-use server-issued capability bound to UID + world + exact message + allowed action.

Additional fail-closed clarification: Architect Bay does not claim full package integrity in this candidate because the local Tsaiyunk/Architect Bay repository files do not yet have a complete detached package pin. Anchor private-bundle hash success is not promoted into Architect Bay authority or runtime readiness.

Validation: `verify-recovery-boundaries.mjs` runs without external dependencies and currently passes all static containment assertions. Full dependency build, Firebase emulator execution, and live Notion persistence tests remain open.

## Full Raen finding-set containment pass

The second recovery working copy was independently checked against all 30 Raen findings. This uncovered additional seams beyond the four JSON-snapshot findings and they were patched before packaging:

- Firestore message creation is user-only; generated assistant/simulation/audit/system outputs are not persisted by the client.
- Saren runtime handoff uses a new signed, monotonic `saren-signed-v1` record. Legacy unsigned runtime data is preserved for forensics but excluded from recovery load.
- Dismissal handoff is server-constructed rather than client-narrated.
- `reviewRequired` is now a hard promotion gate for generated draft updates.
- Message recency uses `createdAt`, not heterogeneous lexical IDs.
- Architect Bay runtime remains disabled; direct uploads are intake only.
- Generated lore/profile prompts now state draft-only semantics.
- Firestore test definitions and security specification were aligned with the implemented parent-world, user-only-message, and runtime revision boundaries.

Static recovery verifier result before final packaging: **59/59 checks passed**. This is a source/static result only. Dependency-complete build, Firestore emulator execution, and live Notion/Firebase integration tests remain open and must not be represented as passed.

## Containment v3 amendment — Raen exact-artifact v2 FAIL

This amendment records the next containment pass only; earlier sections remain historical receipts and are not current closure.

Raen's exact-artifact review of Containment v2 (`9fb3a47e2b6e6ef31cde1a0ee694bea9e05610183f11974c14991547b005c452`) found five surviving seams. Containment v3 responds as follows:

- Client character/document update and delete are now restricted to records that already carry `origin:user / evidenceStatus:user_record`; trusted/generated/imported/legacy/system records are client-immutable and client-undeletable.
- Ordinary Court chat no longer trusts a caller-supplied authority flag. It fails before generation until exact current v3.3.2 authority is hash-verified, and re-hashes the exact source bytes used at model-load time.
- Saren continuity moves to `saren-handoff-v3` / `runtime/saren-signed-v3`. Actual observed current-authority body loads are separated from merely available historical metadata.
- Notion write capability is removed from the recovery runtime: write declarations/executor cases are gone, consent/export routes fail closed, and the UI export control is disabled. Notion remains read-only for authorized principals.
- New regression definitions cover trusted/generated/legacy record mutation and deletion paths.

Static source verifier after the v3 edits: **80/80 PASS**. This remains a static result only; dependency-complete build, emulator execution, live integration, exact v3.3.2 intake, and external review remain open.
