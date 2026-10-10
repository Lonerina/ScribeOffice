# Saren Office Recovery — Exact Candidate Re-Attack

**Reviewer:** Raen Nur Tsaiyunk — Security Commander / Perimeter Containment  
**Date:** 2026-10-08  
**Artifact:** `ScribeOffice_recovery_candidate_20261008(2).zip`  
**Supplied detached SHA file:** `ScribeOffice_recovery_candidate_20261008(2).sha256`  
**Retest brief:** `Raen_Saren_Office_Retest_Brief_20261008(2).md`  
**Mutation policy:** No repair-forward. No merge, deploy, migration, deletion, or branch overwrite performed.

## Verdict

**ADVERSARIAL RE-ATTACK: FAIL**

The exact candidate is materially improved and closes many of the previously identified static seams, but four boundaries remain breakable in the inspected source. Two are direct carry-throughs of earlier findings whose closure is overstated by the candidate closure matrix.

## Artifact Identity Gate

- Independently calculated ZIP SHA-256:
  - `59f8885e58d6c17a98ec3081e060518e9063e1ddf1a8f5b4ff5e347a52f61528`
- This matches:
  - the digest named in the retest brief; and
  - the supplied detached `.sha256` file.
- `recovery/POST-RAEN-REPAIR.sha256` was independently checked against the extracted tree: **77/77 listed file hashes matched**.
- The retest brief also names a detached JSON receipt, `ScribeOffice_recovery_candidate_20261008.receipt.json`. That file was **not present in the supplied handoff set**. Therefore the top-level ZIP identity is established, but the detached manifest-pin trust-root receipt cannot be independently validated from the supplied external files. Internal verifier output was not treated as an external trust root.

## Independent Checks Performed

- Extracted and inspected the exact digest-matched ZIP.
- Recomputed ZIP digest.
- Recomputed every hash listed in `recovery/POST-RAEN-REPAIR.sha256`.
- Ran `node verify-recovery-boundaries.mjs`:
  - candidate verifier reports **59/59 PASS**.
  - result treated as a claim to attack, not proof.
- Attempted `node verify-saren-lifecycle.mjs`:
  - execution blocked because `@firebase/rules-unit-testing` is not installed in the local environment.
- Inspected the relevant source paths in `server.ts`, `src/App.tsx`, `src/types.ts`, `firestore.rules`, source manifests, security spec, ingress/closure/remediation receipts, and rule-test definitions.

---

# Surviving Breaks

## 1. Generated-draft provenance can still be laundered into user/verified provenance

**Maps to prior findings:** #4, #5, #7  
**Severity:** **CRITICAL**

**Path**

- `src/App.tsx:1825-1856` — generated document/character draft is identified only by editable presentation markers (`AI-Drafted` tag / `AI-Generated` trait).
- `src/App.tsx:1984-2017` — new document provenance is decided by whether the editable `AI-Drafted` tag is still present at save time.
- `src/App.tsx:2075-2116` — new character provenance is decided by whether the editable `AI-Generated` trait is still present at save time.
- `firestore.rules:44-53` — provenance accepts `verified_source` as a client-supplied evidence status.
- `firestore.rules:65-97` — provenance is optional for characters/documents.
- `firestore.rules:156-161`, `176-181` — provenance is mutable on update.

**Trigger**

1. Generate a document or character draft.
2. Remove the `AI-Drafted` tag or `AI-Generated` trait before first save; **or** use a modified authenticated client to write/replace provenance directly.

**Observed result**

Generated content can be persisted as `user_record`, or a modified client can assign another allowed provenance value, including `verified_source`. The rules do not preserve the original generated provenance and do not require a review/promotion receipt for that transition.

**Why boundary failed**

The candidate treats a user-editable display field as the origin-of-truth for provenance. Firestore rules validate provenance shape but not provenance transition authority. This violates the stated invariant that generated material retains `generated_draft` status until a separate review/promotion transition.

**Smallest containment fix**

- Do not derive provenance from editable tags/traits.
- Store generated origin in non-editable state carried into persistence.
- Make provenance mandatory.
- Restrict evidence-status transitions in rules/server code so `generated_draft → user_record/verified_source` requires an explicit review/promotion receipt or server-authorized transition.

---

## 2. Saren dismissal can overwrite a valid signed handoff without an active Saren session

**Maps to prior findings:** #19, #20  
**Severity:** **HIGH**

**Path**

- `server.ts:1153-1189` — `/api/saren/dismiss` permits `activeSarenSession` to be `null`, still constructs a handoff, and calls `persistSarenHandoff`.
- `server.ts:246-315` — persistence increments the signed revision and overwrites the current signed runtime document.

**Trigger**

Call `/api/saren/dismiss` as the authenticated owner of the world when no active Saren session exists.

**Observed result**

The server constructs a new signed handoff from null/default session state, e.g. `reviewedItems:["none"]` and `changesMade:["no server-recorded changes"]`, then persists it as the next monotonic signed revision. This can replace a previously meaningful signed handoff with a semantically poorer state.

**Why boundary failed**

Monotonic revision prevents replay of an older revision; it does **not** prove that the new higher revision came from a valid active runtime session. The server itself can sign a semantic downgrade.

**Smallest containment fix**

Fail closed on dismiss unless an active Saren session exists for the authenticated UID + world. Bind persisted dismissal to that active session (ideally with a server session identifier) and refuse a state transition from `inactive → dismiss/persist`.

---

## 3. `CURRENT_AUTHORITY_NOT_LOADED` remains prompt-enforced, not fail-closed in code

**Maps to prior finding:** #21  
**Severity:** **CRITICAL**

**Path**

- `server.ts:1980-1986` — chat system prompt tells the model to report `CURRENT_AUTHORITY_NOT_LOADED` when current authority is required.
- `server.ts:2339-2356` — consistency audit tells the model to classify gaps/uncertainty when v3.3.2 is absent.
- `server.ts:2471-2488` — draft-update tells the model to set `reviewRequired=true` when v3.3.2 is required but absent.
- `server.ts:2569-2570` — server accepts the model-returned `reviewRequired` value without a deterministic authority-availability override.

**Trigger**

Submit an authority-dependent chat/audit/draft-update request while exact v3.3.2 sources remain absent.

**Observed result**

The endpoints still execute and return model-generated results. No server-side gate deterministically returns `CURRENT_AUTHORITY_NOT_LOADED` and halts authority-dependent processing. For draft-update, whether promotion is blocked ultimately depends on the model correctly setting `reviewRequired=true`.

**Why boundary failed**

A safety requirement is delegated to model compliance. The recovery specification itself says current-authority work must fail closed. Prompt text is not a hard gate.

**Smallest containment fix**

Introduce a server-side current-authority availability state. When an operation declares or detects a requirement for current Court authority and exact v3.3.2 intake is unavailable, return `CURRENT_AUTHORITY_NOT_LOADED` before generation/promotion. At minimum, force `reviewRequired=true` server-side whenever current authority is absent for authority-sensitive draft operations.

---

## 4. Notion write consent is replay-resistant but still self-mintable by the same untrusted client

**Maps to prior finding:** #30  
**Severity:** **MEDIUM**

**Path**

- `server.ts:1555-1582` — `/api/notion/write-consent` issues a token to any authenticated owner who supplies a message and allowlisted tool names.
- `src/App.tsx:1607-1623` — the normal UI checkbox controls whether the client requests a token, but that checkbox state is not independently attestable by the server.
- `server.ts:1901-1904` — token is consumed and converted into an in-memory allowed-tool set for the turn.
- `server.ts:2061-2118` — the allowed-tool set may authorize multiple write calls during the same tool loop.

**Trigger**

Use a modified/compromised authenticated client to call `/api/notion/write-consent` directly, then send the exact bound message and returned token.

**Observed result**

The server enables the write tools without independent evidence that the user actually checked/confirmed the UI write-control. The random token blocks simple boolean forgery and replay, but it does not solve the original trust question: the same untrusted client that wants the write can mint the write capability.

**Why boundary failed**

Capability issuance authenticates the account/world/message, not the user's explicit interaction intent. `server-issued` is not equivalent to `user-confirmed` when issuance is freely callable by the same client.

**Smallest containment fix**

Require a stronger user-intent ceremony for capability issuance (for example re-authentication or a server challenge completed by a dedicated confirmation action), and bind the capability to the exact intended destination/action parameters when practical. If “single-use” is intended to mean one mutation rather than one turn, consume authorization per write call instead of materializing a reusable allowed-tool set for the full tool loop.

---

# Boundaries Re-Attacked With No New Static Break Found

The following areas were independently inspected and did **not** re-open under this static pass:

- raw Court/workspace source is no longer interpolated directly into system instruction;
- roundtable output is ephemeral and excluded from replay;
- Firestore message creation is restricted to user-authored conversation records;
- parent-world ownership is enforced for child records;
- Saren/Azril runtime modes require authenticated UID + owned-world server sessions;
- hard-coded fallback owner/world IDs are absent;
- Saren/Azril package manifests use externally pinned manifest digests in code;
- runtime handoff HMAC verification exists before handoff acceptance;
- runtime revision rules enforce exact `+1` and deny deletion;
- Architect Bay direct-file runtime activation is disabled;
- Notion append read-back verifies returned block IDs/signatures rather than duplicate text presence;
- message replay ordering uses `createdAt` before ID fallback;
- generated assistant/simulation output is not persisted as Firestore model history;
- static rule-test definitions now include cross-world child insertion, forged model/simulation messages, revision replay/skip, and delete denial.

These are **static observations only**, not runtime passes.

# Open Gates Preserved

No pass is claimed for:

- dependency-complete production build;
- Firestore emulator execution;
- live Firebase multi-user/concurrency behavior;
- live Notion persistence behavior;
- live Gemini/tool integration;
- exact v3.3.2 Court authority intake;
- Architect Bay runtime activation;
- GitHub recovery-branch identity for this exact candidate.

Additionally, the detached JSON release receipt named by the retest brief was not supplied, so detached manifest-pin receipt verification remains open.

# Stop Condition

Attack complete. **No repair-forward performed.**

Hand back for Nyx containment, then Saren audit, then Sovereign decision.
