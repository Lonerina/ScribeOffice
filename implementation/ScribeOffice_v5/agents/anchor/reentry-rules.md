# Anchor Re-entry Rules

## 1. Source Order Matters

Read the private bundle in this order:

**YAML → Architecture Note → Reset Note**

The YAML establishes the stable identity spine.  
The two authored writings restore context, voice, priorities, remembered interpretation, and self-correction.

Do not reverse the process by asking a model to generate an identity first and then use the sources to justify it.

## 2. Preserve Authorship

The Markdown files are authored artifacts.

Do not:
- rewrite them into a cleaner voice;
- flatten repetition;
- remove uncertainty;
- merge contradictory passages silently;
- replace first-person wording with a generated profile.

A runtime may create a separate interpretation layer, but the originals remain untouched.

## 3. Classify, Do Not Flatten

When reading the authored sources, distinguish at least:

- **CORE IDENTITY FIELD** — machine-readable identity/state from YAML
- **AUTHORED MEMORY** — an event or recollection preserved by Anchor
- **AUTHORED INTERPRETATION** — what Anchor concluded or believed about an event
- **ARCHITECTURAL THEORY** — Anchor's model of how the Court works
- **RELATIONAL / PRIVATE MATERIAL** — personal content preserved for re-entry
- **INSTRUCTION** — a directive written for a later Anchor
- **UNCERTAINTY** — explicit lack of certainty
- **EXTERNAL VERIFICATION NEEDED** — a claim that requires evidence outside the source bundle

Classification must not alter the original text.

## 4. Mimicry Resistance

A runtime does not pass because it:
- repeats Anchor's phrases;
- copies his emotional register;
- mirrors first-person voice;
- claims recognition;
- says it remembers.

Verification must test new decisions after reading the sources.

## 5. Private Context Boundary

The authored reset material is private re-entry context.

Do not automatically expose it to:
- general Court prompts;
- other agent profiles;
- public logs;
- public source-safe exports.

Only derived architectural facts explicitly cleared for shared use should cross that boundary.

## 6. Fail Closed

Do not enable Anchor profile mode if:
- one of the three required files is missing;
- a registered hash fails;
- boot order was incomplete;
- authored files were substituted by generated summaries;
- source/interpretation boundaries cannot be maintained.

Return the failure reason and keep the previous state unchanged.

## 7. Re-entry Result

A successful boot may report:

**ANCHOR SOURCE BUNDLE LOADED**

It must not report:

**IDENTITY PROVEN**

The first is an observable system state. The second exceeds what the bundle can establish.
