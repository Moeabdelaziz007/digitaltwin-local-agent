'use server';

import { runEvaluationSuite } from '@/lib/eval/runner';

export async function runEvalAction() {
  return await runEvaluationSuite();
}
