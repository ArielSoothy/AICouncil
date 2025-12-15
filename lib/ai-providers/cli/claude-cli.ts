/**
 * Claude Code CLI Provider - Uses Claude subscription via CLI
 *
 * This provider shells out to the Claude Code CLI which uses
 * the user's Claude Pro/Max subscription credentials.
 *
 * Requirements:
 * - Claude Code CLI installed (`npx @anthropic-ai/claude-code`)
 * - User authenticated with Claude subscription
 *
 * Usage: For Sub Pro/Max tiers that want to use subscription instead of API keys
 */

import { spawn } from 'child_process';
import { ModelResponse, ModelConfig } from '@/types/consensus';
import { AIProvider } from '../types';

// Models available via Claude Code CLI subscription
const CLAUDE_CLI_MODELS = [
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-5-20251101',
  'claude-haiku-4-5-20251001',
  'sonnet', // Alias for latest sonnet
  'opus',   // Alias for latest opus
  'haiku',  // Alias for latest haiku
];

/**
 * Run Claude CLI with prompt via stdin (avoids shell escaping issues)
 * Returns a promise with stdout/stderr
 */
function runClaudeCliWithStdin(
  prompt: string,
  model: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      '@anthropic-ai/claude-code',
      '-p', '-',  // Read prompt from stdin
      '--output-format', 'json',
      // REMOVED: '--max-budget-usd', '5' - This is for API mode only!
      // Subscription mode has unlimited usage, no budget needed
    ];

    if (model) {
      args.push('--model', model);
    }

    // CRITICAL: For subscription mode, we must NOT pass ANTHROPIC_API_KEY
    // If API key is present, CLI uses API mode (credits). Without it, uses subscription.
    const envWithoutApiKey = { ...process.env };
    delete envWithoutApiKey.ANTHROPIC_API_KEY;

    const child = spawn('npx', args, {
      shell: '/bin/zsh',
      timeout: 120000,  // 2 minute timeout
      env: envWithoutApiKey, // Subscription mode - no API key!
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
      // Filter out Node.js warnings from stderr (these aren't real errors)
      const isJustWarning = stderr && (
        stderr.includes('Warning:') ||
        stderr.includes('DeprecationWarning') ||
        stderr.includes('NODE_TLS_REJECT_UNAUTHORIZED')
      );

      if (code !== 0 && !stdout && !isJustWarning) {
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

interface ClaudeCLIResponse {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  error?: string;
  total_cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export class ClaudeCLIProvider implements AIProvider {
  name = 'Claude Code (Subscription)';
  models = CLAUDE_CLI_MODELS;

  /**
   * Check if Claude Code CLI is available and authenticated
   */
  isConfigured(): boolean {
    try {
      // Check if npx can run claude-code (more reliable than 'which claude' alias)
      const { execSync } = require('child_process');
      const result = execSync('npx @anthropic-ai/claude-code --version', {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
        shell: '/bin/zsh', // Use zsh to get proper environment
      });
      console.log('✅ Claude CLI isConfigured: true, version:', result.trim());
      return true;
    } catch (error) {
      console.log('❌ Claude CLI isConfigured: false, error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Query Claude via CLI using subscription
   */
  async query(
    prompt: string,
    config: ModelConfig & { useTools?: boolean; maxSteps?: number }
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      console.log(`🔷 Claude CLI (Subscription): Querying ${config.model}...`);
      console.log(`🔷 Claude CLI: Using stdin for prompt (${prompt.length} chars)`);

      // Use stdin-based execution to avoid shell escaping issues with complex prompts
      const { stdout, stderr } = await runClaudeCliWithStdin(prompt, config.model);

      const responseTime = Date.now() - startTime;

      // Check if stderr contains actual errors or just warnings
      const isJustWarning = stderr && (
        stderr.includes('Warning:') ||
        stderr.includes('DeprecationWarning') ||
        stderr.includes('NODE_TLS_REJECT_UNAUTHORIZED')
      );

      // Log stderr if it contains real errors (not just warnings)
      if (stderr && !isJustWarning) {
        console.log('🔷 Claude CLI stderr:', stderr);
      }

      if (stderr && !stdout && !isJustWarning) {
        console.error('❌ Claude CLI stderr (no stdout):', stderr);
        throw new Error(stderr);
      }

      // Parse JSON response
      let response: ClaudeCLIResponse;
      try {
        response = JSON.parse(stdout);
      } catch {
        // If not JSON, treat as plain text response
        response = { result: stdout.trim() };
      }

      // 🔍 DEBUG: Log full response for troubleshooting
      console.log('🔷 Claude CLI raw response:', JSON.stringify(response, null, 2));

      // Check for error in response
      if (response.is_error || response.type === 'error') {
        // When is_error=true and type=result, the error message is in the 'result' field
        const errorMessage = response.error || response.result || `Claude CLI returned an error (is_error=${response.is_error}, type=${response.type})`;
        console.error('❌ Claude CLI error response:', {
          is_error: response.is_error,
          type: response.type,
          error: response.error,
          result: response.result,
          subtype: response.subtype,
        });
        throw new Error(errorMessage);
      }

      const responseText = response.result || stdout.trim();

      // Extract token counts from response
      const inputTokens = response.usage?.input_tokens ||
        response.usage?.cache_creation_input_tokens ||
        Math.ceil(prompt.length / 4);
      const outputTokens = response.usage?.output_tokens || Math.ceil(responseText.length / 4);

      console.log(`✅ Claude CLI (Subscription): Response received in ${responseTime}ms`);
      console.log(`   Cost: $${response.total_cost_usd?.toFixed(4) || 'N/A'} (subscription - included in plan)`);
      console.log(`   Tokens: ${inputTokens} input, ${outputTokens} output`);

      return {
        id: `claude-cli-${Date.now()}`,
        provider: 'anthropic',
        model: config.model,
        response: responseText,
        confidence: this.calculateConfidence(responseText),
        responseTime,
        tokens: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens,
        },
        timestamp: new Date(),
        // CLI tool calls would require MCP integration
        toolCalls: undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('❌ Claude CLI error:', errorMessage);

      // Provide helpful error message for common issues
      let userFriendlyError = `Claude CLI Error: ${errorMessage}`;

      if (errorMessage.includes('Credit balance is too low') || errorMessage.includes('credit')) {
        userFriendlyError =
          `Claude CLI Error: Credit balance too low. ` +
          `This means you're using API credits instead of your Claude subscription. ` +
          `To fix: Run 'npx @anthropic-ai/claude-code setup-token' in terminal to switch to subscription mode.`;
        console.error('⚠️ User needs to run: npx @anthropic-ai/claude-code setup-token');
      }

      return {
        id: `claude-cli-error-${Date.now()}`,
        provider: 'anthropic',
        model: config.model,
        response: '',
        confidence: 0,
        responseTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        timestamp: new Date(),
        error: userFriendlyError,
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
