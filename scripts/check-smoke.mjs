import fs from 'node:fs';
import path from 'node:path';

const checks = [
  {
    name: '/api/conversation unauthorized path',
    file: 'src/app/api/conversation/route.ts',
    mustContain: [
      'if (!userId)',
      "return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
      'if (!clerkUserId)',
    ],
  },
  {
    name: 'cron auth guard',
    file: 'src/app/api/cron/decay/route.ts',
    mustContain: [
      "authHeader !== `Bearer ${process.env.CRON_SECRET}`",
      "return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
    ],
  },
  {
    name: 'webhook signature required',
    file: 'src/app/api/webhooks/clerk/route.ts',
    mustContain: [
      "const svix_signature = headerPayload.get('svix-signature');",
      "if (!svix_id || !svix_timestamp || !svix_signature)",
      'wh.verify(body, {',
      "return new Response('Invalid signature', { status: 400 });",
    ],
  },
];

let failed = false;

for (const check of checks) {
  const absolutePath = path.resolve(process.cwd(), check.file);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ ${check.name}: file not found (${check.file})`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  const missing = check.mustContain.filter((needle) => !content.includes(needle));

  if (missing.length > 0) {
    console.error(`❌ ${check.name}: missing expected guard pattern(s) in ${check.file}`);
    for (const needle of missing) {
      console.error(`   - ${needle}`);
    }
    failed = true;
  } else {
    console.log(`✅ ${check.name}`);
  }
}

if (failed) {
  console.error('Smoke checks failed.');
  process.exit(1);
}

console.log('All smoke checks passed.');
