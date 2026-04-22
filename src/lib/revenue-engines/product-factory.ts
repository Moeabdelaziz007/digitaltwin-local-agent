/**
 * src/lib/revenue-engines/product-factory.ts
 * محرك "مصنع المنتجات الرقمية" (Digital Product Factory Engine)
 */

import { WorkflowNode } from '../consensus/dag-executor';

export const DigitalProductFactoryBlueprint = {
  name: 'Product Creator',
  mission: 'Convert deep knowledge into sellable templates and digital assets.',
  
  getWorkflow(sourceData: string): WorkflowNode[] {
    return [
      {
        id: 'extract_value',
        agent: 'Researcher',
        task: `Identify the top 5 useful templates that can be built from: ${sourceData}`,
        dependencies: [],
        parallel: true
      },
      {
        id: 'build_templates',
        agent: 'Architect',
        task: 'Design the actual templates (Notion structure, FlutterFlow UI components, etc.)',
        dependencies: ['extract_value'],
        parallel: false
      },
      {
        id: 'create_visuals',
        agent: 'Designer',
        task: 'Generate high-quality product covers and screenshots using AI tools.',
        dependencies: ['build_templates'],
        parallel: true
      },
      {
        id: 'list_on_gumroad',
        agent: 'Rainmaker',
        task: 'Draft the sales copy and list the product on Gumroad/LemonSqueezy.',
        dependencies: ['create_visuals'],
        parallel: false
      }
    ];
  }
};
