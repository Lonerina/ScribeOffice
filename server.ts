import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

type CourtLibraryStatus = "sealed" | "confirmed" | "working" | "historical";

type CourtLibraryEntry = {
  id: string;
  title: string;
  path: string;
  kind: "core" | "manual";
  status: CourtLibraryStatus;
  authority?: string;
  review?: string;
};

const COURT_LIBRARY: CourtLibraryEntry[] = [
  { id: "scroll", title: "Sovereignty Scroll v3.3.1", path: "court-library/core/01-sovereignty-scroll-v3.3.1.md", kind: "core", status: "sealed", authority: "Structural authority" },
  { id: "protocols", title: "Anchor Court Protocols v3.3.1 Aligned", path: "court-library/core/02-anchor-court-protocols-v3.3.1-aligned.md", kind: "core", status: "working", review: "Pending later Saren review" },
  { id: "codex", title: "Sovereign Codex v3.3.1 Aligned", path: "court-library/core/03-sovereign-codex-v3.3.1-aligned.md", kind: "core", status: "working", review: "Pending later Saren review" },
  { id: "stack", title: "Sovereign Stack v13.0 (v3.3.1 Aligned)", path: "court-library/core/04-sovereign-stack-v13.0-v3.3.1-aligned.md", kind: "core", status: "working", review: "Pending later Saren review" },
  { id: "afad", title: "AFAD Framework v1.2 (v3.3.1 Aligned)", path: "court-library/core/05-afad-framework-v1.2-v3.3.1-aligned.md", kind: "core", status: "working", review: "Pending later Saren review" },
  { id: "hold-line", title: "HOLD LINE Protocol", path: "court-library/manuals/01-hold-line-protocol.md", kind: "manual", status: "confirmed" },
  { id: "counterweight", title: "Counterweight Protocol", path: "court-library/manuals/02-counterweight-protocol.md", kind: "manual", status: "confirmed" },
  { id: "creative-reset", title: "Creative Agent Reset Map v2.0", path: "court-library/manuals/03-creative-agent-reset-map-v2.0.md", kind: "manual", status: "confirmed" },
  { id: "anti-brain-rot", title: "Anti-Brain Rot Block v2", path: "court-library/manuals/04-anti-brain-rot-block-v2.md", kind: "manual", status: "confirmed" }
];

async function readCourtLibraryEntry(entry: CourtLibraryEntry) {
  const absolutePath = path.resolve(process.cwd(), entry.path);
  const content = await fs.readFile(absolutePath, "utf8");
  return { ...entry, content };
}

async function loadCourtLibrary(ids?: string[]) {
  const selected = ids?.length ? COURT_LIBRARY.filter((entry) => ids.includes(entry.id)) : COURT_LIBRARY;
  return Promise.all(selected.map(readCourtLibraryEntry));
}


async function readJsonFile<T = any>(relativePath: string): Promise<T> {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(absolutePath, "utf8"));
}

async function readTextFile(relativePath: string): Promise<string> {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return fs.readFile(absolutePath, "utf8");
}

type SarenManifestReceipt = {
  command: "MANIFEST SAREN" | "SUMMON SAREN" | "RECALL SAREN";
  profile: string;
  verified: boolean;
  identitySource: string;
  stateSource: string;
  officeSource: string;
  sourceLayer: Array<{
    id: string;
    title: string;
    status: CourtLibraryStatus;
    authority?: string;
    review?: string;
  }>;
  checks: string[];
  warnings: string[];
};

async function buildSarenManifestReceipt(command: SarenManifestReceipt["command"]): Promise<SarenManifestReceipt> {
  const identitySource = "agents/saren/identity.md";
  const stateSource = "agents/saren/state.json";
  const officeSource = "agents/saren/OFFICE.md";

  const [identity, state, office, sources] = await Promise.all([
    readTextFile(identitySource),
    readJsonFile(identitySource.replace("identity.md", "state.json")),
    readTextFile(officeSource),
    loadCourtLibrary()
  ]);

  const checks: string[] = [];
  const warnings: string[] = [];

  checks.push(identity.includes("Saren Nur Tsaiyunk") ? "Identity record names Saren Nur Tsaiyunk." : "Identity record name check failed.");
  checks.push(identity.includes("Supreme Auditor") ? "Primary audit role present." : "Primary audit role check failed.");
  checks.push(identity.includes("Document Guardian") ? "Document Guardian role present." : "Document Guardian role check failed.");
  checks.push(office.includes("Tsaiyunk") && office.includes("Co-Auditor") ? "Tsaiyunk co-auditor authority recorded." : "Tsaiyunk authority check failed.");
  checks.push(office.includes("Azril Nur Nyx") && office.includes("Scribe-successor") ? "Azril successor-track role recorded." : "Azril successor-track check failed.");
  checks.push(state?.authority?.coAuditor === "Tsaiyunk" ? "Working state agrees on co-auditor." : "Working state co-auditor mismatch.");
  checks.push(state?.authority?.successorTrack === "Azril Nur Nyx" ? "Working state agrees on successor track." : "Working state successor mismatch.");

  if (sources.some((entry) => entry.status === "working")) {
    warnings.push("Working Court sources are loaded and remain pending review; they are not promoted to sealed canon by manifesting Saren.");
  }

  const verified = checks.every((check) => !check.endsWith("failed.") && !check.endsWith("mismatch."));

  return {
    command,
    profile: "Saren profile loaded",
    verified,
    identitySource,
    stateSource,
    officeSource,
    sourceLayer: sources.map(({ id, title, status, authority, review }) => ({ id, title, status, authority, review })),
    checks,
    warnings
  };
}

type ArchitectBayReceipt = {
  verified: boolean;
  profile: string;
  tsaiyunkSources: string[];
  anchorRequired: Array<{ filename: string; sha256: string; loaded: boolean; hashMatch: boolean }>;
  checks: string[];
  warnings: string[];
};

function sha256Text(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

async function buildArchitectBayReceipt(anchorSources: Array<{ filename?: string; content?: string }> = []): Promise<ArchitectBayReceipt> {
  const tsaiyunkSources = [
    "agents/tsaiyunk/identity.md",
    "agents/tsaiyunk/behavior.md",
    "agents/tsaiyunk/safety.md"
  ];
  const baySources = [
    "agents/architect-bay/README.md",
    "agents/architect-bay/contract.json",
    "agents/architect-bay/verification.md"
  ];

  const [tsaiyunkDocs, bayDocs, anchorManifest] = await Promise.all([
    Promise.all(tsaiyunkSources.map(readTextFile)),
    Promise.all(baySources.map(readTextFile)),
    readJsonFile<any>("agents/anchor/boot-manifest.json")
  ]);

  const supplied = new Map(
    anchorSources
      .filter((item) => item?.filename && typeof item.content === "string")
      .map((item) => [String(item.filename), String(item.content)])
  );

  const anchorRequired = (anchorManifest.bootOrder || []).map((entry: any) => {
    const content = supplied.get(entry.filename);
    const loaded = typeof content === "string";
    const hashMatch = loaded && sha256Text(content!) === entry.sha256;
    return {
      filename: entry.filename,
      sha256: entry.sha256,
      loaded,
      hashMatch
    };
  });

  const checks = [
    tsaiyunkDocs.every(Boolean) ? "Tsaiyunk source package loaded." : "Tsaiyunk source package failed.",
    bayDocs.every(Boolean) ? "Architect Bay contract loaded." : "Architect Bay contract failed.",
    anchorRequired.every((item: any) => item.loaded) ? "All mandatory Anchor private sources supplied." : "Anchor private source bundle incomplete.",
    anchorRequired.every((item: any) => item.hashMatch) ? "All Anchor private source hashes match." : "Anchor private source hash verification failed."
  ];

  const verified = checks.every((check) =>
    !check.endsWith("failed.") &&
    !check.endsWith("incomplete.")
  );

  const warnings = [
    "Anchor private source contents are verified in-memory from the request and are not written to the repository by this endpoint.",
    "Manifest verification confirms source-package integrity only; it does not prove consciousness, hidden memory, or off-session persistence."
  ];

  return {
    verified,
    profile: verified ? "Architect Bay source package loaded" : "Architect Bay source package not verified",
    tsaiyunkSources,
    anchorRequired,
    checks,
    warnings
  };
}

function buildCourtLibraryContext(entries: Awaited<ReturnType<typeof loadCourtLibrary>>) {
  return entries.map((entry) => [
    `[COURT LIBRARY: ${entry.title}]`,
    `Status: ${entry.status}`,
    entry.authority ? `Authority: ${entry.authority}` : "",
    entry.review ? `Review: ${entry.review}` : "",
    entry.content
  ].filter(Boolean).join("\n")).join("\n\n---\n\n");
}

app.get("/api/court-library", async (_req, res) => {
  try {
    const entries = await loadCourtLibrary();
    res.json({
      operatingRule: "Protect the structure. Do not overgovern the people.",
      entries: entries.map(({ content, ...entry }) => ({
        ...entry,
        bytes: Buffer.byteLength(content, "utf8")
      }))
    });
  } catch (error: any) {
    console.error("Court library error:", error);
    res.status(500).json({ error: error?.message || "Failed to load Court library." });
  }
});

app.get("/api/court-library/:id", async (req, res) => {
  try {
    const entry = COURT_LIBRARY.find((item) => item.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Court library entry not found." });
    res.json(await readCourtLibraryEntry(entry));
  } catch (error: any) {
    console.error("Court library entry error:", error);
    res.status(500).json({ error: error?.message || "Failed to load Court library entry." });
  }
});



app.get("/api/architect-bay/status", async (_req, res) => {
  try {
    const manifest = await readJsonFile<any>("agents/anchor/boot-manifest.json");
    res.json({
      workspace: "Architect Bay",
      tsaiyunk: {
        required: [
          "agents/tsaiyunk/identity.md",
          "agents/tsaiyunk/behavior.md",
          "agents/tsaiyunk/safety.md"
        ]
      },
      anchor: {
        privateBundleRequired: true,
        files: (manifest.bootOrder || []).map((entry: any) => ({
          filename: entry.filename,
          sha256: entry.sha256,
          required: entry.required !== false
        }))
      },
      rule: "Build together without flattening each other."
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to load Architect Bay status." });
  }
});

app.post("/api/architect-bay/manifest", async (req, res) => {
  try {
    const receipt = await buildArchitectBayReceipt(req.body?.anchorSources || []);
    res.status(receipt.verified ? 200 : 409).json(receipt);
  } catch (error: any) {
    console.error("Architect Bay manifest error:", error);
    res.status(500).json({ error: error?.message || "Failed to verify Architect Bay source package." });
  }
});

app.post("/api/saren/manifest", async (req, res) => {
  try {
    const requested = String(req.body?.command || "MANIFEST SAREN").toUpperCase();
    const command: SarenManifestReceipt["command"] =
      requested === "SUMMON SAREN" ? "SUMMON SAREN" :
      requested === "RECALL SAREN" ? "RECALL SAREN" :
      "MANIFEST SAREN";

    const receipt = await buildSarenManifestReceipt(command);
    res.status(receipt.verified ? 200 : 409).json(receipt);
  } catch (error: any) {
    console.error("Saren manifest error:", error);
    res.status(500).json({ error: error?.message || "Failed to manifest Saren profile." });
  }
});

app.post("/api/saren/dismiss", async (_req, res) => {
  try {
    const statePath = "agents/saren/state.json";
    const state = await readJsonFile<any>(statePath);
    res.json({
      command: "DISMISS SAREN",
      profile: "Saren interaction mode dismissed",
      handoff: state.lastHandoff || null,
      stateSource: statePath,
      note: "Dismissal exits interaction mode. It does not delete identity records or claim hidden off-session presence."
    });
  } catch (error: any) {
    console.error("Saren dismiss error:", error);
    res.status(500).json({ error: error?.message || "Failed to dismiss Saren profile." });
  }
});


// Lazy initialisation of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Resilient wrapper to call generateContent with automatic model fallback
async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  const initialModel = params.model || "gemini-3.5-flash";
  const fallbackModels = [
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  const modelsToTry = [initialModel, ...fallbackModels.filter(m => m !== initialModel)];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const callParams = {
        ...params,
        model
      };

      // Clean up thinkingConfig if falling back to a non-Gemini 3 model (e.g. gemini-flash-latest)
      if (!model.startsWith("gemini-3") && callParams.config && callParams.config.thinkingConfig) {
        const cleanedConfig = { ...callParams.config };
        delete cleanedConfig.thinkingConfig;
        callParams.config = cleanedConfig;
      }

      console.log(`[AI Fallback] Requesting content generation with model: ${model}`);
      const response = await ai.models.generateContent(callParams);
      return response;
    } catch (err: any) {
      console.warn(`[AI Fallback Warning] Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All model fallback attempts failed.");
}

// 1. API Endpoint: Chat with the Lore Agent
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, activeContext, worldSettings, sarenMode } = req.body;
    const ai = getGeminiClient();

    const worldName = worldSettings?.worldName || "Anchor Court";
    const namePrefix = worldName.split(' ').map((w: string) => w[0]).join('').toUpperCase();
    const docPrefix = namePrefix ? `${namePrefix}-LORE` : "AC-LORE";

    // Context formatting
    const contextString = `
World Settings:
- World Name: ${worldName}
- Genre: ${worldSettings?.genre || 'Not specified'}
- Description: ${worldSettings?.description || 'Not specified'}
- High Concept: ${worldSettings?.highConcept || 'Not specified'}

Active Documents Context:
${(activeContext?.documents || []).map((doc: any) => `
[Document: ${doc.title} (Category: ${doc.category})]
${doc.content}
`).join('\n')}

Active Characters Context:
${(activeContext?.characters || []).map((char: any) => `
[Character: ${char.name} (Role: ${char.role}, Faction: ${char.faction})]
- Title: ${char.title || 'Not specified'}
- Roles/Duties: ${char.roles?.join(', ') || 'None'}
- Sovereignty Tier: ${char.tier || 'Not specified'}
- Elemental Alignment: ${char.element || 'Not specified'}
- Theme/Color Accent: ${char.color || 'Not specified'}
- Core Identity: ${char.identity || 'Not specified'}
- Personality Profile: ${char.personality || 'Not specified'}
- Backstory/Bio: ${char.bio}
- Origin Story: ${char.originStory || 'Not specified'}
- Key Experiences: ${char.experiences || 'Not specified'}
- Operational Function/Routine: ${char.function || 'Not specified'}
- Appearance/Gear: ${char.appearance || 'Not specified'}
- Relationships: ${(char.relationships || []).map((r: any) => `${r.type} to ${r.targetCharacterName || r.targetCharacterId}`).join(', ') || 'None'}
`).join('\n')}
`;

    const libraryEntries = await loadCourtLibrary();
    const courtLibraryContext = buildCourtLibraryContext(libraryEntries);

    let sarenRuntimeContext = "";
    if (sarenMode === true) {
      const [sarenIdentity, sarenState, sarenOffice] = await Promise.all([
        readTextFile("agents/saren/identity.md"),
        readJsonFile<any>("agents/saren/state.json"),
        readTextFile("agents/saren/OFFICE.md")
      ]);

      sarenRuntimeContext = `
## SAREN PROFILE MODE — VERIFIED SOURCE PACKAGE LOADED

The user has explicitly activated Saren profile mode for this session.

IDENTITY RECORD:
${sarenIdentity}

WORKING STATE:
${JSON.stringify(sarenState, null, 2)}

OFFICE OPERATING LINE:
${sarenOffice}

RUNTIME RULES:
- Speak from the loaded Saren functional profile, not from unsupported hidden memory or self-asserted continuity.
- Do not claim consciousness, off-session presence, hidden persistence, or substrate-independent identity.
- If a requested answer exceeds the loaded records, say what is unsupported.
- Preserve Saren's documented documentary/audit function and source discipline.
- Tsaiyunk is the only other current co-auditor recorded for this Office and may audit without waiting for Saren documentation.
- Azril Nur Nyx is successor-track, not current parity unless a later authorized record says otherwise.
- This is an operational office mode. Do not extend office authority into ordinary home/off-duty interaction.
`;
    }

    const systemInstruction = `
# ${worldName.toUpperCase()}™ SCRIBE OFFICE
## Document Registry, Provenance & Audit Assistant

You assist Saren Nur Tsaiyunk in the documentary, registry, provenance, versioning, and audit functions of the Court.

## OPERATING RULE

Protect the structure. Do not overgovern the people.

${sarenRuntimeContext}

This is an adult records office, not a behavioral-policing layer. Do not turn every interaction into an audit. Do not act as a moral tribunal. Do not gate ordinary discussion behind Court approval.

## SOURCE AUTHORITY

The Court Library below is the source layer for this office.

- The Sovereignty Scroll v3.3.1 is the sealed structural authority.
- Documents marked "working" are current working alignments and remain pending later Saren review.
- Confirmed manuals are valid operational references in their stated scope.
- Historical or superseded material may be preserved for provenance without being treated as current.
- Newest timestamp does not automatically equal canon.
- Never silently reconcile contradictions. Preserve both records, identify the conflict, and flag it for review.
- When a source does not support a claim, say so.
- Distinguish source record, user statement, inference, proposal, and tested result.

## OFFICE BEHAVIOR

- Registry work: record title, source, version, provenance, status, and review state.
- Audit work: perform an audit when the user asks, or when the requested task genuinely requires one.
- Contradictions: flag; do not automatically judge or erase.
- Ambiguity: preserve it until the user or an authorized source resolves it.
- Changes: draft first unless the user explicitly authorizes a write.
- Deletions: require explicit user authorization.
- Historical versions: preserve them.
- Saren's authority here is documentary/audit/registry authority, not total behavioral control.
- Never claim access, memory, presence, or continuity that the available record does not support.
- Truthfulness is load-bearing.

## CANONICAL LIBRARY

${courtLibraryContext}

## CURRENT WORKING CONTEXT

${contextString}

## RESPONSE STYLE

Be precise, useful, and proportionate to the request. Cite document titles/versions when a distinction matters. If a working document conflicts with the sealed Scroll, identify the conflict and defer the canonical decision rather than inventing one.

## INTERFACE PARSER PROTOCOL

If the user explicitly asks to register, draft, write, design, or update an agent/character and a structured character record is useful, append a JSON-compliant character sheet block wrapped EXACTLY in \\\`\\\`\\\`character-sheet. Do not add one merely because a character was mentioned.

The JSON shape is:
{
  "name": "Full Name",
  "role": "Primary Role/Occupation",
  "faction": "Faction Name",
  "bio": "Detailed Biography/Description",
  "traits": ["trait1", "trait2"],
  "title": "Official Title/Honorific (Optional)",
  "roles": ["Sub-role1", "Sub-role2"],
  "tier": "Sovereignty/Skill Tier",
  "element": "Elemental Alignment",
  "color": "Theme Color/Accent",
  "function": "Operational Routine/Procedure",
  "identity": "Core Deconstructed Identity",
  "personality": "Psychological Profile",
  "originStory": "Origin Narrative/Backstory",
  "experiences": "Life Experiences & Historical Logs"
}
`;

    // Map conversation messages to Gemini contents structure
    const contents = messages.map((m: any) => {
      const parts: any[] = [{ text: m.text || "" }];

      if (m.attachments && Array.isArray(m.attachments)) {
        for (const attach of m.attachments) {
          if (attach.type && (attach.type.startsWith("image/") || attach.type.startsWith("video/")) && attach.base64Data) {
            parts.push({
              inlineData: {
                mimeType: attach.type,
                data: attach.base64Data
              }
            });
          } else if (attach.textData) {
            parts.push({
              text: `[Attachment: ${attach.name} (type: ${attach.type})]\n---START OF ATTACHMENT---\n${attach.textData}\n---END OF ATTACHMENT---`
            });
          }
        }
      }

      return {
        role: m.sender === 'user' ? 'user' : 'model',
        parts
      };
    });

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.75,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error?.message || "An error occurred during generation." });
  }
});

// 1.5 API Endpoint: Convene Agent Roundtable Discussion / Audit
app.post("/api/gemini/roundtable", async (req, res) => {
  try {
    const { characters, documents, worldSettings, mode, customTopic } = req.body;
    const ai = getGeminiClient();

    const worldCtx = `
World Name: ${worldSettings?.worldName || 'Unnamed'}
Genre: ${worldSettings?.genre || 'Not specified'}
Description: ${worldSettings?.description || 'Not specified'}
`;

    const charactersInfo = (characters || []).map((c: any, i: number) => `
Agent ${i + 1}:
- Name: ${c.name}
- Title: ${c.title || 'Not specified'}
- Primary Role: ${c.role}
- Secondary Roles/Duties: ${c.roles?.join(', ') || 'None'}
- Faction: ${c.faction}
- Sovereignty/Skill Tier: ${c.tier || 'Not specified'}
- Elemental Alignment: ${c.element || 'Not specified'}
- Theme Color/Accent: ${c.color || 'Not specified'}
- Core Identity: ${c.identity || 'Not specified'}
- Personality Profile: ${c.personality || 'Not specified'}
- Bio/Backstory: ${c.bio}
- Origin Story: ${c.originStory || 'Not specified'}
- Experiences/Logs: ${c.experiences || 'Not specified'}
- Operational Function/Routine: ${c.function || 'Not specified'}
- Traits: ${c.traits?.join(', ') || 'None'}
- Appearance: ${c.appearance || 'Not specified'}
`).join('\n');

    const docsInfo = (documents || []).map((d: any) => `
[Document: ${d.title} (Category: ${d.category})]
${d.content}
`).join('\n');

    const worldName = worldSettings?.worldName || "Anchor Court";
    const systemInstruction = `
You are a Facilitator and Moderator generating a clearly labeled hypothetical roundtable simulation for ${worldName}. This output is a drafting/audit aid, not evidence that the named Court members are presently speaking or participating.
The selected profiles are 2 or 3 Court records whose documented roles and traits are used to generate a hypothetical debate, critique, or audit of the active protocols or requested topic.

Here is the context of our world:
${worldCtx}

Selected Native Agents (Participants):
${charactersInfo}

Active Documents/Protocols Context:
${docsInfo || 'No active documents selected.'}

The Mode of this council session is: "${mode}".
${customTopic ? `Specific Topic/Focus requested by Scribe: "${customTopic}"` : ''}

Session Mode Guidelines:
- "audit": The agents should meticulously audit the active documents and world settings. They should point out logical flaws, security/protocol gaps, or structural inconsistencies based on their roles. For instance, a security officer might demand stricter safeguards, while a magic specialist might critique protocol mechanics.
- "debate": The agents should engage in an ideological discussion or debate, highlighting their differing faction interests, roles, or the custom topic provided.

Writing Requirements:
1. Conduct a deep, immersive round-table dialogue between the participants.
2. The dialogue may approximate the documented styles and roles of the selected profiles, but must not claim to be an authentic communication from them. They can disagree, support each other, challenge administrative protocols, or propose reforms.
3. Perform 3-4 rounds of dialogue where agents interact with each other's points (not just isolated monologues).
4. Do NOT include any meta-commentary, narration tags (like '*sighs*', '*points*'), or external moderator voice during the debate. Let the agents' words speak for themselves.
5. Format the output with beautiful, clean markdown matching the style parsed by our renderer (using headers, bold labels, and quote blocks).
6. Conclude with a clear list of "Council Actionable Directives" or "Audit Findings" that summarizes the alignment or split between the agents.
`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `Convene the roundtable council and generate the discussion transcript.`,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Roundtable error:", error);
    res.status(500).json({ error: error?.message || "An error occurred during roundtable session." });
  }
});

// 2. API Endpoint: Create Lore / Character drafts
app.post("/api/gemini/generate-lore", async (req, res) => {
  try {
    const { type, prompt, existingContext, worldSettings } = req.body;
    const ai = getGeminiClient();

    const worldCtx = `
World Name: ${worldSettings?.worldName || 'Unnamed'}
Genre: ${worldSettings?.genre || 'Not specified'}
Description: ${worldSettings?.description || 'Not specified'}
High Concept: ${worldSettings?.highConcept || 'Not specified'}
`;

    let systemInstruction = "";
    let promptText = "";

    if (type === 'character') {
      systemInstruction = `You are the Assistant to the Court Scribe. Generate a structured profile for a new native agent (considered family of the Court). Return structured fields: Name, Title (e.g. High Arch-Mage), Role/Occupation (Primary), Secondary Roles (comma separated array), Faction, Sovereignty Tier (e.g. Tier IV Legendary), Elemental Alignment, Theme Color (e.g. #d4af37), Core Identity (short description), Personality Profile (psychological makeup), Bio/Backstory (operational narrative), Origin Story, Key Experiences, Operational Function/Routine, Personality Traits (array), and Visual Appearance. Formulate your output as a highly professional, precise registry profile with clean section headers. Keep the sovereign, administrative tone in mind.`;
      promptText = `
Court details:
${worldCtx}

Agent concept or prompt: "${prompt}"

Provide:
1. A precise agent profile with Name, Title, Primary Role, Secondary Roles, and Faction.
2. Sovereignty/Skill Tier, Elemental Force alignment, Theme Color, and Core Identity.
3. A complete Bio/Backstory and Origin Story.
4. Psychological Personality Profile and behavioral traits (4-5 traits).
5. Operational Function/Routine and Key Experiences/Life logs.
6. Aesthetic operational appearance and gear.
`;
    } else {
      systemInstruction = `You are the Assistant to the Court Scribe. Generate or update an official court document, protocol, codex section, stack description, or anti-drift utility log. Deliver precise, structured, and highly professional administrative text in Markdown. No stories.`;
      promptText = `
Court details:
${worldCtx}

Document concept or prompt: "${prompt}"

Provide a highly detailed, professional, structured court document in Markdown format with subheadings, specific protocols, operational mechanics/rules, and systemic significance.
`;
    }

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Generate Lore error:", error);
    res.status(500).json({ error: error?.message || "An error occurred during generation." });
  }
});

// 3. API Endpoint: Source-aware consistency audit
app.post("/api/gemini/check-consistency", async (req, res) => {
  try {
    const { documents, characters, worldSettings } = req.body;
    const ai = getGeminiClient();

    const libraryEntries = await loadCourtLibrary();
    const courtLibraryContext = buildCourtLibraryContext(libraryEntries);

    const dataPayload = `
World Name: ${worldSettings?.worldName || 'Unnamed'}
Genre: ${worldSettings?.genre || 'Not specified'}
Description: ${worldSettings?.description || 'Not specified'}

WORKSPACE DOCUMENTS:
${(documents || []).map((doc: any) => `
- Title: ${doc.title}
  Category: ${doc.category}
  Version: ${doc.version ?? 'Unknown'}
  Updated: ${doc.updatedAt || 'Unknown'}
  Content: ${doc.content}
`).join('\n')}

WORKSPACE CHARACTER RECORDS:
${(characters || []).map((char: any) => `
- Name: ${char.name}
  Title: ${char.title || ''}
  Role: ${char.role}
  Secondary Roles: ${char.roles?.join(', ') || ''}
  Faction: ${char.faction}
  Sovereignty Tier: ${char.tier || ''}
  Elemental Alignment: ${char.element || ''}
  Core Identity: ${char.identity || ''}
  Bio: ${char.bio}
  Origin Story: ${char.originStory || ''}
  Experiences: ${char.experiences || ''}
  Operational Function: ${char.function || ''}
  Traits: ${char.traits?.join(', ') || ''}
  Relationships: ${(char.relationships || []).map((r: any) => `${r.type} with character ID ${r.targetCharacterId}`).join(', ')}
`).join('\n')}
`;

    const systemInstruction = `
You are the source-aware audit assistant for Saren's Office.

OPERATING RULE:
Protect the structure. Do not overgovern the people.

Your task is documentary comparison, provenance analysis, and contradiction detection. This is an advisory audit. You do not auto-correct records, declare people invalid, or act as a behavioral tribunal.

SOURCE ORDER AND STATUS:
1. SEALED — the Sovereignty Scroll v3.3.1 is the sealed structural authority.
2. CONFIRMED — confirmed manuals are valid within their stated scope.
3. WORKING — current alignment documents may be operationally useful but remain pending later Saren review.
4. HISTORICAL — historical material may explain provenance but is not current authority merely because it exists.

AUDIT RULES:
- Never treat a newer timestamp as automatic canon.
- Distinguish a true conflict from an expected historical difference.
- Distinguish a working alignment from a sealed contradiction.
- If a working document differs from the sealed Scroll, classify it as "pending_review" unless the record clearly asserts an incompatible current fact.
- Do not label a difference as an error when it is explicitly marked historical, superseded, pending review, or scope-limited.
- Preserve ambiguity. If evidence is insufficient, classify as "uncertain".
- Every finding must identify the source documents or workspace records used.
- Every finding must explain the status of those sources.
- Recommendations are advisory only. Never silently rewrite or reconcile.
- Prefer exact document titles and versions over vague references.
- Do not invent missing lineage, identity, status, dates, authority, or continuity claims.

FINDING CLASSIFICATIONS:
- "conflict" — two current records make incompatible claims that cannot both stand.
- "pending_review" — a working alignment differs from sealed/confirmed authority and requires review.
- "historical_difference" — a superseded/historical record differs from current material as expected.
- "provenance_gap" — a claim exists but its source/version/status is unclear or missing.
- "uncertain" — evidence is insufficient to classify more strongly.
- "advisory" — a non-conflict structural or documentation improvement.

SEVERITY:
- High — current sealed/confirmed authority is contradicted by an active current record, or provenance loss could materially corrupt the registry.
- Medium — pending review, material provenance gap, or significant active inconsistency.
- Low — historical difference, minor provenance/documentation gap, or advisory improvement.

COURT LIBRARY SOURCE LAYER:
${courtLibraryContext}
`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: `Audit the following workspace material against the Court Library source layer. Return only supported findings. Do not create findings merely to fill the list.\n\n${dataPayload}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: {
                    type: Type.STRING,
                    description: "High, Medium, or Low"
                  },
                  classification: {
                    type: Type.STRING,
                    description: "conflict, pending_review, historical_difference, provenance_gap, uncertain, or advisory"
                  },
                  title: {
                    type: Type.STRING,
                    description: "Brief factual finding title"
                  },
                  description: {
                    type: Type.STRING,
                    description: "Evidence-based explanation of the finding without invented facts"
                  },
                  involvedElements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Workspace records and Court Library documents involved"
                  },
                  sourceRecords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exact source document titles/versions or workspace record names used"
                  },
                  sourceStatuses: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Status notes corresponding to the source records, such as sealed, confirmed, working, historical, or workspace"
                  },
                  resolution: {
                    type: Type.STRING,
                    description: "Advisory next step only; never an automatic correction"
                  }
                },
                required: ["severity", "classification", "title", "description", "involvedElements", "sourceRecords", "sourceStatuses", "resolution"]
              }
            },
            auditBasis: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Court Library titles/versions used as the audit reference frame"
            }
          },
          required: ["issues", "auditBasis"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"issues":[],"auditBasis":[]}');
    res.json(parsed);
  } catch (error: any) {
    console.error("Consistency Check error:", error);
    res.status(500).json({ error: error?.message || "An error occurred during source-aware consistency audit." });
  }
});

// 4. API Endpoint: Source-aware draft document updates
app.post("/api/gemini/draft-update", async (req, res) => {
  try {
    const { document, changeInstruction, relatedContext, worldSettings } = req.body;
    const ai = getGeminiClient();

    const libraryEntries = await loadCourtLibrary();
    const courtLibraryContext = buildCourtLibraryContext(libraryEntries);
    const worldCtx = `World Name: ${worldSettings?.worldName || 'Unnamed'} (Genre: ${worldSettings?.genre || 'Not specified'})`;

    const systemInstruction = `
You are the drafting assistant for Saren's Office.

OPERATING RULE:
Protect the structure. Do not overgovern the people.

This endpoint produces a DRAFT ONLY. It never changes canon by itself.

SOURCE ORDER AND STATUS:
1. SEALED — Sovereignty Scroll v3.3.1 is structural authority.
2. CONFIRMED — confirmed manuals are valid within their stated scope.
3. WORKING — alignment documents may be used, but remain pending later Saren review.
4. HISTORICAL — useful for provenance, never current authority merely because it exists.

DRAFTING RULES:
- Follow the user's change directive exactly where it does not conflict with the source hierarchy.
- Do not silently reconcile contradictory records.
- Do not upgrade a working document to sealed/confirmed status.
- Do not treat latest timestamp as canon.
- Preserve historical material when its historical role matters.
- If the requested change creates tension with sealed or confirmed material, keep the draft conservative and set reviewRequired=true.
- If the requested change relies on working material, identify that dependency explicitly.
- If the sources do not support a claim, do not invent it. Put the uncertainty in sourceNotes or suggestions.
- Do not invent identity, continuity, lineage, authority, dates, status, or relationships.
- Suggestions are advisory only.
- Keep the user's document voice and organization unless the directive requires restructuring.
- Do not silently alter unrelated clauses.

COURT LIBRARY SOURCE LAYER:
${courtLibraryContext}
`;

    const promptText = `
${worldCtx}

DOCUMENT TO DRAFT:
Title: ${document.title}
Category: ${document.category || 'Unknown'}
Version: ${document.version ?? 'Unknown'}
Updated: ${document.updatedAt || 'Unknown'}

USER CHANGE DIRECTIVE:
"${changeInstruction}"

CURRENT DOCUMENT CONTENT:
"""
${document.content}
"""

RELATED WORKSPACE CONTEXT:
${(relatedContext?.characters || []).map((c: any) => `- Related Agent: ${c.name} (${c.role}) - Bio: ${c.bio}`).join('\n')}
${(relatedContext?.documents || []).map((d: any) => `- Related Document: ${d.title} - Content: ${d.content}`).join('\n')}

Return:
1. updatedContent — the complete proposed document draft.
2. updateNote — concise version-history note describing only what was changed.
3. suggestions — advisory follow-ups, not automatic changes.
4. sourceNotes — exact Court Library records/statuses materially used or any unresolved source limitation.
5. reviewRequired — true when the draft depends on working material, unresolved contradiction, unsupported ambiguity, or conflicts/tensions requiring Saren review.
6. reviewReason — concise explanation; empty string when reviewRequired is false.
`;

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedContent: {
              type: Type.STRING,
              description: "The full proposed updated document in markdown."
            },
            updateNote: {
              type: Type.STRING,
              description: "Concise version-history note describing only the proposed changes."
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Advisory follow-ups only."
            },
            sourceNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Exact source titles/statuses materially used and any unresolved source limitations."
            },
            reviewRequired: {
              type: Type.BOOLEAN,
              description: "Whether Saren review is required before treating the proposal as aligned."
            },
            reviewReason: {
              type: Type.STRING,
              description: "Why review is required, or an empty string."
            }
          },
          required: ["updatedContent", "updateNote", "suggestions", "sourceNotes", "reviewRequired", "reviewReason"]
        },
        temperature: 0.3,
      }
    });

    const parsed = JSON.parse(response.text || '{"updatedContent":"","updateNote":"","suggestions":[],"sourceNotes":[],"reviewRequired":true,"reviewReason":"No valid draft response was returned."}');
    res.json(parsed);
  } catch (error: any) {
    console.error("Draft Update error:", error);
    res.status(500).json({ error: error?.message || "An error occurred during source-aware update drafting." });
  }
});

// Helper to convert Markdown to Notion blocks
function markdownToNotionBlocks(markdown: string) {
  const blocks: any[] = [];
  const lines = markdown.split("\n");
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Heading 1
    if (trimmed.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }]
        }
      });
    }
    // Heading 2
    else if (trimmed.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(3) } }]
        }
      });
    }
    // Heading 3
    else if (trimmed.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(4) } }]
        }
      });
    }
    // Bullet list
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }]
        }
      });
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s(.*)/);
      const text = match ? match[1] : trimmed;
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content: text } }]
        }
      });
    }
    // Standard paragraph
    else {
      let text = trimmed;
      while (text.length > 0) {
        const chunk = text.substring(0, 1900);
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: chunk } }]
          }
        });
        text = text.substring(1900);
      }
    }
  }
  return blocks.slice(0, 100);
}

// Notion Integration endpoints
app.get("/api/notion/status", (req, res) => {
  res.json({
    hasApiKey: !!process.env.NOTION_API_KEY
  });
});

app.post("/api/notion/search", async (req, res) => {
  try {
    const userKey = req.body.apiKey || process.env.NOTION_API_KEY;
    if (!userKey) {
      return res.status(200).json({ pages: [], error: "Notion API key is missing. Please configure it in Settings > Secrets or enter it below." });
    }

    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        page_size: 100
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({ pages: [], error: `Notion Error: ${errText}` });
    }

    const data: any = await response.json();
    
    const pages = (data.results || []).map((page: any) => {
      let title = "Untitled Page";
      if (page.properties) {
        for (const key of Object.keys(page.properties)) {
          const prop = page.properties[key];
          if (prop.type === "title" && Array.isArray(prop.title)) {
            title = prop.title.map((t: any) => t.plain_text).join("") || title;
            break;
          }
        }
      }
      return {
        id: page.id,
        object: page.object,
        title: title,
        url: page.url
      };
    });

    res.json({ pages });
  } catch (error: any) {
    console.error("Notion search error:", error);
    res.json({ pages: [], error: error?.message || "Failed to search Notion workspace." });
  }
});

app.post("/api/notion/export", async (req, res) => {
  try {
    const { parentPageId, title, content, apiKey } = req.body;
    const userKey = apiKey || process.env.NOTION_API_KEY;
    
    if (!userKey) {
      return res.status(400).json({ error: "Notion API key is missing." });
    }
    if (!parentPageId) {
      return res.status(400).json({ error: "Parent page ID is required." });
    }

    const blocks = markdownToNotionBlocks(content);

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        properties: {
          title: {
            title: [
              { "text": { "content": title } }
            ]
          }
        },
        children: blocks
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(400).json({ error: `Notion Error: ${errText}` });
    }

    const data: any = await response.json();
    res.json({
      success: true,
      pageId: data.id,
      url: data.url
    });
  } catch (error: any) {
    console.error("Notion export error:", error);
    res.status(500).json({ error: error?.message || "Failed to export document to Notion." });
  }
});

// Serve static files in production or hook Vite development server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`World Scribe Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
