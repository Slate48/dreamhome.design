# Dream Home Design — Database & Architecture Reference

> **Purpose:** Complete reference for the app's data model, access control, routing, and component structure. Use this to continue the build in any environment.

---

## 1. Platform & Stack

- **Platform:** Base44 (BaaS: auth, database, integrations, hosting)
- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Routing:** react-router-dom v6
- **State/Data:** @tanstack/react-query, Base44 SDK (`@/api/base44Client`)
- **Animations:** framer-motion
- **Flipbook:** react-pageflip + pdfjs-dist (PDF rendering)
- **Icons:** lucide-react
- **Deployment:** Vite build → Base44 hosting; same codebase publishes to iOS/Android

---

## 2. Role-Based Access Control (RBAC)

Four roles defined on the built-in `User` entity (`role` field):

| Role          | Access                                              | Redirect Target |
|---------------|-----------------------------------------------------|-----------------|
| `client`      | Client portal only (`/portal/*`)                    | `/portal`       |
| `manager`     | Admin portal (`/admin/*`) — no settings, no user mgmt | `/admin`      |
| `admin`       | Admin portal — full content management               | `/admin`        |
| `super_admin` | Admin portal + user management                       | `/admin`        |

**Implementation:**
- `components/RoleGuard.jsx` — wraps route elements; checks `user.role` against `allowedRoles`.
- `lib/AuthContext.jsx` — manages auth state, public settings loading, and error handling (`auth_required`, `user_not_registered`).
- `App.jsx` — route-level guards:
  - Public routes: no guard (wrapped in `PublicLayout`).
  - Portal routes: `<RoleGuard allowedRoles={['client']} redirectTo="/">`
  - Admin routes: `<RoleGuard allowedRoles={['manager','admin','super_admin']} redirectTo="/">`
  - Admin Settings: nested `<RoleGuard allowedRoles={['admin','super_admin']} redirectTo="/admin">`

**Built-in User entity (read-only, never create):**
- Fields: `id`, `created_date`, `full_name`, `email`, `role`
- Users join via invites: `base44.users.inviteUser(email, role)`
- Cannot insert User records directly (create returns 405)

---

## 3. Entities (Database Schema)

All entities include built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`.

### 3.1 TeamMember
Public team directory for the About page. Founders shown separately.

| Field         | Type    | Required | Notes |
|---------------|---------|----------|-------|
| name          | string  | yes      | |
| title         | string  | no       | Job title |
| show_title    | boolean | no       | Default `true`. Per-member toggle for title visibility on About page |
| department    | string  | yes      | Enum: `Sales`, `Cabinetry`, `Design`, `Estimating`, `Engineering`, `Project Management`, `Countertop`, `Management`, `Administration` |
| photo_url     | string  | no       | Portrait image URL |
| bio           | string  | no       | |
| is_founder    | boolean | no       | Default `false`. Founders shown in separate section on About/Home |
| sort_order    | number  | no       | Default `0`. Sorts within department |

**About page department display order:** `['Sales', 'Cabinetry', 'Design', 'Estimating', 'Engineering', 'Project Management', 'Countertop', 'Management', 'Administration']`

### 3.2 SiteSettings
Centralized site configuration (single record, key=`'main'`).

| Field                    | Type   | Required | Notes |
|--------------------------|--------|----------|-------|
| key                      | string | yes      | Use `'main'` |
| phone                    | string | no       | |
| phone_display            | string | no       | Formatted phone for display |
| email_sales              | string | no       | |
| email_billing            | string | no       | |
| billing_contact_name     | string | no       | |
| address                  | string | no       | |
| city_state               | string | no       | |
| google_maps_embed_url    | string | no       | Embed URL for map |
| instagram_url            | string | no       | |
| facebook_url             | string | no       | |
| instagram_handle         | string | no       | |
| website_url              | string | no       | |
| consultation_booking_url| string | no       | |
| logo_url                 | string | no       | |
| tagline                  | string | no       | |

### 3.3 PortfolioItem
Portfolio gallery items for the Portfolio page and home page grid.

| Field       | Type    | Required | Notes |
|-------------|---------|----------|-------|
| title       | string  | yes      | |
| category    | string  | yes      | Enum: `Kitchens`, `Bathrooms`, `Closets`, `Home Bars`, `Pantries`, `Custom Millwork` |
| description | string  | no       | |
| image_url   | string  | yes      | |
| featured    | boolean | no       | Default `false` |
| sort_order  | number  | no       | Default `0` |

### 3.4 FAQItem
FAQ page content.

| Field       | Type    | Required | Notes |
|-------------|---------|----------|-------|
| question    | string  | yes      | |
| answer      | string  | yes      | |
| sort_order  | number  | no       | Default `0` |
| is_active   | boolean | no       | Default `true` |

### 3.5 InvestmentTier
Investment page pricing tiers / payment steps.

| Field                 | Type     | Required | Notes |
|-----------------------|----------|----------|-------|
| step_number           | number   | yes      | |
| title                 | string   | yes      | |
| description           | string   | yes      | |
| note                  | string   | no       | |
| payment_methods       | string[] | no       | Array of accepted methods |
| scope_exclusions_note | string   | no       | |

### 3.6 ProcessStage
Process page workflow stages.

| Field        | Type    | Required | Notes |
|--------------|---------|----------|-------|
| stage_number | number  | yes      | |
| title        | string  | yes      | |
| description  | string  | yes      | |
| is_active    | boolean | no       | Default `true` |

### 3.7 Testimonial
Client testimonials for home page carousel.

| Field         | Type    | Required | Notes |
|---------------|---------|----------|-------|
| client_name   | string  | yes      | |
| quote         | string  | yes      | |
| rating        | number  | yes      | |
| project_type  | string  | no       | |
| featured      | boolean | no       | Default `false` |

### 3.8 ContactInquiry
Contact form submissions.

| Field        | Type   | Required | Notes |
|--------------|--------|----------|-------|
| name         | string | yes      | |
| email        | string | yes      | |
| phone        | string | no       | |
| project_type | string | no       | Enum: `Kitchen`, `Bathroom`, `Closets`, `Home Bar`, `Pantry`, `Full Home`, `Other` |
| how_heard    | string | no       | |
| message      | string | yes      | |
| status       | string | no       | Enum: `New`, `Contacted`, `Converted`, `Closed`. Default `New` |

### 3.9 Project (Client Portal)
Client projects tracked in the portal.

| Field                  | Type     | Required | Notes |
|------------------------|----------|----------|-------|
| name                   | string   | yes      | Project name (e.g. 'Kitchen Remodel') |
| client_email           | string   | yes      | Client user email (links to User) |
| client_name            | string   | no       | |
| address                | string   | no       | |
| project_type           | string   | no       | Enum: `Kitchen`, `Bathroom`, `Closets`, `Home Bar`, `Pantry`, `Full Home`, `Other` |
| assigned_designer      | string   | no       | |
| project_coordinator    | string   | no       | |
| start_date             | date     | no       | |
| estimated_completion   | date     | no       | |
| current_stage          | number   | no       | Default `1`. 1–8 stage number |
| stage_notes            | object[] | no       | Array of `{ stage: number, note: string, date: date }` |
| status                 | string   | no       | Enum: `Active`, `On Hold`, `Completed`, `Cancelled`. Default `Active` |

### 3.10 Document (Client Portal)
Project documents/files in the portal.

| Field       | Type   | Required | Notes |
|-------------|--------|----------|-------|
| project_id  | string | yes      | Associated project ID |
| name        | string | yes      | |
| category    | string | no       | Enum: `Contracts`, `Design Drawings`, `Shop Drawings`, `Change Orders`, `Care Instructions`, `Final Invoice`, `Client Upload` |
| file_url    | string | yes      | Uploaded file URL |
| file_type   | string | no       | |
| uploaded_by | string | no       | |

### 3.11 Selection (Client Portal)
Material/finish selections for a project.

| Field       | Type   | Required | Notes |
|-------------|--------|----------|-------|
| project_id  | string | yes      | |
| category    | string | yes      | Enum: `Door Style`, `Wood Species`, `Finish / Paint / Stain`, `Hardware`, `Countertop Material`, `Inserts / Accessories` |
| item_name   | string | yes      | |
| description | string | no       | |
| status      | string | no       | Enum: `Pending`, `Confirmed`, `Locked`. Default `Pending` |

### 3.12 Message (Client Portal)
Project messaging threads.

| Field           | Type    | Required | Notes |
|-----------------|---------|----------|-------|
| project_id      | string  | yes      | |
| thread_id       | string  | no       | |
| thread_subject  | string  | no       | |
| thread_category | string  | no       | Enum: `Design Question`, `Change Request`, `Billing`, `General` |
| sender_email    | string  | yes      | |
| sender_name     | string  | no       | |
| content         | string  | yes      | |
| is_read         | boolean | no       | Default `false` |

### 3.13 Invoice (Client Portal)
Project billing invoices.

| Field          | Type   | Required | Notes |
|----------------|--------|----------|-------|
| project_id     | string | yes      | |
| invoice_number | string | yes      | |
| description    | string | no       | |
| amount         | number | yes      | |
| status         | string | no       | Enum: `Paid`, `Outstanding`, `Pending`. Default `Pending` |
| due_date       | date   | no       | |
| paid_date      | date   | no       | |
| type           | string | no       | Enum: `Retainer`, `Production Deposit`, `Progress Payment`, `Final Invoice` |

---

## 4. Routing Structure (App.jsx)

### Public Website (PublicLayout, no auth)
| Route        | Page       |
|--------------|------------|
| `/`          | Home       |
| `/about`     | About      |
| `/process`   | Process    |
| `/portfolio` | Portfolio  |
| `/faq`       | FAQ        |
| `/investment`| Investment |
| `/contact`   | Contact    |

### Client Portal (PortalLayout, `client` role only)
| Route                 | Page        |
|-----------------------|-------------|
| `/portal`             | Dashboard   |
| `/portal/project`     | MyProject   |
| `/portal/documents`   | Documents   |
| `/portal/selections`  | Selections  |
| `/portal/messages`    | Messages    |
| `/portal/billing`     | Billing     |
| `/portal/help`        | Help        |

### Admin Portal (AdminLayout, `manager`/`admin`/`super_admin`)
| Route                  | Page             | Extra Guard              |
|------------------------|------------------|--------------------------|
| `/admin`               | AdminDashboard   | —                        |
| `/admin/portfolio`     | AdminPortfolio   | —                        |
| `/admin/team`          | AdminTeam        | —                        |
| `/admin/faqs`          | AdminFAQs        | —                        |
| `/admin/process`       | AdminProcess     | —                        |
| `/admin/investment`    | AdminInvestment  | —                        |
| `/admin/settings`      | AdminSettings    | `admin`/`super_admin` only |
| `/admin/testimonials`  | AdminTestimonials| —                        |

---

## 5. Component Architecture

### Shared
- `components/shared/PublicLayout.jsx` — wraps public pages (navbar + footer)
- `components/shared/Navbar.jsx` — public site navigation
- `components/shared/Footer.jsx` — public site footer
- `components/shared/PageHeader.jsx` — hero header with image + title + subtitle
- `components/shared/SectionReveal.jsx` — framer-motion scroll reveal wrapper
- `components/shared/Logo.jsx` — brand logo
- `components/RoleGuard.jsx` — route-level access control
- `components/UserNotRegisteredError.jsx` — error screen for unregistered users

### Home Page Sections
- `components/home/HeroSection.jsx` — full-screen YouTube video background hero
- `components/home/ServicesStrip.jsx` — service offerings grid
- `components/home/ProcessTeaser.jsx` — 4-step process summary
- `components/home/PortfolioGrid.jsx` — masonry portfolio preview (8 items)
- `components/home/MagazineFeature.jsx` — interactive PDF flipbook (Client Onboarding Handbook)
- `components/home/FoundersSection.jsx` — founders dual-portrait section
- `components/home/TestimonialsSection.jsx` — auto-rotating testimonial carousel
- `components/home/InstagramStrip.jsx` — Instagram photo grid

### Portfolio
- `components/portfolio/PortfolioFlipbook.jsx` — category-based flipbook view

### Portal
- `components/portal/PortalLayout.jsx` — client portal shell (sidebar nav)

### Admin
- `components/admin/AdminLayout.jsx` — admin portal shell (sidebar + user info)

---

## 6. Key Integrations

All via `base44.integrations.Core.*`:
- `InvokeLLM` — LLM calls (optional `model`, `add_context_from_internet`, `response_json_schema`)
- `UploadFile` — file upload → `{ file_url }`
- `UploadPrivateFile` — private storage upload → `{ file_uri }`
- `CreateFileSignedUrl` — signed download URL for private files
- `ExtractDataFromUploadedFile` — extract structured data from CSV/XLSX/JSON/PDF
- `SendEmail` — transactional email
- `GenerateImage` / `GenerateVideo` / `GenerateSpeech` — AI media generation
- `TranscribeAudio` — audio transcription (Whisper)

---

## 7. Design System

**Fonts:**
- Heading: Playfair Display (serif)
- Body: Inter (sans-serif)

**Color Tokens (index.css → tailwind.config.js):**
- `gold` — primary accent (HSL 38 45% 60%)
- `charcoal` — dark backgrounds (HSL 0 0% 10%)
- `cream` — light backgrounds (HSL 30 33% 96%)
- `warm-gray` — muted surfaces (HSL 30 8% 90%)

**Key files:**
- `index.css` — design tokens (`:root` + `.dark`)
- `tailwind.config.js` — token → Tailwind class mapping
- `index.html` — page title, meta tags, fonts, favicon

---

## 8. SDK Usage Patterns

```js
import { base44 } from '@/api/base44Client';

// Entity CRUD
base44.entities.TeamMember.list('sort_order', 100);
base44.entities.TeamMember.filter({ department: 'Sales' }, 'sort_order', 50);
base44.entities.TeamMember.create({ name: '...', department: '...' });
base44.entities.TeamMember.update(id, { title: '...' });
base44.entities.TeamMember.bulkUpdate([{ id, ...changes }]);
base44.entities.TeamMember.delete(id);

// Auth
await base44.auth.me();
await base44.auth.isAuthenticated();
await base44.auth.logout(redirectUrl);
await base44.auth.redirectToLogin(nextUrl);

// Integrations
const { file_url } = await base44.integrations.Core.UploadFile({ file });
const res = await base44.integrations.Core.InvokeLLM({ prompt: '...' });

// Realtime
const unsubscribe = base44.entities.Todo.subscribe((event) => { /* ... */ });
```

---

## 9. Notes for Continuation

- **Entity files** live in `entities/*.json` — each is the full JSON schema (no built-in fields).
- **Backend functions** live in `functions/*.js` — Deno deploy handlers using `createClientFromRequest`.
- **Agents** live in `agents/*.json` — AI agent configs.
- **No local imports** in backend functions (files deploy independently).
- **Flipbook PDFs** are loaded via pdfjs-dist with canvas rendering at scale 2.5.
- **Portfolio page** has a `.catch()` fallback to static items if the entity call fails (401 for unauthenticated users).
- **Admin portal** manages all CMS entities (portfolio, team, FAQs, process, investment, settings, testimonials).
- **Client portal** is scoped by `client_email` matching the logged-in user's email.