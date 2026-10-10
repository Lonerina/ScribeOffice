#!/usr/bin/env python3
"""Offline AI Studio import readiness check. Never prints Firebase IDs or keys."""
from pathlib import Path
import json, sys
base=Path(sys.argv[1] if len(sys.argv)>1 else "implementation/ScribeOffice_v5")
required=["package.json","server.ts","src/App.tsx","src/firebase.ts","firebase-applet-config.json",".env.example","firestore.rules","verify-recovery-boundaries.mjs"]
missing=[p for p in required if not (base/p).is_file()]
if missing:
    print("FAIL missing application files:",", ".join(missing));sys.exit(1)
config=json.loads((base/"firebase-applet-config.json").read_text())
needed={"projectId","apiKey","appId","authDomain","firestoreDatabaseId"}
if needed-set(config):
    print("FAIL missing Firebase configuration fields:",sorted(needed-set(config)));sys.exit(1)
vars=["GEMINI_API_KEY","SAREN_SOURCE_MANIFEST_SHA256","AZRIL_SOURCE_MANIFEST_SHA256","ANCHOR_BOOT_MANIFEST_SHA256","SAREN_RUNTIME_SIGNING_KEY","COURT_AUTHORIZED_UIDS","NOTION_AUTHORIZED_UIDS","COURT_CURRENT_MANIFEST_SHA256"]
sample=(base/".env.example").read_text()
not_documented=[x for x in vars if x not in sample]
if not_documented:
    print("FAIL undocumented environment requirements:",not_documented);sys.exit(1)
package=json.loads((base/"package.json").read_text())
if "firebase-admin" not in package["dependencies"]:
    print("FAIL server Firebase Admin SDK absent");sys.exit(1)
app=(base/"src/App.tsx").read_text()
segment=app.split("const handleCommitUpdate = async () => {",1)[1].split("const handleSaveWorldSettings =",1)[0]
if 'await updateDoc(docRef' not in segment or 'await setDoc(docRef' in segment or 'origin: "generated"' in segment:
    print("FAIL reviewed update path is not provenance-preserving");sys.exit(1)
print("PASS application files, Firebase configuration shape, dependencies and safe document update")
print("EXTERNAL GATES NOT CHECKED: actual AI Studio import, current authority manifest, detached pins, signing key, UID ACL, Firebase project permissions, deployed routes, production rule migration")
