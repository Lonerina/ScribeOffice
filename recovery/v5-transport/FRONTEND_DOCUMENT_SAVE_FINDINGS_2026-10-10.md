# Saren Office v5 — Frontend Document Save Investigation
Date: 2026-10-10
Scope: Reconstructed approved v5 application, source unchanged

## Evidence
- CI trace: https://github.com/Lonerina/ScribeOffice/actions/runs/38036339406
- Firebase document matrix: https://github.com/Lonerina/ScribeOffice/actions/runs/38034784983
- Firestore rules accept authenticated owner-created *user-authored* document records, and reject generated provenance from client-created documents.
- Reconstructed `src/App.tsx` lines 1906–1972: `handleSaveDoc`.
  - Manual creation: `setDoc(...)` with origin `user`, evidenceStatus `user_record` (lines 1930–1937).
  - Generated creation: authenticated POST `/api/records/generated-document` (lines 1921–1929), not yet exercised in isolation.
  - Manual edits use `updateDoc` (lines 1943–1966).
- Reconstructed `src/App.tsx` lines 1831–1885: `handleCommitUpdate`.
  - AI-generated update attempts client `setDoc(...,{merge:true})` and explicitly supplies `provenance: { origin: "generated", evidenceStatus:"generated_draft" }`.
- Reconstructed `firestore.rules` lines 193–215: document update requires `existingIsClientUserRecord()`, `provenanceUnchanged()` and limits affected keys.
- Therefore, for an existing user-authored document with `user_record` provenance, `handleCommitUpdate` would mutate immutable provenance, producing a rules denial. For a generated document, the precondition `existingIsClientUserRecord()` also prevents direct client update.
- No live browser click test or generated-document server-route integration has yet been completed.

## Classification
- Manual document create + read: VERIFIED at Firestore emulator rules layer.
- AI generated document create via server: UNVERIFIED end to end.
- AI update client commit: **STATICALLY INCOMPATIBLE** with the deployed v5 Firestore policy for the described existing records; runtime test recommended.
- Notion export: INTENTIONALLY DISABLED under Containment v3 (independent of Office local documents).

## Safe remediation proposal (not implemented)
1. Preserve provenance on an existing document; do not silently relabel user-authored material as generated during client update.
2. Keep the proposed AI output in a distinct reviewable draft, not an implicitly upgraded canonical record.
3. If an authorized reviewer promotes an AI draft, implement a separate, explicitly reviewed server-authorized transition with audit record and typed provenance semantics, or a compatible versioned draft storage path.
4. Verify `/api/records/generated-document` using Firebase Auth + Firestore emulators, valid user/world, malformed fields, wrong-owner access, duplicate document IDs, and denied unapproved promotion.
5. Add a failing-then-passing regression test before modifying the application; no production changes or weakening Firestore rules.

No production source mutation, merge or deployment.

## Supplemental regression result — 2026-10-10
- Run https://github.com/Lonerina/ScribeOffice/actions/runs/38037101153 **PASSED**.
- Firestore emulator rejected client attempt to mutate an existing manual record's immutable provenance to generated_draft.
- It rejected client update of server-generated provenance and client creation of forged generated provenance.
- Reviewed generated-document route in reconstructed server.ts lines 1833–1875: requires authenticated principal, Court ACL, owned world, valid ID/title/content, duplicate check, and writes generated_draft server-side.
- Positive authenticated HTTP integration of this server route remains **UNVERIFIED**. These regression tests demonstrate denial boundaries only.
