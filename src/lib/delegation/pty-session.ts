/**
 * src/lib/delegation/pty-session.ts
 * محرك إدارة جلسات الأدوات الخارجية (Cross-CLI Orchestration)
 * يسمح لـ MAS-ZERO بتفويض المهام لأدوات مثل Claude Code أو Aider.
 */

import { spawn, ChildProcess } from 'child_process';

export interface DelegationResult {
  success: boolean;
  output: string;
  exitCode: number | null;
}

export type ExternalAgentType = 'claude-code' | 'codex' | 'cursor' | 'aider';

export class PTYSession {
  private agentName: ExternalAgentType;
  private task: string;

  constructor(agentName: ExternalAgentType, task: string) {
    this.agentName = agentName;
    this.task = task;
  }

  /**
   * تنفيذ المهمة عبر الـ CLI المخصص
   */
  public async execute(): Promise<DelegationResult> {
    console.log(`[Delegation] Starting ${this.agentName} for task: ${this.task.substring(0, 50)}...`);

    return new Promise((resolve) => {
      const cliCommand = this.getCLICommand();
      const child = spawn(cliCommand, ['--task', this.task], {
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      let output = '';

      child.stdout?.on('data', (data) => {
        const str = data.toString();
        output += str;
        // هنا يمكن إضافة منطق الـ Expect للتعامل مع المطالبات التفاعلية
      });

      child.stderr?.on('data', (data) => {
        output += `[ERROR] ${data.toString()}`;
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          exitCode: code
        });
      });
    });
  }

  private getCLICommand(): string {
    const commands: Record<ExternalAgentType, string> = {
      'claude-code': 'claude',
      'aider': 'aider',
      'codex': 'codex-cli',
      'cursor': 'cursor-cli'
    };
    return commands[this.agentName];
  }
}

/**
 * دالة التفويض السريع
 */
export async function delegateToExternalAgent(agent: ExternalAgentType, task: string): Promise<DelegationResult> {
  const session = new PTYSession(agent, task);
  return await session.execute();
}
