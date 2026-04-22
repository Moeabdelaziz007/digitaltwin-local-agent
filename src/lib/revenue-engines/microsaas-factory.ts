/**
 * src/lib/revenue-engines/microsaas-factory.ts
 * محرك "مصنع الـ Micro-SaaS" (Micro-SaaS Factory Engine)
 */

import { WorkflowNode } from '../consensus/dag-executor';

export const MicroSaaSFactoryBlueprint = {
  name: 'Micro-SaaS Factory',
  mission: 'Discover niche problems, build MVPs using Next.js, and deploy to Vercel.',
  
  getWorkflow(nicheDescription: string): WorkflowNode[] {
    return [
      {
        id: 'market_discovery',
        agent: 'Scout',
        task: `Find 3 underserved pain points in the ${nicheDescription} niche.`,
        dependencies: [],
        parallel: true
      },
      {
        id: 'product_spec',
        agent: 'Architect',
        task: 'Define features, data models, and user flow for the MVP.',
        dependencies: ['market_discovery'],
        parallel: false
      },
      {
        id: 'code_generation',
        agent: 'claude-code', // تفويض لبناء الهيكل البرمجي
        task: 'Scaffold a Next.js app with Tailwind and PocketBase integration.',
        dependencies: ['product_spec'],
        parallel: false
      },
      {
        id: 'revenue_model',
        agent: 'Rainmaker',
        task: 'Integrate Stripe/LemonSqueezy logic and pricing tiers.',
        dependencies: ['code_generation'],
        parallel: false
      },
      {
        id: 'final_deploy',
        agent: 'CEO',
        task: 'Push to Vercel and set up custom domain/SEO metadata.',
        dependencies: ['revenue_model'],
        parallel: false
      }
    ];
  }
};
