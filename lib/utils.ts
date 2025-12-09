import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`
  }
  return `${(tokens / 1000).toFixed(1)}k tokens`
}

export function calculateConsensusScore(responses: string[]): number {
  if (responses.length < 2) return 1;
  
  // Simple similarity calculation based on response length and word overlap
  // In production, you'd use more sophisticated NLP techniques
  const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
  const lengthVariance = responses.reduce((sum, r) => sum + Math.pow(r.length - avgLength, 2), 0) / responses.length;
  const lengthScore = Math.max(0, 1 - (lengthVariance / (avgLength * avgLength)));
  
  // Word overlap score (simplified)
  const allWords: string[] = [];
  responses.forEach(r => {
    const words = r.toLowerCase().split(/\s+/);
    allWords.push(...words);
  });
  const uniqueWords = new Set(allWords);
  const overlapScore = 1 - (uniqueWords.size / allWords.length);
  
  return (lengthScore * 0.3 + overlapScore * 0.7);
}

export function generateConsensusId(): string {
  return `consensus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
