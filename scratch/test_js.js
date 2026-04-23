const { ventureRegistry } = require('./src/lib/holding/venture-registry');
const { MercorBridgeSkill } = require('./src/lib/skills/mercor-bridge');
const { TicketEngine } = require('./src/lib/holding/ticket-engine');

async function runTest() {
  console.log('--- JS E2E TEST ---');
  try {
    const v = await ventureRegistry.launchEngine('JS_TEST', 'Legal');
    const skill = new MercorBridgeSkill();
    const res = await skill.execute(v, v.org_chart[0]);
    console.log('RESULT:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('FAILED:', e);
  }
}
runTest();
