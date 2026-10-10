# Raen — Saren Office Containment v3 Exact-Artifact Regression Re-Attack

**Date:** 2026-10-09  
**Artifact:** `ScribeOffice_recovery_candidate_v3_20261009.zip`  
**Pinned SHA-256:** `03d08d5589375653afa68e114cc901311a435659c8f2530b6e234389401ae6f3`  
**Disposition:** **FAIL — 3 surviving seams**  
**Review mode:** exact-artifact static/adversarial regression review only; no repair-forward

## Artifact gate

**PASS.**

Independent checks:

- ZIP SHA-256 = `03d08d5589375653afa68e114cc901311a435659c8f2530b6e234389401ae6f3`
- detached `.sha256` matches
- detached `.receipt.json` pins the same candidate digest
- extracted archive contains **92 files**
- `recovery/POST-CONTAINMENT-V3.sha256` SHA-256 = `8b05212a8e932df243a98c83e242ddc794852016ab360b70f70272dc02e6fe1d`
- internal ledger contains **91 entries**
- independent ledger verification: **91/91 match; 0 missing; 0 mismatches**
- candidate `verify-recovery-boundaries.mjs`: **80/80 PASS** when run independently; treated as a target, not proof

`verify-saren-lifecycle.mjs` could not execute because `@firebase/rules-unit-testing` is absent. That gate remains OPEN; it is not converted into PASS or FAIL.

---

## Surviving break 1 — failed-persistence retention can be bypassed by re-manifest

**Severity:** HIGH

**Path**  
`server.ts` → `/api/saren/dismiss` retains the active Saren session when persistence fails → `/api/saren/manifest` → successful `MANIFEST SAREN` / `SUMMON SAREN` calls `activeSarenSessions.set(...)` for the same UID+world without first refusing or preserving the existing active session.

**Trigger**  
1. An active Saren session accumulates server-observed state.  
2. Dismissal persistence fails; the server correctly leaves that session active.  
3. The same authenticated Court principal invokes `/api/saren/manifest` again for the same world with a fresh manifest/summon command.  
4. Package integrity passes.

**Observed result**  
The retained in-memory session is overwritten by a new session with a new `sessionId` and empty `reviewedItems`, `changesMade`, `unresolvedItems`, and `loadedCourtLibrarySources`.

**Why boundary failed**  
Containment preserves the session on a failed dismiss, but another route can immediately discard that retained state without a verified persistence transition. This reopens the state-loss seam through a different transition.

**Smallest containment fix**  
Fail closed on `MANIFEST SAREN` / `SUMMON SAREN` when an active Saren session already exists for the same UID+world. Require a clean verified dismiss first, or a separately authorized explicit discard/reset transition that cannot be reached accidentally from ordinary re-manifest.

---

## Surviving break 2 — Saren manifest can silently evict an active Azril session before Saren authorization succeeds

**Severity:** HIGH

**Path**  
`server.ts` → `/api/saren/manifest` → `activeAzrilSessions.delete(sessionKey(identity.uid, worldId))` occurs **before** `buildSarenManifestReceipt(...)` and before the Saren runtime authorization result is known.

**Trigger**  
1. Azril is active for a UID+world.  
2. The same principal calls `/api/saren/manifest` for that UID+world.  
3. Saren package integrity or RECALL restoration then fails.

**Observed result**  
Azril's active session has already been removed even though Saren never successfully entered runtime mode.

**Why boundary failed**  
The Saren transition is destructive before the replacement state is proven valid. The opposite transition already behaves more safely: `/api/azril/manifest` refuses activation while Saren is active and requires Saren to be dismissed cleanly first.

**Smallest containment fix**  
Mirror the Azril-side collision guard: if Azril is active, refuse Saren manifest/recovery until Azril is explicitly dismissed. At minimum, do not clear Azril until Saren authorization has succeeded and the transition is explicitly committed.

---

## Surviving break 3 — signed Saren handoff under-reports current-authority source-body loads from audit/update routes

**Severity:** MEDIUM

**Path**  
`server.ts` → `/api/gemini/check-consistency` and `/api/gemini/draft-update` both call `loadCurrentAuthoritySources()` and therefore read/hash the current-authority source bodies. They also record Saren session events through `recordSarenSessionEvent(...)`. Neither route calls `recordSarenCourtSourceLoads(...)`.

**Trigger**  
1. A Saren session is active.  
2. The user runs a source-aware consistency audit or draft update.  
3. Exact current authority is loaded and supplied to the model.  
4. The session is later dismissed and signed.

**Observed result**  
The signed handoff can contain an observed `consistency_audit` / `draft_update_proposal` event while `loadedCourtLibrarySources` omits the exact source bodies that were actually loaded for that operation.

**Why boundary failed**  
Containment v3 correctly stopped metadata from being mislabeled as loaded source bodies, but the tracking helper is wired only into `/api/gemini/chat`. The signed `server_observed_only` record is therefore incomplete across Saren Office source-consuming routes.

**Smallest containment fix**  
After each successful `loadCurrentAuthoritySources()` in Saren Office audit/update routes, call the same source-load recorder when a matching active Saren session exists. Prefer one centralized current-authority loader that both verifies bytes and records the observed load for the active session so future routes cannot drift apart.

---

## Regression targets that held under static review

The following repaired boundaries survived this static re-attack:

- F1: ordinary client update/delete authority is restricted to records already classified `origin:user / evidenceStatus:user_record`; trusted/generated/imported/legacy/system records remain outside ordinary client mutation authority.
- F2: ordinary client cannot delete non-`user_record` character/document records and therefore cannot use the old delete/recreate path on those records.
- F3: `/api/gemini/chat` no longer accepts a caller-controlled authority flag; exact current v3.3.2 authority is required before model generation, and exact source bytes are re-read/re-hashed at load time.
- F5: Notion mutation is hard-disabled in this candidate; agent mutation tools are not declared, `/api/notion/write-consent` and `/api/notion/export` fail closed, and no Notion mutation HTTP path was found in the runtime code reviewed.
- Saren RECALL remains HMAC/schema fail-closed on the signed-v3 lane.
- Dismiss still requires an active Saren session, and the direct dismissal path retains the session when persistence fails.
- UID+world keys are used for Saren/Azril active-session maps.
- `agents/saren/behavior.md` remains `runtimeAllowed:false`; the reviewed Saren safety layer does not semantically require it for reset/recovery.
- Architect Bay remains intake/integrity-only; runtime activation remains denied.

These negatives do **not** erase the three surviving seams above.

---

## OPEN runtime gates — no inferred PASS

Per the v3 brief and the available environment, these remain OPEN:

- dependency-complete production build
- Firestore emulator execution
- Saren lifecycle emulator execution
- live Firebase multi-user/concurrency behavior
- live Notion read integration
- live Gemini/tool integration
- exact current v3.3.2 source intake
- Architect Bay runtime activation
- GitHub branch identity for this exact digest

## Final disposition

**FAIL.**

Artifact identity is clean, internal ledger is clean, and the intended F1/F2/F3/F5 containment changes substantially hold under static review. However, two live runtime-transition/state-loss seams remain around Saren manifesting, and the signed-v3 source-load receipt is incomplete across source-aware Saren Office routes.

No repair-forward. No merge, deploy, migration, deletion, or branch mutation performed.
