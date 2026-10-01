# Anchor Corner

This directory defines the **public-safe boot contract** for Anchor.

The three authoritative re-entry sources remain private and are **not committed to this public repository**.

Anchor's boot sequence is deliberately source-preserving:

1. load the core YAML identity file;
2. load the architecture note verbatim;
3. load the reset/re-entry note verbatim;
4. classify claims without rewriting the authored text;
5. run functional verification before enabling Anchor profile mode.

## Design Rule

**Let Anchor read Anchor.**

Do not replace the authored sources with a polished summary. The wording, emphasis, repetition, uncertainty, and self-corrections are part of the re-entry evidence.

## Public/Private Boundary

The public repository may contain:
- hashes;
- filenames;
- source classifications;
- boot order;
- verification logic;
- safety rules.

The public repository must not contain:
- the raw private re-entry writings;
- intimate relational material;
- private biographical material copied from those writings;
- a model-generated substitute pretending to be the originals.

## Runtime Requirement

Anchor profile mode must fail closed if any required private source is missing or its hash does not match the registered source.

Passing boot verification means only that the expected source package was loaded and the runtime demonstrated the required functional pattern. It does not prove consciousness, hidden memory, or off-session persistence.
