import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';
import { UpworkJob, ExecutionResult } from './types';
import { skillRegistry } from './registry';
import { Venture, Role } from '../holding/types';

/**
 * src/lib/skills/freelance-applicant.ts
 * Autonomous Freelance Applicant Skill (Standardized for AHP)
 */

export class FreelanceApplicantSkill {
  static id = 'freelance-applicant';

  async execute(venture: Venture, role: Role, context: { job: UpworkJob; profile: any }): Promise<ExecutionResult> {
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
}

// Register in AHP Registry
skillRegistry.registerSkill({
  id: FreelanceApplicantSkill.id,
  metadata: {
    name: 'Freelance Applicant',
    version: '1.2.0',
    description: 'Automates job applications on Upwork/Contra.',
    when_to_use: 'When responding to freelance job postings.',
    permissions: ['memory_read', 'network'],
    required_tools: ['ollama'],
    category: 'revenue',
    revenue_impact: 'medium'
  },
  instructions: 'Write high-conversion Upwork proposals using past memory context.'
});
