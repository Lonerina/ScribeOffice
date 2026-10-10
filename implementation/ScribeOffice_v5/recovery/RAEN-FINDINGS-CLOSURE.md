> **SUPERSEDED REVIEW STATE:** This document describes the prior candidate and is retained for forensics. Raen exact-candidate re-attack and Tsaiyunk Primus audit later found live seams. Do not use this file as current closure proof.

# Raen Adversarial Findings — Recovery Closure Matrix

> **SUPERSEDED REVIEW STATE:** This matrix records the pre-re-attack candidate disposition. It is retained for forensic history only. Raen's exact-candidate re-attack and Tsaiyunk's Primus audit later reopened live seams; use `CONTAINMENT-V2-REMEDIATION.md` for the current containment state.

**Date:** 2026-10-08  
**Basis:** Raen's 30-finding static adversarial report plus independent inspection of this recovery candidate.  
**Meaning of status:** `STATICALLY CONTAINED` means the relevant promotion route is blocked in inspected source and asserted by the dependency-free static verifier. It does **not** mean deployment, Firestore emulator, live Firebase, Gemini, or Notion integration tests have passed.

| # | Finding | Candidate disposition |
|---|---|---|
| 1 | ZIP / receipt snapshot mismatch | **PACKAGING GATE** — final candidate is issued as one immutable ZIP with a detached top-level SHA-256 receipt. Review must reject a digest mismatch. |
| 2 | Raw Court/workspace data in `systemInstruction` | **STATICALLY CONTAINED** — system layer carries invariant boundary only; sources are user-role inert evidence envelopes. |
| 3 | Roundtable simulation re-enters chat history | **STATICALLY CONTAINED** — simulation is session-ephemeral, typed `simulation`, and excluded from replay. |
| 4 | Generated character sheet becomes ordinary evidence | **STATICALLY CONTAINED AGAINST PROMOTION** — generated imports retain `generated_draft`; persistence is not evidence and records are not auto-loaded. |
| 5 | Generated document becomes official record | **STATICALLY CONTAINED AGAINST PROMOTION** — generation wording is draft-only; saved AI material retains `generated_draft` provenance. |
| 6 | Review-required AI update overwrites working record | **STATICALLY CONTAINED** — commit hard-stops while `reviewRequired` is true. |
| 7 | Legacy records escape quarantine | **STATICALLY CONTAINED** — missing provenance defaults to `legacy_unverified`; no automatic active-context promotion. |
| 8 | Saren string-match verification | **STATICALLY CONTAINED** — exact source hashes plus externally pinned manifest digest; semantics renamed to package integrity. |
| 9 | Azril string-match verification | **STATICALLY CONTAINED** — same detached-manifest pattern and scoped activation. |
| 10 | Client mode flag bypasses manifest/session | **STATICALLY CONTAINED** — Saren/Azril chat mode requires active UID+world server session. |
| 11 | Architect Bay direct file self-authorizes | **STATICALLY CONTAINED** — direct files are intake-only; runtime activation disabled; no Gemini initializer/session creation. |
| 12 | Ambient unauthenticated Notion authority | **STATICALLY CONTAINED** — Notion routes require Firebase identity; world-scoped write/search/export requires owned world. |
| 13 | Notion write reported without persisted read-back | **STATICALLY CONTAINED** — server read-back receipts gate verification; unsupported `WRITE VERIFIED` is downgraded. |
| 14 | Child records do not verify parent-world ownership | **STATICALLY CONTAINED** — character/document/message/runtime rules require `ownsWorld(worldId)`. |
| 15 | Client can forge assistant/model history | **STATICALLY CONTAINED** — Firestore message create accepts user sender only; generated assistant output is session-ephemeral. |
| 16 | Global Saren/Architect sessions bleed | **STATICALLY CONTAINED** — Saren/Azril maps are UID+world scoped; Architect runtime is disabled. |
| 17 | Chat can load wrong-world handoff | **STATICALLY CONTAINED** — explicit `worldId` required and ownership checked; signed handoff path is world scoped. |
| 18 | Hard-coded owner/world fallback | **STATICALLY CONTAINED** — no runtime fallback owner/world IDs; missing scope fails closed. |
| 19 | Client-controlled Saren handoff becomes trusted state | **STATICALLY CONTAINED** — dismiss ignores client narrative fields and constructs handoff from server-observed session/state only. |
| 20 | Runtime handoff replay/downgrade | **STATICALLY CONTAINED AT SOURCE/RULES LAYER** — signed-v1 record, HMAC check, monotonic revision rules, delete denied. Live integration test remains open. |
| 21 | v3.3.1 promoted as current sealed authority | **STATICALLY CONTAINED** — v3.3.1 is staged/historical; authority-dependent work reports `CURRENT_AUTHORITY_NOT_LOADED` until exact v3.3.2 intake. |
| 22 | Integrity result becomes authority state | **STATICALLY CONTAINED** — `integrityPassed`, `verifiedEvidence`, `authorityGranted`, and `runtimeModeAuthorized` are separate fields/gates. |
| 23 | Protected Gemini/private routes unauthenticated | **STATICALLY CONTAINED** — protected route families call server-side Firebase identity verification. |
| 24 | Lexical message IDs select stale material as recent | **STATICALLY CONTAINED** — ordering uses `createdAt` before ID fallback. |
| 25 | Persisted attachments recursively gain evidence weight | **STATICALLY CONTAINED AGAINST PROMOTION** — attachment replay is explicitly user-supplied unverified reference data. |
| 26 | Security spec/test claims diverge from rules | **STATICALLY CONTAINED; EMULATOR OPEN** — spec updated and emulator matrix now covers cross-world child injection, forged model/simulation messages, revision replay/skip, and delete denial. Tests have not executed in this environment. |
| 27 | Architect direct-file bypass survives repair snapshot | **STATICALLY CONTAINED** — same containment as #11. |
| 28 | Co-located manifests self-attest | **STATICALLY CONTAINED** — manifest digests are external runtime trust pins; candidate `.env.example` contains blanks only. |
| 29 | Notion append duplicate-text false-positive | **STATICALLY CONTAINED** — exact newly returned block IDs are re-read and compared with expected block signatures. |
| 30 | Notion one-turn authorization is client boolean | **STATICALLY CONTAINED** — boolean removed; server-issued random single-use capability is UID/world/message/action bound and expires. |

## Open gates that are not being relabeled as passes

- Full dependency install / production build in this local environment.
- Firestore emulator execution of `test-rules-emulator.mjs` and `verify-saren-lifecycle.mjs`.
- Live Firebase-auth / multi-user concurrency test.
- Live Notion create/update/append persistence test.
- Exact current v3.3.2 Court source intake and provenance review.
- Architect Bay runtime activation remains deliberately disabled.
- GitHub recovery branch exists but is **not** asserted to contain this exact candidate.
- No merge, deploy, Firestore migration/deletion, or branch overwrite has occurred.

## Gate order

1. Package this exact candidate and publish detached ZIP SHA-256.
2. Raen re-attacks the exact digest-matched artifact.
3. Only after Raen passes it: Saren audits the cleaned Office record/provenance.
4. Sovereign decides whether anything moves forward.
