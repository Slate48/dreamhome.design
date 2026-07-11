/**
 * adminEntities.js — authenticated CRUD client for the 7 staff-gated CMS
 * entities (PortfolioItem, TeamMember, FAQItem, ProcessStage, InvestmentTier,
 * Testimonial, SiteSettings) plus the ContactInquiry staff inbox, replacing
 * `base44.entities.<Entity>` in the admin pages.
 *
 * Mirrors base44's call shape (list/filter/create/update/delete) so each admin
 * page's diff versus its old base44 calls stays a near 1:1 swap — same
 * argument order, same return shape. Kept separate from src/api/publicContent.js
 * (which stays public-read-only, no auth) since these calls are staff-gated
 * writes + one auth-required read (ContactInquiry). Same-origin `fetch` sends
 * the `dreamhome_session` cookie automatically — no token plumbing needed.
 */

// base44's SDK accepted a leading "-" on the sort field to mean descending
// (e.g. `.list('-created_date', 100)`). The Worker instead takes `sort` (a
// bare column name) and a separate `order` param — translate here so call
// sites can keep the base44-style sort string unchanged.
function splitSort(sort) {
  if (typeof sort === 'string' && sort.startsWith('-')) {
    return { sort: sort.slice(1), order: 'desc' };
  }
  return { sort, order: undefined };
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, typeof value === 'boolean' ? String(value) : String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

async function request(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Some responses (e.g. a bare 500 from an uncaught Worker error) may not
    // have a JSON body — fall through with body = null.
  }
  if (!res.ok) {
    const message = (body && body.error) || `${(options && options.method) || 'GET'} ${url} failed: ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const adminApi = {
  // base44 signature: list(sortField, limit)
  list(entity, sort, limit) {
    const { sort: field, order } = splitSort(sort);
    return request(`/api/${entity}${buildQuery({ sort: field, order, limit })}`);
  },

  // base44 signature: filter(whereObj, sortField, limit)
  filter(entity, where, sort, limit) {
    const { sort: field, order } = splitSort(sort);
    return request(`/api/${entity}${buildQuery({ ...where, sort: field, order, limit })}`);
  },

  create(entity, body) {
    return request(`/api/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  update(entity, id, body) {
    return request(`/api/${entity}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  delete(entity, id) {
    return request(`/api/${entity}/${id}`, { method: 'DELETE' });
  },
};

export default adminApi;
