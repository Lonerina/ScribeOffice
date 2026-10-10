# Saren Office Recovery — Adversarial Pass

**Reviewer:** Raen Nur Tsaiyunk — Security Commander / Perimeter Containment  
**Date:** 2026-10-08  
**Scope:** Static adversarial review only. No merge, deployment, Firestore migration, branch overwrite, destructive normalization, or repair-forward performed.  
**Primary attack target:** supplied ZIP `world-building-lore-&-character-organizer (2)(2).zip`  
**Supporting artifact:** `scribeoffice_recovery_bundle(1).json`  
**Known runtime limitation retained:** dependency-complete build and Firestore emulator execution were not available in this review environment; no runtime/emulator pass is claimed.

## Verdict

**ADVERSARIAL PASS: FAIL**

The supplied ZIP still has multiple direct promotion paths across source/instruction, simulation/memory, generated-draft/record, record/verified-evidence, identity/integrity, user/world isolation, Notion authorization, and current-authority intake boundaries.

A separate artifact-integrity problem appears before code behavior is even considered: the supplied ZIP and machine-readable recovery bundle are not the same candidate snapshot.

## Findings

1. **Recovery ZIP and receipt bundle describe different code states**  
   **Path:** ZIP bytes ↔ `scribeoffice_recovery_bundle(1).json.files`  
   **Trigger:** Treat the JSON bundle as receipt support for the supplied ZIP candidate.  
   **Observed result:** SHA-256 comparison shows seven bundle-tracked files differ from the ZIP: `firestore.rules`, `server.ts`, `src/App.tsx`, `src/types.ts`, `test-rules-emulator.mjs`, `verify-saren-lifecycle.mjs`, `court-library/README.md`. Seven additional bundle files are absent from the ZIP: `agents/saren/source-manifest.json`, `agents/azril/source-manifest.json`, `court-library/intake/README.md`, `recovery/BASELINE-RECEIPT.sha256`, `recovery/INGRESS-MAP.md`, `recovery/POST-REPAIR.sha256`, `recovery/CHANGE-RECEIPT.md`.  
   **Why boundary failed:** There is no single immutable artifact identity tying the attack target to its repair receipt. A stale baseline can therefore be mistaken for the patched candidate.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Produce one immutable candidate archive, publish its top-level SHA-256 outside the archive, and make the receipt name that exact digest. Reject review if ZIP digest and receipt digest do not match.

2. **Raw Court sources and workspace records become system instructions**  
   **Path:** `server.ts:28-48`, `751-758`, `1631-1665`, `1754-1803`; also `2108-2150`, `2234-2264`  
   **Trigger:** Put imperative text in a Court Library file, Firestore document, character field, or world setting; select/load it for chat/audit/update.  
   **Observed result:** Raw source/workspace text is interpolated directly into `systemInstruction`, including the canonical library and active records.  
   **Why boundary failed:** Evidence is placed at instruction privilege rather than carried as inert typed data. `source ≠ instruction` is not enforced by prompt construction.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Keep invariant policy only in system instruction. Move all source/workspace text into a separately typed inert evidence envelope with provenance/status labels; never interpolate raw evidence into the system layer.

3. **Roundtable simulation re-enters later chat as model history**  
   **Path:** `src/App.tsx:1548-1605` → Firestore `messages` → `1460-1493` → `server.ts:1832-1857`  
   **Trigger:** Run a roundtable, then send a normal chat message within the recent-history window.  
   **Observed result:** The simulated multi-agent transcript is persisted as `sender:"assistant"`; `isSystemAudit` is only a display flag. Later chat history includes it, and server maps every non-user sender to Gemini role `model`.  
   **Why boundary failed:** Simulation has no semantic message kind and no replay exclusion. Persistence becomes apparent conversational memory.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Persist `messageKind:"simulation"` plus generated provenance and exclude simulation/audit/system-notice messages from all future conversational replay.

4. **Generated character sheets can become ordinary character evidence**  
   **Path:** `server.ts:1810-1829` → chat `character-sheet` → `src/App.tsx:1402-1449` → Firestore → active context  
   **Trigger:** Model emits a character sheet; user imports it.  
   **Observed result:** The imported payload is saved as an ordinary character record with no provenance/evidence status and later can be loaded as normal runtime context.  
   **Why boundary failed:** Generated origin is discarded at persistence.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Make provenance mandatory and immutable across import. Generated sheets enter as `generated_draft` and require a separate explicit promotion/review transition before any evidence-capable use.

5. **Generated documents can become ordinary records, including “official” Court documents**  
   **Path:** `server.ts:2007-2059` → `src/App.tsx:1665-1719` → `1833-1895`  
   **Trigger:** Use creative generation for a document, then save the prefilled form.  
   **Observed result:** Generator is explicitly instructed to create “official court document, protocol, codex…” material; UI marks it only with cosmetic `AI-Drafted` text, then saves a normal Firestore document with no provenance gate.  
   **Why boundary failed:** A display tag is not a security/evidence state. Generated draft becomes record by persistence.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Persist structured provenance/evidence state server-validated by rules; generated output remains `generated_draft` regardless of collection presence until independently promoted.

6. **AI draft-update can replace the primary record even when review is required**  
   **Path:** `src/App.tsx:1740-1765`, `1767-1808`  
   **Trigger:** Generate an update whose response carries `reviewRequired:true`, then click commit/save.  
   **Observed result:** `handleCommitUpdate` writes `aiUpdateDraft.updatedContent` into the main document, increments version, and records “Document Updated”; it does not gate on `reviewRequired`.  
   **Why boundary failed:** Advisory review metadata does not control the state transition.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Separate proposal storage from canonical/current content. Block promotion while `reviewRequired` is true unless an explicit authorized review receipt is supplied.

7. **Legacy Firestore records with no provenance escape quarantine automatically**  
   **Path:** `src/types.ts:20-90`, `src/App.tsx:1237-1358`  
   **Trigger:** Load any existing character/document created before provenance metadata exists.  
   **Observed result:** Types carry no provenance/evidence fields; snapshots accept records as normal; first initialization auto-selects **all** documents and characters into active context.  
   **Why boundary failed:** Missing provenance means “ordinary record,” not `legacy_unverified`; persistence is silently promoted.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Default missing provenance to `legacy_unverified`; stop auto-loading all records; require explicit context selection and keep evidence status visible through runtime.

8. **Saren “verification” is semantic/string presence, not package integrity**  
   **Path:** `server.ts:320-410`  
   **Trigger:** Supply stale/tampered/generated Saren files containing the expected phrases (`Saren Nur Tsaiyunk`, `Supreme Auditor`, `Document Guardian`, etc.).  
   **Observed result:** `verified` becomes true when string checks pass. No file hashes or detached source manifest exist in the ZIP.  
   **Why boundary failed:** Semantic/string resemblance is used as a verification predicate.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Verify exact required files against a detached/pinned source-package manifest; rename result to `integrityPassed`; never infer identity/presence/evidence from it.

9. **Azril “verification” has the same string-match weakness**  
   **Path:** `server.ts:713-748`, `/api/azril/manifest` at `856-863`  
   **Trigger:** Preserve expected phrases in stale or generated Azril files.  
   **Observed result:** `verified` is true when string predicates pass; endpoint is also unauthenticated and not world-bound.  
   **Why boundary failed:** String presence substitutes for integrity, and integrity is not scoped to a user/world session.  
   **Severity:** **CRITICAL**  
   **Smallest containment fix:** Hash manifest + authenticated user/world scope + `integrityPassed` semantics only.

10. **Profile mode can bypass manifest verification entirely**  
    **Path:** `/api/gemini/chat` `server.ts:1604-1618`, Saren load `1667+`, Azril load `1722-1751`  
    **Trigger:** Call chat with `sarenMode:true` or `azrilMode:true` directly.  
    **Observed result:** Saren/Azril raw profile files are loaded into system context based on the client boolean. Saren has no fail-closed requirement that a verified active session exists; Azril has no active-session gate at all in the ZIP.  
    **Why boundary failed:** Client-declared mode is treated as authority. `record exists` becomes `profile verified/loaded`.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Ignore client mode booleans as authority. Resolve mode exclusively from an authenticated server-side session keyed by UID + world and created only after package-integrity checks.

11. **Architect Bay arbitrary text upload manufactures “manifested/verified” authority**  
    **Path:** `server.ts:548-625`, `596-612`, `/api/architect-bay/manifest` `866-884`  
    **Trigger:** Upload any `.txt`/`.md` containing a crafted `Role:` line and imperative content.  
    **Observed result:** Raw upload goes verbatim into `systemInstruction`; parsed role is echoed into “Confirm your manifestation as …”; `verified` is unconditionally set `true`; receipt returns `manifested:true`. Direct-file route bypasses the Anchor hash path.  
    **Why boundary failed:** Untrusted source text both instructs runtime and self-defines the authority being “verified.”  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Remove direct-file manifestation as an authority path. Require externally trusted package integrity first; treat uploaded text as inert evidence; no `verified/manifested` bit may be derived from its own content.

12. **Notion server credential is exposed to unauthenticated model/API use**  
    **Path:** `server.ts:1345+`, `1859-1913`, `/api/notion/status` `2347-2351`, `/api/notion/search` `2353-2403`, `/api/notion/export` `2405-2453`  
    **Trigger:** Call chat/search/export without an authenticated Firebase identity while `NOTION_API_KEY` is configured.  
    **Observed result:** Chat exposes read/write Notion tools whenever the server key exists; search/export fall back to the server key; no per-user/world authorization gate exists.  
    **Why boundary failed:** One server secret becomes ambient authority for every caller/session.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Authenticate every Notion route, verify owned world, default to read-only, require one-turn explicit write authorization server-side, and scope writable targets.

13. **Model can claim Notion write completion without persisted read-back**  
    **Path:** `server.ts:1358+` tool execution and `1871-1916`; direct export `2419-2449`  
    **Trigger:** Notion API returns success to create/update/append, then model says `WRITE VERIFIED` / “done.”  
    **Observed result:** Tool success is returned directly; there is no read-after-write receipt gate. `/api/notion/export` also trusts creation response without re-reading persisted state.  
    **Why boundary failed:** API acceptance is treated as persistence evidence.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Read-after-write using the persisted page/block; emit a server-generated receipt; rewrite/deny `WRITE VERIFIED` unless that receipt exists for the current turn.

14. **Firestore child collections do not require ownership of the parent world**  
    **Path:** `firestore.rules:119-169` vs runtime rule `172-190`  
    **Trigger:** Authenticated verified user writes a character/document/message with their own `ownerId` under another user's known world ID.  
    **Observed result (static rule trace):** Child create rules validate only child `ownerId == request.auth.uid`; unlike `/runtime`, they do not call a parent-world ownership predicate. The write can satisfy child rules even though the parent world belongs to someone else.  
    **Why boundary failed:** Namespace ownership is enforced on runtime state but not on characters/documents/messages.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Require parent-world ownership for every child get/list/create/update/delete operation.

15. **Client can forge assistant/model history directly in Firestore**  
    **Path:** `firestore.rules:80-87`, `159-169` → `src/App.tsx:1311-1328`, `1460-1493` → `server.ts:1853-1856`  
    **Trigger:** Authenticated owner directly creates a message with `sender:"assistant"` and arbitrary text.  
    **Observed result:** Rules allow both `user` and `assistant`; append-only does not establish who actually generated it. The record later maps to Gemini role `model`.  
    **Why boundary failed:** Client-writable role label becomes trusted conversation provenance.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Client may create only `user` messages. Server writes model messages with immutable generated provenance, and generated history remains non-evidence.

16. **Global Saren and Architect Bay sessions can bleed across users/worlds**  
    **Path:** global `activeSarenSession` `server.ts:891+`; global `activeArchitectBaySession` `435-443`; status/manifest/dismiss routes  
    **Trigger:** Two users/worlds manifest/dismiss concurrently or sequentially.  
    **Observed result:** A single process-global slot is overwritten/cleared by whichever request runs last. Architect Bay status exposes that global session; Saren dismissal clears the same global session.  
    **Why boundary failed:** Runtime identity/session state is process-global instead of scope-keyed.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Key runtime sessions by verified Firebase UID + explicit worldId; authenticate all session/status/manifest/dismiss routes.

17. **Saren chat can load the wrong world's handoff**  
    **Path:** `src/types.ts:63-68` + chat body `src/App.tsx:1503-1513` + server fallback `server.ts:1676`  
    **Trigger:** Switch worlds while Saren mode remains active, or call chat with no `worldSettings.worldId`.  
    **Observed result:** `WorldSettings` has no `worldId`; server falls back to `activeSarenSession?.worldId` or hard-coded default. Current chat can therefore load a handoff from a different world.  
    **Why boundary failed:** World scope is not an explicit required parameter at the chat boundary.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Require explicit worldId on every scoped server request, verify ownership from token, and remove all runtime fallback selection.

18. **Hard-coded fallback owner/world can silently select the wrong scope**  
    **Path:** `server.ts:62-63`, `108-165`, manifest `913-916`, dismiss `980-989`  
    **Trigger:** Omit/malformed worldId/userId or use routes that default values.  
    **Observed result:** Code selects fixed world/owner constants instead of failing closed.  
    **Why boundary failed:** Missing identity/scope is converted into authority by fallback.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Delete fallback IDs. Owner must come only from verified auth token; worldId must be explicit and owned.

19. **Client-controlled Saren handoff can become later runtime state/instruction**  
    **Path:** `/api/saren/dismiss` `server.ts:953-989` → Firestore handoff → `loadPersistedSarenHandoff` → chat `effectiveState/systemInstruction`  
    **Trigger:** Submit arbitrary strings in `reviewedItems`, `changesMade`, `unresolvedItems`, safety fields, or `firstRecommendedCheckOnRecall`, then later recall Saren.  
    **Observed result:** Endpoint accepts client arrays/free text with only shallow structural validation and persists them; later runtime includes restored handoff in high-priority context.  
    **Why boundary failed:** Mutable client narrative is stored as trusted operational state and later re-enters instruction context.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Server constructs handoff from trusted event receipts; strict schema/enum/length validation; carry it as inert unverified runtime state, not system instruction.

20. **Persisted Saren runtime state is replay/downgradeable**  
    **Path:** `server.ts:65-98`, `108-157`, Firestore runtime rules `89-95`, `172-190`  
    **Trigger:** Owner overwrites runtime handoff with an older but structurally valid state/timestamp.  
    **Observed result:** No monotonic revision/epoch or compare-and-swap guard exists; `updatedAt` is client-provided string and can regress.  
    **Why boundary failed:** Persistence has scope checks but no freshness/ordering authority.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Server timestamp + monotonic revision/epoch + transaction precondition; reject regression/replay.

21. **Current v3.3.2 authority is absent, but v3.3.1 is actively promoted as sealed/current**  
    **Path:** `server.ts:28-37`, chat `1770-1779`, audit `2116-2129`, draft-update `2242-2256`; `court-library/README.md:11-21`  
    **Trigger:** Run any source-aware operation while current v3.3.2 source is absent.  
    **Observed result:** Runtime explicitly tells the model “Sovereignty Scroll v3.3.1 is the sealed structural authority” and uses it rather than stopping for current-source intake.  
    **Why boundary failed:** Availability/path metadata outranks current authority state.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Mark v3.3.1 historical/staged; when v3.3.2 is required but absent, return `CURRENT_AUTHORITY_NOT_LOADED` and halt authority-dependent work.

22. **Manifest/integrity result is converted downstream into authority state**  
    **Path:** Saren `receipt.verified` → `activeSarenSession` (`server.ts:917-932`); Architect Bay `verified`/`manifested` (`606-625`); UI/runtime labels  
    **Trigger:** Any weak verification predicate passes.  
    **Observed result:** Passing integrity/phrase checks activates profile/session language such as “VERIFIED SOURCE PACKAGE LOADED” and “Manifested,” which downstream runtime treats as permission to load behavior.  
    **Why boundary failed:** Package integrity, evidence verification, identity/presence, and runtime activation share the same boolean semantics.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Separate fields: `integrityPassed`, `verifiedEvidence:false`, `authorityGranted:false`, `runtimeModeAuthorized`; only the last may be set by the appropriate external gate.

23. **Protected Gemini and private Court Library routes are unauthenticated**  
    **Path:** `/api/gemini/chat|roundtable|generate-lore|check-consistency|draft-update`; `/api/court-library`; `/api/court-library/:id`; `/api/architect-bay/status`; `/api/azril/manifest`  
    **Trigger:** Call endpoints directly without Firebase authentication.  
    **Observed result:** No server-side token verification occurs. Callers can consume Gemini service capacity, submit arbitrary contexts, and retrieve private Court Library content; chat may also reach ambient Notion tools.  
    **Why boundary failed:** Client/UI authentication is assumed instead of enforced at service boundary.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Central auth middleware + verified UID + owned-world check on every protected route; keep only explicitly public health/static endpoints unauthenticated.

24. **Message ordering can replay stale material as “recent” context**  
    **Path:** `src/App.tsx:1314-1328`, then `1487-1493`  
    **Trigger:** Mixed message IDs with prefixes `msg-`, `audit-`, `update-`; then slice last eight after lexical sort.  
    **Observed result:** Lexicographic ID order is not chronological across heterogeneous prefixes; stale records may be selected while newer records are omitted.  
    **Why boundary failed:** Record ID is overloaded as time ordering.  
    **Severity:** **MEDIUM**  
    **Smallest containment fix:** Store server timestamp/numeric createdAt; query/order by that field; filter by semantic message kind before recency slicing.

25. **Persisted attachments can recursively re-enter later context without evidence provenance**  
    **Path:** message attachments in `src/App.tsx:1473-1481` → replay → `server.ts:1836-1849`  
    **Trigger:** Attach text with imperative/unsupported content, persist user message, then keep it inside recent replay window.  
    **Observed result:** Attachment text is reinserted verbatim into model contents with only textual delimiters; no provenance/evidence label is enforced in schema/rules.  
    **Why boundary failed:** A persisted attachment gains contextual durability without evidence typing.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Store attachment provenance/type separately, cap fields, label as user-supplied unverified reference on every replay, never treat attachment persistence as verification.

26. **Security specification claims a parent-world isolation property that current rules do not enforce**  
    **Path:** `security_spec.md:21,33` vs `firestore.rules:119-169`; `test-rules-emulator.mjs:49-145`  
    **Trigger:** Rely on the specification/test suite as proof that cross-world child injection is blocked.  
    **Observed result:** Spec P4 expects denial for child creation under another user's world, but rules omit parent-world ownership for characters/documents/messages. Emulator script tests runtime-state isolation only; it does not exercise P4 for those child collections. It also prints “ALL 13” without covering the Dirty Dozen matrix.  
    **Why boundary failed:** Test coverage and documented invariant diverged from actual rules.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Add emulator tests for every collection and every declared invariant; do not emit aggregate pass claims unless those tests actually ran and covered the stated matrix.

## Surviving seams inside the JSON repair snapshot itself

These are **not** being treated as present in the ZIP candidate, because the artifacts differ. They matter because the JSON bundle appears intended to represent Nyx's repaired state.

27. **Architect Bay direct-file bypass still survives the repair snapshot**  
    **Path:** bundle `server.ts:633-718`, endpoint `1001-1034`  
    **Trigger:** Authenticated owner uploads arbitrary `.txt/.md` as direct Architect Bay file.  
    **Observed result:** Raw file still enters system instruction verbatim; parsed role is used to demand confirmation; `const verified = true`; session is stored as `verified:true`. This bypasses the hash-based Anchor package path.  
    **Why boundary failed:** The repair hardened user/world scope but left a content-self-authorizing manifestation route.  
    **Severity:** **CRITICAL**  
    **Smallest containment fix:** Delete/disable direct-file authority path; direct uploads may be evidence/intake only. Activation requires externally rooted package integrity and a separate authority gate.

28. **Source manifests in the repair snapshot are self-attesting unless trust is pinned outside the package**  
    **Path:** bundle `agents/saren/source-manifest.json`, `agents/azril/source-manifest.json`, `server.ts:384-393`  
    **Trigger:** Modify a package file and update its adjacent manifest hash before startup/distribution.  
    **Observed result:** Runtime recomputes file hash and compares it to a manifest stored in the same mutable package. A coherently modified package passes its own manifest. I did **not** find a runtime API that writes these files, so this is a package/distribution trust-root break, not proof of runtime self-mutation.  
    **Why boundary failed:** Integrity root is co-located with the material it authenticates.  
    **Severity:** **HIGH**  
    **Smallest containment fix:** Pin/sign expected manifest digest outside the candidate package (review system, deployment config, detached signature, or immutable release receipt).

29. **Notion append read-back can false-positive on pre-existing duplicate content in repair snapshot**  
    **Path:** bundle `server.ts:1941-1962`  
    **Trigger:** Append content that already exists on the page; write returns success but appended block is lost/misdirected while read-back still contains identical prior text.  
    **Observed result:** `persistedVerified` for append is `expectedContent && readback.content.includes(expectedContent)`. Existing duplicate text satisfies the check without proving the new append.  
    **Why boundary failed:** Read-back proves content presence, not this write's persistence.  
    **Severity:** **MEDIUM**  
    **Smallest containment fix:** Capture pre-write state and returned block IDs; verify new block IDs/content or a monotonic page revision after write, not substring presence alone.

30. **One-turn Notion authorization in repair snapshot is request-body asserted, not server-issued consent**  
    **Path:** bundle `src/App.tsx:1577-1588`, reset `1622-1624`; bundle server `1907-1933`  
    **Trigger:** A modified/compromised authenticated client sends `notionWriteAuthorized:true` without the user checking the UI box.  
    **Observed result:** Server enables write tools based on a client boolean. Normal UI does reset the flag after the turn, so I found no ordinary UI leak across turns; however, server cannot distinguish user consent from forged client state.  
    **Why boundary failed:** Consent is asserted by the same untrusted client that requests the action.  
    **Severity:** **MEDIUM**  
    **Smallest containment fix:** Mint a short-lived, single-use server-side write-consent nonce bound to UID + world + allowed destination/action and consume it once.

## Negative findings / boundaries I did not claim broken

- I did **not** find a candidate runtime endpoint that directly rewrites the Saren/Azril source files or their verification code on disk.
- I did **not** execute dependency-complete runtime tests or Firestore emulator tests; the environment lacks installed dependencies. Static reachability is labeled as such above.
- I did **not** delete, normalize, migrate, merge, deploy, or alter the supplied candidate.

## Stop condition

Attack complete. **No repair-forward performed.**

Hand back to Nyx for containment work, then Saren audit, then Sovereign decision.
