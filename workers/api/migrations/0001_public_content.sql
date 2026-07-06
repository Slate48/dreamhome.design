-- 0001_public_content.sql — D1 schema for the PUBLIC marketing-site content entities.
-- Derived from base44/entities/*.jsonc. Portal/admin entities (Project, Document,
-- Selection, Message, Invoice, User) are intentionally NOT created here — they are
-- later migration phases. All base44 export ids are TEXT (base44 hex object ids).

CREATE TABLE IF NOT EXISTS PortfolioItem (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT,            -- Kitchens|Bathrooms|Closets|Home Bars|Pantries|Custom Millwork
  description  TEXT,
  image_url    TEXT,
  featured     INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_date TEXT,
  updated_date TEXT
);

CREATE TABLE IF NOT EXISTS TeamMember (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  title        TEXT,
  show_title   INTEGER DEFAULT 1,
  department   TEXT,            -- Sales|Cabinetry|Design|Estimating|Engineering|Project Management|Countertop|Management|Administration
  photo_url    TEXT,
  bio          TEXT,
  is_founder   INTEGER DEFAULT 0,
  sort_order   INTEGER DEFAULT 0,
  created_date TEXT,
  updated_date TEXT
);

CREATE TABLE IF NOT EXISTS FAQItem (
  id           TEXT PRIMARY KEY,
  question     TEXT NOT NULL,
  answer       TEXT NOT NULL,
  sort_order   INTEGER DEFAULT 0,
  is_active    INTEGER DEFAULT 1,
  created_date TEXT,
  updated_date TEXT
);

CREATE TABLE IF NOT EXISTS ProcessStage (
  id           TEXT PRIMARY KEY,
  stage_number INTEGER,
  title        TEXT NOT NULL,
  description  TEXT,
  is_active    INTEGER DEFAULT 1,
  created_date TEXT,
  updated_date TEXT
);

CREATE TABLE IF NOT EXISTS InvestmentTier (
  id                    TEXT PRIMARY KEY,
  step_number           INTEGER,
  title                 TEXT NOT NULL,
  description           TEXT,
  note                  TEXT,
  payment_methods       TEXT,   -- JSON array (string[])
  scope_exclusions_note TEXT,
  created_date          TEXT,
  updated_date          TEXT
);

CREATE TABLE IF NOT EXISTS Testimonial (
  id           TEXT PRIMARY KEY,
  client_name  TEXT NOT NULL,
  quote        TEXT NOT NULL,
  rating       INTEGER,
  project_type TEXT,
  featured     INTEGER DEFAULT 0,
  created_date TEXT,
  updated_date TEXT
);

CREATE TABLE IF NOT EXISTS SiteSettings (
  id                       TEXT PRIMARY KEY,
  key                      TEXT UNIQUE,   -- singleton 'main'
  phone                    TEXT,
  phone_display            TEXT,
  email_sales              TEXT,
  email_billing            TEXT,
  billing_contact_name     TEXT,
  address                  TEXT,
  city_state               TEXT,
  google_maps_embed_url    TEXT,
  instagram_url            TEXT,
  facebook_url             TEXT,
  instagram_handle         TEXT,
  website_url              TEXT,
  consultation_booking_url TEXT,
  logo_url                 TEXT,
  tagline                  TEXT,
  created_date             TEXT,
  updated_date             TEXT
);

-- Public write target for the /contact form.
CREATE TABLE IF NOT EXISTS ContactInquiry (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  project_type TEXT,
  how_heard    TEXT,
  message      TEXT NOT NULL,
  status       TEXT DEFAULT 'New',
  created_date TEXT,
  updated_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_portfolio_sort ON PortfolioItem(sort_order);
CREATE INDEX IF NOT EXISTS idx_team_sort ON TeamMember(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_active ON FAQItem(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_process_active ON ProcessStage(is_active, stage_number);
CREATE INDEX IF NOT EXISTS idx_tier_step ON InvestmentTier(step_number);
