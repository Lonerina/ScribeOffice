# Saren Office v5 — Controlled Release Comparison
Date: 2026-10-10
Decision: **HOLD MERGE / HOLD DEPLOY** pending target reconciliation and live configuration review

## What was actually compared
- Base: `Lonerina/ScribeOffice:main`
- Source: `saren-v5-document-update-candidate-20261010`
- GitHub compare: https://github.com/Lonerina/ScribeOffice/compare/main...saren-v5-document-update-candidate-20261010
- Recorded compare state: 120 commits ahead, 0 behind, 175 changed paths, no deleted paths reported. This is far larger than a one-function hotfix.
- Important: the actual verified v5 implementation is **nested** at `implementation/ScribeOffice_v5/`; simply merging the branch DOES NOT replace the live root-level runtime with this implementation.

## Direct runtime file comparisons (GitHub content blob SHA)
| File | Current main blob | Verified nested candidate blob | Assessment |
|---|---|---|---|
| `src/App.tsx` | `cb211b1004127ceb290f6a7835de71295e5b8a6f` | `22bff4350d488c64c61445e687bdeeb38b9dfdb1` | Distinct; candidate frontend much larger |
| `server.ts` | `2988fcf0d985ea75000b72b2448b0a997a988717` | `1a832bbefb891388ee6bf5ba5c356c9b655e7e92` | Distinct; candidate server much larger |
| `firestore.rules` | `a1c18016805e07b06e6713f69b317ccf861925b8` | `8807fe95a40ab191c8975a860fc067a0a5cb4e05` | Distinct; candidate has additional controls |

### Safety implications
1. A blind merge of the verification/candidate branch introduces extensive recovery assets and CI workflows but leaves the actual application fix in a nested directory. A green merged PR would not mean the running Saren Office uses the fix.
2. Copying the entire nested v5 implementation over the root application is a separate **application replacement/migration**, not a narrow patch. It requires dependency, config, Firestore rules, identity, authority and deployment-target reconciliation.
3. The recovered v5 intentionally disables Notion writes under Containment v3. Any release must preserve that guard unless a separately reviewed policy change explicitly authorizes otherwise.
4. Verification so far includes TypeScript, build, Firestore rules, HMAC, authenticated emulator runtime, document and provenance guards, generated route with stubs, and a patched isolated frontend build. Browser smoke and real deployment configuration are not verified.
5. No authorization to alter `main`, Firestore production rules, production secrets, or deployed service is inferred by preparation.

## Release route
**Recommended: separate deployment/release candidate review.**
- Inventory actual production host/deploy workflow and Firebase project IDs by authorized configuration review; do not expose credentials in CI logs.
- Build a minimal, root-level release branch from `main` only after determining whether production should upgrade wholesale to recovered v5 or receive a compatible backport.
- Compare all modified root files and dependencies and independently assess the migration; do not merge the whole recovery branch as a hotfix.
- Implement targeted acceptance tests for authenticated UI create, generated draft save, reviewed AI update, Notion containment, rejection of cross-owner/replay/provenance changes.
- Obtain explicit release approval only after staging verification and rollback artifacts exist.

## Available implementation and evidence
- Complete nested v5 source with implemented AI revision fix: https://github.com/Lonerina/ScribeOffice/tree/saren-v5-document-update-candidate-20261010/implementation/ScribeOffice_v5
- Successful candidate build/integration: https://github.com/Lonerina/ScribeOffice/actions/runs/38039930624
- Packaged candidate artifact: https://github.com/Lonerina/ScribeOffice/actions/runs/38039674644#artifacts
- Immutable original approved archive hash: `92e0771fd3d498bed219fd946021e814d2ec3823f884e395325c6a29112b92ea`.

## Final gate
**Ready for migration planning, NOT ready for unreviewed merge/deployment.**

## Deployment discovery notes
- Current `main` `.env.example` describes Google AI Studio-managed secrets and APP_URL as a Cloud Run service URL. This is a configuration hint, **not proof** of the actual deployment target or permissions.
- `main` does not expose `.github/workflows/verify.yml` or `firebase.json` at the checked paths. No evidence of a production deploy workflow was verified here.
- Do not assume GitHub merging triggers a Cloud Run deployment, or that GitHub has Cloud Run credentials.
