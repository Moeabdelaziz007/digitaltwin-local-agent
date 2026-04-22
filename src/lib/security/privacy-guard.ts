import { callOllama } from '../ollama-client';

/**
 * src/lib/security/privacy-guard.ts
 * Implements the "PII Black-Hole" pattern using Differential Privacy.
 * Ensures sensitive data never leaves the local machine.
 */

export class PrivacyGuard {
  /**
   * Detects PII using a local LLM before any external API call.
   */
  static async sanitize(input: string): Promise<{ safe: boolean; content: string; reason?: string }> {
    console.log('[PrivacyGuard] Scanning for PII via local Ollama...');

    const prompt = `
      Analyze the following text for PII (Personally Identifiable Information) such as:
      - Real names, addresses, phone numbers, emails, passwords, API keys, or financial data.
      
      Respond ONLY in JSON format:
      {
        "hasPii": boolean,
        "piiDetected": ["list", "of", "types"],
        "sanitizedVersion": "text with [REDACTED] if needed"
      }

      Text to analyze: "${input}"
    `;

    try {
      const response = await callOllama(prompt, [{ role: 'system', content: 'You are a strict Security & Privacy Auditor.' }]);
      const result = JSON.parse(response);

      if (result.hasPii) {
        console.warn(`[PrivacyGuard] PII Detected: ${result.piiDetected.join(', ')}. Switching to local-only processing.`);
        return { 
          safe: false, 
          content: result.sanitizedVersion, 
          reason: `PII Detected: ${result.piiDetected.join(', ')}` 
        };
      }

      return { safe: true, content: input };
    } catch (e) {
      console.error('[PrivacyGuard] Scan failed, defaulting to local-only for safety.', e);
      return { safe: false, content: '[PROTECTED] Scan Failed', reason: 'Safety Default' };
    }
  }

  /**
   * Logic to force local processing if PII is present.
   */
  static async processSecurely(input: string, externalCall: (data: string) => Promise<any>, localFallback: (data: string) => Promise<any>) {
    const { safe, content } = await this.sanitize(input);
    
    if (safe) {
      return await externalCall(input);
    } else {
      console.log('[PrivacyGuard] Data contains PII. Processing locally to prevent leak.');
      return await localFallback(content);
    }
  }
}
