import fs from 'fs';
import path from 'path';
import { callOllama } from '../src/lib/ollama-client';

/**
 * scripts/ai-split.ts
 * Uses LLM to intelligently split a large TypeScript file into smaller modules.
 */

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node scripts/ai-split.ts <file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lineCount = content.split('\n').length;

  console.log(`[AI-Split] Analyzing ${filePath} (${lineCount} lines)...`);

  const prompt = `
    This TypeScript file is ${lineCount} lines long. 
    Analyze the code and suggest how to split it into smaller, more cohesive modules.
    
    RETURN ONLY A JSON OBJECT with this structure:
    {
      "modules": [
        { 
          "name": "suggested-filename.ts", 
          "exports": ["functionName1", "ClassName2"], 
          "reason": "Why this split makes sense" 
        }
      ]
    }

    FILE CONTENT:
    ${content}
  `;

  try {
    const response = await callOllama(prompt, [
      { role: 'system', content: 'You are a Senior Systems Architect specialized in modular design and Clean Code.' }
    ]);

    // Clean JSON from possible markdown wrapping
    const jsonStr = response.replace(/```json|```/g, '').trim();
    const splitPlan = JSON.parse(jsonStr);

    console.log('[AI-Split] Plan generated:');
    console.table(splitPlan.modules);

    // In a real execution, we would extract the module code here.
    // For safety, we'll just output the plan for now.
    console.log('\n[AI-Split] To execute this split, use the proposed plan to extract the code.');

  } catch (error) {
    console.error('[AI-Split] Failed to generate split plan:', error);
  }
}

main();
