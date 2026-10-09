---
name: "done-protocol-ui-architecture"
description: >
  Architecture, UI/UX specification, and integration guidelines for DONE Protocol on Solana.
  Enforces deterministic escrow pipelines, pitch-black dark mode only, zero floating popups,
  drawer/flyout based inspection, canonical SHA-256 DoD hashing, and live Anchor state mapping.
---

# DONE Protocol — Architecture & UI/UX Specification

DONE Protocol is programmable settlement infrastructure for verifiable work on Solana. It eliminates subjective escrow releases by enforcing an explicit, deterministic pipeline:

$$\text{Definition of Done (DoD)} \longrightarrow \text{Evidence Submission} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

This document serves as the agent skill reference for both the technical architecture and the strict UI/UX invariants.

---

## 1. Core Architecture & Protocol Mechanics

### 1.1 Tech Stack
* **Framework:** Next.js (App Router), React 19, TypeScript (strict mode)
* **Styling:** Tailwind CSS (Pitch-black palette, custom radii, high-density data views)
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`) + React Context for wallet/session
* **Solana / Web3 Layer:**
  * `@solana/web3.js` (v1.x)
  * `@solana/spl-token` (USDC SPL mint interactions on Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
  * `@coral-xyz/anchor` compatible IDL (`done_protocol.json` & `done_protocol.ts`)
* **Cryptography:** Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) for canonical commitment hashing

### 1.2 Program Accounts & PDAs
* **Agreement Account PDA:** `seeds = [b"agreement", sponsor.key(), nonce]`
* **Protocol Escrow Vault PDA:** `seeds = [b"vault", agreement.key()]`
* **Milestone Account PDA:** `seeds = [b"milestone", agreement.key(), &[index]]`
* **Evidence Hash Record:** `seeds = [b"evidence", milestone.key()]`

### 1.3 State Transitions & Invariants
* **Agreement States:** `DRAFT` $\rightarrow$ `FUNDED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` (or `CANCELLED`)
* **Milestone States:** `PENDING` $\rightarrow$ `EVIDENCE_SUBMITTED` $\rightarrow$ `VERIFIED` $\rightarrow$ `RELEASED` (or `DISPUTED`)
* **Invariant:** Vault funds can ONLY be released when Milestone State is `VERIFIED` and authorized by the Verifier/Sponsor signature or automated Oracle rule.
* **Deterministic DoD Hashing:** Criteria array is normalized (trimmed, non-empty), sorted alphabetically, JSON serialized, and SHA-256 hashed.

---

## 2. UI/UX Constitution & Design Invariants

### 2.1 Pitch-Black Aesthetic
* **Surfaces:**
  * Base Background: `#000000` (pure pitch black)
  * Container / Card: `#0d0d0f` (deep obsidian ash)
  * Elevated / Nested Element: `#141416` (subtle charcoal)
  * Borders / Dividers: `#26262a` (refined hairline borders)
* **Typography & Density:**
  * Clean monospace accents (`font-mono`) for keys, slots, hashes, balances, and numbers
  * High data density; ZERO filler illustrations, marketing fluff, or long documentation text inside operational app views.

### 2.2 Ample Gentle Curvature (Zero 90° Industrial Angles)
* Cards and main panels: `rounded-2xl` (16px)
* Buttons, inputs, chips, and badges: `rounded-xl` (12px)
* Bottom drawers and mobile sheets: `rounded-3xl` (24px)
* Inner badges: `rounded-lg` (8px)

### 2.3 Zero Floating Popups / Modals (Strict Invariant)
* **Never use centered modal dialog popups or intrusive backdrop alert boxes.**
* **Desktop ( $\ge$ md ):** All inspections, forms, and actions slide in via the **Right Sidebar Flyout** (`w-[440px]`, `#0d0d0f`, `border-l border-[#26262a]`).
* **Mobile ( < md ):** All inspections, forms, and actions slide up via the **Bottom Drawer** (`rounded-t-3xl`, `max-h-[85vh]`).
* **Transaction Execution:** Slides down via the **Top Drawer Banner** (`animate-in slide-in-from-top`).

### 2.4 Shell & Navigation Layout
* **Desktop:**
  * Fixed Left Navigation Bar (`w-64`, `#0d0d0f`, `border-r border-[#26262a]`): Logo, navigation items (`Overview`, `Agreements`, `Sponsor View`, `Worker View`, `Settings`), Role switcher pill, Network & latency stats.
  * Top Context Bar (`h-16`, `#0d0d0f`, `border-b border-[#26262a]`): Active cluster (`DEVNET`), Slot number, RPC latency ping, Airdrop faucet trigger (`+5K USDC`), and Wallet pill.
  * Main Viewport: Padded high-contrast dashboard with max width container.
* **Mobile:**
  * Top Header: Minimal brand mark + wallet address pill.
  * Fixed Bottom Dock: Docked navigation with 5 icons (`rounded-t-2xl`, `h-16`, `#0d0d0f`).

---

## 3. Demo Capabilities & Operational Guidelines
Every screen must be interactive and immediately demonstrable:
1. **Interactive Demo Bar:** Provide instant role-switching and guided workflow triggers for testing all 4 pipeline stages.
2. **Deterministic Settlement:** Executing verification and payout must accurately update escrow balances and worker ATAs.
3. **Transaction Inspection:** Clicking hashes, PDAs, or actions opens the inspector drawer showing the Anchor instruction, base58 signature, and explorer URL.
