const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

async function bootstrapSchema() {
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
    throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD are required.');
  }

  const pb = new PocketBase(POCKETBASE_URL);
  pb.autoCancellation(false);
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);

  const schemaPath = path.join(process.cwd(), 'pb_schema.json');
  const collections = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  for (const collection of collections) {
    const payload = {
      name: collection.name,
      type: collection.type,
      system: collection.system,
      schema: collection.schema,
      listRule: collection.listRule ?? null,
      viewRule: collection.viewRule ?? null,
      createRule: collection.createRule ?? null,
      updateRule: collection.updateRule ?? null,
      deleteRule: collection.deleteRule ?? null,
    };

    try {
      const existing = await pb.collections.getOne(collection.id);
      await pb.collections.update(existing.id, payload);
      console.log(`✅ Updated collection: ${collection.name}`);
    } catch {
      await pb.collections.create({
        id: collection.id,
        ...payload,
      });
      console.log(`✅ Created collection: ${collection.name}`);
    }
  }

  console.log('🎉 PocketBase schema bootstrap complete.');
}

bootstrapSchema().catch((error) => {
  console.error('❌ PocketBase schema bootstrap failed:', error.message);
  process.exit(1);
});
