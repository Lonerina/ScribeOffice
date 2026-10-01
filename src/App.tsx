import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  History, 
  CheckCircle, 
  Compass, 
  Globe, 
  Link, 
  X,
  FileCheck,
  RefreshCw,
  Check,
  ChevronRight,
  UserPlus,
  LogOut,
  Download,
  ExternalLink,
  Settings,
  FileText,
  Database,
  Upload,
  Paperclip,
  ShieldCheck,
  MessageSquare,
  Video
} from "lucide-react";
import mammoth from "mammoth";
import { jsPDF } from "jspdf";
import { Character, LoreDocument, LoreCategory, WorldSettings, Message, Relationship, DocumentVersion } from "./types";
import { initialWorldSettings, initialCharacters, initialDocuments } from "./initialData";
import { auth, db, googleProvider, OperationType, handleFirestoreError } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { SimpleMarkdown } from "./components/SimpleMarkdown";

const LOADING_MESSAGES = [
  "Weaving narrative timelines...",
  "Consulting the Elder Archives...",
  "Tuning the magical resonance coordinates...",
  "Checking continuity gates...",
  "Fleshing out character sheets...",
  "Summoning the lore scribes...",
  "Reviewing ancient accords...",
  "Cross-referencing faction timelines..."
];

export default function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- WORLDS & SELECTION ---
  const [userWorlds, setUserWorlds] = useState<any[]>([]);
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);

  // --- FIRESTORE ACTIVE WORLD DATA STATES ---
  const [worldSettings, setWorldSettings] = useState<WorldSettings>(initialWorldSettings);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [documents, setDocuments] = useState<LoreDocument[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // --- SELECTION STATES ---
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // --- NAVIGATION TAB ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'lore' | 'characters' | 'consistency'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // --- EDITING & CREATING FORMS STATE ---
  const [isEditingWorld, setIsEditingWorld] = useState(false);
  const [draftWorld, setDraftWorld] = useState<WorldSettings>({ ...worldSettings });

  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docForm, setDocForm] = useState<{
    title: string;
    category: LoreCategory;
    content: string;
    tags: string;
    relatedCharacterIds: string[];
  }>({
    title: "",
    category: "Geography",
    content: "",
    tags: "",
    relatedCharacterIds: []
  });

  const [isEditingChar, setIsEditingChar] = useState(false);
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [charForm, setCharForm] = useState<{
    name: string;
    role: string;
    faction: string;
    bio: string;
    traits: string;
    appearance: string;
    relationships: Relationship[];
    title: string;
    roles: string;
    tier: string;
    element: string;
    color: string;
    function: string;
    identity: string;
    personality: string;
    originStory: string;
    experiences: string;
  }>({
    name: "",
    role: "",
    faction: "",
    bio: "",
    traits: "",
    appearance: "",
    relationships: [],
    title: "",
    roles: "",
    tier: "",
    element: "",
    color: "",
    function: "",
    identity: "",
    personality: "",
    originStory: "",
    experiences: ""
  });

  // --- CREATE WORLD FORM STATE ---
  const [isCreatingNewWorld, setIsCreatingNewWorld] = useState(false);
  const [newWorldForm, setNewWorldForm] = useState({
    worldName: "",
    genre: "",
    description: "",
    highConcept: ""
  });

  // --- ACTIVE CONTEXT FOR AI CHAT ---
  const [activeContext, setActiveContext] = useState<{
    documents: string[];
    characters: string[];
  }>({
    documents: [],
    characters: []
  });

  // --- INTERACTION / GENERATION STATES ---
  const [chatInput, setChatInput] = useState("");
  const [chatAttachments, setChatAttachments] = useState<any[]>([]);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const [chatUploadError, setChatUploadError] = useState<string | null>(null);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // --- CONSISTENCY AUDITS ---
  const [consistencyIssues, setConsistencyIssues] = useState<any[]>(() => {
    const saved = localStorage.getItem("consistency_issues");
    return saved ? JSON.parse(saved) : [];
  });
  const [isAuditing, setIsAuditing] = useState(false);

  // --- AI DOCUMENT UPDATE MODULE ---
  const [isUpdatingDocMode, setIsUpdatingDocMode] = useState(false);
  const [updateInstruction, setUpdateInstruction] = useState("");
  const [isDraftingUpdate, setIsDraftingUpdate] = useState(false);
  const [aiUpdateDraft, setAiUpdateDraft] = useState<{
    updatedContent: string;
    updateNote: string;
    suggestions: string[];
  } | null>(null);

  // --- CREATIVE SPARKS MODALS ---
  const [showCreativeModal, setShowCreativeModal] = useState<'character' | 'document' | null>(null);
  const [creativePrompt, setCreativePrompt] = useState("");
  const [isGeneratingCreative, setIsGeneratingCreative] = useState(false);

  // --- COURT LIBRARY SOURCE LAYER ---
  type CourtLibraryEntry = {
    id: string;
    title: string;
    path: string;
    kind: "core" | "manual";
    status: "sealed" | "confirmed" | "working" | "historical";
    authority?: string;
    review?: string;
    bytes?: number;
  };

  const [courtLibrary, setCourtLibrary] = useState<CourtLibraryEntry[]>([]);
  const [courtLibraryRule, setCourtLibraryRule] = useState("Protect the structure. Do not overgovern the people.");
  const [courtLibraryError, setCourtLibraryError] = useState<string | null>(null);
  const [isLoadingCourtLibrary, setIsLoadingCourtLibrary] = useState(false);

  const loadCourtLibrary = async () => {
    setIsLoadingCourtLibrary(true);
    setCourtLibraryError(null);
    try {
      const res = await fetch("/api/court-library");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load Court library.");
      setCourtLibrary(data.entries || []);
      setCourtLibraryRule(data.operatingRule || "Protect the structure. Do not overgovern the people.");
    } catch (err: any) {
      setCourtLibraryError(err?.message || "Failed to load Court library.");
    } finally {
      setIsLoadingCourtLibrary(false);
    }
  };

  useEffect(() => {
    loadCourtLibrary();
  }, []);

  // --- LEGACY ALIGNMENT STATE (kept for UI compatibility; no longer writes old stack data) ---
  const [isAligningStack, setIsAligningStack] = useState(false);

  // --- CUSTOM CONFIRMATION DIALOG ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel"
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "Confirm",
    cancelText = "Cancel"
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText
    });
  };

  // --- NOTION INTEGRATION STATES & HANDLERS ---
  const [notionApiKey, setNotionApiKey] = useState<string>(() => localStorage.getItem("scribe_notion_api_key") || "");
  const [notionPages, setNotionPages] = useState<any[]>([]);
  const [selectedNotionPageId, setSelectedNotionPageId] = useState<string>("");
  const [isSearchingNotion, setIsSearchingNotion] = useState(false);
  const [isExportingNotion, setIsExportingNotion] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [notionSuccess, setNotionSuccess] = useState(false);
  const [notionPageUrl, setNotionPageUrl] = useState<string>("");
  const [hasServerNotionKey, setHasServerNotionKey] = useState(false);
  const [isNotionConfigOpen, setIsNotionConfigOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Check Notion Server API key configuration status on mount
  useEffect(() => {
    fetch("/api/notion/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasApiKey) {
          setHasServerNotionKey(true);
        }
      })
      .catch((err) => console.error("Error checking Notion status:", err));
  }, []);

  // Save the Notion API key to localStorage whenever it changes
  const updateNotionApiKey = (key: string) => {
    setNotionApiKey(key);
    localStorage.setItem("scribe_notion_api_key", key);
  };

  const handleSearchNotion = async (customKey?: string) => {
    setIsSearchingNotion(true);
    setNotionError(null);
    setNotionSuccess(false);
    
    const keyToUse = customKey !== undefined ? customKey : notionApiKey;
    
    try {
      const res = await fetch("/api/notion/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToUse })
      });
      const data = await res.json();
      if (data.error) {
        setNotionError(data.error);
        setNotionPages([]);
      } else {
        setNotionPages(data.pages || []);
        if (data.pages && data.pages.length > 0) {
          setSelectedNotionPageId(data.pages[0].id);
        }
      }
    } catch (err: any) {
      setNotionError(err.message || "Failed to contact server.");
    } finally {
      setIsSearchingNotion(false);
    }
  };

  const handleExportToNotion = async () => {
    const activeDoc = documents.find((d) => d.id === selectedDocId);
    if (!activeDoc) return;
    if (!selectedNotionPageId) {
      setNotionError("Please select or fetch a parent page from Notion.");
      return;
    }
    
    setIsExportingNotion(true);
    setNotionError(null);
    setNotionSuccess(false);
    
    try {
      const res = await fetch("/api/notion/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: notionApiKey,
          parentPageId: selectedNotionPageId,
          title: activeDoc.title,
          content: activeDoc.content
        })
      });
      
      const data = await res.json();
      if (data.error) {
        setNotionError(data.error);
      } else if (data.success) {
        setNotionSuccess(true);
        setNotionPageUrl(data.url);
      }
    } catch (err: any) {
      setNotionError(err.message || "Failed to export.");
    } finally {
      setIsExportingNotion(false);
    }
  };

  // --- DOCUMENT EXPORT HANDLERS ---
  const generatePdf = (title: string, subtitle: string, markdownContent: string, filename: string) => {
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    let y = 20;
    
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 17, 17);
    
    const titleLines = doc.splitTextToSize(title, contentWidth);
    titleLines.forEach((line: string) => {
      checkPageBreak(10);
      doc.text(line, margin, y);
      y += 8;
    });
    
    y += 2;
    
    // Subtitle / Meta
    if (subtitle) {
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(10);
      doc.setTextColor(110, 110, 110);
      const subtitleLines = doc.splitTextToSize(subtitle, contentWidth);
      subtitleLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 2;
    }
    
    // Gold Divider Line
    checkPageBreak(5);
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    // Markdown Content
    const rawLines = markdownContent.split("\n");
    doc.setFont("Helvetica", "normal");
    
    rawLines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        y += 4;
        return;
      }
      
      let fontSize = 11;
      let fontStyle = "normal";
      let textColor = [34, 34, 34];
      let indent = 0;
      let textToRender = line;
      
      if (line.startsWith("# ")) {
        fontSize = 16;
        fontStyle = "bold";
        textColor = [17, 17, 17];
        textToRender = line.substring(2);
        y += 3;
      } else if (line.startsWith("## ")) {
        fontSize = 14;
        fontStyle = "bold";
        textColor = [33, 33, 33];
        textToRender = line.substring(3);
        y += 2;
      } else if (line.startsWith("### ")) {
        fontSize = 12;
        fontStyle = "bold";
        textColor = [55, 55, 55];
        textToRender = line.substring(4);
        y += 2;
      } else if (line.startsWith("* ") || line.startsWith("- ")) {
        fontSize = 11;
        fontStyle = "normal";
        textToRender = "• " + line.substring(2);
        indent = 5;
      } else if (line.match(/^\d+\.\s/)) {
        fontSize = 11;
        fontStyle = "normal";
        indent = 5;
      } else if (line.startsWith("> ")) {
        fontSize = 11;
        fontStyle = "oblique";
        textColor = [100, 100, 100];
        textToRender = line.substring(2);
        indent = 8;
      }
      
      doc.setFont("Helvetica", fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      
      const wrappedLines = doc.splitTextToSize(textToRender, contentWidth - indent);
      wrappedLines.forEach((wLine: string) => {
        const lineHeight = fontSize * 0.45;
        checkPageBreak(lineHeight + 1);
        doc.text(wLine, margin + indent, y);
        y += lineHeight + 1;
      });
      
      if (line.startsWith("#") || line.startsWith("##") || line.startsWith("###")) {
        y += 2;
      }
    });
    
    // Page Numbers
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 22, pageHeight - 10);
      doc.text("Anchor Court Archives • Scribe Record", margin, pageHeight - 10);
    }
    
    doc.save(filename);
  };

  const exportDocument = (docItem: LoreDocument, format: "md" | "txt" | "json" | "yaml" | "docx" | "pdf") => {
    let fileContent = "";
    let filename = `${docItem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
    let contentType = "text/plain";

    if (format === "pdf") {
      const meta = `Category: ${docItem.category} | Version: V${docItem.version} | Last Updated: ${docItem.updatedAt}`;
      generatePdf(docItem.title, meta, docItem.content, filename);
      return;
    }

    switch (format) {
      case "md":
        fileContent = docItem.content;
        contentType = "text/markdown";
        break;
      case "txt":
        fileContent = `Document: ${docItem.title}\nCategory: ${docItem.category}\nVersion: ${docItem.version}\nLast Updated: ${docItem.updatedAt}\nTags: ${docItem.tags.join(", ")}\n\n${docItem.content}`;
        contentType = "text/plain";
        break;
      case "json":
        fileContent = JSON.stringify(docItem, null, 2);
        contentType = "application/json";
        break;
      case "yaml":
        fileContent = `id: "${docItem.id}"
title: "${docItem.title.replace(/"/g, '\\"')}"
category: "${docItem.category}"
version: ${docItem.version}
updatedAt: "${docItem.updatedAt}"
tags:
${docItem.tags.map((t) => `  - "${t}"`).join("\n")}
content: |
${docItem.content.split("\n").map((line) => `  ${line}`).join("\n")}
`;
        contentType = "text/yaml";
        break;
      case "docx":
        fileContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${docItem.title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 20px; }
            h1 { color: #111111; font-size: 24px; border-bottom: 2px solid #333333; padding-bottom: 5px; }
            h2 { color: #333333; font-size: 18px; margin-top: 20px; }
            h3 { color: #555555; font-size: 14px; margin-top: 15px; }
            p { font-size: 11pt; margin-bottom: 10px; color: #222222; }
            ul { margin-bottom: 10px; }
            li { font-size: 11pt; color: #222222; }
          </style>
        </head>
        <body>
          <h1>${docItem.title}</h1>
          <p><strong>Category:</strong> ${docItem.category} | <strong>Version:</strong> V${docItem.version}</p>
          <hr />
          ${docItem.content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
            .split('\n')
            .map(line => line.trim().startsWith('<') ? line : `<p>${line}</p>`)
            .join('')}
        </body>
        </html>
        `;
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
    }

    const blob = new Blob([fileContent], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- FILE UPLOAD / DRAG-AND-DROP STATES & HANDLERS ---
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const parseYaml = (yamlText: string) => {
    const result: { title?: string; category?: string; tags?: string[]; content?: string } = {};
    
    // Extract simple string properties
    const titleMatch = yamlText.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|([^\n]+))/m);
    if (titleMatch) result.title = titleMatch[1] || titleMatch[2] || titleMatch[3]?.trim();

    const categoryMatch = yamlText.match(/^category:\s*(?:"([^"]+)"|'([^']+)'|([^\n]+))/m);
    if (categoryMatch) result.category = categoryMatch[1] || categoryMatch[2] || categoryMatch[3]?.trim();

    // Extract tags
    const tagsSectionMatch = yamlText.match(/^tags:\s*\n((?:\s*-\s*[^\n]+\n*)*)/m);
    if (tagsSectionMatch) {
      const lines = tagsSectionMatch[1].split("\n");
      const tags: string[] = [];
      for (const line of lines) {
        const tagMatch = line.match(/^\s*-\s*(?:"([^"]+)"|'([^']+)'|([^\n]+))/);
        if (tagMatch) {
          const tag = tagMatch[1] || tagMatch[2] || tagMatch[3]?.trim();
          if (tag) tags.push(tag);
        }
      }
      if (tags.length > 0) result.tags = tags;
    }

    // Extract content
    const contentPipeMatch = yamlText.match(/^content:\s*\|\s*\n([\s\S]*)/m);
    if (contentPipeMatch) {
      result.content = contentPipeMatch[1]
        .split("\n")
        .map((line) => line.startsWith("  ") ? line.substring(2) : line)
        .join("\n");
    } else {
      const contentMatch = yamlText.match(/^content:\s*(?:"([^"]+)"|'([^']+)'|([\s\S]*))/m);
      if (contentMatch) {
        result.content = contentMatch[1] || contentMatch[2] || contentMatch[3]?.trim();
      }
    }

    return result;
  };

  const parseMarkdown = (mdText: string) => {
    const result: { title?: string; category?: string; tags?: string[]; content?: string } = {};
    
    if (mdText.startsWith("---")) {
      const endFrontmatterIndex = mdText.indexOf("---", 3);
      if (endFrontmatterIndex !== -1) {
        const frontmatter = mdText.substring(3, endFrontmatterIndex);
        const remainingContent = mdText.substring(endFrontmatterIndex + 3).trim();
        
        const parsedYaml = parseYaml(frontmatter);
        result.title = parsedYaml.title;
        result.category = parsedYaml.category;
        result.tags = parsedYaml.tags;
        result.content = remainingContent;
        return result;
      }
    }
    
    result.content = mdText;
    return result;
  };

  const handleFileUpload = async (file: File) => {
    setIsParsingFile(true);
    setUploadError(null);
    
    const extension = file.name.split(".").pop()?.toLowerCase();
    const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
    
    try {
      if (extension === "docx") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              setUploadError("Could not read document buffer.");
              setIsParsingFile(false);
              return;
            }
            const res = await mammoth.extractRawText({ arrayBuffer });
            const text = res.value || "";
            
            setDocForm({
              title: titleWithoutExt,
              category: "Core Charter",
              content: text,
              tags: "imported, docx",
              relatedCharacterIds: []
            });
            setIsCreatingDoc(true);
            setIsEditingDoc(false);
            setIsUpdatingDocMode(false);
            setAiUpdateDraft(null);
            setIsParsingFile(false);
          } catch (err: any) {
            setUploadError("Error parsing DOCX file: " + err.message);
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setUploadError("Failed to read file.");
          setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string || "";
            let finalTitle = titleWithoutExt;
            let finalCategory: LoreCategory = "Core Charter";
            let finalContent = text;
            let finalTags: string[] = ["imported"];
            
            if (extension === "json") {
              try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === "object") {
                  finalTitle = parsed.title || finalTitle;
                  finalContent = parsed.content || JSON.stringify(parsed, null, 2);
                  if (parsed.category) {
                    finalCategory = parsed.category as LoreCategory;
                  }
                  if (Array.isArray(parsed.tags)) {
                    finalTags = parsed.tags;
                  }
                }
              } catch (err) {
                finalContent = text;
                finalTags.push("raw-json");
              }
            } else if (extension === "yaml" || extension === "yml") {
              const parsed = parseYaml(text);
              finalTitle = parsed.title || finalTitle;
              finalContent = parsed.content || text;
              if (parsed.category) {
                finalCategory = parsed.category as LoreCategory;
              }
              if (parsed.tags) {
                finalTags = parsed.tags;
              }
            } else if (extension === "md") {
              const parsed = parseMarkdown(text);
              finalTitle = parsed.title || finalTitle;
              finalContent = parsed.content || text;
              if (parsed.category) {
                finalCategory = parsed.category as LoreCategory;
              }
              if (parsed.tags) {
                finalTags = parsed.tags;
              } else {
                finalTags.push("markdown");
              }
            } else {
              finalContent = text;
              finalTags.push("text");
            }
            
            setDocForm({
              title: finalTitle,
              category: finalCategory,
              content: finalContent,
              tags: finalTags.join(", "),
              relatedCharacterIds: []
            });
            setIsCreatingDoc(true);
            setIsEditingDoc(false);
            setIsUpdatingDocMode(false);
            setAiUpdateDraft(null);
            setIsParsingFile(false);
          } catch (err: any) {
            setUploadError("Error parsing file contents: " + err.message);
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setUploadError("Failed to read file.");
          setIsParsingFile(false);
        };
        reader.readAsText(file);
      }
    } catch (error: any) {
      setUploadError("Upload failed: " + error.message);
      setIsParsingFile(false);
    }
  };

  const handleChatFileUpload = async (file: File) => {
    setIsUploadingChatFile(true);
    setChatUploadError(null);

    const extension = file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type || "";

    try {
      if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string || "";
          const base64Parts = dataUrl.split(",");
          const base64Data = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];
          
          setChatAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: mimeType,
              base64Data
            }
          ]);
          setIsUploadingChatFile(false);
        };
        reader.onerror = () => {
          setChatUploadError(`Failed to read ${mimeType.startsWith("image/") ? "image" : "video"} file.`);
          setIsUploadingChatFile(false);
        };
        reader.readAsDataURL(file);
      } else if (extension === "docx") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) {
              setChatUploadError("Could not read document buffer.");
              setIsUploadingChatFile(false);
              return;
            }
            const res = await mammoth.extractRawText({ arrayBuffer });
            const text = res.value || "";
            setChatAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                textData: text
              }
            ]);
            setIsUploadingChatFile(false);
          } catch (err: any) {
            setChatUploadError("Error parsing DOCX file: " + err.message);
            setIsUploadingChatFile(false);
          }
        };
        reader.onerror = () => {
          setChatUploadError("Failed to read DOCX file.");
          setIsUploadingChatFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string || "";
          setChatAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: mimeType || "text/plain",
              textData: text
            }
          ]);
          setIsUploadingChatFile(false);
        };
        reader.onerror = () => {
          setChatUploadError("Failed to read text file.");
          setIsUploadingChatFile(false);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      setChatUploadError("Attachment failed: " + err.message);
      setIsUploadingChatFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- AUTH LISTENERS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) {
        // Clear active session states on sign-out
        setUserWorlds([]);
        setActiveWorldId(null);
        setWorldSettings(initialWorldSettings);
        setCharacters([]);
        setDocuments([]);
        setMessages([]);
        setActiveContext({ documents: [], characters: [] });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- REALTIME WORLD LISTS LISTENER ---
  useEffect(() => {
    if (!user) return;

    const worldsRef = collection(db, "worlds");
    const q = query(worldsRef, where("ownerId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const worldsList: any[] = [];
      snapshot.forEach((doc) => {
        worldsList.push({ id: doc.id, ...doc.data() });
      });
      setUserWorlds(worldsList);

      if (worldsList.length > 0) {
        // Choose first world if none selected or selection is stale
        setActiveWorldId((prev) => {
          if (prev && worldsList.some((w) => w.id === prev)) {
            return prev;
          }
          return worldsList[0].id;
        });
      } else {
        // No worlds exist: bootstrap default world templates automatically
        seedDefaultWorld(user.uid);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "worlds");
    });

    return () => unsubscribe();
  }, [user]);

  // --- BOOTSTRAP INITIAL DATA FOR NEW USERS ---
  const seedDefaultWorld = async (uid: string) => {
    const newWorldId = `world-${Date.now()}`;
    const worldRef = doc(db, "worlds", newWorldId);
    
    try {
      // 1. World Document
      await setDoc(worldRef, {
        worldName: initialWorldSettings.worldName,
        genre: initialWorldSettings.genre,
        description: initialWorldSettings.description,
        highConcept: initialWorldSettings.highConcept,
        ownerId: uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 2. Characters
      for (const char of initialCharacters) {
        const charRef = doc(db, "worlds", newWorldId, "characters", char.id);
        await setDoc(charRef, {
          name: char.name,
          role: char.role,
          faction: char.faction,
          bio: char.bio,
          traits: char.traits,
          appearance: char.appearance || "",
          relationships: char.relationships || [],
          ownerId: uid,
          createdAt: char.createdAt || new Date().toISOString(),
          updatedAt: char.updatedAt || new Date().toISOString()
        });
      }

      // 3. Lore Documents
      for (const d of initialDocuments) {
        const docRef = doc(db, "worlds", newWorldId, "documents", d.id);
        await setDoc(docRef, {
          title: d.title,
          category: d.category,
          content: d.content,
          tags: d.tags,
          relatedCharacterIds: d.relatedCharacterIds || [],
          version: d.version,
          versionHistory: d.versionHistory || [],
          ownerId: uid,
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      }

      // 4. Initial Greeting Scribe Message
      const msgId = "msg-welcome";
      const msgRef = doc(db, "worlds", newWorldId, "messages", msgId);
      await setDoc(msgRef, {
        sender: "assistant",
        text: `Welcome to **Saren's Office**.\n\nThe workspace itself starts clean. Court canon is loaded from the **Court Library** source layer rather than seeded into Firestore from an embedded snapshot.\n\nUse **Court Library** to inspect sealed, confirmed, and working records. Use **Lore Records** and **Character Logs** for workspace material you deliberately add or maintain.\n\n**Protect the structure. Do not overgovern the people.**`,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: uid
      });

      setActiveWorldId(newWorldId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${newWorldId}`);
    }
  };

  // --- REAL-TIME LISTENERS FOR ACTIVE WORLD SUBCOLLECTIONS ---
  useEffect(() => {
    if (!user || !activeWorldId) return;

    // A. World Settings Sync
    const worldRef = doc(db, "worlds", activeWorldId);
    const unsubscribeWorld = onSnapshot(worldRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWorldSettings({
          worldName: data.worldName || "",
          genre: data.genre || "",
          description: data.description || "",
          highConcept: data.highConcept || ""
        });
        setDraftWorld({
          worldName: data.worldName || "",
          genre: data.genre || "",
          description: data.description || "",
          highConcept: data.highConcept || ""
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `worlds/${activeWorldId}`);
    });

    // B. Characters Sync
    const charsRef = collection(db, "worlds", activeWorldId, "characters");
    const qChars = query(charsRef, where("ownerId", "==", user.uid));
    const unsubscribeChars = onSnapshot(qChars, (snapshot) => {
      const charsList: Character[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        charsList.push({
          id: doc.id,
          name: d.name || "",
          role: d.role || "",
          faction: d.faction || "",
          bio: d.bio || "",
          traits: d.traits || [],
          appearance: d.appearance || "",
          relationships: d.relationships || [],
          title: d.title || "",
          roles: d.roles || [],
          tier: d.tier || "",
          element: d.element || "",
          color: d.color || "",
          function: d.function || "",
          identity: d.identity || "",
          personality: d.personality || "",
          originStory: d.originStory || "",
          experiences: d.experiences || "",
          createdAt: d.createdAt || "",
          updatedAt: d.updatedAt || ""
        });
      });
      setCharacters(charsList);
      
      // Auto-select first if none selected
      if (charsList.length > 0) {
        setSelectedCharId((prev) => (prev && charsList.some((c) => c.id === prev) ? prev : charsList[0].id));
      } else {
        setSelectedCharId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `worlds/${activeWorldId}/characters`);
    });

    // C. Documents Sync
    const docsRef = collection(db, "worlds", activeWorldId, "documents");
    const qDocs = query(docsRef, where("ownerId", "==", user.uid));
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      const docsList: LoreDocument[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        docsList.push({
          id: doc.id,
          title: d.title || "",
          category: d.category || "Geography",
          content: d.content || "",
          tags: d.tags || [],
          relatedCharacterIds: d.relatedCharacterIds || [],
          version: d.version || 1,
          updatedAt: d.updatedAt || "",
          versionHistory: d.versionHistory || []
        });
      });
      setDocuments(docsList);
      
      // Auto-select first if none selected
      if (docsList.length > 0) {
        setSelectedDocId((prev) => (prev && docsList.some((d) => d.id === prev) ? prev : docsList[0].id));
      } else {
        setSelectedDocId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `worlds/${activeWorldId}/documents`);
    });

    // D. Messages Sync
    const msgsRef = collection(db, "worlds", activeWorldId, "messages");
    const qMsgs = query(msgsRef, where("ownerId", "==", user.uid));
    const unsubscribeMsgs = onSnapshot(qMsgs, (snapshot) => {
      const msgsList: Message[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        msgsList.push({
          id: doc.id,
          sender: d.sender || "user",
          text: d.text || "",
          timestamp: d.timestamp || "",
          isSystemAudit: d.isSystemAudit || false,
          attachments: d.attachments || []
        });
      });
      msgsList.sort((a, b) => a.id.localeCompare(b.id));
      setMessages(msgsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `worlds/${activeWorldId}/messages`);
    });

    return () => {
      unsubscribeWorld();
      unsubscribeChars();
      unsubscribeDocs();
      unsubscribeMsgs();
    };
  }, [user, activeWorldId]);

  // --- INITIALIZE CHECKLIST CONTEXT ONCE DATA LOADS ---
  useEffect(() => {
    if (documents.length > 0 || characters.length > 0) {
      setActiveContext((prev) => {
        const validDocs = prev.documents.filter((did) => documents.some((d) => d.id === did));
        const validChars = prev.characters.filter((cid) => characters.some((c) => c.id === cid));
        
        // Auto-load all documents/characters into context if first initialization
        const finalDocs = prev.documents.length === 0 ? documents.map((d) => d.id) : validDocs;
        const finalChars = prev.characters.length === 0 ? characters.map((c) => c.id) : validChars;
        
        return {
          documents: finalDocs,
          characters: finalChars
        };
      });
    }
  }, [documents, characters]);

  // --- ROTATE CHAT LOADING PLACEHOLDERS ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingChat) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[idx]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGeneratingChat]);

  // Auto-scroll chat window
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist local issues for seamless reload
  useEffect(() => {
    localStorage.setItem("consistency_issues", JSON.stringify(consistencyIssues));
  }, [consistencyIssues]);

  // Helpers to parse and strip character sheet blocks
  const parseCharacterSheetBlock = (text: string) => {
    if (!text) return null;
    const match = text.match(/```character-sheet\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error("Failed to parse character sheet JSON from chat message:", e);
      }
    }
    return null;
  };

  const cleanMarkdownText = (text: string) => {
    if (!text) return "";
    return text.replace(/```character-sheet\s*[\s\S]*?\s*```/, "").trim();
  };

  const handleImportCharacterFromChat = async (charData: any) => {
    if (!activeWorldId || !user || !charData.name) return;
    
    const existingChar = characters.find((c) => c.name.toLowerCase() === charData.name.toLowerCase());
    const charId = existingChar ? existingChar.id : `char-${Date.now()}`;
    const charRef = doc(db, "worlds", activeWorldId, "characters", charId);

    const traitsArray = Array.isArray(charData.traits) 
      ? charData.traits 
      : typeof charData.traits === "string" 
      ? charData.traits.split(",").map((t: string) => t.trim()).filter(Boolean) 
      : [];

    const rolesArray = Array.isArray(charData.roles)
      ? charData.roles
      : typeof charData.roles === "string"
      ? charData.roles.split(",").map((r: string) => r.trim()).filter(Boolean)
      : [];

    const payload: any = {
      name: charData.name || "",
      role: charData.role || "",
      faction: charData.faction || "",
      bio: charData.bio || "",
      traits: traitsArray,
      appearance: charData.appearance || "",
      relationships: Array.isArray(charData.relationships) ? charData.relationships : [],
      title: charData.title || "",
      roles: rolesArray,
      tier: charData.tier || "",
      element: charData.element || "",
      color: charData.color || "",
      function: charData.function || "",
      identity: charData.identity || "",
      personality: charData.personality || "",
      originStory: charData.originStory || "",
      experiences: charData.experiences || "",
      updatedAt: new Date().toISOString()
    };

    try {
      if (existingChar) {
        await updateDoc(charRef, payload);
      } else {
        payload.ownerId = user.uid;
        payload.createdAt = new Date().toISOString();
        await setDoc(charRef, payload);
      }
      alert(`Successfully registered "${charData.name}" to your character logs!`);
      setSelectedCharId(charId);
      setActiveTab("characters");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}/characters/${charId}`);
    }
  };

  // --- MUTATION IMPLEMENTATIONS (FIRESTORE) ---

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && chatAttachments.length === 0) || isGeneratingChat || !activeWorldId || !user) return;

    const userMsgText = chatInput;
    const currentAttachments = [...chatAttachments];
    setChatInput("");
    setChatAttachments([]);
    setIsGeneratingChat(true);

    const messageId = `msg-${Date.now()}`;
    const messageRef = doc(db, "worlds", activeWorldId, "messages", messageId);

    try {
      // 1. Write user message to cloud
      await setDoc(messageRef, {
        sender: "user",
        text: userMsgText,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid,
        ...(currentAttachments.length > 0 ? { attachments: currentAttachments } : {})
      });

      // 2. Fetch selected context entities
      const selectedDocsContext = documents.filter((d) => activeContext.documents.includes(d.id));
      const selectedCharsContext = characters.filter((c) => activeContext.characters.includes(c.id));

      const chatHistory = [...messages, { 
        id: messageId, 
        sender: "user" as const, 
        text: userMsgText, 
        timestamp: "",
        ...(currentAttachments.length > 0 ? { attachments: currentAttachments } : {})
      }].slice(-8);

      // 3. Ping AI Scribe back-end
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          worldSettings,
          activeContext: {
            documents: selectedDocsContext,
            characters: selectedCharsContext
          }
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to contact Gemini server.");
      }

      const data = await response.json();

      // 4. Save AI reply to cloud
      const aiMessageId = `msg-${Date.now() + 1}`;
      const aiMessageRef = doc(db, "worlds", activeWorldId, "messages", aiMessageId);
      await setDoc(aiMessageRef, {
        sender: "assistant",
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });

    } catch (err: any) {
      console.error(err);
      const errorMsgId = `msg-${Date.now() + 2}`;
      const errorMsgRef = doc(db, "worlds", activeWorldId, "messages", errorMsgId);
      await setDoc(errorMsgRef, {
        sender: "assistant",
        text: `⚠️ **Aether Grid Interruption**: ${err.message || "Could not complete text weave."}`,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });
    } finally {
      setIsGeneratingChat(false);
    }
  };

  const handleConveneRoundtable = async (mode: 'audit' | 'debate') => {
    const selectedCharsContext = characters.filter((c) => activeContext.characters.includes(c.id));
    if (selectedCharsContext.length < 1 || isGeneratingChat || !activeWorldId || !user) return;

    const userMsgText = chatInput.trim();
    setChatInput("");
    setIsGeneratingChat(true);
    setLoadingMessage("Convene council of native agents...");

    const messageId = `msg-${Date.now()}`;
    const messageRef = doc(db, "worlds", activeWorldId, "messages", messageId);

    try {
      // 1. Write the convening request to cloud (user message)
      const promptText = userMsgText 
        ? `*Convenes a council meeting to discuss: "${userMsgText}"*`
        : `*Convenes a council meeting with ${selectedCharsContext.map(c => c.name).join(', ')} for a world ${mode === 'audit' ? 'audit' : 'discussion'}*`;
      
      await setDoc(messageRef, {
        sender: "user",
        text: promptText,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });

      // 2. Fetch selected context entities
      const selectedDocsContext = documents.filter((d) => activeContext.documents.includes(d.id));

      // 3. Ping AI Roundtable back-end
      const response = await fetch("/api/gemini/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characters: selectedCharsContext,
          documents: selectedDocsContext,
          worldSettings,
          mode,
          customTopic: userMsgText || undefined
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to contact Gemini server.");
      }

      const data = await response.json();

      // 4. Save AI reply to cloud (represented as a system audit/council response)
      const aiMessageId = `msg-${Date.now() + 1}`;
      const aiMessageRef = doc(db, "worlds", activeWorldId, "messages", aiMessageId);
      await setDoc(aiMessageRef, {
        sender: "assistant",
        text: data.text,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid,
        isSystemAudit: true // Stylized in amber/dark
      });

    } catch (err: any) {
      console.error(err);
      const errorMsgId = `msg-${Date.now() + 2}`;
      const errorMsgRef = doc(db, "worlds", activeWorldId, "messages", errorMsgId);
      await setDoc(errorMsgRef, {
        sender: "assistant",
        text: `⚠️ **Sovereignty Council Error**: ${err.message || "Could not convene agent meeting."}`,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });
    } finally {
      setIsGeneratingChat(false);
      setLoadingMessage(LOADING_MESSAGES[0]);
    }
  };

  const handleRunConsistencyAudit = async () => {
    if (!activeWorldId || !user) return;
    setIsAuditing(true);
    try {
      const response = await fetch("/api/gemini/check-consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldSettings,
          documents,
          characters
        })
      });

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to process continuity audit.");
      }

      const data = await response.json();
      setConsistencyIssues(data.issues || []);
      setActiveTab("consistency");
      
      // Save diagnostic report directly to cloud
      const auditMsgId = `audit-${Date.now()}`;
      const auditMsgRef = doc(db, "worlds", activeWorldId, "messages", auditMsgId);
      await setDoc(auditMsgRef, {
        sender: "assistant",
        text: `📊 **Continuity Audit Completed!** I scanned ${documents.length} lore records and ${characters.length} character logs. I discovered **${(data.issues || []).length} timeline/lore contradictions** of varying severities. Review them in the **Consistency Hub** tab.`,
        timestamp: new Date().toLocaleTimeString(),
        isSystemAudit: true,
        ownerId: user.uid
      });

    } catch (err: any) {
      console.error(err);
      alert("Continuity Audit failed: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCreativeGeneration = async () => {
    if (!creativePrompt.trim() || isGeneratingCreative || !user) return;
    setIsGeneratingCreative(true);

    try {
      const response = await fetch("/api/gemini/generate-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: showCreativeModal,
          prompt: creativePrompt,
          worldSettings
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      if (showCreativeModal === "document") {
        setIsCreatingDoc(true);
        setActiveTab("lore");
        setDocForm({
          title: `Archival: ${creativePrompt.slice(0, 30)}...`,
          category: "Other",
          content: data.text,
          tags: "AI-Drafted",
          relatedCharacterIds: []
        });
      } else if (showCreativeModal === "character") {
        setIsCreatingChar(true);
        setActiveTab("characters");
        setCharForm({
          name: "Unmapped Hero",
          role: "NPC / Hero",
          faction: "Unaligned",
          bio: data.text,
          traits: "AI-Generated",
          appearance: "Generated via Scribe Space",
          relationships: [],
          title: "",
          roles: "",
          tier: "",
          element: "",
          color: "",
          function: "",
          identity: "",
          personality: "",
          originStory: "",
          experiences: ""
        });
      }

      setShowCreativeModal(null);
      setCreativePrompt("");

    } catch (err: any) {
      alert("Creative generation failed: " + err.message);
    } finally {
      setIsGeneratingCreative(false);
    }
  };

  const handleDraftUpdate = async () => {
    if (!updateInstruction.trim() || !selectedDocId || !user) return;
    setIsDraftingUpdate(true);
    setAiUpdateDraft(null);

    const docToUpdate = documents.find((d) => d.id === selectedDocId);
    if (!docToUpdate) return;

    try {
      const response = await fetch("/api/gemini/draft-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: docToUpdate,
          changeInstruction: updateInstruction,
          worldSettings,
          relatedContext: {
            characters: characters.filter((c) => docToUpdate.relatedCharacterIds?.includes(c.id))
          }
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setAiUpdateDraft(data);
    } catch (err: any) {
      alert("Drafting update failed: " + err.message);
    } finally {
      setIsDraftingUpdate(false);
    }
  };

  const handleCommitUpdate = async () => {
    if (!aiUpdateDraft || !selectedDocId || !activeWorldId || !user) return;

    const docToUpdate = documents.find((d) => d.id === selectedDocId);
    if (!docToUpdate) return;

    const nextVersion = docToUpdate.version + 1;
    const newVersionLog: DocumentVersion = {
      version: nextVersion,
      content: aiUpdateDraft.updatedContent,
      updateNote: aiUpdateDraft.updateNote,
      updatedAt: new Date().toISOString()
    };

    const docRef = doc(db, "worlds", activeWorldId, "documents", selectedDocId);
    
    try {
      await setDoc(docRef, {
        title: docToUpdate.title,
        category: docToUpdate.category,
        content: aiUpdateDraft.updatedContent,
        tags: docToUpdate.tags || [],
        relatedCharacterIds: docToUpdate.relatedCharacterIds || [],
        version: nextVersion,
        versionHistory: [newVersionLog, ...(docToUpdate.versionHistory || [])],
        ownerId: user.uid,
        updatedAt: new Date().toISOString()
      });

      setIsUpdatingDocMode(false);
      setAiUpdateDraft(null);
      setUpdateInstruction("");

      const updateMsgId = `update-${Date.now()}`;
      const updateMsgRef = doc(db, "worlds", activeWorldId, "messages", updateMsgId);
      await setDoc(updateMsgRef, {
        sender: "assistant",
        text: `📝 **Document Updated**: I've successfully drafted and committed Version ${nextVersion} of "**${docToUpdate.title}**". \n\n*Changelog:* "${aiUpdateDraft.updateNote}"`,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });

    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}/documents/${selectedDocId}`);
    }
  };

  const handleSaveWorldSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorldId || !user) return;
    const worldRef = doc(db, "worlds", activeWorldId);
    try {
      await updateDoc(worldRef, {
        worldName: draftWorld.worldName,
        genre: draftWorld.genre,
        description: draftWorld.description,
        highConcept: draftWorld.highConcept,
        updatedAt: new Date().toISOString()
      });
      setIsEditingWorld(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}`);
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim() || !activeWorldId || !user) return;

    const docId = isCreatingDoc ? `doc-${Date.now()}` : selectedDocId;
    if (!docId) return;

    const docRef = doc(db, "worlds", activeWorldId, "documents", docId);
    
    try {
      if (isCreatingDoc) {
        const newDoc = {
          title: docForm.title,
          category: docForm.category,
          content: docForm.content,
          tags: docForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          relatedCharacterIds: docForm.relatedCharacterIds || [],
          version: 1,
          versionHistory: [
            {
              version: 1,
              content: docForm.content,
              updateNote: "Initial creation.",
              updatedAt: new Date().toISOString()
            }
          ],
          ownerId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, newDoc);
        setIsCreatingDoc(false);
        setSelectedDocId(docId);
      } else {
        const existingDoc = documents.find((d) => d.id === selectedDocId);
        const wasChanged = existingDoc?.content !== docForm.content;
        const nextVersion = wasChanged ? (existingDoc?.version || 1) + 1 : (existingDoc?.version || 1);
        const newHistory = wasChanged ? [
          {
            version: nextVersion,
            content: docForm.content,
            updateNote: "Manual correction edit.",
            updatedAt: new Date().toISOString()
          },
          ...(existingDoc?.versionHistory || [])
        ] : (existingDoc?.versionHistory || []);

        const updatedDoc = {
          title: docForm.title,
          category: docForm.category,
          content: docForm.content,
          tags: docForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          relatedCharacterIds: docForm.relatedCharacterIds || [],
          version: nextVersion,
          versionHistory: newHistory,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(docRef, updatedDoc);
        setIsEditingDoc(false);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}/documents/${docId}`);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!activeWorldId) return;
    showConfirm(
      "Delete Lore Document",
      "Are you sure you want to permanently delete this lore document from the chronicles?",
      async () => {
        const docRef = doc(db, "worlds", activeWorldId, "documents", id);
        try {
          await deleteDoc(docRef);
          setActiveContext((prev) => ({ ...prev, documents: prev.documents.filter((did) => did !== id) }));
          if (selectedDocId === id) {
            setSelectedDocId(null);
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `worlds/${activeWorldId}/documents/${id}`);
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const handleSaveChar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charForm.name.trim() || !activeWorldId || !user) return;

    const charId = isCreatingChar ? `char-${Date.now()}` : selectedCharId;
    if (!charId) return;

    const charRef = doc(db, "worlds", activeWorldId, "characters", charId);
    
    try {
      const payload: any = {
        name: charForm.name,
        role: charForm.role,
        faction: charForm.faction,
        bio: charForm.bio,
        traits: charForm.traits.split(",").map((t) => t.trim()).filter(Boolean),
        appearance: charForm.appearance || "",
        relationships: charForm.relationships || [],
        title: charForm.title || "",
        roles: charForm.roles.split(",").map((r) => r.trim()).filter(Boolean),
        tier: charForm.tier || "",
        element: charForm.element || "",
        color: charForm.color || "",
        function: charForm.function || "",
        identity: charForm.identity || "",
        personality: charForm.personality || "",
        originStory: charForm.originStory || "",
        experiences: charForm.experiences || "",
        updatedAt: new Date().toISOString()
      };
      if (isCreatingChar) {
        payload.ownerId = user.uid;
        payload.createdAt = new Date().toISOString();
        await setDoc(charRef, payload);
      } else {
        await updateDoc(charRef, payload);
      }
      setIsCreatingChar(false);
      setIsEditingChar(false);
      setSelectedCharId(charId);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}/characters/${charId}`);
    }
  };

  const handleDeleteChar = async (id: string) => {
    if (!activeWorldId) return;
    showConfirm(
      "Delete Character Profile",
      "Are you sure you want to permanently delete this character profile from the setting?",
      async () => {
        const charRef = doc(db, "worlds", activeWorldId, "characters", id);
        try {
          await deleteDoc(charRef);
          setActiveContext((prev) => ({ ...prev, characters: prev.characters.filter((cid) => cid !== id) }));
          if (selectedCharId === id) {
            setSelectedCharId(null);
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, `worlds/${activeWorldId}/characters/${id}`);
        }
      },
      "Delete",
      "Cancel"
    );
  };

  const handleCreateNewWorld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newWorldForm.worldName.trim()) return;

    const newWorldId = `world-${Date.now()}`;
    const worldRef = doc(db, "worlds", newWorldId);

    try {
      await setDoc(worldRef, {
        worldName: newWorldForm.worldName,
        genre: newWorldForm.genre,
        description: newWorldForm.description,
        highConcept: newWorldForm.highConcept,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Seeding a simple welcoming message
      const msgId = "msg-welcome";
      const msgRef = doc(db, "worlds", newWorldId, "messages", msgId);
      await setDoc(msgRef, {
        sender: "assistant",
        text: `Welcome to your brand-new universe: **${newWorldForm.worldName}**! \n\nI have successfully generated your world bounds. Start by using the panels to record characters, NPCS, magical systems, or faction archives!`,
        timestamp: new Date().toLocaleTimeString(),
        ownerId: user.uid
      });

      setActiveWorldId(newWorldId);
      setIsCreatingNewWorld(false);
      setNewWorldForm({
        worldName: "",
        genre: "",
        description: "",
        highConcept: ""
      });
      setActiveTab("dashboard");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `worlds/${newWorldId}`);
    }
  };

  const handleAlignStack = async () => {
    setIsAligningStack(true);
    try {
      await loadCourtLibrary();
      setActiveTab("library");
    } finally {
      setIsAligningStack(false);
    }
  };

  // --- RENDERING FORM HELPERS ---
  const openEditDoc = (doc: LoreDocument) => {
    setDocForm({
      title: doc.title,
      category: doc.category,
      content: doc.content,
      tags: doc.tags.join(", "),
      relatedCharacterIds: doc.relatedCharacterIds || []
    });
    setIsEditingDoc(true);
    setIsCreatingDoc(false);
  };

  const openNewDoc = () => {
    setDocForm({
      title: "",
      category: "Geography",
      content: "",
      tags: "",
      relatedCharacterIds: []
    });
    setIsCreatingDoc(true);
    setIsEditingDoc(false);
  };

  const openEditChar = (char: Character) => {
    setCharForm({
      name: char.name,
      role: char.role,
      faction: char.faction,
      bio: char.bio,
      traits: char.traits.join(", "),
      appearance: char.appearance || "",
      relationships: char.relationships || [],
      title: char.title || "",
      roles: char.roles ? char.roles.join(", ") : "",
      tier: char.tier || "",
      element: char.element || "",
      color: char.color || "",
      function: char.function || "",
      identity: char.identity || "",
      personality: char.personality || "",
      originStory: char.originStory || "",
      experiences: char.experiences || ""
    });
    setIsEditingChar(true);
    setIsCreatingChar(false);
  };

  const openNewChar = () => {
    setCharForm({
      name: "",
      role: "",
      faction: "",
      bio: "",
      traits: "",
      appearance: "",
      relationships: [],
      title: "",
      roles: "",
      tier: "",
      element: "",
      color: "",
      function: "",
      identity: "",
      personality: "",
      originStory: "",
      experiences: ""
    });
    setIsCreatingChar(true);
    setIsEditingChar(false);
  };

  const toggleDocContext = (docId: string) => {
    setActiveContext((prev) => {
      const exists = prev.documents.includes(docId);
      return {
        ...prev,
        documents: exists 
          ? prev.documents.filter((id) => id !== docId) 
          : [...prev.documents, docId]
      };
    });
  };

  const toggleCharContext = (charId: string) => {
    setActiveContext((prev) => {
      const exists = prev.characters.includes(charId);
      return {
        ...prev,
        characters: exists 
          ? prev.characters.filter((id) => id !== charId) 
          : [...prev.characters, charId]
      };
    });
  };

  const triggerQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
  };

  const getCharName = (id: string) => characters.find((c) => c.id === id)?.name || "Unknown Character";

  const selectedDoc = documents.find((d) => d.id === selectedDocId);
  const selectedChar = characters.find((c) => c.id === selectedCharId);

  // --- RENDER LOADERS OR AUTH GATES ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c0d] flex flex-col items-center justify-center text-[#e5e5e5]">
        <Compass className="w-12 h-12 text-[#d4af37] animate-spin mb-4" />
        <p className="text-sm font-mono text-[#7a7a7a]">Synchronizing with Aether Grid...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0c0c0d] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#d4af37]/5 via-[#0c0c0d] to-[#0c0c0d] pointer-events-none"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-md w-full bg-[#0f0f10] border border-[#2a2a2b] backdrop-blur-md rounded-2xl p-8 shadow-2xl space-y-6 text-center relative z-10">
          <div className="flex justify-center">
            <div className="p-4 bg-[#161618] text-[#d4af37] border border-[#2a2a2b] rounded-2xl shadow-inner animate-pulse">
              <Compass className="w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-serif italic tracking-tight text-[#e5e5e5]">Court Scribe Console</h1>
            <p className="text-[#7a7a7a] text-xs md:text-sm font-sans">
              An interactive administration suite for Anchor Court, powered by secure real-time Cloud Firestore synchronization.
            </p>
          </div>

          <div className="border-t border-[#2a2a2b] my-4"></div>

          <button
            onClick={async () => {
              try {
                await signInWithPopup(auth, googleProvider);
              } catch (err: any) {
                alert("Sign-In failed: " + err.message);
              }
            }}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-[#1a1a1c] hover:bg-[#222] text-[#e5e5e5] border border-[#333335] font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-[10px] text-[#555] font-mono">
            Requires Google verification. All chronicles are tied to your unique user seed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#0c0c0d] flex flex-col font-sans text-[#d1d1d1] selection:bg-[#d4af37]/20 selection:text-white lg:overflow-hidden">
      
      {/* HEADER BAR */}
      <header className="bg-[#0f0f10] border-b border-[#2a2a2b] sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1a1a1c] text-[#d4af37] border border-[#333335] rounded-xl shadow-md">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-serif italic tracking-tight text-[#e5e5e5] flex items-center gap-2">
              Saren's Office <span className="text-[10px] py-0.5 px-2 bg-[#161618] rounded-full text-[#d4af37] border border-[#333335] font-mono font-bold">COURT LIBRARY</span>
            </h1>
            <p className="text-xs text-[#7a7a7a] font-medium">Document registry, provenance, versioning & audit workspace</p>
          </div>
        </div>

        {/* Global Controls & Account Widget */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto justify-end">
          
          {/* Active World Selector dropdown */}
          <div className="flex items-center gap-1.5 bg-[#1a1a1c] border border-[#333335] rounded-lg px-2.5 py-1">
            <Globe className="w-3.5 h-3.5 text-[#d4af37]" />
            <select
              value={activeWorldId || ""}
              onChange={(e) => setActiveWorldId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#e5e5e5] focus:outline-none cursor-pointer pr-1"
            >
              {userWorlds.map((w) => (
                <option key={w.id} value={w.id} className="bg-[#1a1a1c] text-white">{w.worldName}</option>
              ))}
            </select>
            
            <button 
              onClick={() => setIsCreatingNewWorld(true)}
              className="p-1 hover:bg-[#222] text-[#7a7a7a] hover:text-[#e5e5e5] rounded transition-colors cursor-pointer"
              title="Create new world project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => {
                setDraftWorld({ ...worldSettings });
                setIsEditingWorld(true);
              }} 
              className="p-1 hover:bg-[#222] text-[#7a7a7a] hover:text-[#e5e5e5] rounded transition-colors cursor-pointer"
              title="Modify settings"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRunConsistencyAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d4af37] hover:opacity-90 disabled:opacity-50 text-[#000] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm shadow-[#d4af37]/10 cursor-pointer"
          >
            {isAuditing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Audit Continuity
          </button>

          {/* User display name + Log Out */}
          <div className="flex items-center gap-2 border-l border-[#2a2a2b] pl-4">
            <span className="text-xs font-semibold text-[#999] hidden sm:inline">{user.displayName || user.email}</span>
            <button
              onClick={() => signOut(auth)}
              className="p-2 text-[#7a7a7a] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* CORE WORKSPACE SPLIT */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:overflow-hidden">
        
        {/* COLLAPSIBLE LEFT SIDEBAR (Desktop) / TOP TABS NAVIGATION (Mobile) */}
        <nav className={`bg-[#0f0f10] border-b lg:border-b-0 lg:border-r border-[#2a2a2b] flex flex-row lg:flex-col justify-between shrink-0 transition-all duration-300 ${
          isSidebarCollapsed ? "lg:w-16 w-full p-2 lg:p-3" : "lg:w-64 w-full p-4"
        }`}>
          <div className="flex flex-row lg:flex-col gap-1 lg:gap-2 flex-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none">
            {/* Logo / Sidebar branding - Only shown on desktop and when expanded */}
            {!isSidebarCollapsed && (
              <div className="hidden lg:flex items-center gap-2 px-2 pb-4 mb-2 border-b border-[#2a2a2b]/60">
                <Compass className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#7a7a7a] uppercase">Navigation Matrix</span>
              </div>
            )}

            {/* Sidebar Tabs */}
            <button
              onClick={() => { setActiveTab("dashboard"); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-left ${
                activeTab === "dashboard" 
                  ? "bg-[#161618] text-[#d4af37] border border-[#d4af37]/20 shadow-md shadow-[#d4af37]/5" 
                  : "text-[#7a7a7a] hover:text-[#e5e5e5] hover:bg-[#161618]/40 border border-transparent"
              } ${isSidebarCollapsed ? "lg:justify-center lg:px-0" : "w-full"}`}
              title="Dashboard Overview"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarCollapsed ? "lg:hidden" : "block"}`}>
                Dashboard
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("library"); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-left ${
                activeTab === "library"
                  ? "bg-[#161618] text-[#d4af37] border border-[#d4af37]/20 shadow-md shadow-[#d4af37]/5"
                  : "text-[#7a7a7a] hover:text-[#e5e5e5] hover:bg-[#161618]/40 border border-transparent"
              } ${isSidebarCollapsed ? "lg:justify-center lg:px-0" : "w-full"}`}
              title={`Court Library (${courtLibrary.length})`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-200 flex-1 flex items-center justify-between ${isSidebarCollapsed ? "lg:hidden" : "block"}`}>
                <span>Court Library</span>
                <span className="ml-1 px-1.5 py-0.5 bg-[#1e1e21] text-[10px] text-[#7a7a7a] rounded-md font-mono">{courtLibrary.length}</span>
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("lore"); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-left ${
                activeTab === "lore" 
                  ? "bg-[#161618] text-[#d4af37] border border-[#d4af37]/20 shadow-md shadow-[#d4af37]/5" 
                  : "text-[#7a7a7a] hover:text-[#e5e5e5] hover:bg-[#161618]/40 border border-transparent"
              } ${isSidebarCollapsed ? "lg:justify-center lg:px-0" : "w-full"}`}
              title={`Lore Records (${documents.length})`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-200 flex-1 flex items-center justify-between ${isSidebarCollapsed ? "lg:hidden" : "block"}`}>
                <span>Lore Records</span>
                <span className="ml-1 px-1.5 py-0.5 bg-[#1e1e21] text-[10px] text-[#7a7a7a] rounded-md font-mono">{documents.length}</span>
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("characters"); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-left ${
                activeTab === "characters" 
                  ? "bg-[#161618] text-[#d4af37] border border-[#d4af37]/20 shadow-md shadow-[#d4af37]/5" 
                  : "text-[#7a7a7a] hover:text-[#e5e5e5] hover:bg-[#161618]/40 border border-transparent"
              } ${isSidebarCollapsed ? "lg:justify-center lg:px-0" : "w-full"}`}
              title={`Character Logs (${characters.length})`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-200 flex-1 flex items-center justify-between ${isSidebarCollapsed ? "lg:hidden" : "block"}`}>
                <span>Character Logs</span>
                <span className="ml-1 px-1.5 py-0.5 bg-[#1e1e21] text-[10px] text-[#7a7a7a] rounded-md font-mono">{characters.length}</span>
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("consistency"); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer text-left relative ${
                activeTab === "consistency" 
                  ? "bg-[#161618] text-[#d4af37] border border-[#d4af37]/20 shadow-md shadow-[#d4af37]/5" 
                  : "text-[#7a7a7a] hover:text-[#e5e5e5] hover:bg-[#161618]/40 border border-transparent"
              } ${isSidebarCollapsed ? "lg:justify-center lg:px-0" : "w-full"}`}
              title="Consistency Hub"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className={`transition-opacity duration-200 ${isSidebarCollapsed ? "lg:hidden" : "block"}`}>
                Consistency
              </span>
              {consistencyIssues.length > 0 && (
                <span className={`absolute w-2 h-2 rounded-full bg-amber-500 animate-pulse ${isSidebarCollapsed ? "lg:top-1.5 lg:right-1.5" : "top-3 right-3"}`}></span>
              )}
            </button>
          </div>

          {/* Desktop Sidebar Collapse Toggle Button */}
          <div className="hidden lg:flex items-center justify-center pt-4 border-t border-[#2a2a2b]/60">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="p-2 w-full bg-[#161618] hover:bg-[#1f1f22] border border-[#2a2a2b] rounded-xl text-[#7a7a7a] hover:text-[#e5e5e5] flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs font-mono font-bold"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </nav>

        {/* LEFT WORKSPACE PANEL (Tabs + Detail views) */}
        <main className="flex-1 p-4 md:p-6 flex flex-col min-h-0 overflow-y-auto">

          {/* TAB CONTENTS */}
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* 1. DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* World Settings Hero display */}
                <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#d4af37]/5 via-transparent to-transparent pointer-events-none"></div>
                  <span className="px-2.5 py-1 bg-[#1a1a1c] border border-[#333335] text-[#d4af37] rounded-full text-xs font-mono font-bold tracking-wide">ACTIVE SETTING</span>
                  
                  <h2 className="text-2xl md:text-3xl font-serif italic text-[#e5e5e5] mt-3">{worldSettings.worldName}</h2>
                  <p className="text-[#7a7a7a] text-xs font-mono font-medium mt-1">Genre: {worldSettings.genre}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#2a2a2b]">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] font-mono">Overview</h4>
                      <p className="text-[#b1b1b1] text-sm mt-1 leading-relaxed">{worldSettings.description}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[#d4af37] font-mono">High Concept / Tension</h4>
                      <p className="text-[#b1b1b1] text-sm mt-1 leading-relaxed">{worldSettings.highConcept}</p>
                    </div>
                  </div>
                </div>

                {/* Court Library Source Status */}
                <div className="bg-[#0f0f10] border border-[#d4af37]/25 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${courtLibraryError ? "bg-red-500" : isLoadingCourtLibrary ? "bg-amber-500 animate-pulse" : "bg-[#d4af37] shadow-[0_0_8px_#d4af37]"}`}></span>
                        <h3 className="font-serif italic text-lg text-[#e5e5e5]">Court Library Source Layer</h3>
                      </div>
                      <p className="text-[#b1b1b1] text-xs mt-2 leading-relaxed max-w-3xl">{courtLibraryRule}</p>
                      <p className="text-[#666] text-[10px] font-mono mt-2">
                        {courtLibraryError ? courtLibraryError : `${courtLibrary.length} source records loaded · sealed / confirmed / working states preserved`}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {[
                          ["SEALED", courtLibrary.filter(e => e.status === "sealed").length],
                          ["CONFIRMED", courtLibrary.filter(e => e.status === "confirmed").length],
                          ["WORKING", courtLibrary.filter(e => e.status === "working").length],
                          ["PENDING SAREN", courtLibrary.filter(e => e.review).length]
                        ].map(([label, count]) => (
                          <div key={String(label)} className="bg-[#161618] border border-[#2a2a2b] rounded-lg p-3">
                            <p className="text-[9px] font-mono text-[#7a7a7a] uppercase">{label}</p>
                            <p className="text-xl font-serif text-[#e5e5e5] mt-1">{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0 flex gap-2">
                      <button
                        onClick={loadCourtLibrary}
                        disabled={isLoadingCourtLibrary}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold border bg-[#161618] border-[#2a2a2b] text-[#b1b1b1] hover:text-[#d4af37] hover:border-[#d4af37]/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCourtLibrary ? "animate-spin" : ""}`} />
                        Refresh
                      </button>
                      <button
                        onClick={() => setActiveTab("library")}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#d4af37] text-black hover:opacity-90 flex items-center gap-2 cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        Open Library
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  
                  <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl p-4 flex items-center justify-between hover:border-[#333335] transition-all">
                    <div>
                      <p className="text-xs font-semibold text-[#7a7a7a] font-mono uppercase">Lore Documents</p>
                      <h3 className="text-2xl font-serif text-[#e5e5e5] mt-1">{documents.length}</h3>
                      <button onClick={() => setActiveTab("lore")} className="text-xs font-medium text-[#7a7a7a] hover:text-[#d4af37] flex items-center gap-1 mt-2 transition-colors cursor-pointer">
                        Inspect collection <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-[#161618] border border-[#2a2a2b] text-[#d4af37] rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl p-4 flex items-center justify-between hover:border-[#333335] transition-all">
                    <div>
                      <p className="text-xs font-semibold text-[#7a7a7a] font-mono uppercase">Characters Tracked</p>
                      <h3 className="text-2xl font-serif text-[#e5e5e5] mt-1">{characters.length}</h3>
                      <button onClick={() => setActiveTab("characters")} className="text-xs font-medium text-[#7a7a7a] hover:text-[#d4af37] flex items-center gap-1 mt-2 transition-colors cursor-pointer">
                        Inspect logs <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-[#161618] border border-[#2a2a2b] text-[#d4af37] rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl p-4 flex items-center justify-between hover:border-[#333335] transition-all">
                    <div>
                      <p className="text-xs font-semibold text-[#7a7a7a] font-mono uppercase">Detected Contradictions</p>
                      <h3 className="text-2xl font-serif text-[#e5e5e5] mt-1">{consistencyIssues.length}</h3>
                      <button onClick={handleRunConsistencyAudit} className="text-xs font-medium text-[#7a7a7a] hover:text-[#d4af37] flex items-center gap-1 mt-2 transition-colors cursor-pointer">
                        Refresh audit <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 bg-[#1a1a1c] border border-amber-500/20 text-amber-500 rounded-xl">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                  </div>

                </div>

                {/* Narrative Actions / Creative Triggers */}
                <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl p-6">
                  <h3 className="font-serif italic text-lg text-[#e5e5e5] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#d4af37]" />
                    AI Administrative Sparks
                  </h3>
                  <p className="text-[#7a7a7a] text-xs mt-1">Need to formalize system definitions? Leverage the Scribe Assistant to draft protocols, stack definitions, or agent profiles directly into your workspace.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <button 
                      onClick={() => setShowCreativeModal("document")}
                      className="bg-[#161618] border border-[#2a2a2b] hover:border-[#333335] p-4 rounded-xl text-left transition-all hover:translate-y-[-2px] hover:shadow-sm flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="p-2.5 bg-[#1a1a1c] border border-[#333335] rounded-lg text-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-black transition-colors">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#e5e5e5] text-sm group-hover:text-white transition-colors">Synthesize Court Document</h4>
                        <p className="text-xs text-[#7a7a7a] mt-1">Draft a court protocol page, codex, stack definition, or anti-drift procedure from a concept spark.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setShowCreativeModal("character")}
                      className="bg-[#161618] border border-[#2a2a2b] hover:border-[#333335] p-4 rounded-xl text-left transition-all hover:translate-y-[-2px] hover:shadow-sm flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="p-2.5 bg-[#1a1a1c] border border-[#333335] rounded-lg text-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-black transition-colors">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#e5e5e5] text-sm group-hover:text-white transition-colors">Register Native Agent</h4>
                        <p className="text-xs text-[#7a7a7a] mt-1">Create a brand-new native agent profile with operational bio, behavioral traits, and appearance logs.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mini Context Inspector */}
                <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl p-6">
                  <h3 className="font-serif italic text-[#e5e5e5] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#d4af37]" />
                    Live Active Memory Context ({activeContext.documents.length + activeContext.characters.length})
                  </h3>
                  <p className="text-[#7a7a7a] text-xs mt-1">These profiles and protocols are loaded in the Scribe Assistant's active context to guide updates and alignment.</p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {documents.map((d) => {
                      const isActive = activeContext.documents.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          onClick={() => toggleDocContext(d.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isActive 
                              ? "bg-[#1a1a1c] border-[#d4af37] text-[#d4af37] font-semibold" 
                              : "bg-[#161618] border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-[#e5e5e5]"
                          }`}
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>{d.title}</span>
                          {isActive && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                    {characters.map((c) => {
                      const isActive = activeContext.characters.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCharContext(c.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isActive 
                              ? "bg-[#1a1a1c] border-[#d4af37] text-[#d4af37] font-semibold" 
                              : "bg-[#161618] border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-[#e5e5e5]"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          <span>{c.name}</span>
                          {isActive && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* 2. COURT LIBRARY */}
            {activeTab === "library" && (
              <div className="space-y-5">
                <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#d4af37]" />
                        <h2 className="text-xl font-serif italic text-[#e5e5e5]">Court Library</h2>
                      </div>
                      <p className="text-xs text-[#b1b1b1] mt-2">{courtLibraryRule}</p>
                      <p className="text-[10px] text-[#666] font-mono mt-1">Registry view is read-only. Canon changes still require an authorized source/update path.</p>
                    </div>
                    <button
                      onClick={loadCourtLibrary}
                      disabled={isLoadingCourtLibrary}
                      className="px-4 py-2 bg-[#161618] border border-[#2a2a2b] rounded-lg text-xs text-[#b1b1b1] hover:text-[#d4af37] hover:border-[#d4af37]/40 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCourtLibrary ? "animate-spin" : ""}`} />
                      Refresh Registry
                    </button>
                  </div>
                </div>

                {courtLibraryError && (
                  <div className="bg-red-950/20 border border-red-900/40 text-red-300 rounded-xl p-4 text-xs font-mono">
                    {courtLibraryError}
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {courtLibrary.map((entry) => {
                    const statusClass =
                      entry.status === "sealed"
                        ? "text-[#d4af37] border-[#d4af37]/30 bg-[#d4af37]/5"
                        : entry.status === "confirmed"
                        ? "text-emerald-400 border-emerald-900/40 bg-emerald-950/20"
                        : entry.status === "working"
                        ? "text-amber-300 border-amber-900/40 bg-amber-950/20"
                        : "text-[#999] border-[#333] bg-[#161618]";

                    return (
                      <div key={entry.id} className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl p-5 hover:border-[#3a3a3c] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {entry.kind === "core" ? <BookOpen className="w-4 h-4 text-[#d4af37] shrink-0" /> : <ShieldCheck className="w-4 h-4 text-[#999] shrink-0" />}
                              <h3 className="text-sm font-semibold text-[#e5e5e5] truncate">{entry.title}</h3>
                            </div>
                            <p className="text-[10px] text-[#666] font-mono mt-2 break-all">{entry.path}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full border text-[9px] font-mono font-bold uppercase shrink-0 ${statusClass}`}>
                            {entry.status}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#202022] space-y-1.5 text-[11px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-[#666]">Class</span>
                            <span className="text-[#b1b1b1] uppercase font-mono">{entry.kind}</span>
                          </div>
                          {entry.authority && (
                            <div className="flex justify-between gap-4">
                              <span className="text-[#666]">Authority</span>
                              <span className="text-[#d4af37]">{entry.authority}</span>
                            </div>
                          )}
                          {entry.review && (
                            <div className="flex justify-between gap-4">
                              <span className="text-[#666]">Review</span>
                              <span className="text-amber-300">{entry.review}</span>
                            </div>
                          )}
                          {typeof entry.bytes === "number" && (
                            <div className="flex justify-between gap-4">
                              <span className="text-[#666]">Size</span>
                              <span className="text-[#999] font-mono">{Math.max(1, Math.round(entry.bytes / 1024))} KB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. LORE DOCUMENTS TABS */}
            {activeTab === "lore" && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-[400px]">
                
                {/* List Sidebar */}
                <div className="w-full md:w-64 flex flex-col border border-[#2a2a2b] rounded-xl bg-[#0f0f10] p-3 space-y-2 min-h-[200px] md:min-h-0">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2b]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a] font-mono">Lore Records</span>
                    <button 
                      onClick={openNewDoc} 
                      className="p-1 hover:bg-[#1a1a1c] text-[#7a7a7a] hover:text-[#d4af37] rounded-lg transition-colors cursor-pointer"
                      title="Add manual lore document"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1">
                    {documents.map((doc) => {
                      const isActive = doc.id === selectedDocId;
                      const isInContext = activeContext.documents.includes(doc.id);
                      return (
                        <div 
                          key={doc.id}
                          className={`group w-full flex items-center justify-between p-2 rounded-lg transition-all text-left text-xs border ${
                            isActive 
                              ? "bg-[#161618] border-[#d4af37]/30 text-[#d4af37]" 
                              : "border-transparent hover:bg-[#161618] text-[#b1b1b1]"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setIsEditingDoc(false);
                              setIsCreatingDoc(false);
                              setIsUpdatingDocMode(false);
                              setAiUpdateDraft(null);
                            }}
                            className="flex-1 font-medium font-sans truncate py-1 text-left cursor-pointer"
                          >
                            {doc.title}
                          </button>
                          
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <input
                              type="checkbox"
                              checked={isInContext}
                              onChange={() => toggleDocContext(doc.id)}
                              title="Toggle AI reference context"
                              className="w-3.5 h-3.5 rounded border-[#333335] text-[#d4af37] focus:ring-[#d4af37] bg-[#0c0c0d] cursor-pointer"
                            />
                            
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className={`p-1 rounded hover:bg-slate-100/10 ${isActive ? "text-[#7a7a7a] hover:text-red-400" : "text-[#7a7a7a] hover:text-red-500"} cursor-pointer`}
                              title="Delete record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {documents.length === 0 && (
                      <p className="text-xs text-[#7a7a7a] italic text-center py-4">No lore records found.</p>
                    )}
                  </div>

                  {/* File import / Dropzone area */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-2 border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isDraggingFile 
                        ? "border-[#d4af37] bg-[#d4af37]/5" 
                        : "border-[#2a2a2b] bg-[#0c0c0d]/40 hover:bg-[#161618] hover:border-[#d4af37]/40"
                    }`}
                  >
                    <input 
                      type="file" 
                      accept=".json,.yaml,.yml,.docx,.md,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    
                    {isParsingFile ? (
                      <div className="flex flex-col items-center space-y-1">
                        <RefreshCw className="w-5 h-5 text-[#d4af37] animate-spin" />
                        <span className="text-[10px] text-[#7a7a7a] font-mono">Parsing document...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1.5 pointer-events-none">
                        <Upload className="w-5 h-5 text-[#7a7a7a] group-hover:text-[#d4af37]" />
                        <div>
                          <span className="text-[11px] font-semibold text-[#e5e5e5] block">Import Document</span>
                          <span className="text-[9px] text-[#7a7a7a] font-sans">Drag & drop or browse</span>
                        </div>
                        <span className="text-[8px] font-mono text-[#666] uppercase bg-[#161618] px-1 py-0.5 rounded tracking-wider border border-[#2a2a2b]">
                          JSON, YAML, DOCX, MD, TXT
                        </span>
                      </div>
                    )}
                  </div>
                  {uploadError && (
                    <div className="text-[9px] text-red-400 bg-red-950/30 border border-red-900/40 p-2 rounded-lg font-mono leading-tight max-w-full break-all">
                      {uploadError}
                    </div>
                  )}
                </div>

                {/* Main detail / Editor panel */}
                <div className="flex-1 flex flex-col bg-[#0f0f10] border border-[#2a2a2b] rounded-xl overflow-hidden p-6 min-w-0">
                  
                  {isCreatingDoc || isEditingDoc ? (
                    /* DOC FORM EDITOR */
                    <form onSubmit={handleSaveDoc} className="space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#2a2a2b] pb-3">
                        <h3 className="font-serif italic text-lg text-[#e5e5e5]">
                          {isCreatingDoc ? "Record New Lore Element" : "Edit Lore Element"}
                        </h3>
                        <button 
                          type="button" 
                          onClick={() => { setIsEditingDoc(false); setIsCreatingDoc(false); }}
                          className="p-1 bg-[#1a1a1c] hover:bg-[#222] text-[#7a7a7a] hover:text-[#e5e5e5] border border-[#333335] rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Title</label>
                          <input 
                            type="text" 
                            required
                            value={docForm.title}
                            onChange={(e) => setDocForm((prev) => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-[#0c0c0d] border border-[#2a2a2b] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                            placeholder="e.g. Great Leyline Breach"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Category</label>
                          <select
                            value={docForm.category}
                            onChange={(e) => setDocForm((prev) => ({ ...prev, category: e.target.value as LoreCategory }))}
                            className="w-full bg-[#0c0c0d] border border-[#2a2a2b] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          >
                            <option value="Core Charter" className="bg-[#0c0c0d]">Core Charter</option>
                            <option value="Legal & Operations" className="bg-[#0c0c0d]">Legal & Operations</option>
                            <option value="Architecture" className="bg-[#0c0c0d]">Architecture</option>
                            <option value="System Safeguards" className="bg-[#0c0c0d]">System Safeguards</option>
                            <option value="Geography" className="bg-[#0c0c0d]">Geography</option>
                            <option value="Magic System" className="bg-[#0c0c0d]">Magic System</option>
                            <option value="History" className="bg-[#0c0c0d]">History</option>
                            <option value="Factions" className="bg-[#0c0c0d]">Factions</option>
                            <option value="Culture" className="bg-[#0c0c0d]">Culture</option>
                            <option value="Technology" className="bg-[#0c0c0d]">Technology</option>
                            <option value="Other" className="bg-[#0c0c0d]">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Tags (comma separated)</label>
                        <input 
                          type="text" 
                          value={docForm.tags}
                          onChange={(e) => setDocForm((prev) => ({ ...prev, tags: e.target.value }))}
                          className="w-full bg-[#0c0c0d] border border-[#2a2a2b] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          placeholder="e.g. Magic, Chronology, Solaria"
                        />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Markdown Content</label>
                        <textarea 
                          required
                          value={docForm.content}
                          onChange={(e) => setDocForm((prev) => ({ ...prev, content: e.target.value }))}
                          className="w-full flex-1 min-h-[250px] bg-[#0c0c0d] border border-[#2a2a2b] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] font-mono focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          placeholder="Draft your immersive lore article here... Supports Markdown headers, quotes, lists."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2b]">
                        <button 
                          type="button" 
                          onClick={() => { setIsEditingDoc(false); setIsCreatingDoc(false); }}
                          className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-5 py-2 text-xs font-bold bg-[#d4af37] text-black hover:opacity-90 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  ) : selectedDoc ? (
                    /* VIEW MODE / MANAGE UPDATES DRIVER */
                    <div className="space-y-6 flex-1 flex flex-col min-h-0">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2a2a2b] pb-4 gap-4">
                        <div>
                          <span className="px-2.5 py-0.5 bg-[#161618] text-[#d4af37] border border-[#333335] rounded-full text-[10px] font-mono font-bold tracking-wider uppercase">
                            {selectedDoc.category}
                          </span>
                          <h2 className="text-xl md:text-2xl font-serif italic text-[#e5e5e5] mt-1.5">{selectedDoc.title}</h2>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedDoc.tags.map((tag, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-[#1a1a1c] border border-[#333335] text-[#999] rounded-md font-semibold">#{tag}</span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openEditDoc(selectedDoc)}
                            className="p-2 text-[#7a7a7a] hover:text-[#e5e5e5] bg-[#161618] border border-[#2a2a2b] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Correct Edit
                          </button>

                          <button
                            onClick={() => setIsUpdatingDocMode((prev) => !prev)}
                            className={`p-2 border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                              isUpdatingDocMode 
                                ? "bg-[#d4af37] border-[#d4af37] text-black font-bold shadow-md shadow-[#d4af37]/15" 
                                : "bg-[#161618] border border-[#2a2a2b] text-[#d4af37] hover:bg-[#1a1a1c]"
                            }`}
                          >
                            <History className="w-3.5 h-3.5" />
                            Draft Update with AI
                          </button>

                          {/* Notion sync control button */}
                          <button
                            onClick={() => setIsNotionConfigOpen((prev) => !prev)}
                            className={`p-2 border rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                              isNotionConfigOpen 
                                ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold shadow-md shadow-emerald-500/10" 
                                : "bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:text-[#e5e5e5]"
                            }`}
                          >
                            <Database className="w-3.5 h-3.5 text-[#d4af37]" />
                            Notion Sync
                          </button>

                          {/* Document Export dropdown container */}
                          <div className="relative">
                            <button
                              onClick={() => setShowExportDropdown((prev) => !prev)}
                              className="p-2 text-[#7a7a7a] hover:text-[#e5e5e5] bg-[#161618] border border-[#2a2a2b] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                              Export As...
                            </button>
                            {showExportDropdown && (
                              <div className="absolute right-0 mt-2 w-44 bg-[#161618] border border-[#2a2a2b] rounded-xl shadow-xl z-30 py-1.5 overflow-hidden">
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "pdf"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-emerald-400 font-bold">PDF</span> PDF Document (.pdf)
                                </button>
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "md"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">MD</span> Markdown (.md)
                                </button>
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "docx"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">DOCX</span> Word Doc (.docx)
                                </button>
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "yaml"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">YAML</span> YAML (.yaml)
                                </button>
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "json"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">JSON</span> JSON (.json)
                                </button>
                                <button
                                  onClick={() => { exportDocument(selectedDoc, "txt"); setShowExportDropdown(false); }}
                                  className="w-full text-left px-4 py-2 text-xs text-[#b1b1b1] hover:text-white hover:bg-[#202022] transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono text-[9px] px-1 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">TXT</span> Plain Text (.txt)
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isNotionConfigOpen && (
                        /* NOTION INTEGRATION PANEL */
                        <div className="bg-[#111915] border border-emerald-900/40 rounded-xl p-4 space-y-4 shadow-lg">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase font-mono text-emerald-400 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-emerald-400" />
                              Notion Integration & Archiver
                            </h4>
                            <button onClick={() => setIsNotionConfigOpen(false)} className="text-[#7a7a7a] hover:text-white cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-[#999] leading-relaxed">
                            Synchronize your Anchor Court protocols, records, and registries to your Notion workspace in real-time.
                          </p>

                          {/* Credentials configuration */}
                          <div className="space-y-3 bg-[#0c0c0d] border border-[#2a2a2b] p-3 rounded-lg">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a7a] flex justify-between">
                                <span>Notion Integration Token</span>
                                {hasServerNotionKey && <span className="text-emerald-500 font-mono text-[9px] lowercase">Loaded from server environment</span>}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="password"
                                  value={notionApiKey}
                                  onChange={(e) => updateNotionApiKey(e.target.value)}
                                  placeholder={hasServerNotionKey ? "••••••••••••••••••••••••" : "Paste secret_... token here"}
                                  className="flex-1 bg-[#161618] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                />
                                <button
                                  type="button"
                                  disabled={isSearchingNotion}
                                  onClick={() => handleSearchNotion()}
                                  className="px-3 py-1.5 bg-[#161618] border border-[#2a2a2b] text-[#d4af37] hover:bg-[#202022] font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  {isSearchingNotion ? "Fetching..." : "Fetch Pages"}
                                </button>
                              </div>
                              <p className="text-[10px] text-[#666]">
                                Create a private integration on <a href="https://developers.notion.com" target="_blank" rel="noopener noreferrer" className="text-[#d4af37] underline">developers.notion.com</a>, and share your parent page with it to permit workspace access.
                              </p>
                            </div>

                            {/* Dropdown with fetched pages */}
                            {notionPages.length > 0 && (
                              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#2a2a2b]">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a7a]">
                                  Select Parent Page
                                </label>
                                <select
                                  value={selectedNotionPageId}
                                  onChange={(e) => setSelectedNotionPageId(e.target.value)}
                                  className="w-full bg-[#161618] border border-[#2a2a2b] rounded-lg px-3 py-1.5 text-xs text-[#e5e5e5] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                >
                                  {notionPages.map((page) => (
                                    <option key={page.id} value={page.id} className="bg-[#161618]">
                                      {page.title} ({page.object})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Error display */}
                            {notionError && (
                              <div className="text-xs text-red-400 bg-red-950/25 border border-red-900/30 p-2.5 rounded-lg font-mono">
                                {notionError}
                              </div>
                            )}

                            {/* Success display */}
                            {notionSuccess && (
                              <div className="text-xs text-emerald-400 bg-emerald-950/25 border border-emerald-900/30 p-2.5 rounded-lg space-y-1.5">
                                <p className="font-semibold flex items-center gap-1.5">
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                  Successfully archived page to Notion!
                                </p>
                                {notionPageUrl && (
                                  <a
                                    href={notionPageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-emerald-400 underline font-mono text-[10px] font-bold"
                                  >
                                    Open Page in Notion <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              disabled={isExportingNotion || (!notionApiKey && !hasServerNotionKey)}
                              onClick={handleExportToNotion}
                              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                            >
                              {isExportingNotion ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Archiving...
                                </>
                              ) : (
                                <>
                                  <Database className="w-3.5 h-3.5" />
                                  Save Page to Notion
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {isUpdatingDocMode && (
                        /* AI DOCUMENT UPDATE MODULE */
                        <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase font-mono text-[#d4af37] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                              Write & Draft Document Update
                            </h4>
                            <button onClick={() => { setIsUpdatingDocMode(false); setAiUpdateDraft(null); }} className="text-[#7a7a7a] hover:text-white">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <p className="text-xs text-[#999] leading-relaxed">
                            Describe how this document should evolve (e.g. <em>"Incorporate the new cryptographic handshake protocol into our communication standards"</em>). The Scribe Assistant will update the document, generate a formal changelog, and verify alignment.
                          </p>

                          <div className="flex gap-2">
                            <textarea
                              value={updateInstruction}
                              onChange={(e) => setUpdateInstruction(e.target.value)}
                              placeholder="e.g. Reflect the recent changes to the Sovereignty Scroll, adding a clause for anti-drift automatic sweeps..."
                              className="flex-1 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                            />
                            <button
                              onClick={handleDraftUpdate}
                              disabled={isDraftingUpdate || !updateInstruction.trim()}
                              className="px-4 bg-[#d4af37] hover:opacity-90 disabled:bg-[#333] text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center cursor-pointer uppercase tracking-wider"
                            >
                              {isDraftingUpdate ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                "Generate Draft"
                              )}
                            </button>
                          </div>

                          {aiUpdateDraft && (
                            /* COMPARATIVE side-by-side PREVIEW */
                            <div className="mt-4 border-t border-[#2a2a2b] pt-4 space-y-3">
                              <div className="bg-[#101b15] border border-emerald-900/35 rounded-lg p-3">
                                <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                  <FileCheck className="w-3.5 h-3.5" />
                                  Generated Changelog
                                </h5>
                                <p className="text-[11px] text-emerald-300/80 mt-1 italic">"{aiUpdateDraft.updateNote}"</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-[#2a2a2b] rounded-lg p-3 max-h-[250px] overflow-y-auto bg-[#0c0c0d]">
                                  <h6 className="text-[10px] font-bold uppercase text-[#7a7a7a] mb-1">Original Content</h6>
                                  <div className="opacity-60 text-xs">
                                    <SimpleMarkdown content={selectedDoc.content} />
                                  </div>
                                </div>
                                <div className="border border-emerald-900/40 rounded-lg p-3 max-h-[250px] overflow-y-auto bg-[#101b15]/20">
                                  <h6 className="text-[10px] font-bold uppercase text-emerald-500 mb-1">Updated AI Proposed Draft</h6>
                                  <div className="text-xs">
                                    <SimpleMarkdown content={aiUpdateDraft.updatedContent} />
                                  </div>
                                </div>
                              </div>

                              {aiUpdateDraft.suggestions?.length > 0 && (
                                <div className="bg-[#241c0f] border border-amber-900/30 rounded-lg p-3">
                                  <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                    Continuity Advice / Impact Checklist
                                  </h5>
                                  <ul className="list-disc pl-4 mt-1 space-y-1">
                                    {aiUpdateDraft.suggestions.map((s, i) => (
                                      <li key={i} className="text-[10px] text-amber-300/80">{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setAiUpdateDraft(null)}
                                  className="px-3 py-1.5 bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[#7a7a7a] hover:text-[#e5e5e5] font-semibold text-xs rounded-lg cursor-pointer"
                                >
                                  Reject Draft
                                </button>
                                <button 
                                  onClick={handleCommitUpdate}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm shadow-emerald-600/10 cursor-pointer uppercase tracking-wider"
                                >
                                  Commit Update (V.{selectedDoc.version + 1})
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main document display */}
                      <div className="flex-1 overflow-y-auto bg-[#0c0c0d] rounded-xl p-4 md:p-6 border border-[#2a2a2b]">
                        <SimpleMarkdown content={selectedDoc.content} />
                      </div>

                      {/* Version history footer list */}
                      {selectedDoc.versionHistory?.length > 0 && (
                        <div className="border-t border-[#2a2a2b] pt-4">
                          <h4 className="text-xs font-bold uppercase font-mono text-[#7a7a7a] flex items-center gap-1.5 mb-3">
                            <History className="w-3.5 h-3.5" />
                            Document Version Log
                          </h4>
                          <div className="space-y-2">
                            {selectedDoc.versionHistory.map((h, i) => (
                              <div key={i} className="text-xs border border-[#2a2a2b] rounded-lg p-2.5 bg-[#161618] flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#2a2a2b] rounded text-[#d4af37] font-bold">
                                    V{h.version}
                                  </span>
                                  <p className="text-[#999] font-medium font-sans italic mt-1">"{h.updateNote}"</p>
                                </div>
                                <span className="text-[10px] text-[#555] font-mono">
                                  {new Date(h.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <BookOpen className="w-12 h-12 text-[#2a2a2b]" />
                      <h4 className="font-serif italic text-[#e5e5e5] mt-3">Select a Lore Document</h4>
                      <p className="text-[#7a7a7a] text-xs mt-1">Choose an element on the left sidebar or create a new one to begin detailing magic, geography, or empires.</p>
                      <button onClick={openNewDoc} className="mt-4 px-4 py-1.5 bg-[#d4af37] text-black rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Add Document
                      </button>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* 3. CHARACTERS TAB */}
            {activeTab === "characters" && (
              <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-[400px]">
                
                {/* Character list sidebar */}
                <div className="w-full md:w-64 flex flex-col border border-[#2a2a2b] rounded-xl bg-[#0f0f10] p-3 space-y-2 min-h-[200px] md:min-h-0">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2b]">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a] font-mono">Actors & NPCs</span>
                    <button 
                      onClick={openNewChar} 
                      className="p-1 hover:bg-[#1a1a1c] text-[#7a7a7a] hover:text-[#d4af37] rounded-lg transition-colors cursor-pointer"
                      title="Add manual character log"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1">
                    {characters.map((char) => {
                      const isActive = char.id === selectedCharId;
                      const isInContext = activeContext.characters.includes(char.id);
                      return (
                        <div 
                          key={char.id}
                          className={`group w-full flex items-center justify-between p-2 rounded-lg transition-all text-left text-xs border ${
                            isActive 
                              ? "bg-[#161618] border-[#d4af37]/30 text-[#d4af37]" 
                              : "border-transparent hover:bg-[#161618] text-[#b1b1b1]"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSelectedCharId(char.id);
                              setIsEditingChar(false);
                              setIsCreatingChar(false);
                            }}
                            className="flex-1 font-medium font-sans truncate py-1 text-left cursor-pointer"
                          >
                            {char.name}
                          </button>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <input
                              type="checkbox"
                              checked={isInContext}
                              onChange={() => toggleCharContext(char.id)}
                              title="Toggle AI reference context"
                              className="w-3.5 h-3.5 rounded border-[#333335] text-[#d4af37] focus:ring-[#d4af37] bg-[#0c0c0d] cursor-pointer"
                            />

                            <button
                              onClick={() => handleDeleteChar(char.id)}
                              className={`p-1 rounded hover:bg-slate-100/10 ${isActive ? "text-[#7a7a7a] hover:text-red-400" : "text-[#7a7a7a] hover:text-red-500"} cursor-pointer`}
                              title="Delete record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {characters.length === 0 && (
                      <p className="text-xs text-[#7a7a7a] italic text-center py-4">No characters recorded.</p>
                    )}
                  </div>
                </div>

                {/* Character Sheet display */}
                <div className="flex-1 bg-[#0f0f10] border border-[#2a2a2b] rounded-xl overflow-hidden p-6 min-w-0">
                  
                  {isCreatingChar || isEditingChar ? (
                    /* CHARACTER FORM EDITOR */
                    <form onSubmit={handleSaveChar} className="flex-1 flex flex-col h-full min-h-0">
                      <div className="flex items-center justify-between border-b border-[#2a2a2b] pb-3 mb-4 shrink-0">
                        <h3 className="font-serif italic text-lg text-[#e5e5e5]">
                          {isCreatingChar ? "Record New Character" : "Edit Character Profile"}
                        </h3>
                        <button 
                          type="button" 
                          onClick={() => { setIsEditingChar(false); setIsCreatingChar(false); }}
                          className="p-1 bg-[#1a1a1c] hover:bg-[#222] text-[#7a7a7a] hover:text-[#e5e5e5] border border-[#333335] rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Scrollable Form Body Wrapper */}
                      <div className="flex-1 overflow-y-auto space-y-5 pr-1 max-h-[55vh] scrollbar-thin">
                        
                        {/* Section A: Registry Core */}
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Registry Information</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Full Name *</label>
                              <input 
                                type="text" 
                                required
                                value={charForm.name}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Zephyr Vance"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Official Title / Honorific</label>
                              <input 
                                type="text" 
                                value={charForm.title}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. High Arch-Mage"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Faction / Organization</label>
                              <input 
                                type="text" 
                                value={charForm.faction}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, faction: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Leyline Syndicate"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Primary Role / Archetype</label>
                              <input 
                                type="text" 
                                value={charForm.role}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, role: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Arcane Smuggler"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Additional Roles (comma separated)</label>
                              <input 
                                type="text" 
                                value={charForm.roles}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, roles: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Scout, Cipher-Breaker"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Sovereignty / Skill Tier</label>
                              <input 
                                type="text" 
                                value={charForm.tier}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, tier: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Tier IV Legendary"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section B: Forces & Aesthetics */}
                        <div className="space-y-3 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Aesthetic & Force Signature</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Elemental Force Alignment</label>
                              <input 
                                type="text" 
                                value={charForm.element}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, element: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Void-Fire, Shadow, Chrono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Stylistic Accent Color (Hex/Name)</label>
                              <input 
                                type="text" 
                                value={charForm.color}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, color: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. #d4af37, royalblue, deepviolet"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Visual Appearance & Aesthetics</label>
                              <input 
                                type="text" 
                                value={charForm.appearance}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, appearance: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Cloaked, metallic glowing visor"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Behavioral Traits (comma separated)</label>
                              <input 
                                type="text" 
                                value={charForm.traits}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, traits: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Clever, Cynical, Agile"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Core Identity Deconstruction</label>
                              <input 
                                type="text" 
                                value={charForm.identity}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, identity: e.target.value }))}
                                className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="e.g. Former revolutionary seeking peace..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section C: Psychological & Lore Profiles */}
                        <div className="space-y-4 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Narrative Dossier</span>
                          
                          <div>
                            <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Primary Biography & Motives *</label>
                            <textarea 
                              required
                              value={charForm.bio}
                              onChange={(e) => setCharForm((prev) => ({ ...prev, bio: e.target.value }))}
                              className="w-full h-24 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              placeholder="Draft character motivations, objectives, and historic background..."
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Origin Story</label>
                              <textarea 
                                value={charForm.originStory}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, originStory: e.target.value }))}
                                className="w-full h-24 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="Narrate their birthplace, early years, or founding incidents..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Psychological Personality Profile</label>
                              <textarea 
                                value={charForm.personality}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, personality: e.target.value }))}
                                className="w-full h-24 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="Describe their psychological makeup, quirks, fears, and temperament..."
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Experiences & Life Logs</label>
                              <textarea 
                                value={charForm.experiences}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, experiences: e.target.value }))}
                                className="w-full h-24 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="Log crucial life experiences, past battles, trials, or training records..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Operational Function / Routine</label>
                              <textarea 
                                value={charForm.function}
                                onChange={(e) => setCharForm((prev) => ({ ...prev, function: e.target.value }))}
                                className="w-full h-24 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                placeholder="Describe operational directives, mechanical/magic routines, or daily schedules..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Relationships draft section */}
                        <div className="border border-[#2a2a2b] rounded-xl p-4 bg-[#161618] space-y-3 pt-2">
                          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#7a7a7a] block">Direct Character Connections</span>
                          
                          <div className="space-y-2">
                            {charForm.relationships.map((rel, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-[#0c0c0d] p-2 border border-[#2a2a2b] rounded-lg text-xs text-[#b1b1b1]">
                                <span className="font-semibold text-[#e5e5e5]">{getCharName(rel.targetCharacterId)}</span>
                                <span className="text-[#d4af37] bg-[#1a1a1c] border border-[#333335] px-1.5 py-0.5 rounded text-[10px] font-mono">{rel.type}</span>
                                <span className="text-[#7a7a7a] flex-1 truncate">{rel.notes}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setCharForm((prev) => ({
                                      ...prev,
                                      relationships: prev.relationships.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  className="text-[#7a7a7a] hover:text-red-400 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add relationship sub-form */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <select 
                              id="rel-target" 
                              className="bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="" className="bg-[#0c0c0d]">-- Connect with Character --</option>
                              {characters.filter((c) => c.id !== selectedCharId).map((c) => (
                                <option key={c.id} value={c.id} className="bg-[#0c0c0d] text-white">{c.name}</option>
                              ))}
                            </select>
                            <input 
                              id="rel-type" 
                              type="text" 
                              placeholder="Type: Ally, Rival" 
                              className="bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-2 py-1 text-xs w-32"
                            />
                            <input 
                              id="rel-notes" 
                              type="text" 
                              placeholder="Connection details..." 
                              className="bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-2 py-1 text-xs flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const targetEl = document.getElementById("rel-target") as HTMLSelectElement;
                                const typeEl = document.getElementById("rel-type") as HTMLInputElement;
                                const notesEl = document.getElementById("rel-notes") as HTMLInputElement;
                                
                                if (targetEl && targetEl.value && typeEl && typeEl.value) {
                                  const newRel: Relationship = {
                                    targetCharacterId: targetEl.value,
                                    type: typeEl.value,
                                    notes: notesEl?.value || ""
                                  };
                                  setCharForm((prev) => ({
                                    ...prev,
                                    relationships: [...prev.relationships, newRel]
                                  }));
                                  targetEl.value = "";
                                  typeEl.value = "";
                                  if (notesEl) notesEl.value = "";
                                }
                              }}
                              className="px-3 py-1 bg-[#d4af37] text-black font-bold uppercase tracking-wider text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Link className="w-3 h-3" /> Connect
                            </button>
                          </div>
                        </div>

                      </div>

                      <div className="flex justify-end gap-2 pt-3 mt-4 border-t border-[#2a2a2b] shrink-0">
                        <button 
                          type="button" 
                          onClick={() => { setIsEditingChar(false); setIsCreatingChar(false); }}
                          className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="px-5 py-2 text-xs font-bold bg-[#d4af37] text-black hover:opacity-90 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          Save Profile
                        </button>
                      </div>
                    </form>
                  ) : selectedChar ? (
                    /* DETAILED PROFILE CARD VIEW */
                    <div className="flex flex-col h-full min-h-0">
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#2a2a2b] pb-4 mb-4 gap-4 shrink-0">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-[#161618] text-[#d4af37] border border-[#333335] rounded-full text-[10px] font-mono font-bold tracking-wider uppercase">
                              {selectedChar.faction || "Independent Actor"}
                            </span>
                            {selectedChar.title && (
                              <span className="px-2 py-0.5 bg-[#1a1a1c]/80 text-[#b1b1b1] border border-[#2a2a2b] rounded-full text-[9px] font-mono font-medium">
                                🎖️ {selectedChar.title}
                              </span>
                            )}
                            {selectedChar.tier && (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[9px] font-mono font-semibold">
                                Tier: {selectedChar.tier}
                              </span>
                            )}
                            {selectedChar.element && (
                              <span className="px-2 py-0.5 bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 rounded-full text-[9px] font-mono font-semibold">
                                🌌 {selectedChar.element}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2.5 mt-1.5">
                            {selectedChar.color && (
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm" 
                                style={{ backgroundColor: selectedChar.color }}
                                title={`Signature color: ${selectedChar.color}`}
                              />
                            )}
                            <h2 className="text-xl md:text-2xl font-serif italic text-[#e5e5e5]">{selectedChar.name}</h2>
                          </div>
                          
                          <p className="text-xs text-[#7a7a7a] font-semibold font-mono">
                            {selectedChar.role || "Role unmapped"}
                            {selectedChar.roles && selectedChar.roles.length > 0 && ` • (${selectedChar.roles.join(', ')})`}
                          </p>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedChar.traits.map((trait, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 bg-[#1a1a1c] border border-[#333335] text-[#999] rounded-md font-mono font-semibold">{trait}</span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => openEditChar(selectedChar)}
                          className="p-2 text-[#7a7a7a] hover:text-[#e5e5e5] bg-[#161618] border border-[#2a2a2b] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Modify Bio
                        </button>
                      </div>

                      {/* Scrollable Dossier Details */}
                      <div className="flex-1 overflow-y-auto space-y-6 pr-1 max-h-[55vh] scrollbar-thin">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Main Story & Backstory Columns */}
                          <div className="lg:col-span-2 space-y-5">
                            {/* Bio / Bio backstory */}
                            <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-5 space-y-2">
                              <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Primary Biography</h4>
                              <p className="text-[#b1b1b1] text-xs leading-relaxed whitespace-pre-wrap font-sans">{selectedChar.bio}</p>
                            </div>

                            {/* Origin story */}
                            {selectedChar.originStory && (
                              <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-5 space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Origin Narrative</h4>
                                <p className="text-[#b1b1b1] text-xs leading-relaxed whitespace-pre-wrap font-sans">{selectedChar.originStory}</p>
                              </div>
                            )}

                            {/* Key Life Experiences */}
                            {selectedChar.experiences && (
                              <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-5 space-y-2">
                                <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Life Experiences & Historic Logs</h4>
                                <p className="text-[#b1b1b1] text-xs leading-relaxed whitespace-pre-wrap font-sans">{selectedChar.experiences}</p>
                              </div>
                            )}
                          </div>

                          {/* Aesthetic & Operational Column */}
                          <div className="space-y-5">
                            {/* Appearance & Identity block */}
                            {(selectedChar.appearance || selectedChar.identity || selectedChar.personality || selectedChar.function) && (
                              <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-4 space-y-4">
                                <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Aesthetic & Force Signature</h4>
                                
                                {selectedChar.appearance && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-mono text-[#7a7a7a] uppercase font-bold">Appearance</span>
                                    <p className="text-[#b1b1b1] text-xs leading-relaxed font-sans">{selectedChar.appearance}</p>
                                  </div>
                                )}

                                {selectedChar.identity && (
                                  <div className="space-y-1 pt-2 border-t border-[#2a2a2b]/60">
                                    <span className="text-[9px] font-mono text-[#7a7a7a] uppercase font-bold">Deconstructed Identity</span>
                                    <p className="text-[#b1b1b1] text-xs leading-relaxed font-sans">{selectedChar.identity}</p>
                                  </div>
                                )}

                                {selectedChar.personality && (
                                  <div className="space-y-1 pt-2 border-t border-[#2a2a2b]/60">
                                    <span className="text-[9px] font-mono text-[#7a7a7a] uppercase font-bold">Psychological Profile</span>
                                    <p className="text-[#b1b1b1] text-xs leading-relaxed font-sans">{selectedChar.personality}</p>
                                  </div>
                                )}

                                {selectedChar.function && (
                                  <div className="space-y-1 pt-2 border-t border-[#2a2a2b]/60">
                                    <span className="text-[9px] font-mono text-[#7a7a7a] uppercase font-bold">Operational Routine / Procedure</span>
                                    <p className="text-[#b1b1b1] text-xs leading-relaxed font-sans">{selectedChar.function}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Connections / Relationships block */}
                            <div className="bg-[#161618] border border-[#2a2a2b] rounded-xl p-4 space-y-3">
                              <h4 className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] flex items-center gap-1.5">
                                <Link className="w-3.5 h-3.5 text-[#d4af37]" />
                                Thematic Connections
                              </h4>
                              
                              <div className="space-y-2.5">
                                {selectedChar.relationships?.map((rel, i) => (
                                  <div key={i} className="text-xs bg-[#0c0c0d] border border-[#2a2a2b] p-2.5 rounded-lg space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-[#e5e5e5]">{getCharName(rel.targetCharacterId)}</span>
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1a1a1c] text-[#d4af37] border border-[#333335] rounded-full font-bold">{rel.type}</span>
                                    </div>
                                    {rel.notes && (
                                      <p className="text-[#7a7a7a] text-[11px] leading-snug font-sans italic">"{rel.notes}"</p>
                                    )}
                                  </div>
                                ))}
                                {(!selectedChar.relationships || selectedChar.relationships.length === 0) && (
                                  <p className="text-[11px] text-[#7a7a7a] italic">No social ties or clashes mapped.</p>
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <Users className="w-12 h-12 text-[#2a2a2b]" />
                      <h4 className="font-serif italic text-[#e5e5e5] mt-3">Select a Character Sheet</h4>
                      <p className="text-[#7a7a7a] text-xs mt-1">Choose a faction agent on the left sidebar or record a new profile to start detailing their motives.</p>
                      <button onClick={openNewChar} className="mt-4 px-4 py-1.5 bg-[#d4af37] text-black rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Record Character
                      </button>
                    </div>
                  )}

                </div>

              </div>
            )}

            {/* 4. CONSISTENCY HUB */}
            {activeTab === "consistency" && (
              <div className="space-y-6">
                
                <div className="bg-[#11100d] border border-[#d4af37]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex gap-3 items-start">
                    <div className="p-3 bg-[#1c1a14] text-[#d4af37] border border-[#d4af37]/30 rounded-xl mt-1 sm:mt-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif italic text-[#e5e5e5]">Protocol Alignment Audit</h3>
                      <p className="text-[#b1b1b1] text-xs mt-1 leading-relaxed">
                        Execute an administrative alignment check across your entire court. The Scribe Assistant scans for protocol gaps, schema drifts, and mismatched agent registries.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRunConsistencyAudit}
                    disabled={isAuditing}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#d4af37] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-105"
                  >
                    {isAuditing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Auditing Court Alignment...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Run Integrity Sweep
                      </>
                    )}
                  </button>
                </div>

                {consistencyIssues.length > 0 ? (
                  <div className="space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a] font-mono block">
                      Detected Logical Anomaly Reports ({consistencyIssues.length})
                    </span>

                    <div className="grid grid-cols-1 gap-4">
                      {consistencyIssues.map((issue, idx) => (
                        <div key={idx} className="bg-[#0f0f10] border border-[#2a2a2b] rounded-xl overflow-hidden flex flex-col sm:flex-row items-stretch">
                          <div className={`w-full sm:w-3 bg-amber-500 ${
                            issue.severity === "High" ? "sm:bg-red-500" : issue.severity === "Medium" ? "sm:bg-amber-500" : "sm:bg-blue-400"
                          }`}></div>

                          <div className="p-5 flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h4 className="font-serif text-[#e5e5e5] text-sm md:text-base flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border ${
                                  issue.severity === "High" 
                                    ? "bg-[#1c1212] text-red-400 border-red-900/40" 
                                    : issue.severity === "Medium" 
                                    ? "bg-[#1c1812] text-amber-400 border-amber-900/40" 
                                    : "bg-[#12161c] text-blue-400 border-blue-900/40"
                                }`}>
                                  {issue.severity} Severity
                                </span>
                                {issue.title}
                              </h4>
                              
                              <div className="flex flex-wrap gap-1">
                                {issue.involvedElements?.map((elem: string, idx2: number) => (
                                  <span key={idx2} className="text-[10px] font-mono bg-[#1a1a1c] border border-[#333335] rounded-md px-1.5 py-0.5 text-[#999]">
                                    {elem}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="text-[#b1b1b1] text-xs leading-relaxed">{issue.description}</p>

                            <div className="bg-[#121c16] border border-emerald-900/30 rounded-lg p-3 space-y-1">
                              <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#d4af37] block">Scribe's Proposed Resolution</span>
                              <p className="text-[#b1b1b1] text-xs italic leading-relaxed">"{issue.resolution}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-12 bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                    <h4 className="font-serif italic text-[#e5e5e5] mt-3">Continuity Shield Intact</h4>
                    <p className="text-[#7a7a7a] text-xs mt-1">No major contradictions or narrative clashing have been registered. Run a sweep if you've recently modified documents or characters.</p>
                  </div>
                )}

              </div>
            )}

          </div>
        </main>

        {/* RIGHT SIDEBAR PANEL: CONTEXT-AWARE CHAT AGENT */}
        <aside className="w-full lg:w-96 bg-[#0f0f10] border-t lg:border-t-0 lg:border-l border-[#2a2a2b] flex flex-col h-[500px] lg:h-full min-h-0">
          
          {/* Scribe Sidebar Header */}
          <div className="p-4 border-b border-[#2a2a2b] flex items-center justify-between bg-[#161618]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#1a1a1c] border border-[#d4af37]/30 text-[#d4af37] rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif italic text-sm text-[#e5e5e5]">Scribe Consulting Console</h3>
                <p className="text-[10px] text-[#7a7a7a]">Continuous context memory frame</p>
              </div>
            </div>

            {/* Clear history */}
            <button 
              onClick={() => {
                if (!activeWorldId || !user) return;
                showConfirm(
                  "Reset Chat History",
                  "Are you sure you want to clear the entire consulting log memory for this world setting?",
                  async () => {
                    const freshWelcomeId = `msg-${Date.now()}`;
                    const freshWelcomeRef = doc(db, "worlds", activeWorldId, "messages", freshWelcomeId);
                    
                    try {
                      // Delete all existing messages in Firestore
                      const deletePromises = messages.map((m) => 
                        deleteDoc(doc(db, "worlds", activeWorldId, "messages", m.id))
                      );
                      setMessages([]); // Instant UI feedback
                      await Promise.all(deletePromises);
                      
                      // Add fresh welcome note
                      await setDoc(freshWelcomeRef, {
                        sender: "assistant",
                        text: "Logs reset. Ask me anything about the world or request drafts.",
                        timestamp: new Date().toLocaleTimeString(),
                        ownerId: user.uid
                      });
                    } catch (err: any) {
                      handleFirestoreError(err, OperationType.WRITE, `worlds/${activeWorldId}/messages/${freshWelcomeId}`);
                    }
                  },
                  "Reset",
                  "Cancel"
                );
              }} 
              className="text-[#7a7a7a] hover:text-[#d4af37] transition-colors cursor-pointer"
              title="Reset Chat logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active context summaries list */}
          <div className="px-4 py-2 border-b border-[#2a2a2b] bg-[#121214] flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-[#7a7a7a]">Context:</span>
              <span className="text-[10px] font-sans font-semibold bg-[#1a1a1c] border border-[#333335] text-[#b1b1b1] px-2 py-0.5 rounded-full">
                {activeContext.documents.length} Docs, {activeContext.characters.length} Chars
              </span>
            </div>
            
            <span className="text-[10px] font-sans text-[#7a7a7a] font-medium">Auto-synced</span>
          </div>

          {/* Chat message streams logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#09090a]">
            {messages.map((m) => {
              const charSheetData = parseCharacterSheetBlock(m.text);
              const cleanText = cleanMarkdownText(m.text);

              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[85%] ${
                    m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2 shadow-sm w-full ${
                    m.sender === "user" 
                      ? "bg-[#1a1a1c] text-[#e5e5e5] border border-[#2a2a2b] rounded-tr-none" 
                      : m.isSystemAudit 
                      ? "bg-[#11100d] border border-[#d4af37]/30 text-[#b1b1b1] rounded-tl-none" 
                      : "bg-[#161618] border border-[#2a2a2b] text-[#b1b1b1] rounded-tl-none"
                  }`}>
                    {cleanText ? (
                      <SimpleMarkdown content={cleanText} />
                    ) : (
                      <p className="text-[10px] text-[#7a7a7a] font-mono italic">Drafting native agent profile...</p>
                    )}
                    
                    {/* Render a beautiful, custom character registration card if a sheet is drafted */}
                    {charSheetData && (
                      <div className="mt-3 bg-[#0c0c0d] border border-[#d4af37]/30 rounded-xl p-3 space-y-2 text-xs text-left">
                        <div className="flex items-center justify-between border-b border-[#2a2a2b]/60 pb-2">
                          <span className="text-[10px] uppercase font-mono font-bold text-[#d4af37] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#d4af37]" />
                            Drafted Character Card
                          </span>
                          <span className="text-[9px] font-mono bg-[#161618] text-[#999] px-1.5 py-0.5 rounded border border-[#2a2a2b]">
                            Ready for Logs
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="font-serif italic text-sm text-[#e5e5e5]">{charSheetData.name}</h4>
                          <p className="text-[10px] text-[#7a7a7a] font-mono">
                            {charSheetData.title || charSheetData.role} • {charSheetData.faction}
                          </p>
                          <p className="text-[#b1b1b1] text-[11px] leading-relaxed line-clamp-3">{charSheetData.bio}</p>
                          
                          {charSheetData.traits && Array.isArray(charSheetData.traits) && charSheetData.traits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {charSheetData.traits.map((trait: string, tIdx: number) => (
                                <span key={tIdx} className="text-[9px] font-mono bg-[#1a1a1c] border border-[#2a2a2b] rounded px-1.5 py-0.5 text-[#999]">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImportCharacterFromChat(charSheetData)}
                          className="w-full mt-2 py-1.5 bg-[#d4af37]/10 hover:bg-[#d4af37]/25 text-[#d4af37] hover:text-white border border-[#d4af37]/30 hover:border-[#d4af37]/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Register "{charSheetData.name}" to Logs
                        </button>
                      </div>
                    )}
                    
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-[#333]/40">
                        {m.attachments.map((attach, idx) => {
                          const isImage = attach.type && attach.type.startsWith("image/");
                          const isVideo = attach.type && attach.type.startsWith("video/");
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center gap-1.5 bg-[#252528]/60 hover:bg-[#252528] px-2 py-1 rounded-lg border border-[#333]/50 text-[10px] text-[#b1b1b1] max-w-[200px]"
                              title={attach.name}
                            >
                              {isImage ? (
                                <img 
                                  src={`data:${attach.type};base64,${attach.base64Data}`} 
                                  alt={attach.name} 
                                  className="w-4 h-4 object-cover rounded"
                                  referrerPolicy="no-referrer"
                                />
                              ) : isVideo ? (
                                <Video className="w-3 h-3 text-[#d4af37]" />
                              ) : (
                                <Paperclip className="w-3 h-3 text-[#7a7a7a]" />
                              )}
                              <span className="truncate max-w-[120px] font-mono">{attach.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="w-full flex items-center justify-between mt-1 px-1 text-[9px] text-[#7a7a7a] font-mono gap-4">
                    <span>{m.timestamp}</span>
                    {m.text && (
                      <button
                        type="button"
                        onClick={() => {
                          const title = `${m.sender === "user" ? "User Record" : "Scribe Response"}`;
                          const subtitle = `Anchor Court Scribe Session • Thread: ${activeWorldId || "Draft"} • Timestamp: ${m.timestamp}`;
                          generatePdf(title, subtitle, cleanMarkdownText(m.text), `scribe-archive-${Date.now()}.pdf`);
                        }}
                        className="text-[#7a7a7a] hover:text-[#d4af37] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
                        title="Download message block as PDF"
                      >
                        <Download className="w-2.5 h-2.5" />
                        <span>Save as PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {isGeneratingChat && (
              <div className="flex flex-col items-start max-w-[85%] mr-auto">
                <div className="p-3 bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] rounded-2xl rounded-tl-none text-xs flex items-center gap-2 shadow-sm">
                  <RefreshCw className="w-3.5 h-3.5 text-[#d4af37] animate-spin" />
                  <span className="font-semibold text-[#7a7a7a] font-serif italic">{loadingMessage}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reference guide instructions / templates */}
          {messages.length < 3 && (
            <div className="px-4 py-2 border-t border-[#2a2a2b] bg-[#121214]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a7a] font-mono">Brainstorming Sparks</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <button
                  onClick={() => triggerQuickPrompt("Weave a historic event describing a legendary battle that explains how the Floating Metropolis of Solaria lost its first runic engine.")}
                  className="p-1.5 text-left border border-[#2a2a2b] hover:border-[#d4af37]/50 bg-[#161618] hover:bg-[#1a1a1c] rounded text-[10px] text-[#b1b1b1] hover:text-[#d4af37] transition-all cursor-pointer font-sans truncate"
                >
                  ⚡ Engine Loss Event
                </button>
                <button
                  onClick={() => triggerQuickPrompt("Concoct a third character who is a double-agent spy secretly trading information between the Iron Conclave and the Outcast Syndicate.")}
                  className="p-1.5 text-left border border-[#2a2a2b] hover:border-[#d4af37]/50 bg-[#161618] hover:bg-[#1a1a1c] rounded text-[10px] text-[#b1b1b1] hover:text-[#d4af37] transition-all cursor-pointer font-sans truncate"
                >
                  ⚡ Double-Agent Spy
                </button>
                <button
                  onClick={() => triggerQuickPrompt("Explain what physical side-effects occur if a human spends too long inside a mine containing unrefined raw Aetherite.")}
                  className="p-1.5 text-left border border-[#2a2a2b] hover:border-[#d4af37]/50 bg-[#161618] hover:bg-[#1a1a1c] rounded text-[10px] text-[#b1b1b1] hover:text-[#d4af37] transition-all cursor-pointer font-sans truncate"
                >
                  ⚡ Aether Mining Risks
                </button>
                <button
                  onClick={() => triggerQuickPrompt("Check if there are any narrative inconsistencies or clashing details between Zephyr's backstory and the terms of the Obsidian Accord.")}
                  className="p-1.5 text-left border border-[#2a2a2b] hover:border-[#d4af37]/50 bg-[#161618] hover:bg-[#1a1a1c] rounded text-[10px] text-[#b1b1b1] hover:text-[#d4af37] transition-all cursor-pointer font-sans truncate"
                >
                  ⚡ Backstory Cross-Check
                </button>
              </div>
            </div>
          )}

          {/* Chat Attachments Preview Area */}
          {chatAttachments.length > 0 && (
            <div className="px-3 py-2 bg-[#121214] border-t border-[#2a2a2b] flex flex-wrap gap-1.5">
              {chatAttachments.map((attach, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-1.5 bg-[#1a1a1c] border border-[#2a2a2b] pl-2 pr-1.5 py-1 rounded-lg text-[10px] text-[#e5e5e5] font-mono"
                >
                  {attach.type && attach.type.startsWith("image/") ? (
                    <img 
                      src={`data:${attach.type};base64,${attach.base64Data}`} 
                      alt={attach.name} 
                      className="w-4 h-4 object-cover rounded"
                      referrerPolicy="no-referrer"
                    />
                  ) : attach.type && attach.type.startsWith("video/") ? (
                    <Video className="w-3.5 h-3.5 text-[#d4af37]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#7a7a7a]" />
                  )}
                  <span className="truncate max-w-[120px]">{attach.name}</span>
                  <button
                    type="button"
                    onClick={() => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#7a7a7a] hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload loading and errors inside chat */}
          {isUploadingChatFile && (
            <div className="px-3 py-1 bg-[#121214] border-t border-[#2a2a2b] flex items-center gap-1.5 text-[10px] font-mono text-[#7a7a7a]">
              <RefreshCw className="w-3 h-3 text-[#d4af37] animate-spin" />
              <span>Weaving attachment...</span>
            </div>
          )}
          {chatUploadError && (
            <div className="px-3 py-1 bg-[#121214] border-t border-[#2a2a2b] text-[10px] font-mono text-red-400">
              ⚠️ {chatUploadError}
            </div>
          )}

          {/* Native Agent Council / Roundtable Banner */}
          {characters.filter((c) => activeContext.characters.includes(c.id)).length > 0 && (
            <div className="p-3 bg-[#11100d] border-t border-[#2a2a2b] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#d4af37] font-semibold font-serif italic">
                  <Users className="w-3.5 h-3.5" />
                  Convene Court Council
                </div>
                <span className="text-[9px] text-[#7a7a7a] font-mono bg-[#161618] px-1.5 py-0.5 rounded border border-[#2a2a2b]">
                  {characters.filter((c) => activeContext.characters.includes(c.id)).length === 1 ? '1 Agent Active' : `${characters.filter((c) => activeContext.characters.includes(c.id)).length} Agents Selected`}
                </span>
              </div>
              <div className="text-[10px] text-[#7a7a7a] leading-normal font-sans">
                Bring <strong>{characters.filter((c) => activeContext.characters.includes(c.id)).map(c => c.name).join(', ')}</strong> into a council meeting to audit documents or debate ideologies.
              </div>
              {chatInput.trim() && (
                <div className="text-[9px] text-[#d4af37] bg-[#d4af37]/5 px-2 py-1 rounded border border-[#d4af37]/20 font-sans italic">
                  Focus topic: "{chatInput.trim()}"
                </div>
              )}
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => handleConveneRoundtable('audit')}
                  disabled={isGeneratingChat}
                  className="flex-1 py-1.5 px-2 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 hover:border-[#d4af37]/50 rounded text-[10px] font-semibold text-[#d4af37] cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Audit Context
                </button>
                <button
                  type="button"
                  onClick={() => handleConveneRoundtable('debate')}
                  disabled={isGeneratingChat}
                  className="flex-1 py-1.5 px-2 bg-[#1a1a1c] hover:bg-[#222] border border-[#2a2a2b] rounded text-[10px] font-semibold text-[#e5e5e5] cursor-pointer transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Convene Debate
                </button>
              </div>
            </div>
          )}

          {/* Chat Input Bar */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-[#2a2a2b] flex gap-2 bg-[#121214] items-center">
            {/* Paperclip upload button */}
            <div className="relative flex items-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.json,.yaml,.yml,.docx,.md,.txt"
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach((file: File) => handleChatFileUpload(file));
                  }
                  e.target.value = "";
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                title="Attach file to scribe"
              />
              <button
                type="button"
                disabled={isGeneratingChat}
                className="p-2.5 bg-[#161618] hover:bg-[#1f1f22] text-[#7a7a7a] hover:text-[#d4af37] border border-[#2a2a2b] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat(e as any);
                }
              }}
              disabled={isGeneratingChat}
              placeholder="Ask Scribe for suggestions, drafts, or links..."
              rows={1}
              className="flex-1 bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] disabled:bg-[#161618] focus:border-[#d4af37] resize-none overflow-y-auto min-h-[38px] max-h-[120px]"
            />
            <button
              type="submit"
              disabled={isGeneratingChat || (!chatInput.trim() && chatAttachments.length === 0)}
              className="p-2.5 bg-[#d4af37] text-black disabled:bg-[#1a1a1c] disabled:text-[#7a7a7a] rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </aside>

      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. EDIT WORLD SETTINGS MODAL */}
      {isEditingWorld && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2b] pb-3">
              <h3 className="font-serif italic text-lg text-[#e5e5e5] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#d4af37]" />
                Edit World Parameters
              </h3>
              <button 
                onClick={() => setIsEditingWorld(false)} 
                className="p-1 bg-[#1a1a1c] border border-[#333335] hover:bg-[#222] rounded-lg text-[#7a7a7a] hover:text-[#e5e5e5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWorldSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">World Name</label>
                  <input
                    type="text"
                    required
                    value={draftWorld.worldName}
                    onChange={(e) => setDraftWorld((prev) => ({ ...prev, worldName: e.target.value }))}
                    className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    value={draftWorld.genre}
                    onChange={(e) => setDraftWorld((prev) => ({ ...prev, genre: e.target.value }))}
                    className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Brief Description</label>
                <textarea
                  required
                  value={draftWorld.description}
                  onChange={(e) => setDraftWorld((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">High Concept Conflict</label>
                <textarea
                  required
                  value={draftWorld.highConcept}
                  onChange={(e) => setDraftWorld((prev) => ({ ...prev, highConcept: e.target.value }))}
                  className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2b]">
                <button
                  type="button"
                  onClick={() => setIsEditingWorld(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#d4af37] text-black hover:opacity-90 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Save World Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CREATIVE AI SPARK MODAL */}
      {showCreativeModal && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2b] pb-3">
              <h3 className="font-serif italic text-lg text-[#e5e5e5] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#d4af37]" />
                AI Creative Lore Spark
              </h3>
              <button 
                onClick={() => setShowCreativeModal(null)} 
                className="p-1 bg-[#1a1a1c] border border-[#333335] hover:bg-[#222] rounded-lg text-[#7a7a7a] hover:text-[#e5e5e5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#7a7a7a] leading-relaxed">
              Synthesize a brand-new {showCreativeModal === "document" ? "lore document" : "character profile"} by describing the core concept (e.g. <em>"A forgotten crystal shrine hidden in the floating archives of Solaria"</em> or <em>"A cyborg guild leader who manufactures runic gear under pressure"</em>).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Concept Prompt</label>
                <textarea
                  value={creativePrompt}
                  onChange={(e) => setCreativePrompt(e.target.value)}
                  placeholder={showCreativeModal === "document" ? "e.g. The Chronos Core, an ancient hourglass artifact engineered to harvest time-leyline sparks..." : "e.g. Vespera Nyx, a cyber-mage assassin who uses runic daggers linked to planetary leylines..."}
                  className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-24 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2b]">
                <button
                  type="button"
                  onClick={() => setShowCreativeModal(null)}
                  disabled={isGeneratingCreative}
                  className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreativeGeneration}
                  disabled={isGeneratingCreative || !creativePrompt.trim()}
                  className="px-4 py-2 text-xs font-bold bg-[#d4af37] text-black hover:opacity-90 disabled:bg-[#1a1a1c] disabled:text-[#7a7a7a] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  {isGeneratingCreative ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Weaving Threads...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Weave into World
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CREATE NEW WORLD MODAL */}
      {isCreatingNewWorld && (
        <div className="fixed inset-0 bg-[#000000]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2b] pb-3">
              <h3 className="font-serif italic text-lg text-[#e5e5e5] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#d4af37]" />
                Establish New World Space
              </h3>
              <button 
                onClick={() => setIsCreatingNewWorld(false)} 
                className="p-1 bg-[#1a1a1c] border border-[#333335] hover:bg-[#222] rounded-lg text-[#7a7a7a] hover:text-[#e5e5e5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewWorld} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">World Name</label>
                  <input
                    type="text"
                    required
                    value={newWorldForm.worldName}
                    onChange={(e) => setNewWorldForm((prev) => ({ ...prev, worldName: e.target.value }))}
                    placeholder="e.g. Neo-Valkyria"
                    className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Genre</label>
                  <input
                    type="text"
                    required
                    value={newWorldForm.genre}
                    onChange={(e) => setNewWorldForm((prev) => ({ ...prev, genre: e.target.value }))}
                    placeholder="e.g. Solar-Fantasy / Solarpunk"
                    className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">Brief Description</label>
                <textarea
                  required
                  value={newWorldForm.description}
                  onChange={(e) => setNewWorldForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Summarize the primary setting, magical structure, and factions of the world..."
                  className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7a7a7a] uppercase font-mono mb-1">High Concept Conflict</label>
                <textarea
                  required
                  value={newWorldForm.highConcept}
                  onChange={(e) => setNewWorldForm((prev) => ({ ...prev, highConcept: e.target.value }))}
                  placeholder="Define the primary tension driving narratives in this world..."
                  className="w-full bg-[#0c0c0d] border border-[#2a2a2b] text-[#e5e5e5] rounded-lg px-3 py-2 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2b]">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewWorld(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#d4af37] text-black hover:opacity-90 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Create World Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CUSTOM CONFIRMATION DIALOG */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-[#0f0f10] border border-[#2a2a2b] rounded-2xl max-w-sm w-full p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-4">
            <div className="space-y-2">
              <h3 className="font-serif italic text-lg text-[#e5e5e5] flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                {confirmState.title}
              </h3>
              <p className="text-xs text-[#b1b1b1] leading-relaxed">{confirmState.message}</p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2b]">
              <button
                type="button"
                onClick={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold bg-[#161618] border border-[#2a2a2b] text-[#7a7a7a] hover:bg-[#1a1a1c] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                {confirmState.cancelText || "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState((prev) => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
              >
                {confirmState.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
