import fs from 'fs';
import path from 'path';
import pb from '@/lib/pocketbase-client';
import { executeRecallMemory } from '@/lib/memory-engine';

interface EvalCase {
  id: string;
  topic: string;
  input: string;
  expected_category: string;
  expected_fact: string;
  type: string;
}

interface EvalResult {
  caseId: string;
  success: boolean;
  actual_output: string;
  latencyRows: number;
}

export async function runEvaluationSuite(proposalId?: string) {
  const datasetPath = path.join(process.cwd(), 'eval/datasets/memory/baseline.json');
  const dataset: EvalCase[] = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  
  const results: EvalResult[] = [];
  let successCount = 0;

  console.log(`[EVAL_RUNNER] Starting evaluation on ${dataset.length} cases...`);

  for (const tc of dataset) {
    const start = Date.now();
    try {
      // For Phase 1, we test the Recall logic
      const recallResult = await executeRecallMemory('system_eval_user', tc.topic);
      const success = recallResult.toLowerCase().includes(tc.expected_fact.toLowerCase());
      
      results.push({
        caseId: tc.id,
        success,
        actual_output: recallResult,
        latencyRows: Date.now() - start
      });
      
      if (success) successCount++;
    } catch (err) {
      console.error(`Error on case ${tc.id}:`, err);
    }
  }

  const summary = {
    total: dataset.length,
    success: successCount,
    failure: dataset.length - successCount,
    accuracy: (successCount / dataset.length) * 100
  };

  // Persist run history to PocketBase
  try {
    await pb.collection('eval_runs').create({
      proposal_id: proposalId || null,
      run_date: new Date().toISOString(),
      dataset_version: 'baseline-v1',
      results: results,
      metrics_summary: summary,
      status: summary.accuracy >= 90 ? 'success' : 'regression'
    });
  } catch (err) {
    console.error('Failed to persist eval run:', err);
  }

  return summary;
}
