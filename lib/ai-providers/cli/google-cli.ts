/**
 * Google Gemini CLI Provider - Uses Gemini subscription via OAuth
 *
 * This provider uses Google OAuth authentication to access Gemini
 * with the user's Gemini Advanced subscription.
 *
 * Requirements:
 * - Google Cloud SDK installed (`gcloud`)
 * - User authenticated (`gcloud auth login` with Gemini Advanced account)
 * - OR Google API credentials in environment
 *
 * Usage: For Sub Pro/Max tiers that want to use Gemini subscription
 *
 * Note: Unlike Claude Code and Codex which have dedicated subscription CLIs,
 * Gemini Advanced requires OAuth token authentication through the API.
 * We use `gcloud auth print-access-token` to get OAuth tokens.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ModelResponse, ModelConfig } from '@/types/consensus';
import { AIProvider } from '../types';

const execAsync = promisify(exec);

// Models available via Gemini (subscription)
const GEMINI_CLI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

// Gemini API endpoint for OAuth-based access
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GoogleCLIProvider implements AIProvider {
  name = 'Gemini (Subscription)';
  models = GEMINI_CLI_MODELS;

  /**
   * Check if Google OAuth is available
   */
  isConfigured(): boolean {
    try {
      // Check if gcloud command exists
      const { execSync } = require('child_process');
      execSync('which gcloud', { encoding: 'utf-8', stdio: 'pipe' });
      return true;
    } catch {
      // Fall back to checking for API key
      return !!process.env.GOOGLE_API_KEY;
    }
  }

  /**
   * Get OAuth access token from gcloud
   */
  private async getOAuthToken(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('gcloud auth print-access-token', {
        encoding: 'utf-8',
        timeout: 10000,
      });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Query Gemini via OAuth or API key
   */
  async query(
    prompt: string,
    config: ModelConfig & { useTools?: boolean; maxSteps?: number }
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      console.log(`🔵 Gemini (Subscription): Querying ${config.model}...`);

      // Try OAuth first, fall back to API key
      const oauthToken = await this.getOAuthToken();
      const apiKey = process.env.GOOGLE_API_KEY;

      if (!oauthToken && !apiKey) {
        throw new Error(
          'Google authentication not configured. Run `gcloud auth login` or set GOOGLE_API_KEY.'
        );
      }

      // Build request
      const model = config.model || 'gemini-2.0-flash';
      const url = `${GEMINI_API_URL}/${model}:generateContent`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Use OAuth if available (subscription), otherwise API key
      if (oauthToken) {
        headers['Authorization'] = `Bearer ${oauthToken}`;
        console.log(`🔵 Using OAuth token (Gemini Advanced subscription)`);
      } else {
        // API key goes in query string
        console.log(`🔵 Using API key (pay-as-you-go)`);
      }

      const requestUrl = oauthToken ? url : `${url}?key=${apiKey}`;

      const body = JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 1000,
        },
      });

      // Make API request
      let response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body,
      });

      // If OAuth fails with scope error, fall back to API key
      if (!response.ok && oauthToken && apiKey) {
        const errorText = await response.text();
        if (response.status === 403 && errorText.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
          console.log(`⚠️ OAuth scope insufficient, falling back to API key`);
          // Retry with API key instead
          const apiKeyUrl = `${url}?key=${apiKey}`;
          const apiKeyHeaders = { 'Content-Type': 'application/json' };
          response = await fetch(apiKeyUrl, {
            method: 'POST',
            headers: apiKeyHeaders,
            body,
          });
        }
      }

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Extract text from Gemini response
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log(`✅ Gemini (Subscription): Response received in ${responseTime}ms`);
      console.log(
        `   Response length: ${responseText.length} chars ${oauthToken ? '(subscription - no charge)' : '(API key - pay-per-use)'}`
      );

      return {
        id: `gemini-cli-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: responseText,
        confidence: this.calculateConfidence(responseText),
        responseTime,
        tokens: {
          prompt: data.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4),
          completion:
            data.usageMetadata?.candidatesTokenCount ||
            Math.ceil(responseText.length / 4),
          total:
            data.usageMetadata?.totalTokenCount ||
            Math.ceil((prompt.length + responseText.length) / 4),
        },
        timestamp: new Date(),
        toolCalls: undefined,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('❌ Gemini error:', errorMessage);

      return {
        id: `gemini-cli-error-${Date.now()}`,
        provider: 'google',
        model: config.model,
        response: '',
        confidence: 0,
        responseTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        timestamp: new Date(),
        error: `Gemini Error: ${errorMessage}`,
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
