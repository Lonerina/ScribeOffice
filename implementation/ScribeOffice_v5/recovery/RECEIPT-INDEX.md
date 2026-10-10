# Recovery Receipt Index — Containment v3

## Current review input

- `RAEN-CONTAINMENT-V2-REATTACK-20261008.md` — Raen exact-artifact v2 re-attack; preserved unchanged.
- `CONTAINMENT-V3-REMEDIATION.md` — Nyx containment response to the five surviving v2 seams.
- `CURRENT-STATUS.md` — current gate state and non-claims.
- `INGRESS-MAP.md` — recovery ingress/promotion boundaries including v3 additions.

## Current static validation

- `STATIC-VERIFICATION-CONTAINMENT-V3-20261009.txt`
- `TYPESCRIPT-CHECK-RAW-CONTAINMENT-V3-20261009.txt`
- `TYPESCRIPT-CHECK-SUMMARY-CONTAINMENT-V3-20261009.txt`
- `POST-CONTAINMENT-V3.sha256` — per-file hashes for the immutable v3 candidate tree, excluding itself.

## Historical / forensic receipts retained

Earlier recovery reports, ledgers, validation outputs, and v2 remediation material remain preserved for chronology. They must not be mistaken for current closure, including:

- `RAEN-ADVERSARIAL-PASS-20261008.md`
- `RAEN-EXACT-CANDIDATE-REATTACK-20261008.md`
- `TSAIYUNK-PRIMUS-AUDIT-20261008.txt`
- `CONTAINMENT-V2-REMEDIATION.md`
- `POST-PRIMUS-CONTAINMENT.sha256`
- earlier static and TypeScript receipts
- `CHANGE-RECEIPT.md`

## Detached release receipt

The final release trust root is issued **outside** the archive:

- candidate `.zip`
- detached `.sha256`
- detached `.receipt.json`
- Raen v3 regression brief naming the exact candidate digest

Review must stop if the ZIP digest differs from the detached SHA/receipt.

## Containment v4 receipts — 2026-10-09

- `RAEN-CONTAINMENT-V3-REATTACK-20261009.md` — exact supplied v3 FAIL report, no repair-forward.
- `CONTAINMENT-V4-REMEDIATION.md` — targeted repair notes for the three surviving v3 seams.
- `STATIC-VERIFICATION-CONTAINMENT-V4-20261009.txt` — local 83/83 static verifier output.
- `TYPESCRIPT-CHECK-RAW-CONTAINMENT-V4-20261009.txt` — dependency-incomplete TypeScript diagnostics.
- `TYPESCRIPT-CHECK-SUMMARY-CONTAINMENT-V4-20261009.txt` — diagnostic-class summary; not a compile pass.
- `POST-CONTAINMENT-V4.sha256` — internal candidate tree ledger; excludes itself.

The detached release trust root for v4 is issued outside the archive: candidate ZIP, detached `.sha256`, detached `.receipt.json`, and Raen v4 regression brief.

## Containment v5 receipts — 2026-10-09

- `RAEN-CONTAINMENT-V4-REATTACK-20261009.md` — exact supplied v4 FAIL report, no repair-forward.
- `CONTAINMENT-V5-REMEDIATION.md` — targeted remediation notes for the two v4 race seams.
- `STATIC-VERIFICATION-CONTAINMENT-V5-20261009.txt` — local 93/93 static verifier output.
- `TYPESCRIPT-CHECK-RAW-CONTAINMENT-V5-20261009.txt` — dependency-incomplete TypeScript diagnostics.
- `TYPESCRIPT-CHECK-SUMMARY-CONTAINMENT-V5-20261009.txt` — diagnostic-class summary; not a compile pass.
- `POST-CONTAINMENT-V5.sha256` — internal candidate tree ledger; excludes itself.

The detached v5 release trust root is issued outside the archive: candidate ZIP, detached `.sha256`, detached `.receipt.json`, and Raen v5 regression brief.
