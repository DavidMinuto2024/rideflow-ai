// ═══════════════════════════════════════════════════════════
// RideFlow AI — Supabase Migration Script
//
// Reads SQL migration files from scripts/sql/ and sends them
// to the Supabase Management API for execution.
//
// Usage:
//   SUPABASE_REF=xyz SUPABASE_MANAGEMENT_TOKEN=sbp_xxx npx ts-node scripts/migrate-supabase.ts
//
// Environment variables:
//   SUPABASE_REF              (required) Your Supabase project reference ID
//   SUPABASE_MANAGEMENT_TOKEN (required) Supabase Management API access token
//   SUPABASE_SERVICE_ROLE_KEY (fallback) Used when MANAGEMENT_TOKEN is not set
//   SUPABASE_URL              (required for fallback) Project URL like https://xyz.supabase.co
// ═══════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  file: string;
  statements: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

async function runMigration(): Promise<void> {
  const supabaseRef = process.env.SUPABASE_REF;
  const mgmtToken = process.env.SUPABASE_MANAGEMENT_TOKEN;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseRef) {
    console.error('❌ SUPABASE_REF is required. Set it in your environment or .env file.');
    process.exit(1);
  }

  // Determine auth strategy
  let authToken: string;
  let apiUrl: string;

  if (mgmtToken) {
    // Management API (recommended for DDL migrations)
    authToken = mgmtToken;
    apiUrl = `https://api.supabase.com/v1/projects/${supabaseRef}/database/query`;
    console.log(`🔑 Using Management API token`);
  } else if (serviceRoleKey && supabaseUrl) {
    // Fallback: use the supabase-js REST API with a raw SQL function
    // Requires a stored procedure named exec_sql in the database
    authToken = serviceRoleKey;
    // Extract subdomain from SUPABASE_URL
    const urlObj = new URL(supabaseUrl);
    apiUrl = `${urlObj.protocol}//${urlObj.hostname}/rest/v1/rpc/exec_sql`;
    console.log(`🔑 Using service_role key (fallback mode)`);
    console.log(`⚠️  Requires exec_sql stored procedure in the database.`);
  } else {
    console.error(
      '❌ Either SUPABASE_MANAGEMENT_TOKEN or (SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL) is required.'
    );
    process.exit(1);
  }

  // Read SQL files from scripts/sql/ directory
  const sqlDir = path.resolve(__dirname, 'sql');
  if (!fs.existsSync(sqlDir)) {
    console.error(`❌ SQL directory not found: ${sqlDir}`);
    process.exit(1);
  }

  const sqlFiles = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (sqlFiles.length === 0) {
    console.warn('⚠️  No SQL migration files found in scripts/sql/');
    process.exit(0);
  }

  console.log(`📁 Found ${sqlFiles.length} migration file(s):`);
  sqlFiles.forEach((f) => console.log(`   - ${f}`));
  console.log('');

  const results: MigrationResult[] = [];

  for (const file of sqlFiles) {
    console.log(`▶️  Running migration: ${file}`);
    const filePath = path.join(sqlDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Split into individual statements (semicolon-delimited, ignoring DO blocks)
    // We send the entire file as one query since it uses IF NOT EXISTS guards
    const result = await executeMigration(sql, file, apiUrl, authToken, mgmtToken ? 'mgmt' : 'rpc');
    results.push(result);

    console.log(
      `   ✅ ${result.succeeded}/${result.statements} statements succeeded`
    );
    if (result.failed > 0) {
      console.log(`   ❌ ${result.failed} statement(s) failed:`);
      result.errors.forEach((e) => console.log(`      - ${e}`));
    }
    console.log('');
  }

  // Summary
  const totalSucceeded = results.reduce((s, r) => s + r.succeeded, 0);
  const totalFailed = results.reduce((s, r) => s + r.failed, 0);

  console.log('═══════════════════════════════════════════');
  console.log('📊 Migration Summary');
  console.log('═══════════════════════════════════════════');
  console.log(`   Files processed: ${results.length}`);
  console.log(`   Statements succeeded: ${totalSucceeded}`);
  console.log(`   Statements failed: ${totalFailed}`);
  console.log(`   Status: ${totalFailed === 0 ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

async function executeMigration(
  sql: string,
  fileName: string,
  apiUrl: string,
  token: string,
  mode: 'mgmt' | 'rpc'
): Promise<MigrationResult> {
  const result: MigrationResult = {
    file: fileName,
    statements: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Remove comments and blank lines for statement counting
  const cleanedSql = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')
    .join('\n');

  // Split by semicolons for statement count estimate
  const rawStatements = cleanedSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  result.statements = rawStatements.length;

  try {
    const body = mode === 'mgmt' ? { query: sql } : { query: sql };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(mode === 'mgmt' ? { 'X-Request-Id': `migration-${fileName}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      result.failed = result.statements;
      result.errors.push(`HTTP ${response.status}: ${errorBody}`);
    } else {
      result.succeeded = result.statements;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.failed = result.statements;
    result.errors.push(message);
  }

  return result;
}

runMigration().catch((err) => {
  console.error('❌ Migration script failed:', err);
  process.exit(1);
});