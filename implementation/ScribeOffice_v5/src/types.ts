export type LoreCategory = 
  | 'Geography' 
  | 'Magic System' 
  | 'History' 
  | 'Factions' 
  | 'Culture' 
  | 'Technology' 
  | 'Other'
  | 'Core Charter'
  | 'Legal & Operations'
  | 'Architecture'
  | 'System Safeguards';

export type EvidenceStatus =
  | 'verified_source'
  | 'user_record'
  | 'generated_draft'
  | 'simulation'
  | 'legacy_unverified'
  | 'quarantined';

export type RecordOrigin =
  | 'user'
  | 'generated'
  | 'imported_chat'
  | 'legacy'
  | 'system';

export interface ProvenanceMeta {
  origin: RecordOrigin;
  evidenceStatus: EvidenceStatus;
  sourceRefs?: string[];
  note?: string;
}

export interface Relationship {
  targetCharacterId: string;
  type: string;
  notes?: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  faction: string;
  bio: string;
  traits: string[];
  appearance?: string;
  relationships: Relationship[];
  title?: string;
  roles?: string[];
  tier?: string;
  element?: string;
  color?: string;
  function?: string;
  identity?: string;
  personality?: string;
  originStory?: string;
  experiences?: string;
  provenance?: ProvenanceMeta;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  version: number;
  content: string;
  updateNote: string;
  updatedAt: string;
}

export interface LoreDocument {
  id: string;
  title: string;
  category: LoreCategory;
  content: string;
  tags: string[];
  relatedCharacterIds: string[];
  version: number;
  createdAt?: string;
  updatedAt: string;
  versionHistory: DocumentVersion[];
  provenance?: ProvenanceMeta;
}

export interface WorldSettings {
  worldName: string;
  genre: string;
  description: string;
  highConcept: string;
  worldId?: string;
}

export interface MessageReference {
  type: 'document' | 'character';
  id: string;
  title: string;
}

export interface Attachment {
  name: string;
  type: string;
  base64Data?: string;
  textData?: string;
}

export type MessageKind = 'conversation' | 'simulation' | 'audit_notice' | 'system_notice';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  createdAt?: string;
  references?: MessageReference[];
  isSystemAudit?: boolean;
  attachments?: Attachment[];
  messageKind?: MessageKind;
  provenance?: ProvenanceMeta;
}
