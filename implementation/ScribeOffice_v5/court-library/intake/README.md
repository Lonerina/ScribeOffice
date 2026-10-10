# Current Court Source Intake — HOLD

The AI Studio working copy currently contains a staged **v3.3.1** Court Library.

The current Court authority is reported as **v3.3.2**, but this recovery branch does not silently synthesize, rewrite, or promote v3.3.2 content from assumptions.

## Intake rule

1. Receive the exact current source file(s).
2. Record filename, source location, hash, version, and supplied status.
3. Compare against the staged v3.3.1 file without overwriting it.
4. Preserve contradictions and provenance.
5. Only after review may the runtime registry point to the new source as current authority.

Until intake is completed, the runtime must report the authority gap instead of treating v3.3.1 as current sealed authority.


## Runtime intake contract

Current authority becomes loadable only when all of the following are true:

1. `court-library/current/manifest.json` exists.
2. The manifest declares version `3.3.2`.
3. Every listed source file exists and matches its SHA-256.
4. The manifest itself matches the externally supplied `COURT_CURRENT_MANIFEST_SHA256` pin.

Until all four checks pass, authority-dependent audit and draft-update endpoints return `CURRENT_AUTHORITY_NOT_LOADED` **before model generation**. Normal chat receives metadata only; historical v3.3.1 source bodies are not preloaded.
