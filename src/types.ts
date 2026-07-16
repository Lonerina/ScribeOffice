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

export interface Relationship {
  targetCharacterId: string;
  type: string; // e.g., 'Ally', 'Enemy', 'Family', 'Mentor', 'Rival'
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
  updatedAt: string;
  versionHistory: DocumentVersion[];
}

export interface WorldSettings {
  worldName: string;
  genre: string;
  description: string;
  highConcept: string;
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

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  references?: MessageReference[];
  isSystemAudit?: boolean;
  attachments?: Attachment[];
}
