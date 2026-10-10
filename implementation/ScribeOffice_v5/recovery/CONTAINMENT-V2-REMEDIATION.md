# Saren Office Recovery — Containment v2 Remediation

**Date:** 2026-10-08  
**Parent candidate SHA-256:** `59f8885e58d6c17a98ec3081e060518e9063e1ddf1a8f5b4ff5e347a52f61528`  
**Scope:** Source/static containment after Raen exact-candidate re-attack and Tsaiyunk Primus audit.  
**Mutation policy:** No merge, deploy, Firestore migration/deletion, branch overwrite, or synthesized v3.3.2 authority.

## Review inputs preserved

- `RAEN-EXACT-CANDIDATE-REATTACK-20261008.md` — exact-candidate re-attack received from Raen.
- `TSAIYUNK-PRIMUS-AUDIT-20261008.txt` — Primus audit received from Tsaiyunk.
- Earlier reports remain in `recovery/` as forensic history. They are not promoted into proof of current closure.

## Parent-artifact receipt

Before this pass, the extracted working directory used for containment was compared with the exact parent candidate ZIP identified above:

- parent ZIP files: 78
- extracted working-copy files: 78
- missing from either side: 0
- byte-different files: 0

This establishes the immediate code parent by bytes/digest. It does **not** establish disputed AI Studio / GitHub filename ancestry.

## Containment changes

### 1. Generated-draft provenance

- Firestore client creation of documents/characters now requires provenance and accepts only `origin:user / evidenceStatus:user_record` from the client.
- Clients cannot mint `generated_draft` or `verified_source` provenance.
- Client updates cannot mutate provenance.
- Generated documents/characters are persisted only through authenticated server endpoints using fixed `generated_draft` provenance.
- Generated origin is carried in non-editable UI state; editable `AI-Drafted` tags / `AI-Generated` traits no longer determine provenance.
- Chat character-sheet import creates a new generated draft through the server and does not overwrite an existing same-name record.
- A malicious client can still submit arbitrary text as its own `user_record`; `user_record` is explicitly **not verified evidence** and cannot self-promote into `verified_source` through client rules.

### 2. Saren continuity and dismissal

- Runtime handoff schema moved to `saren-handoff-v2` in `runtime/saren-signed-v2`.
- Active sessions receive a server-generated `sessionId` and are keyed by authenticated UID + world.
- `RECALL SAREN` fails closed unless a signed v2 handoff is successfully restored.
- Fresh `MANIFEST/SUMMON` is a separate explicit baseline-start path; it does not masquerade as recall.
- `/api/saren/dismiss` fails closed when no active session exists.
- Dismissal persists only a handoff bound to the active server session.
- If handoff persistence fails, the active in-memory session is retained; it is not destroyed.
- Signed handoff scope is explicitly `server_observed_only`.
- Server-observed chat review hashes, audit events, draft proposals/review requirements, and verified manual Notion exports can be recorded into the session receipt.
- Safety flags default to `not observed by server`; the signature authenticates the server receipt, not comprehensive observation of every event.

### 3. Current authority gate / historical source pressure

- Normal chat no longer preloads the full historical Court Library. It receives metadata only.
- `loadCourtLibrary()` requires explicit source IDs; implicit full-library loading is prohibited.
- Exact current v3.3.2 intake has a separate manifest + per-file hash + detached manifest-pin path.
- Source-aware consistency audit and draft-update endpoints return deterministic `CURRENT_AUTHORITY_NOT_LOADED` before model generation while current v3.3.2 intake is unavailable.
- Normal chat can be explicitly marked authority-required and then fails closed before generation; otherwise its output remains ephemeral/non-evidence and receives historical metadata only.
- No v3.3.2 source text is synthesized from v3.3.1.

### 4. Notion authority / consent

- Agent-initiated Notion mutation tools are disabled in this recovery candidate; Saren/Azril may receive read tools only.
- The server Notion integration is restricted by external `NOTION_AUTHORIZED_UIDS`; owning a Firestore world is not enough.
- Manual export requires Firebase re-authentication immediately before capability issuance.
- Server verifies the freshly issued Firebase token (including revocation check) and requires recent `auth_time`.
- Capability is bound to UID + owned world + exact export payload digest + exact `notion_export_page` action, expires after two minutes, and is consumed for one mutation.
- Manual export still requires persisted exact read-back before success is reported.
- No API secret or Firebase UID allowlist value is stored in the candidate package.

### 5. Private Court material / principals

- Private Court routes are restricted by external `COURT_AUTHORIZED_UIDS` in addition to Firebase authentication/world checks where applicable.
- Court Library detail routes are no longer accessible merely because an arbitrary Google/Firebase account can sign in.

### 6. Saren runtime-source contradiction

- `agents/saren/behavior.md` remains quarantined (`runtimeAllowed:false`).
- Runtime `safety.md` no longer tells recovery to reload quarantined behavior, and its manifest requirements now refer to runtime-allowed source-package integrity rather than a behavioral-signature dependency.
- Saren source manifest hashes were regenerated after that change.

## Static validation performed

- `node verify-recovery-boundaries.mjs` — **78/78 static assertions passed**.
- `node --check verify-recovery-boundaries.mjs` — passed.
- `node --check test-rules-emulator.mjs` — passed.
- `node --check verify-saren-lifecycle.mjs` — passed.
- `tsc --noEmit` — non-zero because project dependencies / Node typings are absent. Only documented environment/dependency diagnostic classes appeared; no additional diagnostic class appeared. This is **not** a dependency-complete compile pass.

## Gates still open

- dependency-complete production build
- Firestore emulator execution
- Saren lifecycle/emulator execution
- live Firebase multi-user/concurrency behavior
- live Notion persistence / re-auth behavior
- live Gemini/tool integration
- exact current v3.3.2 source intake
- Architect Bay runtime activation
- GitHub branch identity for the exact new candidate

## Disposition

**STATIC CONTAINMENT CANDIDATE ONLY.**  
Raen re-attacks the new immutable package first. Saren self-audit remains blocked until adversarial/Primus review stops producing live seams and the Sovereign authorizes advancement.
