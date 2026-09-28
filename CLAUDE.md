# CukaiSmart — Frontend Prototype (Proof of Concept)

## What this project is
CukaiSmart is an AI-assisted e-Invoicing compliance platform for Malaysian SMEs and accounting firms.
This repo is a **frontend-only clickable prototype** for a proof of concept. There is **no backend**:
all data comes from `src/data/mock-data.js` and all "AI" behaviour is simulated with timers.

The prototype must demonstrate two use cases:
1. **Sales e-Invoice** — prepare MyInvois-ready data from a sales invoice.
2. **Purchase invoice / receipt** — record a supplier invoice or receipt into accounting records.

And these capabilities: document upload, AI field extraction, low-confidence warnings,
human approval, and MyInvois-ready data generation.

## Tech stack
- React 18 + Vite, JavaScript (no TypeScript)
- React Router for pages
- Plain CSS with shared files (no Tailwind, no UI libraries): `src/styles/tokens.css`, `src/styles/components.css`
- Icons: `lucide-react`, outline style, 20px
- Font: Inter (Google Fonts), fallback `system-ui, -apple-system, "Segoe UI", sans-serif`
- App state: React Context (`src/state/AppContext.jsx`), persisted to localStorage with a "Reset demo data" action in Settings

## Folder structure
```
src/
  styles/tokens.css        colours, typography, spacing, radius, shadows (CSS variables only)
  styles/components.css    buttons, inputs, cards, badges, tables, layout classes
  components/              shared React components (Sidebar, TopBar, PublicNavbar, Badge, Button, Card, Modal, Toast, ProgressSteps...)
  data/mock-data.js        clients, documents, extracted fields, compliance checks, audit events
  state/AppContext.jsx     documents, active client, notifications, actions
  pages/                   one file per screen
```

## Design rules (source of truth — follow exactly)

### Direction
Premium, trustworthy, minimalist fintech with subtle AI elements. Plenty of white space, clean cards,
simple icons. No excessive gradients, glows or complicated animations.

**Landing hero:** centred text above a product window showing the review screen, with a subtle CSS 3D tilt that
flattens on scroll. The AI-and-human story animates inside the window (AI = teal scan, human = cursor confirming a
field). No three.js in the hero. The story plays 3 times, then rests on the final frame.

### Colours
| Token | Hex | Use |
|---|---|---|
| --navy | #003787 | Primary buttons, headings, navigation |
| --teal | #02A1A2 | Active states, AI elements, highlights |
| --gold | #DDAE42 | Small attention indicators only |
| --bg | #F8FAFC | App background |
| --card | #FFFFFF | Cards and forms |
| --text | #0F172A | Body text and headings |
| --text-secondary | #64748B | Descriptions, helper text |
| --border | #D2E4EC | Tables, cards |
| --success | #15803D | Approved / ready |
| --warning | #D97706 | Requires review |
| --error | #DC2626 | Missing / invalid |

- Navy-to-teal gradient ONLY on the landing-page hero and AI-processing elements.
- **Accessibility adjustments (required):** teal, warning amber and gold fail 4.5:1 contrast as small text on white.
  Use them for icons, fills, borders and large text only. For small text use darker shades:
  `--teal-text: #017A7B`, `--warning-text: #92400E`, `--gold-text: #7A5A0F`.
  Input borders use a slightly darker `--border-input: #A9C3CF` so fields look clickable.
  Status badges = pale tinted background + dark same-hue text (never white text on amber/teal/gold).

### Typography (Inter)
| Text | Size / weight |
|---|---|
| Landing headline | 48px Bold |
| Page title | 32px Bold |
| Section heading | 22px Semi-Bold |
| Card heading | 16px Semi-Bold |
| Body | 15–16px Regular |
| Button / label | 14px Semi-Bold |
| Caption / helper | 12–13px Regular |
Headings navy, body text dark. Teal highlights important words only, never whole paragraphs.

### Layout and components
- Designed for a 1440 × 900 desktop frame (desktop-first; must not break at 1280px).
- Sidebar ~240px, fixed. Main content padding 32px. Spacing scale 8 / 16 / 24 / 32px.
- Cards: white, 12px radius, 1px border, soft shadow.
- Inputs: 44px high, label above, helper/error text below.
- Primary button: navy bg, white text. Secondary: white bg, navy border and text.
- Visible keyboard focus states on all interactive elements.

### Status labels (use everywhere, same colours)
| Status | Colour |
|---|---|
| Processing | teal |
| Needs Review | amber |
| Ready | green |
| Error | red |
| Submitted | navy |
| Exported | grey |

### Navigation
- **Public pages** — top bar: logo left; Home, How It Works, Pricing, About centred in a pill; Log In link and
  **Get Started** button right. On the landing page the bar is fixed, translucent white with backdrop blur.
- **Signed-in app** — fixed left sidebar: Dashboard, Clients, Upload Document, Review Queue, Records, Settings.
  Top-right: notifications bell (with dropdown), active client switcher, user profile menu.

## Screens and routes
| Route | Screen |
|---|---|
| `/style-guide` | UI Style Guide (logo, colours, type, buttons, inputs, cards, badges, sidebar, navbar, table, review layout) |
| `/` | Landing page (hero with "New: Introducing Next-Gen AI Agent" pill, headline, Start Trial / Watch Demo, 3D document-scan scene with static HTML/CSS fallback; How it works, Pricing, About) |
| `/login` | Login (any input works; "Log in" opens dashboard; show/hide password; simulated "Forgot password?") |
| `/signup` | Sign up (full name, email, company, account type SME / Accounting firm, password strength hint, terms; inline validation; logs in and opens dashboard) |
| `/app/dashboard` | Stats (processed, pending, % usage), tabs All/Pending/Completed, searchable document table, + Upload |
| `/app/clients` | Client cards with doc counts per status, search, + Add Client (modal), pooled usage bar (e.g. 580 / 10,000 docs) |
| `/app/upload` | Client dropdown, Sales Invoice vs Purchase Invoice/Receipt toggle, drag-and-drop (PDF/JPG/PNG), upload queue with progress, Process Documents |
| `/app/review-queue` | List of documents needing review, sorted by urgency |
| `/app/documents/:id/processing` | Timed stages: Uploaded → AI Extraction → Tax Validation → Ready for Review; progress bar; live log ("12 fields extracted", "3 fields need attention") |
| `/app/documents/:id/review` | Split view: document preview left, extracted fields right, grouped by confidence (high / medium / low) |
| `/app/documents/:id/compliance` | Compliance checks, blocking issues listed first, score as secondary visual |
| `/app/documents/:id/finish` | Final summary, destination, confirmation checkbox, export / simulated submit |
| `/app/records` | Records table with search, filters, tabs, pagination; row opens audit-trail drawer |
| `/app/settings` | Profile + business details form (saves to state) + "Reset demo data" |

## Key interaction rules (no dead buttons)
- Login opens the dashboard. Client switching updates the company name shown everywhere.
- Upload shows the selected file name, size and a progress bar.
- AI processing moves through timed stages (about 1.5s each) and can't be skipped by accident.
- **Review:** clicking a field highlights where it came from on the document preview (and vice versa).
  Low-confidence fields show the reason ("Faded text", "TIN format invalid"). They are editable.
  Confirming or correcting a field removes its warning. **"Approve" stays disabled until every
  low-confidence field is confirmed** (every low-confidence field requires human review).
  "Save draft" keeps progress; no ambiguous "Cancel".
- **Compliance:** checks animate in one by one. Blocking issues (e.g. missing classification code,
  possible duplicate invoice) show "Fix issue", which jumps to the related field. "Mark ready" only when no blockers remain.
- **Finish — sales flow:** destination "MyInvois (sandbox — simulated)". Actions: "Generate MyInvois JSON"
  (downloads a sample JSON file), "Export CSV", and "Submit (simulated)" which shows a success message with a
  sample UUID-style reference and a clear "Simulated — not sent to LHDN" note.
- **Finish — purchase flow:** destination is accounting records (e.g. "Export for accounting software (CSV)"), not MyInvois submission.
- **Audit trail:** every action writes an event: who, what, when, and before → after values for edits
  (e.g. "Amount edited from RM 1,204.00 to RM 1,240.00 by Razak · 28 Sep 2026, 10:14").
- Any feature outside PoC scope (e.g. notifications settings) shows a friendly "Coming in a later version" state, never a silent button.
- Toasts for success/failure feedback; confirm modal before destructive actions.

## Mock data guidelines
- Use Malaysian SME examples: Ali Trading Sdn Bhd, Nasi Kandar Cafe, Teh Tarik Enterprise, Kedai Runcit Maju.
  Do not use real brand names.
- Currency format `RM 1,240.00`; dates `28 Sep 2026`.
- Include realistic fields: supplier name, supplier TIN, BRN, SST registration no., invoice no., invoice date,
  buyer name, buyer TIN, line items, subtotal, SST amount, total, classification code.
- Keep numbers consistent across screens (counts on dashboard = counts in records).
- Sample document previews are drawn with HTML/CSS (a styled "invoice" and a "thermal receipt"), no external images.
- All data is fictional; label the app footer "Prototype — sample data only".

## Working rules for Claude Code
- Plan before large changes; show the plan and wait for approval.
- Use only the tokens in `tokens.css` — no hard-coded hex values in components.
- Reuse shared components; don't duplicate sidebar/topbar markup per page.
- **Never run git commands that change the repo** (no `git add`, `git commit`, `git push`, `git checkout`, `git merge`). The developer commits manually.
- **Never start or build the app** (no `npm run dev`, `npm run build`, `npm run preview`, `npm start`, `vite`, `npx vite`). The developer runs and checks the app themselves.
- If a new package is needed, ask first and explain why before installing it.
- At the end of each task, give a short summary: files created/changed, what to check in the browser, and a suggested commit message the developer can use.
- Two developers work in parallel: one branch per feature (`feature/<screen-name>`), merge via pull request.