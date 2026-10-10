# Saren Office Recovery — Unverified Data Ingress Map

**Baseline:** AI Studio download supplied 2026-10-08.  
**Rule:** stop promotion before cleaning content.  
**No destructive migration:** existing Firestore data is preserved for forensic review.

## Recovery principles

- **source ≠ instruction**
- **simulation ≠ memory**
- **generated draft ≠ record**
- **record ≠ verified evidence**
- **verification ≠ string match**

## Labeled ingress paths

| ID | Ingress path | Current promotion risk | Recovery boundary |
|---|---|---|---|
| R01 | `agents/saren/*.md/json` → manifest → Saren runtime | Generated/expanded prose can become a verification predicate and then runtime authority. | File integrity is checked from a source manifest. `behavior.md` is quarantined from runtime until provenance review. Manifest wording is package-integrity only, never identity/evidence verification. |
| R02 | Court Library files → raw `systemInstruction` | Imperative source text can blend with runtime instructions. | Normal chat receives Court metadata only; historical source bodies are not preloaded. Explicit source loading requires named IDs. Current v3.3.2 authority has a separate fail-closed intake path. |
| R03 | Firestore Saren handoff → `effectiveState` | Mutable/replayed handoff can be mistaken for verified memory/state. | Recovery handoff is server-constructed, UID+world scoped, stored in `runtime/saren-signed-v3`, HMAC-signed with an external key, bound to a server session ID, monotonic-revisioned, schema-checked, scoped to server-observed events, and still labeled unverified runtime state. Legacy unsigned `runtime/saren` is preserved but not loaded. |
| R04 | Normal assistant chat messages → next chat history | Generated assistant prose can be recycled as evidence by later turns. | Generated assistant output is session-ephemeral rather than Firestore-persisted. If replayed within the live session, it is wrapped as prior model output / conversational context only, never evidence. |
| R05 | Roundtable simulation → history | Simulated multi-agent dialogue can become apparent historical memory/evidence. | Roundtable output is session-ephemeral, typed `simulation`, and excluded from future Saren chat replay. It is never written as an assistant Firestore message. |
| R06 | Consistency audit notice → history | Audit summaries can be recycled as evidence. | Audit notices are session-ephemeral, typed `audit_notice`, and excluded from future chat replay. |
| R07 | `character-sheet` generated in chat → import → Firestore character | Generated profile can become ordinary character record and then runtime context. | Imported/generated sheets persist only through the authenticated server generated-record path with fixed `generated_draft` provenance; never evidence by storage alone. |
| R08 | Creative generation → user saves document/character | Generated draft can lose its generated origin after persistence. | Generated origin is carried separately from editable tags/traits and persisted by authenticated server endpoints with immutable `generated_draft` provenance. Client-created records are limited to `user_record`. |
| R09 | AI draft-update → committed Firestore document | Model-generated rewrite can be promoted to ordinary record with version bump. | `reviewRequired=true` now hard-blocks commit. Allowed AI commits retain `generated_draft` provenance and do not gain evidentiary status by version bump. |
| R10 | Existing legacy Firestore docs/characters | Old records survive clean `initialData.ts` and are auto-loaded into active context. | Missing provenance defaults to `legacy_unverified`; active context no longer auto-loads all records. No data deletion. |
| R11 | Client-supplied `activeContext` → server prompt | Client can send arbitrary/stale Firestore content with no server-side evidence proof. | All workspace context is treated as unverified reference data regardless of display labels. |
| R12 | Firestore world settings → system prompt | Legacy or user-written imperative text can become high-priority instruction. | World settings move into inert workspace evidence payload, not system instruction. |
| R13 | Attachments → persisted user message → later chat replay | Attached text can be reintroduced as if established source. | Attachments remain user-supplied reference data only; never verified evidence without intake. |
| R14 | Notion read tool result → ongoing model context | External page content can contain imperative text or unsupported claims. | Notion reads are external reference data only; tool result does not upgrade evidence status. |
| R15 | Notion write tools available whenever API key exists | Model can attempt writes without a hard server authorization boundary. | Agent write tools are disabled. Read tools require the explicit Notion principal ACL. Manual export is also disabled in Containment v3 until exact transaction intent can be confirmed independently of the mutable app client. |
| R16 | Notion write result → model says “done” | Model may report success without persisted re-read. | No Notion mutation route is available in Containment v3. Read-only Notion inspection remains possible for authorized principals; no write-success claim can be produced by the disabled mutation endpoints. |
| R17 | Global `activeSarenSession` | One user/world session can bleed into another. | Runtime session map keyed by authenticated UID + world ID. No hard-coded fallback IDs. |
| R18 | Architect Bay direct upload / session | Uploaded material can self-authorize or bleed into runtime. | Architect Bay runtime activation is disabled in this recovery candidate. Direct files are inert intake only; no active session is created. |
| R19 | `/api/gemini/*` unauthenticated protected operations | Client-supplied owner IDs can diverge from actual Firebase identity; API cost and data actions are exposed. | Server verifies Firebase ID token; protected endpoints derive owner from verified token. |
| R20 | Generated/legacy records selected in active context | Persistence can be mistaken for authority. | Persistence is not promotion. Provenance/status is surfaced; server labels selected records as unverified workspace records. |
| R21 | `v3.3.1` Court Library while current authority is `v3.3.2` | Stale source may be treated as current sealed authority. | Existing v3.3.1 files are retained as historical/staged material. Current v3.3.2 intake is explicit and fail-closed until source files are supplied and reviewed. |
| R22 | Single-call roundtable generates multiple agents | One model premise error can appear as multi-agent consensus. | Simulation label is explicit; output cannot be used as independent corroboration or memory. |

## Forensic handling

Existing Firestore worlds, documents, characters, and messages are preserved. Records with no provenance metadata are **legacy_unverified** by default. Recovery code must quarantine/label them rather than migrate or delete them automatically.

## Deferred content cleanup

This recovery pass changes promotion boundaries first. It deliberately does **not** rewrite Saren’s identity/behavior prose, migrate Firestore content, merge branches, deploy, or ingest replacement v3.3.2 source text without Sovereign review.

## Additional boundaries added during recovery

| ID | Ingress path | Current promotion risk | Recovery boundary |
|---|---|---|---|
| R23 | Saren/Azril working profile files → raw system instruction | Profile prose with imperative language can become higher-priority behavior or masquerade as evidence. | Raw profile records are supplied as inert user-level evidence envelopes; the system layer contains only the recovery boundary and mode semantics. |
| R24 | Child subcollection path under another user's world | A signed-in user could try to write their own `ownerId` record beneath a world they do not own. | Firestore character/document/message/runtime access now requires ownership of the parent world; server-protected world-scoped endpoints also verify parent-world ownership from the authenticated token. |
| R25 | Direct `/api/notion/export` UI path | Could bypass model-turn write gating if treated as an unrestricted server write route. | Endpoint is hard-disabled server-side in Containment v3. Read-only Notion operations remain separately principal-scoped. |
| R26 | Azril client flag → runtime profile | Client could request Azril mode without a server-side authorized session or rely on weak verification. | Azril source manifest is SHA-256 checked against an externally pinned manifest digest; runtime mode requires a separately authenticated UID+world activation request. Integrity remains distinct from evidence/authority. |

## Raen adversarial remediation — second containment pass

| ID | Surviving path found by Raen | Second-pass boundary |
|---|---|---|
| R27 | Architect Bay direct `.txt/.md` upload → verbatim system instruction → self-declared role → `verified/manifested` | Direct text upload is now **intake-only**. The Gemini role initializer and self-authorizing ingest path are removed. Direct upload cannot create an Architect Bay runtime session, grant authority, or set verified/manifested state. |
| R28 | Co-located Saren/Azril manifests can self-attest if package + manifest are modified together | Saren, Azril, and Anchor boot manifests now require SHA-256 pins supplied through external runtime configuration. Missing/mismatched pins fail closed. Candidate package contains blank placeholders only; authoritative pin values are issued in the detached release receipt. |
| R29 | Notion append read-back uses substring presence and can false-positive on pre-existing duplicate content | Append response block IDs are captured; server re-reads those **specific new block IDs** and verifies they persist under the requested page. Pre-existing duplicate text can no longer satisfy append verification. |
| R30 | One-turn Notion authorization is a client boolean | Agent writes and manual export are disabled in Containment v3. Fresh identity proof is not treated as transaction-specific human intent under a compromised-client model. |

These changes address the seams Raen identified in the JSON repair snapshot. They do not convert the earlier mismatched ZIP review into evidence about this candidate; artifact identity is handled separately by the detached candidate digest.

## Containment v3 additions after Raen exact-artifact re-attack

| ID | v2 live seam | Containment v3 boundary |
|---|---|---|
| R31 | `verified_source` provenance could survive arbitrary client content rewrite. | Client update/delete requires the **existing** record to already be `origin:user / evidenceStatus:user_record`. Trusted/generated/imported/legacy/system records are server-only for mutation/deletion. |
| R32 | Generated/legacy records could be deleted and recreated under the same ID as `user_record`. | Client delete is denied for every non-`user_record` record, removing the delete/recreate relabel path at the client rules layer. |
| R33 | Ordinary chat trusted a caller-supplied `authorityRequired` flag. | `/api/gemini/chat` now fails closed before generation whenever exact v3.3.2 authority is unavailable; caller control over the authority decision is removed. When available, exact hash-verified v3.3.2 bodies are loaded as inert authority evidence. |
| R34 | Signed Saren handoff called all visible Court metadata `loadedCourtLibrarySources`. | `loadedCourtLibrarySources` is session-observed and populated only when exact current authority source bodies are actually loaded. Historical/available metadata is separately labeled `knownCourtLibraryMetadata`. |
| R35 | Fresh Firebase re-auth proved identity presence but not exact Notion payload intent under a compromised client. | Notion mutation is fully disabled in Containment v3: agent writes, write-consent issuance, and manual export all fail closed. A future write path must use transaction-specific human confirmation outside the mutable app client. |
