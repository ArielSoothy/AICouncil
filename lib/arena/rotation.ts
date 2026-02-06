/**
 * Arena Mode Rotation System
 *
 * Manages daily rotation order for fair model selection.
 * First pick rotates daily so no model has permanent advantage.
 *
 * Example rotation:
 * Day 1: [Claude, GPT-4, Gemini, Llama]
 * Day 2: [GPT-4, Gemini, Llama, Claude]
 * Day 3: [Gemini, Llama, Claude, GPT-4]
 * Day 4: [Llama, Claude, GPT-4, Gemini]
 * Day 5: [Claude, GPT-4, Gemini, Llama] (cycle repeats)
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface RotationRecord {
  id: string;
  date: string;
  model_order: string[];
  created_at: string;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Rotate array by one position (first element moves to end)
 * [A, B, C, D] → [B, C, D, A]
 */
function rotateArray<T>(arr: T[]): T[] {
  if (arr.length <= 1) return arr;
  return [...arr.slice(1), arr[0]];
}

/**
 * Get or create today's rotation order
 * If no rotation exists for today, creates one based on yesterday's
 * @param enabledModels - Array of model IDs that are enabled
 * @returns Ordered array of model IDs for today
 */
export async function getTodayRotation(enabledModels: string[]): Promise<string[]> {
  if (enabledModels.length === 0) {
    throw new Error('No models enabled for arena');
  }

  const supabase = getSupabaseAdmin();
  const today = getTodayDate();

  // Check if we already have today's rotation
  const { data: todayRotation, error: todayError } = await supabase
    .from('arena_rotation')
    .select('*')
    .eq('date', today)
    .single();

  if (todayError && todayError.code !== 'PGRST116') {
    console.error('❌ Failed to get today rotation:', todayError);
    throw todayError;
  }

  // If today's rotation exists, use it (but filter to only enabled models)
  if (todayRotation) {
    const existingOrder = todayRotation.model_order as string[];
    // Filter to only include currently enabled models, maintain order
    const filteredOrder = existingOrder.filter(m => enabledModels.includes(m));
    // Add any new models that weren't in the rotation
    const newModels = enabledModels.filter(m => !existingOrder.includes(m));
    const finalOrder = [...filteredOrder, ...newModels];

    console.log(`📋 Today's rotation (${today}): ${finalOrder.join(' → ')}`);
    return finalOrder;
  }

  // No rotation for today, get yesterday's and rotate
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: yesterdayRotation } = await supabase
    .from('arena_rotation')
    .select('*')
    .eq('date', yesterdayStr)
    .single();

  let newOrder: string[];

  if (yesterdayRotation) {
    // Rotate yesterday's order
    const yesterdayOrder = yesterdayRotation.model_order as string[];
    // Filter to only enabled models first
    const filteredYesterday = yesterdayOrder.filter(m => enabledModels.includes(m));
    // Add any new models
    const newModels = enabledModels.filter(m => !yesterdayOrder.includes(m));
    // Rotate and add new models at end
    newOrder = [...rotateArray(filteredYesterday), ...newModels];
  } else {
    // No previous rotation, use enabled models as-is
    newOrder = [...enabledModels];
  }

  // Save today's rotation
  const { error: insertError } = await supabase
    .from('arena_rotation')
    .insert({
      date: today,
      model_order: newOrder,
    });

  if (insertError) {
    console.error('❌ Failed to save rotation:', insertError);
    throw insertError;
  }

  console.log(`📋 Created today's rotation (${today}): ${newOrder.join(' → ')}`);
  return newOrder;
}

/**
 * Get rotation history for the last N days
 * @param days - Number of days to look back
 * @returns Array of rotation records
 */
export async function getRotationHistory(days: number = 7): Promise<RotationRecord[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('arena_rotation')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('❌ Failed to get rotation history:', error);
    throw error;
  }

  return (data || []) as RotationRecord[];
}

/**
 * Preview what tomorrow's rotation would be
 * (Does not save to database)
 * @param enabledModels - Current enabled models
 * @returns What tomorrow's order would be
 */
export async function previewNextRotation(enabledModels: string[]): Promise<string[]> {
  const todayOrder = await getTodayRotation(enabledModels);
  return rotateArray(todayOrder);
}

/**
 * Reset rotation for a specific date
 * (Admin function for manual corrections)
 * @param date - Date to reset (YYYY-MM-DD format)
 * @param newOrder - New model order
 */
export async function setRotation(date: string, newOrder: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Delete existing rotation for this date
  await supabase
    .from('arena_rotation')
    .delete()
    .eq('date', date);

  // Insert new rotation
  const { error } = await supabase
    .from('arena_rotation')
    .insert({
      date,
      model_order: newOrder,
    });

  if (error) {
    console.error('❌ Failed to set rotation:', error);
    throw error;
  }

  console.log(`📋 Set rotation for ${date}: ${newOrder.join(' → ')}`);
}

/**
 * Get the position (1-indexed) of a model in today's rotation
 * @param modelId - Model ID to check
 * @param enabledModels - Currently enabled models
 * @returns Position (1-indexed) or -1 if not found
 */
export async function getModelPosition(
  modelId: string,
  enabledModels: string[]
): Promise<number> {
  const order = await getTodayRotation(enabledModels);
  const index = order.indexOf(modelId);
  return index === -1 ? -1 : index + 1;
}
