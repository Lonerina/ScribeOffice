# Security Specification & Adversarial Payload Audit

This document defines the zero-trust security invariants and rules validation tests for the World Scribe database.

## 1. Core Data Invariants

1. **Owner Isolation**: Any user can only read or write world-building records that they explicitly own (`ownerId == request.auth.uid`). No user can view or alter other authors' worlds.
2. **Strict Structure**: Elements are constrained by explicit sizing limits in `firestore.rules` (currently lore document content <= 50,000 characters; character bio <= 25,000 characters, with additional per-field and list caps) to reduce accidental or adversarial resource bloat.
3. **Immutability of Key Identifiers**: Key fields like `ownerId` and `createdAt` are immutable once saved.
4. **Valid Email Verification**: Write operations require the user to be signed in with an email-verified account (`request.auth.token.email_verified == true`).

## 2. The "Dirty Dozen" Adversarial Payloads

Below are the 12 specific JSON payloads designed to probe the rules for common Firestore vulnerabilities:

| ID | Target Path | Threat Type | Malicious Intent / Payload Pattern | Expected Result |
|----|-------------|-------------|------------------------------------|-----------------|
| P1 | `/worlds/w-1` | Identity Spoofing | Create a world document with an `ownerId` different than current auth user. | `PERMISSION_DENIED` |
| P2 | `/worlds/w-1` | Privilege Escalation | Update a world document by injecting a ghost field `"isAdmin": true` (Shadow Update). | `PERMISSION_DENIED` |
| P3 | `/worlds/w-1` | Value Poisoning | Set a non-string or oversized string into `worldName`. | `PERMISSION_DENIED` |
| P4 | `/worlds/w-1/characters/c-1` | Orphaned Subcollection | Creating a character in another user's world ID. | `PERMISSION_DENIED` |
| P5 | `/worlds/w-1/characters/c-1` | Identity Spoofing | Create character sheet with different `ownerId` than authenticated user. | `PERMISSION_DENIED` |
| P6 | `/worlds/w-1/characters/c-1` | Resource Poisoning | Injecting a 10MB string into character `bio`. | `PERMISSION_DENIED` |
| P7 | `/worlds/w-1/documents/d-1` | Value Poisoning | Update lore document category to a non-enum category like `"Superweapon"`. | `PERMISSION_DENIED` |
| P8 | `/worlds/w-1/documents/d-1` | Immutability Violation | Attempting to change the `ownerId` during update. | `PERMISSION_DENIED` |
| P9 | `/worlds/w-1/messages/m-1` | Spoof Attack | Creating a message with `sender` set to `"system"` (bypassing enum check). | `PERMISSION_DENIED` |
| P10| `/worlds/w-1/documents/d-1` | Metadata Tampering | Attempt to alter immutable ownership/creation metadata such as `ownerId` or `createdAt`. | `PERMISSION_DENIED` |
| P11| `/worlds/w-1` | Path ID Injection | Creating a world document with ID `"world%20/nested/path"` (poisons ID variables). | `PERMISSION_DENIED` |
| P12| `/worlds/w-1/messages/m-1` | Size Exploitation | Injecting a massive array of related elements to bloat indexes. | `PERMISSION_DENIED` |

## 3. Test Cases (TDD Reference)

All of the above payloads will be rejected at the security rules firewall. Below we write the Firestore rules that guarantee these protections.


## 4. Current Enforcement Notes

- `isVerifiedUser()` requires both authentication and `email_verified == true`.
- `ownerId` remains bound to the authenticated user on create and update.
- `createdAt` is treated as immutable for world and character records where present.
- Message records remain append-only: valid owners may create messages; update and delete are denied.
- Lore and character size ceilings in this document mirror the current Firestore rules and should be revised whenever `firestore.rules` changes.
