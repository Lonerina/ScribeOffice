#!/usr/bin/env python3
"""Non-destructive v5 candidate patch. Run only on a reconstructed working copy."""
from pathlib import Path

path=Path("src/App.tsx")
source=path.read_text()
start=source.index("  const handleCommitUpdate = async () => {")
end=source.index("  const handleSaveWorldSettings =",start)
part=source[start:end]
assert part.count("await setDoc(docRef, {")==1
assert 'origin: "generated"' in part
assert "const docToUpdate = documents.find((d) => d.id === selectedDocId);" in part

part=part.replace(
  "    if (!docToUpdate) return;",
  """    if (!docToUpdate) return;
    // A generated record must never be client-promoted into a user record.
    // Its owner may review a separate proposal; this update path is user-record-only.
    if (docToUpdate.provenance?.origin !== "user" || docToUpdate.provenance?.evidenceStatus !== "user_record") {
      alert("AI-assisted updates to generated records require a separate reviewed server workflow.");
      return;
    }""",1)
part=part.replace(
  "      updateNote: aiUpdateDraft.updateNote,",
  '      updateNote: `AI-assisted; explicitly reviewed and approved by user. ${aiUpdateDraft.updateNote}`,',1)
a=part.index("      await setDoc(docRef, {")
b=part.index("\n\n      setIsUpdatingDocMode(false);",a)
part=part[:a]+"""      // Update only fields permitted by immutable-provenance Firestore rules.
      // Version history records AI assistance and explicit reviewer approval.
      // Original owner, creation time, and provenance remain unchanged.
      await updateDoc(docRef, {
        content: aiUpdateDraft.updatedContent,
        version: nextVersion,
        versionHistory: [newVersionLog, ...(docToUpdate.versionHistory || [])],
        updatedAt: new Date().toISOString()
      });"""+part[b:]
part=part.replace(
  'text: `📝 **Working Record Updated**: Version ${nextVersion} of "**${docToUpdate.title}**" was explicitly promoted from the reviewed draft. \\n\\n*Changelog:* "${aiUpdateDraft.updateNote}"`,',
  'text: `📝 **Reviewed AI-Assisted Revision Saved**: Version ${nextVersion} of "**${docToUpdate.title}**" was approved by the user. Original provenance is unchanged; this is not new verified evidence. \\n\\n*Changelog:* "${newVersionLog.updateNote}"`,',
  1)
assert "await setDoc(docRef, {" not in part
assert "await updateDoc(docRef, {" in part
assert 'origin: "generated"' not in part
assert "explicitly reviewed and approved by user" in part
updated=source[:start]+part+source[end:]
path.write_text(updated)
print("Candidate patched handleCommitUpdate; source approval ZIP remains untouched.")
