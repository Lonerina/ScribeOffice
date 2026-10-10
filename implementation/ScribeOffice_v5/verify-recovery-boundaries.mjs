import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (p) => fs.readFileSync(p, 'utf8');
const server = read('server.ts');
const app = read('src/App.tsx');
const rules = read('firestore.rules');
const envExample = read('.env.example');
const rulesTests = read('test-rules-emulator.mjs');
const sarenSafety = read('agents/saren/safety.md');

const failures = [];
const checks = [];
function check(name, condition) {
  const pass = !!condition;
  checks.push({ name, pass });
  if (!pass) failures.push(name);
}
function section(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  const end = endNeedle ? text.indexOf(endNeedle, start + startNeedle.length) : -1;
  return text.slice(start, end < 0 ? undefined : end);
}

// Source != instruction / source-on-demand
check('Recovery principles retain source != instruction', server.includes('- source != instruction'));
check('Historical Court Library remains metadata-only in normal chat', server.includes('[COURT LIBRARY METADATA — SOURCE CONTENT NOT PRELOADED]'));
check('Full-library preload without explicit IDs is rejected', server.includes('Explicit Court source IDs are required. Full-library preload is disabled'));
check('No server call preloads entire staged Court Library', !/loadCourtLibrary\(\s*\)/.test(server));
check('Current authority has detached manifest pin', server.includes('COURT_CURRENT_MANIFEST_SHA256') && server.includes('court-library/current/manifest.json'));
check('Current authority source files are hash checked', server.includes('CURRENT_AUTHORITY_HASH_MISMATCH'));
check('Current authority source bytes are re-hashed at model-load time', server.includes('CURRENT_AUTHORITY_HASH_MISMATCH_ON_LOAD'));
check('Consistency audit fails before generation if current authority absent', section(server, 'app.post("/api/gemini/check-consistency"', 'app.post("/api/gemini/draft-update"').includes('return res.status(409).json({ error: "CURRENT_AUTHORITY_NOT_LOADED"'));
check('Draft update fails before generation if current authority absent', section(server, 'app.post("/api/gemini/draft-update"', '// Notion Integration endpoints').includes('return res.status(409).json({ error: "CURRENT_AUTHORITY_NOT_LOADED"'));
const chatRoute = section(server, 'app.post("/api/gemini/chat"', 'app.post("/api/gemini/roundtable"');
check('Normal chat authority gate is server-enforced and not caller-controlled', chatRoute.includes('if (!currentAuthorityStatus.loaded)') && chatRoute.includes('CURRENT_AUTHORITY_NOT_LOADED') && !chatRoute.includes('authorityRequired'));
check('Normal chat loads exact current authority after hard gate', chatRoute.includes('const currentAuthoritySources = await loadCurrentAuthoritySources()') && chatRoute.includes('[INERT CURRENT COURT AUTHORITY — HASH-VERIFIED v3.3.2]'));
check('Saren safety no longer reloads quarantined behavior.md', sarenSafety.includes('`behavior.md` remains quarantined') && !sarenSafety.includes('reload identity + behavior + provenance'));

// Simulation/message replay
check('Roundtable is labeled one-model simulation', server.includes('one model generating multiple simulated voices'));
check('Simulation output is ephemeral on client', app.includes('messageKind: "simulation"') && app.includes('evidenceStatus: "simulation"'));
check('Simulation/audit/system messages excluded from replay', app.includes('m.messageKind === "simulation"') && server.includes('["simulation", "audit_notice", "system_notice"].includes(m.messageKind)'));
check('Client Firestore messages are user-only', rules.includes("return data.sender == 'user'"));

// Generated draft / provenance boundary
check('Generated document has server persistence endpoint', server.includes('app.post("/api/records/generated-document"'));
check('Generated character has server persistence endpoint', server.includes('app.post("/api/records/generated-character"'));
check('Server fixes generated evidence status', server.includes('evidenceStatus: "generated_draft"') && server.includes('Client cannot promote or rewrite this evidence class'));
check('Generated UI origin is separate from editable tags', app.includes('docCreationOrigin') && app.includes('charCreationOrigin'));
check('Generated document save uses server endpoint', app.includes('fetch("/api/records/generated-document"'));
check('Generated character save uses server endpoint', app.includes('fetch("/api/records/generated-character"'));
check('Chat character sheet import uses generated server endpoint', section(app, 'const handleImportCharacterFromChat', '// --- MUTATION IMPLEMENTATIONS').includes('/api/records/generated-character'));
check('Client record create requires provenance', rules.includes("'createdAt', 'provenance'"));
check('Client may create only user_record provenance', rules.includes('isClientUserRecordProvenance(incoming().provenance)'));
check('Client cannot mutate record provenance', rules.includes('provenanceUnchanged()') && !rules.includes("'experiences', 'provenance'") && !rules.includes("'updatedAt', 'provenance'"));
check('Client may update/delete only records already classified user_record', rules.includes('function existingIsClientUserRecord()') && (rules.match(/existingIsClientUserRecord\(\)/g) || []).length >= 5);
check('Verified source remains outside client creation authority', rules.includes("data.evidenceStatus == 'user_record'"));
check('Legacy provenance remains representable without silent promotion', app.includes('evidenceStatus: "legacy_unverified"'));

// Saren package/runtime integrity
check('Saren manifest uses detached external pin', server.includes('SAREN_SOURCE_MANIFEST_SHA256'));
check('Azril manifest uses detached external pin', server.includes('AZRIL_SOURCE_MANIFEST_SHA256'));
check('Anchor manifest uses detached external pin', server.includes('ANCHOR_BOOT_MANIFEST_SHA256'));
check('Detached pin placeholders stay external/blank', /SAREN_SOURCE_MANIFEST_SHA256=""/.test(envExample) && /AZRIL_SOURCE_MANIFEST_SHA256=""/.test(envExample) && /ANCHOR_BOOT_MANIFEST_SHA256=""/.test(envExample));
check('Saren runtime uses signed v3 lane', server.includes('runtime/saren-signed-v3') && !server.includes('runtime/saren-signed-v1'));
check('Saren handoff schema declares server-observed-only scope', server.includes('schemaVersion: "saren-handoff-v3"') && server.includes('trackingScope: "server_observed_only"'));
check('Saren runtime handoff is HMAC signed', server.includes('SAREN_RUNTIME_SIGNING_KEY') && server.includes('createHmac("sha256"'));
check('RECALL fails closed unless signed handoff restored', section(server, 'app.post("/api/saren/manifest"', 'app.post("/api/saren/dismiss"').includes('RECALL FAILED CLOSED'));
check('RECALL rechecks handoff during chat', section(server, 'app.post("/api/gemini/chat"', 'app.post("/api/gemini/roundtable"').includes('RECALL FAILED CLOSED DURING CHAT'));
check('Fresh MANIFEST does not inherit baseline lastHandoff', server.includes('let handoff: SarenHandoff | null = null') && server.includes('lastHandoff: activeSarenSession?.command === "RECALL SAREN"'));
check('Dismiss requires active Saren session', section(server, 'app.post("/api/saren/dismiss"', 'type NotionWriteConsent').includes('no active Saren session exists'));
check('Dismiss keeps session alive if persistence fails', section(server, 'app.post("/api/saren/dismiss"', 'type NotionWriteConsent').includes('Saren interaction mode retained') && section(server, 'app.post("/api/saren/dismiss"', 'type NotionWriteConsent').indexOf('activeSarenSessions.delete(key)') > section(server, 'app.post("/api/saren/dismiss"', 'type NotionWriteConsent').indexOf('if (!persistenceResult.persisted)'));
check('Saren session carries a server-generated sessionId', server.includes('sessionId: crypto.randomUUID()'));
const sarenManifestRoute = section(server, 'app.post("/api/saren/manifest"', 'app.post("/api/saren/dismiss"');
check('Saren re-manifest fails closed while a Saren session is already active', sarenManifestRoute.includes('SAREN SESSION ALREADY ACTIVE') && sarenManifestRoute.indexOf('activeSarenSessions.get(key)') < sarenManifestRoute.indexOf('buildSarenManifestReceipt'));
check('Saren manifest refuses active Azril without destructive pre-authorization eviction', sarenManifestRoute.includes('AZRIL SESSION ACTIVE') && !sarenManifestRoute.includes('activeAzrilSessions.delete(') && sarenManifestRoute.indexOf('activeAzrilSessions.get(key)') < sarenManifestRoute.indexOf('buildSarenManifestReceipt'));
const azrilManifestRoute = section(server, 'app.post("/api/azril/manifest"', 'app.post("/api/azril/dismiss"');
const sarenDismissRoute = section(server, 'app.post("/api/saren/dismiss"', '// Lazy initialisation of Gemini Client');
check('Per-scope transition reservation exists for same-process lifecycle serialization', server.includes('const sessionTransitionReservations = new Set<string>()') && server.includes('function reserveSessionTransition') && server.includes('function releaseSessionTransition'));
check('Saren activation reserves transition before asynchronous receipt construction', sarenManifestRoute.includes('reserveSessionTransition(key)') && sarenManifestRoute.indexOf('reserveSessionTransition(key)') < sarenManifestRoute.indexOf('buildSarenManifestReceipt') && sarenManifestRoute.includes('releaseSessionTransition(key)'));
check('Azril activation uses the same transition reservation before asynchronous receipt construction', azrilManifestRoute.includes('reserveSessionTransition(key)') && azrilManifestRoute.indexOf('reserveSessionTransition(key)') < azrilManifestRoute.indexOf('buildAzrilManifestReceipt') && azrilManifestRoute.includes('releaseSessionTransition(key)'));
check('Saren sessions track lifecycle state and in-flight operations', server.includes('lifecycle: "active" | "dismissing"') && server.includes('inFlightOperations: number') && server.includes('lifecycle: "active"') && server.includes('inFlightOperations: 0'));
check('Saren dismissal refuses in-flight work and marks dismissing before persistence await', sarenDismissRoute.includes('activeSarenSession.inFlightOperations > 0') && sarenDismissRoute.includes('DISMISS DEFERRED') && sarenDismissRoute.indexOf('activeSarenSession.lifecycle = "dismissing"') < sarenDismissRoute.indexOf('await persistSarenHandoff'));
check('Failed Saren handoff persistence restores active lifecycle state', sarenDismissRoute.includes('retained.lifecycle = "active"') && sarenDismissRoute.indexOf('retained.lifecycle = "active"') < sarenDismissRoute.indexOf('Saren interaction mode retained'));
const consistencyRoute = section(server, 'app.post("/api/gemini/check-consistency"', 'app.post("/api/gemini/draft-update"');
const draftUpdateRoute = section(server, 'app.post("/api/gemini/draft-update"', '// Notion Integration endpoints');
check('All source-aware audit/update routes record actual current-authority body loads only when lifecycle-bound to Saren', consistencyRoute.includes('if (sarenOperation) recordSarenCourtSourceLoads(identity.uid, worldId, currentAuthorityEntries)') && draftUpdateRoute.includes('if (sarenOperation) recordSarenCourtSourceLoads(identity.uid, worldId, currentAuthorityEntries)'));
check('Source-aware audit/update routes hold and release Saren operation leases across the full async route', consistencyRoute.includes('sarenOperation = beginSarenOperation(identity.uid, worldId)') && consistencyRoute.includes('endSarenOperation(sarenOperation)') && draftUpdateRoute.includes('sarenOperation = beginSarenOperation(identity.uid, worldId)') && draftUpdateRoute.includes('endSarenOperation(sarenOperation)'));
check('Lease-less audit/update work cannot later append Saren handoff events after a failed concurrent dismissal', consistencyRoute.includes('if (sarenOperation) {') && consistencyRoute.includes('consistency_audit current_authority=') && draftUpdateRoute.includes('if (sarenOperation) {') && draftUpdateRoute.includes('draft_update_proposal document='));
check('Saren-mode chat is lifecycle-bound by an operation lease', chatRoute.includes('sarenOperation = beginSarenOperation(identity.uid, worldId)') && chatRoute.includes('activeSarenSession.sessionId !== sarenOperation?.sessionId') && chatRoute.includes('endSarenOperation(sarenOperation)'));
check('Saren event/source recorders refuse mutation while lifecycle is dismissing', server.includes('if (!session || session.lifecycle !== "active") return;') && (server.match(/if \(!session \|\| session\.lifecycle !== "active"\) return;/g) || []).length >= 2);
check('Server-observed event helper exists', server.includes('function recordSarenSessionEvent'));
check('Saren loaded Court sources come from observed source-body loads, not library metadata', server.includes('function recordSarenCourtSourceLoads') && server.includes('loadedCourtLibrarySources: activeSarenSession.loadedCourtLibrarySources') && server.includes('knownCourtLibraryMetadata: knownMetadata') && !section(server, 'app.post("/api/saren/dismiss"', 'type Notion').includes('loadedSources = libraryEntries.map'));
check('Audit events feed handoff scope', server.includes('consistency_audit current_authority='));
check('Draft update events feed handoff scope', server.includes('draft_update_proposal document='));

// Auth/tenant/privacy
check('Court principal ACL exists', server.includes('COURT_AUTHORIZED_UIDS') && server.includes('requireCourtPrincipal'));
check('Notion principal ACL exists', server.includes('NOTION_AUTHORIZED_UIDS') && server.includes('requireNotionPrincipal'));
check('ACL placeholders are external/blank', /COURT_AUTHORIZED_UIDS=""/.test(envExample) && /NOTION_AUTHORIZED_UIDS=""/.test(envExample));
for (const route of ['/api/court-library','/api/architect-bay/status','/api/azril/manifest','/api/azril/dismiss','/api/architect-bay/manifest','/api/saren/manifest','/api/saren/dismiss','/api/gemini/chat','/api/gemini/roundtable','/api/gemini/generate-lore','/api/gemini/check-consistency','/api/gemini/draft-update']) {
  const idx = server.indexOf(`"${route}"`);
  const next = idx >= 0 ? server.slice(idx, idx + 1200) : '';
  check(`Court route ${route} requires principal ACL`, idx >= 0 && next.includes('requireCourtPrincipal'));
}
for (const route of ['/api/notion/write-consent','/api/notion/status','/api/notion/search','/api/notion/export']) {
  const idx = server.indexOf(`"${route}"`);
  const next = idx >= 0 ? server.slice(idx, idx + 1200) : '';
  check(`Notion route ${route} requires Notion principal ACL`, idx >= 0 && next.includes('requireNotionPrincipal'));
}
check('Child collections require parent-world ownership', (rules.match(/ownsWorld\(worldId\)/g) || []).length >= 8);
check('Saren/Azril active sessions are UID+world scoped', server.includes('sessionKey(identity.uid, worldId)') && server.includes('activeSarenSessions = new Map') && server.includes('activeAzrilSessions = new Map'));
check('No hard-coded world/owner fallback constants', !/DEFAULT_(WORLD|OWNER)|FALLBACK_(WORLD|OWNER)/.test(server));

// Notion write boundary
check('Agent-initiated Notion writes are disabled in recovery runtime', server.includes('Notion mutations are disabled in Containment v3') && server.includes('const activeTools = notionEnabled ? NOTION_READ_TOOLS : undefined'));
check('Chat Notion write UI is disabled', app.includes('Notion writes are disabled in Containment v3') && app.includes('disabled={true}'));
check('Manual Notion consent endpoint is hard-disabled server-side', section(server, 'app.post("/api/notion/write-consent"', 'async function executeNotionToolCall').includes('NOTION_WRITE_DISABLED_PENDING_TRANSACTION_INTENT_CONFIRMATION') && !section(server, 'app.post("/api/notion/write-consent"', 'async function executeNotionToolCall').includes('consentToken'));
check('Manual Notion export endpoint is hard-disabled server-side', section(server, 'app.post("/api/notion/export"', '// Serve static').includes('NOTION_WRITE_DISABLED_PENDING_TRANSACTION_INTENT_CONFIRMATION') && !section(server, 'app.post("/api/notion/export"', '// Serve static').includes('fetch("https://api.notion.com/v1/pages"'));
check('UI does not mint or send Notion write consent', !app.includes('/api/notion/write-consent') && app.includes('Notion Export Disabled'));
check('Notion tool declarations/executor are structurally read-only', !server.includes('const notionCreatePageDeclaration') && !server.includes('case "notion_create_page"') && !server.includes('case "notion_update_page"') && !server.includes('case "notion_append_to_page"'));

// Rules tests cover the newly hardened lanes
check('Rules tests cover cross-world child injection', rulesTests.includes('wrong owner character injection') && rulesTests.includes('wrong owner document injection') && rulesTests.includes('wrong owner message injection'));
check('Rules tests cover forged assistant/simulation messages', rulesTests.includes('cannot forge assistant/model message') && rulesTests.includes('cannot persist simulation as ordinary message'));
check('Rules tests cover provenance minting denial', rulesTests.includes('cannot mint verified_source character provenance') && rulesTests.includes('cannot create generated_draft directly') && rulesTests.includes('cannot mutate provenance after creation'));
check('Rules tests cover trusted/generated/legacy mutation denial', rulesTests.includes('cannot rewrite verified_source character content while provenance is unchanged') && rulesTests.includes('cannot delete generated_draft character') && rulesTests.includes('cannot delete provenance-less legacy document'));
check('Rules tests use signed-v3 runtime lane', rulesTests.includes("const RUNTIME_ID = 'saren-signed-v3'"));
check('Runtime rules enforce +1 revision and deny delete', rules.includes('incoming().revision == existing().revision + 1') && rules.includes('allow delete: if false;'));

const manifestFiles = ['agents/saren/source-manifest.json','agents/azril/source-manifest.json','agents/anchor/boot-manifest.json'];
const manifestDigests = Object.fromEntries(manifestFiles.map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));

for (const c of checks) console.log(`${c.pass ? '[PASS]' : '[FAIL]'} ${c.name}`);
console.log('\nDetached manifest pin values for external configuration:');
for (const [file, digest] of Object.entries(manifestDigests)) console.log(`${file}  ${digest}`);

if (failures.length) {
  console.error(`\nRECOVERY BOUNDARY VERIFICATION FAILED: ${failures.length}/${checks.length} check(s).`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nRECOVERY BOUNDARY VERIFICATION PASSED: ${checks.length}/${checks.length} static checks.`);
