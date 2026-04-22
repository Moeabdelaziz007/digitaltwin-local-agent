import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';
import { UpworkJob, ExecutionResult } from '@/types/agent-skills';
import { skillRegistry } from './registry';

/**
 * src/lib/skills/freelance-applicant.ts
 * Autonomous Freelance Applicant Skill (Refactored for AHP)
 */

export const freelanceApplicantSkill = {
  id: 'freelance-applicant',
  instructions: `
    You are an expert freelance growth agent. 
    Your goal is to write high-conversion Upwork proposals.
    Lead with results, be concise, and human.
  `,
  async execute(context: { job: UpworkJob; profile: any }): Promise<ExecutionResult> {
    const { job, profile } = context;
    const query = `freelance job proposal ${job.title} ${job.description.substring(0, 50)}`;
    const relevantPastWork = await executeRecallMemory('system', query);

    const prompt = `
      Write a winning Upwork proposal in this person's voice:
      Voice Style: ${profile.voiceStyle || 'professional and concise'}
      Job: ${job.title} - ${job.description}
      Past Context: ${JSON.stringify(relevantPastWork)}
    `;

    const proposal = await callOllama(prompt, [
      { role: 'system', content: 'You are an expert freelance growth agent.' }
    ]);

    return {
      success: true,
      output: proposal,
      metadata: { jobId: job.id, timestamp: Date.now() }
    };
  }
};

// تسجيل المهارة تلقائياً في السجل الجديد
skillRegistry.registerSkill({
  id: freelanceApplicantSkill.id,
  metadata: {
    name: 'Freelance Applicant',
    version: '1.1.0',
    description: 'Automates job applications on Upwork/Contra.',
    when_to_use: 'When responding to freelance job postings.',
    permissions: ['memory_read', 'network'],
    required_tools: ['ollama'],
    category: 'revenue',
    revenue_impact: 'high'
  },
  instructions: freelanceApplicantSkill.instructions
});
