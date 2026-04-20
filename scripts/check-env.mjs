import fs from 'node:fs';
import path from 'node:path';

const envFile = path.resolve(process.cwd(), '.env.local');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

const fileEnv = parseEnvFile(envFile);
const mergedEnv = { ...fileEnv, ...process.env };

const requiredForBuild = [
  'POCKETBASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CRON_SECRET',
  'CLERK_WEBHOOK_SECRET',
];

const missing = requiredForBuild.filter((name) => {
  const value = mergedEnv[name];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missing.length > 0) {
  const sourceHint = fs.existsSync(envFile)
    ? '.env.local + process env'
    : 'process env (no .env.local found)';

  console.error('❌ Environment check failed. Missing required variables for build/runtime guards:');
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error(`Checked source: ${sourceHint}`);
  process.exit(1);
}

console.log('✅ Environment check passed. Required variables are set.');
