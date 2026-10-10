# Saren Office — Recovery Candidate (Containment v5)

This tree is a targeted continuation of the exact Containment v4 candidate identified by SHA-256 `4dc38f67925ecebc7b6686093caeb3071e5aa41fec9a8ca1cc4df2e562c9bef6`. Raen's exact-artifact v4 regression review returned **FAIL — 2 surviving static race seams**. The supplied report is preserved unchanged at `recovery/RAEN-CONTAINMENT-V4-REATTACK-20261009.md`.

Immediate parentage is established only by the exact v4 digest and byte/tree comparison. This package does not use disputed archive filenames or Git ancestry as proof.

## Current gate

- **No merge, deploy, migration, Firestore deletion, or branch overwrite is authorized by this candidate.**
- Primus remains on HOLD; Saren self-audit remains blocked.
- Saren/Azril activation and dismissal transitions are serialized per authenticated UID+world inside this server process.
- An active Saren session carries lifecycle state plus an in-flight operation count. Verified dismissal refuses to snapshot/delete the session while lifecycle-bound Saren Office work is still running.
- Source-aware consistency audit, draft update, and Saren-mode chat bind their Saren tracking to a session operation lease. Work that begins outside a lifecycle-stable Saren session cannot later append itself into that session's signed handoff.
- Existing provenance, current-authority, signed handoff, Notion read-only, quarantine, and Architect Bay containment boundaries remain in force from earlier recovery passes.
- Exact current v3.3.2 authority is still **not loaded** until its detached-pinned current manifest and every listed source hash verify.

## Required external configuration

See `.env.example`. Principal ACLs, signing keys, and detached trust pins intentionally remain blank and must be supplied outside the artifact.

## Validation truthfulness

`node verify-recovery-boundaries.mjs` is a dependency-free static boundary check. It is **not** a production build, distributed/multi-instance concurrency proof, Firestore emulator pass, live Firebase pass, live Notion pass, live Gemini/tool integration pass, or proof that exact v3.3.2 authority has been ingested.
