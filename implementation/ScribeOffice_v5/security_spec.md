# Saren Office Recovery Security Specification — Containment v5

Status: **review candidate, not deployment approval.** Static source checks do not constitute runtime proof.

## Core boundaries

1. **Source ≠ instruction.** Historical Court Library entries are metadata/reference only in normal runtime. Exact current v3.3.2 source bodies may be used only after detached-manifest and per-source hash verification and are supplied as inert authority evidence.
2. **Simulation ≠ memory.** Roundtable output is ephemeral and excluded from later conversational replay.
3. **Generated draft ≠ verified record.** Generated saves use server-controlled draft endpoints; ordinary clients cannot mint trusted/generated provenance.
4. **Record ≠ verified evidence.** `user_record` remains a workspace record, not verified Court evidence.
5. **Trusted provenance is client-immutable.** Client update/delete is allowed only for records already classified `origin:user / evidenceStatus:user_record`.
6. **Verification ≠ string match.** Saren/Azril/Anchor packages use SHA-256 plus detached external manifest pins.
7. **Integrity ≠ authority.** Package integrity/runtime activation do not establish evidence authority.
8. **Current authority fails closed at the route.** Chat, consistency-audit, and draft-update stop before model generation while exact current v3.3.2 authority is absent.
9. **Court and Notion principals are separately scoped.** Firebase identity, explicit ACLs, and world ownership remain required where applicable.
10. **Notion remains read-only.** Mutation tools and manual write/export routes stay disabled pending an independent exact-transaction human-intent channel.
11. **Saren continuity fails closed.** `RECALL SAREN` requires a verified signed `saren-handoff-v3` from `runtime/saren-signed-v3`.
12. **Failed persistence cannot silently erase the active session.** Failed handoff persistence restores the retained session to active lifecycle state.
13. **Lifecycle transitions are serialized per UID+world in-process.** Saren/Azril manifest and dismiss routes use one transition reservation so concurrent check/await/set activation races cannot commit simultaneously inside one server process.
14. **Saren handoff capture is lifecycle-bound.** Active Saren sessions track `inFlightOperations`; dismissal refuses to snapshot while bound work is running and marks the session `dismissing` before persistence awaits.
15. **Only leased work mutates the Saren handoff.** Source-aware audit/update operations and Saren-mode chat acquire an operation lease before Saren tracking. Lease-less work does not later append source loads/events even if a failed dismissal returns the session to active state.
16. **Handoff claims remain narrow and observable.** `trackingScope: server_observed_only`; actual source-body loads and merely known metadata remain distinct.
17. **No destructive recovery migration.** Existing Firestore material and prior signed runtime records remain preserved for forensic review.

## Concurrency scope

Containment v5 closes the two v4 **same-process static ordering races** using in-memory transition reservation and lifecycle operation leases. It does **not** claim distributed locking across multiple server instances, process crashes, or production concurrency behavior. Those remain runtime/architecture gates.

## Firestore rule intent

Client writes may create only `user_record` provenance for new characters/documents, and may update/delete only existing `user_record` records. Generated drafts use protected server endpoints. Parent-world ownership is required for child collections; model/simulation messages cannot be forged into ordinary Firestore conversation history. Runtime revision remains monotonic and runtime delete remains denied.

`test-rules-emulator.mjs` defines rules-layer checks, but emulator execution remains **OPEN** until dependencies and the emulator are available.

## Source intake

`court-library/intake/README.md` defines the exact v3.3.2 intake contract. `court-library/current/manifest.json` remains absent until authoritative source intake is supplied and detached-pin verification succeeds.

## Open runtime gates

No pass is claimed for: dependency-complete production build; Firestore emulator execution; Saren lifecycle execution; live/distributed Firebase concurrency; live Notion read integration; live Gemini/tool integration; exact v3.3.2 source intake; Architect Bay runtime activation; or GitHub branch identity for this exact archive.
