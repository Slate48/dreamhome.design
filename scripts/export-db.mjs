#!/usr/bin/env node
/**
 * Export the Base44 database to a local JSON file.
 *
 * Usage:
 *   node scripts/export-db.mjs <ENDPOINT_URL> <AUTH_TOKEN>
 *
 * Get the endpoint URL from: Dashboard → Code → Functions → exportDatabase
 * Get your auth token from: browser dev tools → localStorage → base44_auth_token
 *
 * Output: database_export.json in the project root.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [endpointUrl, authToken] = process.argv.slice(2);

if (!endpointUrl || !authToken) {
  console.error('Usage: node scripts/export-db.mjs <ENDPOINT_URL> <AUTH_TOKEN>');
  process.exit(1);
}

async function main() {
  console.log('Fetching database export...');
  const res = await fetch(endpointUrl, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Export failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  const outPath = resolve(__dirname, '..', 'database_export.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  const counts = Object.entries(data.entities).map(([name, records]) => {
    const count = Array.isArray(records) ? records.length : 0;
    return `  ${name}: ${count}`;
  });
  console.log(`\nExport saved to: ${outPath}\n`);
  console.log('Record counts:');
  console.log(counts.join('\n'));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});