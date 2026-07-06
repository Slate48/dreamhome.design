# Database Export

## Option 1: Download via Backend Function (Quickest)

The `exportDatabase` backend function returns the full database as a downloadable JSON file.

1. Go to **Dashboard → Code → Functions → exportDatabase**
2. Copy the **Endpoint URL**
3. Open it in your browser while logged into the app — it will download `database_export.json`

The function is admin-only and returns all 13 entities in one file (~72KB).

## Option 2: Run the Export Script Locally

```bash
# From the project root:
node scripts/export-db.mjs <ENDPOINT_URL> <YOUR_AUTH_TOKEN>
```

This saves `database_export.json` to the project root.

## Exported Entities

| Entity | Record Count |
|---|---|
| TeamMember | 30 |
| PortfolioItem | 55 |
| SiteSettings | 1 |
| FAQItem | 8 |
| InvestmentTier | 3 |
| ProcessStage | 8 |
| Testimonial | 3 |
| ContactInquiry | 0 |
| Invoice | 0 |
| Message | 0 |
| Project | 0 |
| Document | 0 |
| Selection | 0 |

## Migrating to Cloudflare (D1 / KV / R2)

The exported JSON is a flat key-per-entity structure:

```json
{
  "exported_at": "2026-07-06T16:04:52.027Z",
  "entities": {
    "TeamMember": [ { ...record }, ... ],
    "PortfolioItem": [ { ...record }, ... ],
    ...
  }
}
```

Each record includes its `id`, `created_date`, `updated_date`, and all schema-defined fields. You can transform this into SQL INSERTs, KV entries, or R2 objects depending on your Cloudflare target.