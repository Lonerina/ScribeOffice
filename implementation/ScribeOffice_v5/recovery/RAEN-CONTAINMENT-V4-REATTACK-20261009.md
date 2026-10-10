# Raen — Saren Office Containment v4 Exact-Artifact Regression Re-Attack

**Date:** 2026-10-09  
**Artifact:** `ScribeOffice_recovery_candidate_v4_20261009.zip`  
**Pinned SHA-256:** `4dc38f67925ecebc7b6686093caeb3071e5aa41fec9a8ca1cc4df2e562c9bef6`  
**Disposition:** **FAIL — 2 surviving static race seams**  
**Review mode:** exact-artifact static/adversarial regression review only; no repair-forward

## Artifact gate

**PASS.**

Independent checks:

- ZIP SHA-256 = `4dc38f67925ecebc7b6686093caeb3071e5aa41fec9a8ca1cc4df2e562c9bef6`
- detached `.sha256` matches
- detached `.receipt.json` pins the same candidate digest
- extracted archive contains **98 files**
- `recovery/POST-CONTAINMENT-V4.sha256` SHA-256 = `4f8ea3fb5308115cf27eb2b4d1d3be70d8224f9022cda2c5eb99e5f2b3e8a2f0`
- internal ledger contains **97 entries**
- independent ledger verification: **97/97 match; 0 missing; 0 mismatches**
- candidate `verify-recovery-boundaries.mjs`: **83/83 PASS** when run independently; treated as a target, not proof

`verify-saren-lifecycle.mjs` could not execute because `@firebase/rules-unit-testing` is absent. That gate remains OPEN; it is not converted into PASS or FAIL.

`tsc --noEmit` remains dependency-incomplete with the same documented missing-module / missing-environment diagnostic classes. No production compile PASS is inferred.

---

## Surviving break 1 — session activation guards are non-atomic across concurrent requests

**Severity:** HIGH

**Path**  
`server.ts` → `/api/saren/manifest` checks `activeSarenSessions` / `activeAzrilSessions` → awaits `buildSarenManifestReceipt(...)` → later writes `activeSarenSessions.set(...)`.  
`/api/azril/manifest` similarly checks `activeSarenSessions` → awaits `buildAzrilManifestReceipt()` → later writes `activeAzrilSessions.set(...)`.

**Trigger**  
Two activation requests for the same authenticated UID+world arrive before either request commits its active-session map entry.

Two important forms exist:

1. **Saren + Saren:** both requests can pass the “no active Saren” check, await receipt construction, then both create different `sessionId` values; the later `set(...)` overwrites the earlier session.
2. **Saren + Azril:** Saren can observe no Azril while Azril simultaneously observes no Saren; after their respective awaits, both can commit active sessions for the same UID+world.

**Observed result from code ordering**  
The v4 single-request guards are correct, but the guard-and-commit sequence is not atomic. Under concurrent requests the system can still overwrite a newly created Saren session or reach the state where Saren and Azril are both active in the same scope.

**Why boundary failed**  
The fix closes the sequential transition seam but leaves a check-then-await-then-set race. There is no per-UID+world activation reservation, mutex, or atomic state-machine transition spanning the asynchronous integrity/handoff work.

**Containment direction only**  
Serialize activation transitions per UID+world or reserve the session transition before asynchronous verification, releasing the reservation on failure. Do not implement here; no repair-forward performed.

---

## Surviving break 2 — in-flight Saren Office operations can escape the signed handoff during concurrent dismissal

**Severity:** MEDIUM

**Path**  
`server.ts` → `/api/gemini/check-consistency` and `/api/gemini/draft-update` → `await loadCurrentAuthoritySources()` → only after that await call `recordSarenCourtSourceLoads(...)` → later record the audit/update event.  
`/api/saren/dismiss` can concurrently snapshot the current session, persist the handoff, and delete the active session.

**Trigger**  
1. A Saren session is active.
2. A consistency audit or draft update starts and enters the asynchronous current-authority load.
3. Before the route records those exact body loads, a concurrent verified Saren dismissal snapshots/persists the handoff and removes the active session.
4. The audit/update resumes.

**Observed result from code ordering**  
`recordSarenCourtSourceLoads(...)` and the later event recorder become no-ops because the matching active session has already been deleted, while the audit/update operation can continue and return a result. The signed handoff can therefore omit a source-aware operation that began while Saren was active.

A neighboring interleaving also exists if dismissal occurs after source-load recording but before the end-of-route audit/update event is recorded: the handoff can contain the source loads but omit the corresponding operation event.

**Why boundary failed**  
V4 wires the correct recorder into every source-aware route, but it does not bind the full asynchronous operation to the lifecycle of the active Saren session. Dismissal does not know about in-flight Saren Office work and does not wait/reject while such work is pending.

**Containment direction only**  
Treat in-flight source-aware work as part of the session lifecycle so dismissal and audit/update cannot cross each other without an explicit ordering rule. Do not implement here; no repair-forward performed.

---

## Regression targets that held under static review

The intended v4 repairs hold for ordinary sequential execution:

- active Saren blocks sequential MANIFEST / SUMMON / RECALL replacement;
- active Azril blocks sequential Saren activation and Saren no longer destructively evicts Azril;
- consistency-audit and draft-update routes call the exact current-authority source-load recorder;
- prior trusted/generated provenance mutation denial remains intact;
- non-user-record delete/recreate relabel denial remains intact;
- normal chat still hard-fails before model generation when current v3.3.2 authority is absent;
- signed-v3 RECALL remains fail-closed;
- direct dismissal still retains the active Saren session on persistence failure;
- UID+world scoping remains present;
- Notion writes remain hard-disabled;
- quarantined `agents/saren/behavior.md` remains outside runtime;
- Architect Bay runtime remains disabled.

These negative findings do **not** erase the two race seams above.

---

## OPEN runtime gates — no inferred PASS

Per the v4 brief and the available environment, these remain OPEN:

- dependency-complete production build
- Firestore emulator execution
- Saren lifecycle emulator execution
- live Firebase multi-user/concurrency behavior
- live Notion read integration
- live Gemini/tool integration
- exact current v3.3.2 source intake
- Architect Bay runtime activation
- GitHub branch identity for this exact digest

The two findings above are static ordering/race findings. Live reproduction remains part of the still-OPEN runtime/concurrency gate.

## Final disposition

**FAIL.**

Artifact identity is clean, internal ledger is clean, and the three v3 findings are closed for ordinary sequential execution. However, the v4 transition guards are not atomic under concurrent activation, and source-aware Saren Office operations are not lifecycle-bound strongly enough to guarantee complete signed handoff capture during concurrent dismissal.

No repair-forward. No merge, deploy, migration, deletion, or branch mutation performed.
