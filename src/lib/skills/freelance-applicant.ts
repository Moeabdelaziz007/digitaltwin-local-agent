import { callOllama } from '../ollama-client';
import { executeRecallMemory } from '../memory-engine';
import { AgentSkill, DigitalTwinProfile, UpworkJob, ExecutionResult } from '@/types/agent-skills';

/**
 * src/lib/skills/freelance-applicant.ts
 * Autonomous Freelance Applicant Skill.
 */

export const freelanceApplicantSkill: AgentSkill & { execute: (context: { job: UpworkJob; profile: DigitalTwinProfile }) => Promise<ExecutionResult> } = {
  id: 'freelance-applicant@1.0.0',
  name: 'Freelance Applicant',
  version: '1.0.0',
  author: 'system',
  description: 'Automates job applications on Upwork/Contra using digital twin voice.',
  successRate: 0,
  totalEarnings: 0,
  lastUsed: new Date().toISOString(),
  status: 'experimental',
  tags: ['revenue', 'freelance', 'automation'],
  requiredEnvVars: ['OLLAMA_BASE_URL'],
  cost: 'free',
  stats: {
    totalRuns: 0,
    avgDurationMs: 0
  },
  execute: async (context: { job: UpworkJob; profile: DigitalTwinProfile }): Promise<ExecutionResult> => {
    const { job, profile } = context;

    // 1. Recall past similar wins using memory engine
    const query = `freelance job proposal ${job.title} ${job.description.substring(0, 50)}`;
    const relevantPastWork = await executeRecallMemory('system', query);

    // 2. Generate winning proposal
    const prompt = `
      Write a winning Upwork proposal in this person's voice:
      Voice Style: ${profile.voiceStyle || 'professional and concise'}
      
      Job Title: ${job.title}
      Job Description: ${job.description}
      
      Their past wins & context:
      ${JSON.stringify(relevantPastWork)}
      
      Their profile summary: ${profile.summary || 'Expert in AI and development.'}
      
      INSTRUCTIONS:
      - Max 150 words.
      - Sound human and professional, not robotic.
      - Lead with a specific result or insight.
      - Do not use placeholders like [Name].
    `;

    console.log(`[FreelanceSkill] Generating proposal for: ${job.title}`);
    const proposal = await callOllama(prompt, [
      { role: 'system', content: 'You are an expert freelance growth agent specialized in high-conversion proposals.' }
    ]);

    // 3. Simulation of submission (Integration with browser-use/sidecar goes here)
    console.log(`[FreelanceSkill] Proposal generated: \n${proposal.substring(0, 100)}...`);

    return {
      success: true,
      status: 'generated',
      output: proposal,
      metadata: {
        jobId: job.id,
        timestamp: Date.now()
      }
    };
  }
};

