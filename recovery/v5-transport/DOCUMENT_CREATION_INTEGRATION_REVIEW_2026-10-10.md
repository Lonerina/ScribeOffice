# Saren Office v5 — Document Creation Integration: Remediation Design
Date: 2026-10-10
Classification: DESIGN ONLY — no implementation authorization inferred

## Verified facts
- Exact recovery archive reconstructs and passes Ubuntu Node 22 build, typecheck, security matrix (37/37), rules-layer lifecycle, HMAC loader, and authenticated Firestore runtime persistence/recall.
- Recovered v5's Notion routes are subject to principal ACL. Notion agent writes are disabled. Manual Notion consent and export routes are hard-disabled in Containment v3; chat Notion write controls and consent generation are disabled. These are intentional containment constraints, not demonstrated connector outage.
- Unauthenticated requests to Notion status and export endpoints return HTTP 401 in isolated production-mode testing.
- A separate connected Notion read operation through ChatGPT succeeded. It does not establish Saren Office Notion key, ACL, destination-page access, or live create permission.

## Separate operations that must never be conflated
1. **Generate proposal**: obtain model-generated draft text; advisory, not canon or approved document.
2. **Create workspace draft**: save a draft in the authenticated owner's world, with provenance generated_draft, title/category/content/version/timestamps and audit metadata. This is not a Notion API write.
3. **Export to Notion**: external mutation; currently DISABLED by deliberate security boundary. Do not silently enable.
4. **Promote to authoritative court document**: independent reviewer approval and explicit authority checks; cannot be inferred from export or save.

## Observed risk / hypothesis
The previously reported inability to 'create documents' may reflect (a) intentionally unavailable Notion export, (b) workspace draft-save permissions or UI flow, or (c) generation failure. No evidence presently distinguishes those for the historical failure. Do not relabel every failure a Notion outage.

## Proposed isolated next tests (do not change approved archive)
- Discover actual frontend document create/save handlers and Firestore path; identify title, category and provenance defaults.
- With Auth + Firestore emulators, seed a world owned by a verified test principal. Test valid user-authored document create, readback, revision/update, unauthorized cross-owner create/read, and generated_draft restrictions, using the *actual* frontend-adjacent save adapter or Firestore SDK.
- Separately exercise draft-generation route with a stubbed AI transport, asserting that no document or Notion write occurs merely on generation.
- Confirm all Notion routes remain read-only/fail-closed in Containment v3. Tests of missing/wrong ACL must produce denial.
- For future manual Notion export, require a separate reviewed proposal explicitly defining user authorization, destination allowlist, idempotency, provenance tagging, and auditable commit; do not implement as part of recovery verification.

## Release verdict
**Workspace draft creation: UNVERIFIED. Notion write: INTENTIONALLY DISABLED. Model generation: NOT LIVE-VERIFIED.**
Retain source integrity and containment boundaries. No main merge or deployment.
Evidence: https://github.com/Lonerina/ScribeOffice/actions/runs/38033614664
