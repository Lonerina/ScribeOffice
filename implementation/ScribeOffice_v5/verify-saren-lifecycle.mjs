import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Rules-layer lifecycle only. This file does NOT claim to validate the server HMAC.
// Server-side HMAC/revision verification is covered by static recovery checks until a dependency-complete integration environment is available.
const OWNER_UID = process.env.TEST_OWNER_UID || 'recovery-test-owner';
const WORLD_ID = process.env.TEST_WORLD_ID || 'recovery-test-world';
const RUNTIME_ID = 'saren-signed-v3';
const signature = (ch) => ch.repeat(64);

async function verifyLifecycle() {
  console.log('=== SAREN SIGNED-RUNTIME RULES-LAYER LIFECYCLE ===\n');
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: process.env.TEST_FIREBASE_PROJECT_ID || 'demo-saren-recovery',
    firestore: { rules, host: '127.0.0.1', port: 8085 }
  });

  try {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'worlds', WORLD_ID), {
        worldName: 'Aurena Core', genre: 'Sci-Fi Worldbuilding', description: 'Recovery lifecycle world',
        highConcept: 'Signed runtime rules-layer verification', ownerId: OWNER_UID, createdAt: new Date().toISOString()
      });
    });

    const ownerDb = testEnv.authenticatedContext(OWNER_UID, { email_verified: true }).firestore();
    const t1 = new Date().toISOString();
    const handoff1 = JSON.stringify({
      schemaVersion: 'saren-handoff-v3',
      sessionId: 'test-session-0001',
      trackingScope: 'server_observed_only',
      timestamp: t1,
      reviewedItems: [], changesMade: [], unresolvedItems: [],
      loadedCourtLibrarySources: [], knownCourtLibraryMetadata: [],
      safetyProtocolsTriggered: { holdLine: 'not observed by server', counterweight: 'not observed by server', reset: 'not observed by server' },
      firstRecommendedCheckOnRecall: 'Verify current-source intake status.'
    });
    const ref = doc(ownerDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID);

    await assertSucceeds(setDoc(ref, {
      agent: 'Saren Nur Tsaiyunk', worldId: WORLD_ID, ownerId: OWNER_UID,
      revision: 1, updatedAt: t1, handoffJson: handoff1, signature: signature('a')
    }));
    console.log('[PASS] revision 1 create accepted by owner/world rules');

    const freshContextDb = testEnv.authenticatedContext(OWNER_UID, { email_verified: true }).firestore();
    const recalled = await getDoc(doc(freshContextDb, 'worlds', WORLD_ID, 'runtime', RUNTIME_ID));
    if (!recalled.exists() || recalled.data().revision !== 1) throw new Error('signed runtime state not readable after fresh client context');
    console.log('[PASS] signed runtime state remains available across fresh client context');

    const t2 = new Date().toISOString();
    await assertSucceeds(updateDoc(ref, { revision: 2, updatedAt: t2, handoffJson: JSON.stringify({ timestamp: t2 }), signature: signature('b') }));
    console.log('[PASS] monotonic +1 revision accepted');

    await assertFails(updateDoc(ref, { revision: 2, updatedAt: new Date().toISOString(), signature: signature('c') }));
    console.log('[PASS] replay/downgrade revision rejected');

    console.log('\nSAREN RULES-LAYER LIFECYCLE PASSED. Server HMAC validation remains an integration-test gate.');
  } finally {
    await testEnv.cleanup();
  }
}

verifyLifecycle().catch((err) => {
  console.error('Lifecycle verification failed:', err);
  process.exit(1);
});
