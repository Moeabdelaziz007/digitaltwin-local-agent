import { createJiti } from 'jiti';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const jiti = createJiti(import.meta.url, {
  alias: {
    '@': path.join(rootDir, 'src')
  }
});

// Run the test script
console.log('--- EXECUTING TEST WITH JITI ALIASES ---');
jiti.import('./test_mercor_e2e.ts').catch(err => {
  console.error('JITI EXECUTION FAILED:');
  console.error(err);
  process.exit(1);
});
