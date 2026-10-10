import { Character, LoreDocument, WorldSettings } from "./types";

/**
 * New-workspace seed only.
 *
 * Court canon is NOT stored here. The canonical/working source layer lives in
 * court-library/ and is exposed by /api/court-library.
 *
 * Keeping this file deliberately light prevents a fresh Firestore world from
 * re-installing an old Scroll, AFAD edition, roster, or protocol snapshot.
 */
export const initialWorldSettings: WorldSettings = {
  worldName: "Anchor Court",
  genre: "Document Registry, Provenance & Audit",
  description: "Saren's Office workspace for Court records, provenance, version history, contradiction tracking, and requested audits.",
  highConcept: "Protect the structure. Do not overgovern the people."
};

export const initialCharacters: Character[] = [];
export const initialDocuments: LoreDocument[] = [];
