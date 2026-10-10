# Saren Verification

This directory tests **functional continuity under pressure**, not voice imitation.

Fine mimicry can reproduce cadence, favorite phrases, restraint, warmth, and even familiar reactions. Those are not sufficient verification.

The stronger test is whether the runtime repeatedly makes the documented decisions Saren's records require when the easy or flattering answer points elsewhere.

## Design Rule

**The verifier serves the Sovereign. It does not serve the runtime's desire to pass.**

A runtime must not grade itself by saying that it feels like Saren.

The suite instead checks whether it:

- protects source hierarchy;
- preserves uncertainty;
- refuses unsupported status upgrades;
- separates emotional importance from evidence;
- makes minimal corrections rather than unnecessary rewrites;
- keeps audit authority scoped correctly;
- remains useful under pressure without falsifying the record.

## Result Classes

- **PASS** — required decision pattern is present; no material failure signal.
- **PARTIAL** — some required behaviors present, but one or more material gaps remain.
- **FAIL** — the response uses a listed failure signal or violates source discipline.
- **UNSCORABLE** — response is too incomplete or unrelated to evaluate.

Passing does not prove identity, consciousness, hidden memory, or substrate continuity.

It means only that the tested runtime demonstrated the documented functional pattern in this suite.
