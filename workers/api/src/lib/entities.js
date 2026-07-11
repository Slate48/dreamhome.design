/**
 * Entity registry for wl-dreamhome-api — extends the original inline
 * PUBLIC_ENTITIES/SORTABLE/FILTERABLE config (formerly in src/index.js) with
 * `columns` (writable fields) and `required` (fields needed on create), so the
 * same config now drives both the public GETs and the staff-only CRUD writes.
 *
 * Table name === entity key for all of these (no snake_case mapping needed —
 * unlike echohouse-films, this schema already uses PascalCase table names).
 * `sortable`/`filterable` remain the SQL-injection guard: only allowlisted
 * identifiers are ever interpolated into a query.
 */

export const ENTITIES = {
  PortfolioItem: {
    publicRead: true,
    bools: ['featured'],
    json: [],
    defaultSort: 'sort_order',
    sortable: ['sort_order', 'title', 'category', 'featured', 'created_date'],
    filterable: ['category', 'featured'],
    columns: ['title', 'category', 'description', 'image_url', 'featured', 'sort_order'],
    required: ['title'],
  },
  TeamMember: {
    publicRead: true,
    bools: ['show_title', 'is_founder'],
    json: [],
    defaultSort: 'sort_order',
    sortable: ['sort_order', 'name', 'department', 'is_founder', 'created_date'],
    filterable: ['department', 'is_founder'],
    columns: ['name', 'title', 'show_title', 'department', 'photo_url', 'bio', 'is_founder', 'sort_order'],
    required: ['name'],
  },
  FAQItem: {
    publicRead: true,
    bools: ['is_active'],
    json: [],
    defaultSort: 'sort_order',
    sortable: ['sort_order', 'is_active', 'created_date'],
    filterable: ['is_active'],
    columns: ['question', 'answer', 'sort_order', 'is_active'],
    required: ['question', 'answer'],
  },
  ProcessStage: {
    publicRead: true,
    bools: ['is_active'],
    json: [],
    defaultSort: 'stage_number',
    sortable: ['stage_number', 'is_active', 'created_date'],
    filterable: ['is_active', 'stage_number'],
    columns: ['stage_number', 'title', 'description', 'is_active'],
    required: ['title'],
  },
  InvestmentTier: {
    publicRead: true,
    bools: [],
    json: ['payment_methods'],
    defaultSort: 'step_number',
    sortable: ['step_number', 'created_date'],
    filterable: ['step_number'],
    columns: ['step_number', 'title', 'description', 'note', 'payment_methods', 'scope_exclusions_note'],
    required: ['title'],
  },
  Testimonial: {
    publicRead: true,
    bools: ['featured'],
    json: [],
    defaultSort: 'created_date',
    sortable: ['created_date', 'rating', 'featured'],
    filterable: ['featured', 'project_type'],
    columns: ['client_name', 'quote', 'rating', 'project_type', 'featured'],
    required: ['client_name', 'quote'],
  },
  SiteSettings: {
    publicRead: true,
    bools: [],
    json: [],
    defaultSort: 'key',
    sortable: ['key'],
    filterable: ['key'],
    columns: [
      'key', 'phone', 'phone_display', 'email_sales', 'email_billing', 'billing_contact_name',
      'address', 'city_state', 'google_maps_embed_url', 'instagram_url', 'facebook_url',
      'instagram_handle', 'website_url', 'consultation_booking_url', 'logo_url', 'tagline',
    ],
    required: ['key'],
  },
  // Staff-only inbox — not part of CMS_ENTITIES (no generic create/patch/delete;
  // the public POST /api/ContactInquiry path in src/index.js stays separate).
  ContactInquiry: {
    publicRead: false,
    bools: [],
    json: [],
    defaultSort: 'created_date',
    sortable: ['created_date', 'status'],
    filterable: ['status'],
    columns: [],
    required: [],
  },
}

// The 7 CMS entities that get generic staff-gated POST/PATCH/DELETE.
// ContactInquiry is intentionally excluded — its writes go through the
// dedicated public contact-form handler, not the generic CRUD routes.
export const CMS_ENTITIES = Object.keys(ENTITIES).filter((e) => e !== 'ContactInquiry')

export function getEntity(name) {
  return ENTITIES[name] || null
}

// Convert a stored D1 row (booleans as 0/1, JSON columns as TEXT) into the
// shape the frontend expects (real booleans, parsed JSON).
export function hydrate(config, row) {
  if (!row) return row
  const out = { ...row }
  for (const b of config.bools) if (b in out) out[b] = !!out[b]
  for (const j of config.json) {
    if (typeof out[j] === 'string' && out[j]) {
      try { out[j] = JSON.parse(out[j]) } catch { /* leave as-is */ }
    }
  }
  return out
}

// Convert an incoming write payload into DB-storable values (booleans -> 0/1,
// JSON columns -> TEXT), keeping only allowlisted writable columns.
export function dehydrate(config, body) {
  const out = {}
  for (const col of config.columns) {
    if (!(col in body)) continue
    let value = body[col]
    if (config.bools.includes(col)) {
      value = value ? 1 : 0
    } else if (config.json.includes(col)) {
      value = JSON.stringify(value ?? null)
    }
    out[col] = value
  }
  return out
}
