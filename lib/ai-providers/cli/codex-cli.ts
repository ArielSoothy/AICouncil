/**
 * OpenAI Codex CLI Provider - Uses ChatGPT subscription via CLI
 *
 * This provider shells out to the Codex CLI which uses
 * the user's ChatGPT Plus/Pro subscription credentials.
 *
 * Requirements:
 * - Codex CLI installed (`npm install -g @openai/codex` or homebrew)
 * - User authenticated with ChatGPT subscription (`codex login`)
 *
 * Usage: For Sub Pro/Max tiers that want to use subscription instead of API keys
 *
 * IMPORTANT: ChatGPT subscription mode does NOT support specifying models!
 * The CLI uses its own default model (usually o4-mini or similar).
 * Do NOT pass -m flag when using ChatGPT subscription.
 */

import { spawn } from 'child_process';
import { ModelResponse, ModelConfig } from '@/types/consensus';
import { AIProvider } from '../types';

// Models available via Codex CLI (ChatGPT subscription)
// NOTE: ChatGPT subscription uses default model only - cannot specify!
// These are listed for reference but -m flag is NOT used
const CODEX_CLI_MODELS = [
  'codex-default',  // ChatGPT subscription uses default model
];

/**
 * Run Codex CLI with prompt via stdin (avoids shell escaping issues)
 * Returns a promise with stdout/stderr
 */
function runCodexCliWithStdin(
  prompt: string,
  model: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      'exec', '-',  // Read prompt from stdin
      '--json',
      '--skip-git-repo-check',
    ];

    // NOTE: Do NOT pass -m flag with ChatGPT subscription!
    // ChatGPT subscription mode uses default model only.
    // Passing specific models like gpt-4o causes:
    // "The 'gpt-4o' model is not supported when using Codex with a ChatGPT account."

    const child = spawn('/opt/homebrew/bin/codex', args, {
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

interface CodexEvent {
  type: string;
  message?: {
    content?: string;
    role?: string;
  };
  text?: string;
  [key: string]: unknown;
}

export class CodexCLIProvider implements AIProvider {
  name = 'Codex (Subscription)';
  models = CODEX_CLI_MODELS;

  /**
   * Check if Codex CLI is available and authenticated
   */
  isConfigured(): boolean {
    try {
      // Check if codex command exists at homebrew path
      const { execSync } = require('child_process');
      execSync('/opt/homebrew/bin/codex --version', {
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
   * Query OpenAI via Codex CLI using subscription
   */
  async query(
    prompt: string,
    config: ModelConfig & { useTools?: boolean; maxSteps?: number }
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      console.log(`🟢 Codex CLI (Subscription): Querying ${config.model}...`);
      console.log(`🟢 Codex CLI: Using stdin for prompt (${prompt.length} chars)`);

      // Use stdin-based execution to avoid shell escaping issues with complex prompts
      const { stdout, stderr } = await runCodexCliWithStdin(prompt, config.model);

      const responseTime = Date.now() - startTime;

      if (stderr && !stdout) {
        console.error('❌ Codex CLI stderr:', stderr);
        throw new Error(stderr);
      }

      // Parse JSONL output - each line may contain one or more JSON events
      // Codex sometimes outputs JSON followed by extra text, so we extract JSON carefully
      const lines = stdout.trim().split('\n').filter(Boolean);
      let responseText = '';
      let lastAssistantMessage = '';

      /**
       * Extract all JSON objects from a line (handles multiple JSON or JSON+text)
       */
      function extractJsonObjects(line: string): CodexEvent[] {
        const events: CodexEvent[] = [];
        let remaining = line.trim();

        while (remaining.length > 0) {
          // Find the start of a JSON object
          const startIdx = remaining.indexOf('{');
          if (startIdx === -1) break;

          // Find matching closing brace using bracket counting
          let depth = 0;
          let endIdx = -1;
          let inString = false;
          let escape = false;

          for (let i = startIdx; i < remaining.length; i++) {
            const char = remaining[i];

            if (escape) {
              escape = false;
              continue;
            }

            if (char === '\\' && inString) {
              escape = true;
              continue;
            }

            if (char === '"' && !escape) {
              inString = !inString;
              continue;
            }

            if (!inString) {
              if (char === '{') depth++;
              if (char === '}') {
                depth--;
                if (depth === 0) {
                  endIdx = i;
                  break;
                }
              }
            }
          }

          if (endIdx === -1) break;

          // Extract and parse the JSON object
          const jsonStr = remaining.substring(startIdx, endIdx + 1);
          try {
            const event = JSON.parse(jsonStr) as CodexEvent;
            events.push(event);
          } catch {
            // Invalid JSON, skip
          }

          // Move past this JSON object
          remaining = remaining.substring(endIdx + 1).trim();
        }

        return events;
      }

      for (const line of lines) {
        const events = extractJsonObjects(line);

        if (events.length === 0) {
          // No JSON found, treat as plain text
          responseText += line + '\n';
          continue;
        }

        for (const event of events) {
          // Look for assistant messages in the event stream
          if (event.type === 'message' && event.message?.role === 'assistant') {
            lastAssistantMessage = event.message.content || '';
          }

          // Also check for text output
          if (event.text) {
            responseText += event.text;
          }

          // Check for final message type
          if (event.type === 'agent_complete' || event.type === 'done') {
            // Use whatever text we've accumulated
            if (!responseText && lastAssistantMessage) {
              responseText = lastAssistantMessage;
            }
          }
        }
      }

      // Fallback to last assistant message if no text accumulated
      if (!responseText && lastAssistantMessage) {
        responseText = lastAssistantMessage;
      }

      // Final fallback - use entire stdout
      if (!responseText) {
        responseText = stdout.trim();
      }

      console.log(`✅ Codex CLI (Subscription): Response received in ${responseTime}ms`);
      console.log(`   Response length: ${responseText.length} chars (subscription - no charge)`);

      return {
        id: `codex-cli-${Date.now()}`,
        provider: 'openai',
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
        // Codex CLI tool calls would require parsing the event stream
        toolCalls: undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('❌ Codex CLI error:', errorMessage);

      return {
        id: `codex-cli-error-${Date.now()}`,
        provider: 'openai',
        model: config.model,
        response: '',
        confidence: 0,
        responseTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        timestamp: new Date(),
        error: `Codex CLI Error: ${errorMessage}`,
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
