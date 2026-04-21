#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const datasetPath = path.join(process.cwd(), 'eval/datasets/memory/baseline.json');
const expectedPrefix = 'memory-baseline-v';

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
} catch (error) {
  console.error(`[memory-dataset-check] Failed to parse ${datasetPath}:`, error);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
  console.error('[memory-dataset-check] Dataset must be an object with metadata and cases[]');
  process.exit(1);
}

if (typeof parsed.dataset_version !== 'string' || !parsed.dataset_version.startsWith(expectedPrefix)) {
  console.error(`[memory-dataset-check] dataset_version must start with "${expectedPrefix}".`);
  process.exit(1);
}

if (parsed.source !== 'eval/datasets/memory/baseline.json') {
  console.error('[memory-dataset-check] source must be "eval/datasets/memory/baseline.json".');
  process.exit(1);
}

if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
  console.error('[memory-dataset-check] cases must be a non-empty array.');
  process.exit(1);
}

console.log(`[memory-dataset-check] OK: ${parsed.dataset_version} (${parsed.cases.length} cases)`);
