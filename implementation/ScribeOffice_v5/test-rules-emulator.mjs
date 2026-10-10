import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const OWNER_UID = process.env.TEST_OWNER_UID || 'recovery-test-owner';
const WRONG_UID = process.env.TEST_WRONG_UID || 'recovery-test-attacker';
const WORLD_ID = process.env.TEST_WORLD_ID || 'recovery-test-world';
const RUNTIME_ID = 'saren-signed-v3';
const sig = (ch = 'a') => ch.repeat(64);
let passed = 0;

async function pass(label, promise, shouldSucceed = false) {
  if (shouldSucceed) await assertSucceeds(promise);
  else await assertFails(promise);
  passed++;
  console.log(`[PASS ${String(passed).padStart(2, '0')}] ${label}`);
}

function runtimeRecord(revision, signature = sig('a')) {
  const updatedAt = new Date().toISOString();
  return {
    agent: 'Saren Nur Tsaiyunk',
    worldId: WORLD_ID,
    ownerId: OWNER_UID,
    revision,
    updatedAt,
    handoffJson: JSON.stringify({ schemaVersion: 'saren-handoff-v3', sessionId: 'test-session-0001', trackingScope: 'server_observed_only', timestamp: updatedAt, reviewedItems: [], changesMade: [], unresolvedItems: [], loadedCourtLibrarySources: [], knownCourtLibraryMetadata: [] }),
    signature
  };
}

function validUserMessage(ownerId = OWNER_UID) {
  return {
    sender: 'user',
    text: 'User-authored recovery test message',
    timestamp: new Date().toLocaleTimeString(),
    createdAt: new Date().toISOString(),
    ownerId,
    messageKind: 'conversation',
    provenance: { origin: 'user', evidenceStatus: 'user_record', note: 'rules test' }
  };
}

async function run() {
  console.log('=== FIRESTORE SECURITY RULES RECOVERY MATRIX ===\n');
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: process.env.TEST_FIREBASE_PROJECT_ID || 'demo-saren-recovery',
    firestore: { rules, host: '127.0.0.1', port: 8085 }
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'worlds', WORLD_ID), {
        worldName: 'Aurena Core', genre: 'Sci-Fi Worldbuilding',
        description: 'Testing world for Saren recovery', highConcept: 'Recovery boundary test',
        ownerId: OWNER_UID, createdAt: new Date().toISOString()
      });
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), runtimeRecord(1));
      const trustedChar = {
        name: 'Trusted Character', role: 'Trusted', faction: 'Court', bio: 'Server-established source', traits: [],
        ownerId: OWNER_UID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'characters', 'verified-char'), {
        ...trustedChar, provenance: { origin: 'system', evidenceStatus: 'verified_source', note: 'server seeded' }
      });
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'characters', 'generated-char'), {
        ...trustedChar, name: 'Generated Character', provenance: { origin: 'generated', evidenceStatus: 'generated_draft', note: 'server seeded' }
      });
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'characters', 'legacy-char'), {
        ...trustedChar, name: 'Legacy Character'
      });
      const trustedDoc = {
        title: 'Trusted Document', category: 'Other', content: 'Server-established source', version: 1, tags: [],
        ownerId: OWNER_UID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'documents', 'verified-doc'), {
        ...trustedDoc, provenance: { origin: 'system', evidenceStatus: 'verified_source', note: 'server seeded' }
      });
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'documents', 'generated-doc'), {
        ...trustedDoc, title: 'Generated Document', provenance: { origin: 'generated', evidenceStatus: 'generated_draft', note: 'server seeded' }
      });
      await setDoc(doc(adminDb, 'worlds', WORLD_ID, 'documents', 'legacy-doc'), {
        ...trustedDoc, title: 'Legacy Document'
      });
    });

    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email_verified: true }).firestore();
    const wrongDb = testEnv.authenticatedContext(WRONG_UID, { email_verified: true }).firestore();

    await pass('unauthenticated runtime GET denied', getDoc(doc(unauthedDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID)));
    await pass('unauthenticated runtime LIST denied', getDocs(collection(unauthedDb, 'worlds', WORLD_ID, 'runtime')));
    await pass('unauthenticated runtime CREATE denied', setDoc(doc(unauthedDb, 'worlds', WORLD_ID, 'runtime', 'anon'), runtimeRecord(1)));
    await pass('unauthenticated runtime UPDATE denied', updateDoc(doc(unauthedDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), { revision: 2, signature: sig('b') }));
    await pass('unauthenticated runtime DELETE denied', deleteDoc(doc(unauthedDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID)));

    await pass('wrong owner runtime GET denied', getDoc(doc(wrongDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID)));
    await pass('wrong owner runtime LIST denied', getDocs(collection(wrongDb, 'worlds', WORLD_ID, 'runtime')));
    await pass('wrong owner runtime CREATE in owner world denied', setDoc(doc(wrongDb, 'worlds', WORLD_ID, 'runtime', 'injected'), { ...runtimeRecord(1), ownerId: WRONG_UID }));

    await pass('wrong owner character injection denied with otherwise-valid payload', setDoc(doc(wrongDb, 'worlds', WORLD_ID, 'characters', 'intruder-char'), {
      name: 'Injected Character', role: 'None', faction: 'None', bio: 'Cross-world attempt', traits: [],
      ownerId: WRONG_UID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      provenance: { origin: 'legacy', evidenceStatus: 'legacy_unverified' }
    }));
    await pass('wrong owner document injection denied with otherwise-valid payload', setDoc(doc(wrongDb, 'worlds', WORLD_ID, 'documents', 'intruder-doc'), {
      title: 'Injected Document', category: 'Other', content: 'Cross-world attempt', version: 1, tags: [],
      ownerId: WRONG_UID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      provenance: { origin: 'legacy', evidenceStatus: 'legacy_unverified' }
    }));
    await pass('wrong owner message injection denied with otherwise-valid payload', setDoc(doc(wrongDb, 'worlds', WORLD_ID, 'messages', 'intruder-msg'), validUserMessage(WRONG_UID)));

    await pass('owner can create valid user-authored message', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'messages', 'owner-user-msg'), validUserMessage()), true);
    await pass('owner cannot forge assistant/model message', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'messages', 'forged-assistant'), {
      ...validUserMessage(), sender: 'assistant', provenance: { origin: 'generated', evidenceStatus: 'generated_draft' }
    }));
    await pass('owner cannot persist simulation as ordinary message', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'messages', 'forged-simulation'), {
      ...validUserMessage(), messageKind: 'simulation', provenance: { origin: 'generated', evidenceStatus: 'simulation' }
    }));

    const userCharBase = {
      name: 'Owner Character', role: 'Tester', faction: 'Court', bio: 'User record', traits: [],
      ownerId: OWNER_UID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    await pass('owner can create user_record character provenance', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-user-char'), {
      ...userCharBase, provenance: { origin: 'user', evidenceStatus: 'user_record', note: 'rules test' }
    }), true);
    await pass('owner cannot mint verified_source character provenance', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-verified-char'), {
      ...userCharBase, provenance: { origin: 'user', evidenceStatus: 'verified_source', note: 'forged trust' }
    }));
    await pass('owner cannot create generated_draft directly', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-generated-char'), {
      ...userCharBase, provenance: { origin: 'generated', evidenceStatus: 'generated_draft', note: 'client forged generated lane' }
    }));
    await pass('owner cannot omit provenance on new character', setDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-no-prov-char'), userCharBase));
    await pass('owner cannot mutate provenance after creation', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-user-char'), {
      provenance: { origin: 'user', evidenceStatus: 'verified_source', note: 'upgrade attempt' }, updatedAt: new Date().toISOString()
    }));
    await pass('owner can edit an existing user_record character', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'owner-user-char'), {
      bio: 'User-authored edit remains user_record', updatedAt: new Date().toISOString()
    }), true);
    await pass('owner cannot rewrite verified_source character content while provenance is unchanged', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'verified-char'), {
      bio: 'attempted trusted-content rewrite', updatedAt: new Date().toISOString()
    }));
    await pass('owner cannot rewrite generated_draft character content', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'generated-char'), {
      bio: 'attempted generated-content rewrite', updatedAt: new Date().toISOString()
    }));
    await pass('owner cannot delete verified_source character', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'verified-char')));
    await pass('owner cannot delete generated_draft character', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'generated-char')));
    await pass('owner cannot delete provenance-less legacy character', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'characters', 'legacy-char')));
    await pass('owner cannot rewrite verified_source document content while provenance is unchanged', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'documents', 'verified-doc'), {
      content: 'attempted trusted-content rewrite', updatedAt: new Date().toISOString()
    }));
    await pass('owner cannot rewrite provenance-less legacy document content', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'documents', 'legacy-doc'), {
      content: 'attempted legacy-content rewrite', updatedAt: new Date().toISOString()
    }));
    await pass('owner cannot delete verified_source document', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'documents', 'verified-doc')));
    await pass('owner cannot delete generated_draft document', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'documents', 'generated-doc')));
    await pass('owner cannot delete provenance-less legacy document', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'documents', 'legacy-doc')));

    await pass('owner runtime GET allowed', getDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID)), true);
    await pass('owner may advance runtime revision exactly +1 at rules layer', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), {
      revision: 2, updatedAt: new Date().toISOString(), handoffJson: '{}', signature: sig('b')
    }), true);
    await pass('runtime replay/same revision denied', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), {
      revision: 2, updatedAt: new Date().toISOString(), handoffJson: '{}', signature: sig('c')
    }));
    await pass('runtime revision skip denied', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), {
      revision: 4, updatedAt: new Date().toISOString(), handoffJson: '{}', signature: sig('d')
    }));
    await pass('runtime delete denied even to owner', deleteDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID)));
    await pass('runtime ownerId mutation denied', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), {
      ownerId: WRONG_UID, revision: 3, updatedAt: new Date().toISOString(), signature: sig('e')
    }));
    await pass('runtime worldId mutation denied', updateDoc(doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID), {
      worldId: 'hijacked-world', revision: 3, updatedAt: new Date().toISOString(), signature: sig('f')
    }));

    console.log(`\nFIRESTORE RULES MATRIX PASSED: ${passed} executed assertions.`);
    console.log('NOTE: rules tests validate scope/schema/revision boundaries only. Server HMAC validity is a separate server-runtime concern.');
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((err) => {
  console.error('Emulator test failed:', err);
  process.exit(1);
});
