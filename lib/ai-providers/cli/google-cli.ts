/**
 * Google Gemini CLI Provider - Uses Gemini Advanced subscription via CLI
 *
 * This provider shells out to the Gemini CLI which uses
 * the user's Gemini Advanced subscription credentials.
 *
 * Requirements:
 * - Gemini CLI installed (`brew install gemini`)
 * - User authenticated with Gemini Advanced subscription
 *   (configured in ~/.gemini/settings.json with "selectedType": "oauth-personal")
 *
 * Usage: For Sub Pro/Max tiers that want to use subscription instead of API keys
 *
 * IMPORTANT: This provider does NOT fall back to API keys.
 * User explicitly requested subscription-only mode for sub tiers.
 */

import { spawn } from 'child_process';
import { ModelResponse, ModelConfig } from '@/types/consensus';
import { AIProvider } from '../types';

// Models available via Gemini CLI (subscription)
const GEMINI_CLI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

/**
 * Run Gemini CLI with prompt via stdin (avoids shell escaping issues)
 * Returns a promise with stdout/stderr
 */
function runGeminiCliWithStdin(
  prompt: string,
  model: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      '-o', 'json',              // JSON output format
      '--approval-mode', 'yolo', // Non-interactive (auto-approve all actions)
    ];

    if (model) {
      args.push('-m', model);
    }

    const child = spawn('/opt/homebrew/bin/gemini', args, {
      shell: '/bin/zsh',
      timeout: 180000,  // 3 minute timeout for complex queries
      env: { ...process.env },
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        reject(new Error(stderr || `Process exited with code ${code}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    // Write prompt to stdin and close it
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

interface GeminiEvent {
  type?: string;
  message?: {
    content?: string;
    role?: string;
  };
  text?: string;
  result?: string;
  [key: string]: unknown;
}

export class GoogleCLIProvider implements AIProvider {
  name = 'Gemini (Subscription)';
  models = GEMINI_CLI_MODELS;

  /**
   * Check if Gemini CLI is available and authenticated
   */
  isConfigured(): boolean {
    try {
      // Check if gemini command exists at homebrew path
      const { execSync } = require('child_process');
      execSync('/opt/homebrew/bin/gemini --version', {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
        shell: '/bin/zsh',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Query Gemini via CLI using subscription
   * NOTE: Does NOT fall back to API key - subscription only!
   */
  async query(
    prompt: string,
    config: ModelConfig & { useTools?: boolean; maxSteps?: number }
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      console.log(`🔵 Gemini CLI (Subscription): Querying ${config.model}...`);
      console.log(`🔵 Gemini CLI: Using stdin for prompt (${prompt.length} chars)`);

      // Use stdin-based execution to avoid shell escaping issues with complex prompts
      const { stdout, stderr } = await runGeminiCliWithStdin(prompt, config.model);

      const responseTime = Date.now() - startTime;

      if (stderr && !stdout) {
        console.error('❌ Gemini CLI stderr:', stderr);
        throw new Error(stderr);
      }

      // Parse JSON output - Gemini CLI can return JSON or JSONL
      let responseText = '';

      // Try to parse as single JSON first
      try {
        const data = JSON.parse(stdout);
        // Gemini CLI returns { "response": "...", "stats": {...} }
        responseText = data.response || data.result || data.text || data.message?.content || '';
      } catch {
        // If not single JSON, try JSONL (multiple JSON objects)
        const lines = stdout.trim().split('\n').filter(Boolean);
        let lastMessage = '';

        for (const line of lines) {
          try {
            const event: GeminiEvent = JSON.parse(line);

            // Look for text/result in various formats
            if (event.result) {
              responseText = event.result;
            } else if (event.text) {
              responseText += event.text;
            } else if (event.message?.content) {
              lastMessage = event.message.content;
            }
          } catch {
            // If line isn't valid JSON, might be plain text output
            responseText += line + '\n';
          }
        }

        // Fallback to last message if no text accumulated
        if (!responseText && lastMessage) {
          responseText = lastMessage;
        }

        // Final fallback - use entire stdout
        if (!responseText) {
          responseText = stdout.trim();
        }
      }

      console.log(`✅ Gemini CLI (Subscription): Response received in ${responseTime}ms`);
      console.log(`   Response length: ${responseText.length} chars (subscription - no charge)`);

      return {
        id: `gemini-cli-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: responseText,
        confidence: this.calculateConfidence(responseText),
        responseTime,
        tokens: {
          // CLI doesn't provide exact token counts, estimate based on text
          prompt: Math.ceil(prompt.length / 4),
          completion: Math.ceil(responseText.length / 4),
          total: Math.ceil((prompt.length + responseText.length) / 4),
        },
        timestamp: new Date(),
        toolCalls: undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('❌ Gemini CLI error:', errorMessage);

      return {
        id: `gemini-cli-error-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: '',
        confidence: 0,
        responseTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        timestamp: new Date(),
        error: `Gemini CLI Error: ${errorMessage}. Make sure 'gemini' CLI is installed and authenticated with your Gemini Advanced subscription.`,
      };
    }
  }

  /**
   * Simple confidence calculation based on response quality
   */
  private calculateConfidence(response: string): number {
    const length = response.length;
    const hasGoodLength = length > 50 && length < 5000;
    const hasStructure = response.includes('\n') || response.includes('.');

    if (hasGoodLength && hasStructure) return 0.85;
    if (hasGoodLength) return 0.75;
    return 0.6;
  }
}
