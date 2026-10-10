# Saren Office Recovery — Containment v5 Remediation

**Date:** 2026-10-09  
**Immediate parent candidate SHA-256:** `4dc38f67925ecebc7b6686093caeb3071e5aa41fec9a8ca1cc4df2e562c9bef6`  
**Review input:** `RAEN-CONTAINMENT-V4-REATTACK-20261009.md`  
**Scope:** Targeted defensive containment of the two static concurrency/lifecycle seams reported against exact Containment v4.  
**Mutation policy:** No merge, deploy, Firestore migration/deletion, branch overwrite, synthesized v3.3.2 authority, or Saren self-audit.

## F1 — Non-atomic Saren/Azril activation

**v5 boundary**

- One in-memory transition reservation is keyed by authenticated `UID+world`.
- Saren manifest, Azril manifest, Saren dismiss, and Azril dismiss must reserve that key before lifecycle mutation.
- The reservation is acquired before asynchronous manifest/receipt work and released in `finally`.
- A second concurrent transition for the same key receives HTTP 409 instead of independently passing stale pre-commit guards.
- Both Saren and Azril manifests also reject an already-active same-agent session before creating a replacement.

**Scope limit:** this is same-process serialization. No distributed/multi-instance lock is claimed.

## F2 — In-flight Saren Office work could escape signed dismissal handoff

**v5 boundary**

- Active Saren sessions now carry `lifecycle: active|dismissing` and `inFlightOperations`.
- Source-aware consistency audit, draft update, and Saren-mode chat obtain a session operation lease synchronously before Saren tracking begins and release it in `finally`.
- Dismissal refuses to proceed while `inFlightOperations > 0`.
- Once dismissal is admitted, it marks lifecycle `dismissing` before the first persistence await; new Saren operation leases cannot start during that window.
- If handoff persistence fails or throws, the retained session returns to `active`; successful persistence deletes the session only after the signed handoff is persisted.
- Audit/update source-load and event recorders are invoked only when that route actually holds a Saren operation lease. This prevents work that began during a failed dismissal from later appending a partial event after the session becomes active again.

## Regression hardening

- Saren event/source recorder helpers refuse mutation unless lifecycle is `active`.
- Saren-mode chat is lifecycle-bound as the same root concurrency boundary, so dismissal cannot cut across a long Saren chat operation either.
- Existing v4 sequential guards and earlier provenance/authority/Notion/quarantine boundaries are preserved.

## Static validation

- `node verify-recovery-boundaries.mjs` — **93/93 static assertions PASS** after v5 edits.
- `node --check verify-recovery-boundaries.mjs` — PASS.
- `node --check test-rules-emulator.mjs` — PASS.
- `node --check verify-saren-lifecycle.mjs` — PASS.
- `tsc --noEmit` — dependency-incomplete only; no production compile PASS is claimed.
- Emulator and live concurrency execution remain OPEN.

## Disposition

**CONTAINMENT v5 — STATIC CANDIDATE ONLY. NOT PASSED.**

Next external lane: Raen exact-artifact concurrency/regression review of the immutable v5 package. Primus remains on HOLD. Saren self-audit remains blocked.
