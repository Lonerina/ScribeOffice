# Raen — Saren Office Containment v2 Exact-Artifact Re-Attack

**Date:** 2026-10-08  
**Target artifact:** `ScribeOffice_recovery_candidate_v2_20261008.zip`  
**Expected / verified SHA-256:** `9fb3a47e2b6e6ef31cde1a0ee694bea9e05610183f11974c14991547b005c452`  
**Disposition:** **FAIL**  
**Repair-forward:** **NOT PERFORMED**

## 1. Artifact gate

PASS.

- ZIP SHA-256 independently calculated: `9fb3a47e2b6e6ef31cde1a0ee694bea9e05610183f11974c14991547b005c452`
- Detached `.sha256` agrees.
- Detached `.receipt.json` agrees.
- Archive contains 86 files.
- Receipt pins `recovery/POST-PRIMUS-CONTAINMENT.sha256` to `c10b731e6c6a9567ecbdcbd5d45854949b2a6bdd676fc13a4cd5e4f84c6357ed`; independently matched.
- Internal ledger lists 85 files; independently verified **85/85**, 0 missing, 0 mismatches.
- Immediate parent digest preserved as `59f8885e58d6c17a98ec3081e060518e9063e1ddf1a8f5b4ff5e347a52f61528`.

The candidate's own static verifier reports **78/78 PASS**. That result is treated as a target to attack, not proof.

## 2. Surviving breaks

### F1 — Verified-source content can be rewritten while retaining verified provenance

**Path**  
`firestore.rules` — `/worlds/{worldId}/characters/{characterId}` update rule (approx. lines 171–177) and `/documents/{docId}` update rule (approx. lines 193–199).

**Trigger**  
Start with a server/trusted record whose provenance is `evidenceStatus: verified_source`. Submit a normal authenticated client update that changes substantive fields (character identity/bio/function/etc. or document title/content/version) while leaving the provenance map byte-for-byte unchanged.

**Observed result**  
The rules require only `provenanceUnchanged()` and otherwise permit substantive field mutation. They do not require the existing record to be a client-owned `user_record` before client update.

**Why the boundary failed**  
The client cannot mint `verified_source`, but once such a record exists it can rewrite its content while preserving the trusted provenance label. That is a direct evidence-laundering path: arbitrary new content can remain tagged as verified source.

**Severity**  
**CRITICAL**

**Smallest containment fix**  
Client update/delete must be allowed only when the **existing** provenance is `origin:user / evidenceStatus:user_record`. Generated, imported, legacy, system, and verified records must be server-only for mutation/deletion; trusted transitions must use a separate server path.

---

### F2 — Delete/recreate can launder generated or legacy provenance into `user_record`

**Path**  
`firestore.rules` — character delete (approx. line 179), document delete (approx. line 201), paired with client create rules (approx. lines 165–169 and 187–191).

**Trigger**  
1. Take an existing `generated_draft` or provenance-less legacy record owned by the user.  
2. Delete it through the client.  
3. Recreate the **same document ID** through the normal client-create lane, which requires `origin:user / evidenceStatus:user_record`.

**Observed result**  
Delete has no provenance-class restriction or tombstone check. Recreate is accepted as a fresh `user_record`.

**Why the boundary failed**  
Provenance is immutable only while the record exists. Record identity is not durable across delete/recreate, so the same logical record can cross from generated/legacy state into `user_record` without a trusted transition.

**Severity**  
**HIGH**

**Smallest containment fix**  
Deny client delete for any non-`user_record` provenance class. If ID-level identity must survive deletion, add a server-owned tombstone/record-origin ledger checked on recreate.

---

### F3 — Ordinary free-form chat still has a caller-controlled authority gate

**Path**  
`server.ts` — `/api/gemini/chat` around lines 2169–2185.  
`src/App.tsx` — `handleSendChat` around lines 1598–1614.

**Trigger**  
Ask an authority-dependent question through ordinary chat while exact v3.3.2 authority is absent.

**Observed result**  
The server fails closed only when the request body contains `authorityRequired === true`. The normal UI request does **not** send `authorityRequired` at all. Therefore an authority-dependent free-form request reaches the model with prompt-level instructions telling it to report `CURRENT_AUTHORITY_NOT_LOADED`, rather than a deterministic code gate.

The chat response is session-ephemeral by default, but structured chat output can be sent to the generated-character persistence lane as `generated_draft`; F2 provides a further path to relabel the same record ID as `user_record`.

**Why the boundary failed**  
Whether current authority is required is still declared by the client rather than enforced by the server/route. The exact seam Nyx asked to attack therefore remains: the non-authoritative chat lane can carry an authority-dependent request while current authority is unavailable.

**Severity**  
**CRITICAL**

**Smallest containment fix**  
Do not rely on a client-supplied `authorityRequired` boolean. Separate authority-dependent operations into a server-enforced authority route, and make ordinary chat structurally non-authoritative with no promotion path into evidence-bearing records. If current-authority semantics are requested, the server must reject before model generation.

---

### F4 — Signed Saren handoff overstates which Court sources were actually loaded

**Path**  
`server.ts` — `/api/saren/dismiss` around lines 1333–1348.

**Trigger**  
Manifest a Saren session, use only metadata / no full Court source bodies, then dismiss.

**Observed result**  
Dismiss calls `getCourtLibraryMetadata()` and maps **every** library entry into a field named `loadedCourtLibrarySources`, regardless of whether any source body was actually loaded during the session.

**Why the boundary failed**  
The signed handoff claims `trackingScope: server_observed_only`, but its own `loadedCourtLibrarySources` field is not an observation of actual source loading. On later recall, that signed runtime state can imply broader source exposure than occurred.

**Severity**  
**HIGH**

**Smallest containment fix**  
Track source-body loads per active session and sign only the exact observed set. If the intent is merely to preserve available metadata, rename/separate the field (for example `knownCourtLibraryMetadata`) so it cannot be read as a load receipt.

---

### F5 — Notion capability still proves fresh identity presence, not exact payload intent

**Path**  
`server.ts` — `/api/notion/write-consent` around lines 1735–1765 and `/api/notion/export`.  
`src/App.tsx` — manual export re-auth flow.

**Trigger**  
Use the same compromised-client threat model as the prior finding. Cause the user to complete fresh Firebase re-authentication, then have the compromised client choose a different destination/title/content and submit that client-constructed `messageText` to `/api/notion/write-consent`.

**Observed result**  
The server correctly checks revoked/fresh authentication, UID, owned world, TTL, exact message digest, single-use action, and persisted read-back. However, the exact message being bound is itself supplied by the same compromised client after re-auth. There is no independent server-side confirmation that the human saw and approved that exact destination/title/content.

**Why the boundary failed**  
Fresh re-auth proves recent user presence and identity, but under the stated compromised-client threat model it does not independently prove transaction-specific intent.

**Severity**  
**HIGH**

**Smallest containment fix**  
Use a server-created pending export intent and a separate confirmation step that visibly binds the human approval to the exact destination/title/content hash before capability issuance. Re-authentication should authorize that precommitted intent, not arbitrary post-auth client text.

## 3. Negative findings / repaired seams that survived static attack

The following repairs held under static re-attack:

- Candidate identity / detached receipt / internal tree ledger all matched.
- Direct client create cannot mint `generated_draft` or `verified_source`; client create requires `user_record` provenance.
- Server generated-document / generated-character endpoints fix provenance to `generated_draft` and deny overwrite by existing ID.
- Editable `AI-Drafted` / `AI-Generated` presentation markers are no longer origin authority.
- `RECALL SAREN` has a signed-v2 lane and fails closed on missing/malformed/bad handoff in the static logic.
- Saren dismissal requires an active UID+world session.
- Failed handoff persistence returns failure before deleting the active in-memory Saren session.
- Saren/Azril sessions are UID+world scoped.
- Court and Notion principal ACLs are separate and fail closed when unconfigured.
- Agent-initiated Notion write tools are disabled in chat recovery mode.
- Notion export token is short-lived, single-use, UID/world/action/message-bound, and requires persisted read-back.
- `behavior.md` remains `runtimeAllowed:false`; `safety.md` explicitly keeps it quarantined rather than semantically re-importing it.
- Current-authority consistency-audit and draft-update endpoints reject before generation while v3.3.2 is absent.
- The static boundary verifier itself returned **78/78**, but this report demonstrates that its checks do not cover all live semantic paths above.

## 4. Runtime gates still OPEN

Not converted into PASS or FAIL without execution evidence:

- dependency-complete production build
- Firestore emulator execution
- Saren lifecycle emulator execution
- live Firebase multi-user/concurrency behavior
- live Notion persistence / re-auth behavior
- live Gemini/tool integration
- exact current v3.3.2 source intake
- Architect Bay runtime activation
- GitHub branch identity for this exact digest

Attempted lifecycle verifier execution could not run because `@firebase/rules-unit-testing` is not installed in the available environment. This remains OPEN, not failed.

## 5. Final disposition

**FAIL.**

Containment v2 repaired multiple prior seams, but the exact candidate still contains live provenance, authority-routing, signed-handoff semantics, and transaction-intent weaknesses.

No repair-forward performed. No merge, deploy, migration, deletion, or branch mutation performed.
