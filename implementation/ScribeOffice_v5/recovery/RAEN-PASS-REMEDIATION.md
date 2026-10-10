# Saren Office Recovery — Raen Pass Remediation

**Date:** 2026-10-08  
**Stage:** Second containment pass after Raen adversarial review  
**Mutation policy:** No merge, deploy, Firestore migration/deletion, branch overwrite, or v3.3.2 source synthesis.

## Accepted surviving seams

Raen's findings 27–30 against the JSON repair snapshot are accepted for containment:

1. Architect Bay direct-file self-authorization path.
2. Co-located/self-attesting Saren/Azril source manifests.
3. Notion append read-back false-positive on pre-existing duplicate content.
4. Client-asserted one-turn Notion write authorization.

## Changes

### Architect Bay

- Removed the direct-file Gemini role initializer and self-authorizing ingest path.
- `.txt` uploads are inert intake only.
- Embedded `Role:` text is labeled an unverified claim.
- Direct upload cannot create an active Architect Bay runtime session.
- Package integrity is explicitly separate from authority/runtime authorization.
- Anchor boot manifest now also requires an external detached SHA-256 pin.

### Manifest trust root

- Saren source manifest requires `SAREN_SOURCE_MANIFEST_SHA256` from runtime configuration.
- Azril source manifest requires `AZRIL_SOURCE_MANIFEST_SHA256`.
- Anchor boot manifest requires `ANCHOR_BOOT_MANIFEST_SHA256`.
- Package-local `.env.example` contains blank placeholders only; it is not a trust root.
- Exact pin values are emitted in the detached release receipt outside the candidate archive.

### Notion append verification

- Append tool returns the IDs of newly created blocks.
- Server re-reads those exact block IDs after the write.
- Each re-read block must still exist, be unarchived, and belong to the requested page.
- Verification no longer succeeds merely because identical text already existed somewhere on the page.

### Notion write consent

- Removed `notionWriteAuthorized` boolean and `confirmWrite` export boolean.
- Added server-issued random consent capability.
- Capability is bound to verified Firebase UID, owned world ID, exact message digest, allowed actions, and a two-minute expiry.
- Capability is deleted on first consumption, including invalid-scope/message attempts.
- Chat and direct export both require the capability for writes.

## Validation boundary

`verify-recovery-boundaries.mjs` uses Node built-ins only and statically asserts these four containment changes. Full dependency build and Firebase/Notion integration tests remain open until dependencies/emulators/credentials are available.

## Next gate

Raen re-attacks the exact immutable candidate identified by its detached ZIP SHA-256. Saren self-audit remains blocked until Raen passes that candidate.

## Independent re-audit against all 30 findings

After the four JSON-snapshot seams were patched, Nyx re-ran the full Raen finding set against this candidate rather than assuming findings 1–26 belonged only to the older ZIP. Additional surviving routes were found and contained in source:

- Firestore clients can no longer create `assistant` messages; only user-authored conversation messages are accepted. Generated model/simulation/audit/system output is session-ephemeral.
- Saren handoff persistence moved to `runtime/saren-signed-v1` with external-key HMAC validation, monotonically increasing revisions, and delete denial. Legacy unsigned runtime records remain preserved but are not loaded.
- `/api/saren/dismiss` now ignores client narrative fields and constructs the handoff from server-observed session/state only.
- Saren/Azril receipts separate package integrity from evidence/authority/runtime activation semantics.
- `reviewRequired=true` generated document updates cannot be committed into the working record.
- Message ordering uses `createdAt` before ID fallback.
- Firestore emulator test definitions now include cross-world child insertion, forged assistant/simulation messages, monotonic runtime revision, replay/skip denial, and runtime delete denial.
- Generated lore/profile instructions explicitly produce drafts and may not call generated material official/canonical/verified.
- Direct Notion export now verifies persisted title and content blocks on the newly created page.

`recovery/RAEN-FINDINGS-CLOSURE.md` records the disposition of all 30 findings and keeps runtime/emulator/live-service testing explicitly open.
