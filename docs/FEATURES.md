# FEATURES — Dream Home Design

> Feature + base44-usage inventory. Feeds the base44→CF migration plan
> (docs/ROADMAP.md). Generated during fleet onboarding (2026-07-06). The pre-existing
> `src/DATABASE.md` has the base44-era field-level detail; this file is the
> migration-facing inventory.

## Surfaces / routes (25 routes, from `src/App.jsx`)

### Public marketing site (8, no auth, `PublicLayout`)
| Route | Page | base44 entity read |
|---|---|---|
| `/` | Home | (SiteSettings via `useSiteSettings`) |
| `/about` | About | `TeamMember` |
| `/process` | Process | `ProcessStage` |
| `/portfolio` | Portfolio | `PortfolioItem` |
| `/videos` | VideoLibrary | YouTube channel library (23 videos + 48 Shorts, categorized; no app entity) |
| `/faq` | FAQ | `FAQItem` |
| `/investment` | Investment | `InvestmentTier` |
| `/contact` | Contact | writes `ContactInquiry` |

### Client portal (7, role `client`, `PortalLayout` + `RoleGuard`)
| Route | Page | base44 entities |
|---|---|---|
| `/portal` | Dashboard | `Message`, `Project` |
| `/portal/project` | MyProject | `Project` |
| `/portal/documents` | Documents | `Project`, `Document` + `integrations.Core.UploadFile` |
| `/portal/selections` | Selections | `Selection` |
| `/portal/messages` | Messages | `Message` |
| `/portal/billing` | Billing | `Invoice` (display-only, no payment) |
| `/portal/help` | Help | (static) |

### Admin CMS (9, roles `manager`/`admin`/`super_admin`, `AdminLayout` + `RoleGuard`)
| Route | Page | Manages |
|---|---|---|
| `/admin` | AdminDashboard | overview |
| `/admin/portfolio` | AdminPortfolio | `PortfolioItem` |
| `/admin/team` | AdminTeam | `TeamMember` |
| `/admin/faqs` | AdminFAQs | `FAQItem` |
| `/admin/process` | AdminProcess | `ProcessStage` |
| `/admin/investment` | AdminInvestment | `InvestmentTier` |
| `/admin/testimonials` | AdminTestimonials | `Testimonial` |
| `/admin/inquiries` | AdminInquiries | `ContactInquiry` |
| `/admin/settings` | AdminSettings | `SiteSettings` (role `admin`/`super_admin` only) |

## Data model — 14 base44 entities (`base44/entities/*.jsonc`)
Migration target: one D1 table each in `wl-dreamhome-db` (+ a Worker CRUD route).

| Entity | Key fields | Notes for D1 |
|---|---|---|
| **User** | `role` (client/manager/admin/super_admin) | base44 built-in; replace with our auth users table |
| **Project** | name, client_email, client_name, address, project_type(enum), assigned_designer, project_coordinator, start_date, estimated_completion, current_stage(1–8), stage_notes[] (nested), status(enum) | `stage_notes` is an array-of-objects → JSON column or child table |
| **Document** | project_id, name, category(enum), file_url, file_type, uploaded_by | `file_url` → R2 object; FK project_id |
| **Selection** | project_id, category(enum), item_name, description, status(enum) | FK project_id |
| **Message** | project_id, thread_id, thread_subject, thread_category(enum), sender_email, sender_name, content, is_read | threaded; unread-leak guard needed on portal |
| **Invoice** | project_id, invoice_number, description, amount, status(enum), due_date, paid_date, type(enum) | display-only today; P6 Stripe decision |
| **ContactInquiry** | name, email, phone, project_type(enum), how_heard, message, status(enum) | public write from Contact form |
| **PortfolioItem** | title, category(enum), description, image_url, featured, sort_order | `image_url` → R2 / external |
| **ProcessStage** | stage_number, title, description, is_active | |
| **InvestmentTier** | step_number, title, description, note, payment_methods[], scope_exclusions_note | array field |
| **FAQItem** | question, answer, sort_order, is_active | |
| **TeamMember** | name, title, show_title, department(enum), photo_url, bio, is_founder, sort_order | `photo_url` → R2 / external |
| **Testimonial** | client_name, quote, rating, project_type, featured | |
| **SiteSettings** | key('main'), phone, emails, address, social URLs, logo_url, tagline, booking URL | singleton (`key='main'`) |

## Data source for the D1 seed (migration P2/P3)
The D1 seed sources **from in-repo record files + a full DB export Levi provides** —
NOT a base44 API scrape (base44 now writes the database records directly into this
repo, `Cinedex/dream-home-design`).
- **Schemas:** `base44/entities/*.jsonc` (present today — types/enums/defaults above).
- **Records (expected):** base44 is pushing record data into the repo. As of
  onboarding (2026-07-06) **no record/data files have landed yet** — the `base44/`
  dir holds only entity *schemas*, and there is no `data/`/`records/` dir. When they
  arrive, expect them under `base44/` (alongside the entity schemas) or a new
  top-level `data/`/`records/` dir. **The P2/P3 seed step reads from there + Levi's
  full export** — update this section with the exact path once the files land.

## base44 SDK usage (what must be replaced)

### Data — `base44.entities.<E>.list/filter/create/update/delete`
ORM-style over the hosted DB. Call sites (one per surface, via `@tanstack/react-query`):
Contact→ContactInquiry, About→TeamMember, Process→ProcessStage, Portfolio→PortfolioItem,
FAQ→FAQItem, Investment→InvestmentTier, portal Dashboard→Message/Project,
Documents→Project+Document, Selections→Selection, Billing→Invoice,
useSiteSettings→SiteSettings, AdminTestimonials→Testimonial (+ the other admin pages).
→ **Replace with** `fetch('/api/<entity>')` → `wl-dreamhome-api` Worker → D1.

### Auth — `src/lib/AuthContext.jsx` + `src/components/RoleGuard.jsx`
`base44.auth.me()` (current user + role), `base44.auth.logout(url)`,
`base44.auth.redirectToLogin(url)`. App-level `public-settings` fetch via base44's
axios client. Errors: `auth_required`, `user_not_registered`. 4 roles: client,
manager, admin, super_admin. → **Replace with** our cookie/JWT session + a
`/api/auth/*` Worker; keep RoleGuard, swap its data source.

### Files — `base44.integrations.Core.UploadFile({file})`
ONE call site: `src/pages/portal/Documents.jsx` (client document upload → returns
`file_url` stored on `Document`). → **Replace with** R2 multipart upload endpoint.

### Config — `src/lib/app-params.js`, `src/api/base44Client.js`, `vite.config.js`
`@base44/vite-plugin` (hmr/nav/analytics/visual-edit + legacy import shim); app id
`6a0c98b9972c40dc9ebe5d05`; env `VITE_BASE44_APP_ID` / `_FUNCTIONS_VERSION` /
`_APP_BASE_URL`; token via URL param → localStorage. → **Remove** the plugin +
client; map env to `VITE_*` brand/tenant vars.

### NOT used
No `base44.functions.*`, no `Core.InvokeLLM`, no `Core.SendEmail`. No live Stripe
usage despite deps. No Supabase/Vercel.

## Engines (fleet ENGINE_MATRIX candidates — all UNAUDITED)
Discovered during onboarding; not yet audited:
- **Auth** (roles/RBAC) — currently base44, → our auth. ❓ UNAUDITED
- **Data/CRUD** (14 entities) — → D1 + Worker. ❓ UNAUDITED
- **File storage** (document uploads) — → R2. ❓ UNAUDITED
- **Email/notifications** — none today; Contact form only writes an entity (no send).
  Candidate for Resend on migration (fleet standard). ❓ UNAUDITED
- **Payments** — Stripe deps present, unused. Decision P6. ❓ UNAUDITED
