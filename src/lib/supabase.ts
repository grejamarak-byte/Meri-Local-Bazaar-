import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable getter supporting Vite (import.meta.env) and Node/Vercel (process.env)
export function getEnvVar(key: string, fallback: string = ''): string {
  try {
    // 1. Check Vite import.meta.env
    const metaAny = import.meta as any;
    if (
      typeof metaAny !== 'undefined' &&
      metaAny?.env &&
      typeof metaAny.env[key] === 'string' &&
      metaAny.env[key]
    ) {
      return metaAny.env[key];
    }
  } catch (_) {
    // Ignore in non-Vite runtimes
  }

  try {
    // 2. Check Node/Vercel process.env
    if (
      typeof process !== 'undefined' &&
      process.env &&
      typeof process.env[key] === 'string' &&
      process.env[key]
    ) {
      return process.env[key]!;
    }
  } catch (_) {
    // Ignore in browser environments without process shim
  }

  return fallback;
}

export function cleanString(val: string | undefined): string {
  if (!val) return '';
  let cleaned = val.trim();
  // Strip quotes if they were passed literally in the env string
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function normalizeSupabaseUrl(
  rawUrl: string | undefined,
  defaultUrl: string = 'https://qljyucqxgpzfehqwggbv.supabase.co'
): string {
  const cleaned = cleanString(rawUrl);
  if (!cleaned) return defaultUrl;

  let candidate = cleaned;
  // If only a project reference ID was provided (e.g. qljyucqxgpzfehqwggbv)
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    if (/^[a-zA-Z0-9_-]+$/.test(candidate)) {
      candidate = `https://${candidate}.supabase.co`;
    } else {
      candidate = `https://${candidate}`;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch (e) {
    console.warn('URL parsing failed for:', candidate, e);
  }

  return defaultUrl;
}

const rawUrl = getEnvVar('VITE_SUPABASE_URL', 'https://qljyucqxgpzfehqwggbv.supabase.co');
const rawKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9'
);

export const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY =
  cleanString(rawKey) || 'sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9';

export interface SupabaseInitState {
  client: SupabaseClient | null;
  error: string | null;
  isConfigured: boolean;
}

export function initSupabase(): SupabaseInitState {
  try {
    const validUrl = normalizeSupabaseUrl(SUPABASE_URL);
    const validKey =
      cleanString(SUPABASE_ANON_KEY) || 'sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9';

    const client = createClient(validUrl, validKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return {
      client,
      error: null,
      isConfigured: true,
    };
  } catch (err: any) {
    console.error('Supabase Initialization Exception:', err);
    return {
      client: null,
      error: err?.message || 'Failed to initialize Supabase client safely.',
      isConfigured: false,
    };
  }
}

// Export singleton instance safely
export const supabaseState = initSupabase();
export const supabase = supabaseState.client;

/**
 * Direct Supabase update query on 'profiles' table to activate user monthly plan.
 * Bypasses local state delays and session caching.
 */
export async function updateUserPlanActiveDirect(params: {
  userId?: string;
  email?: string;
  phone?: string;
  planTitle?: string;
  planStatus?: 'active' | 'inactive';
  isPro?: boolean;
  durationDays?: number;
  daysValid?: number;
  additionalProfileFields?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client not initialized' };

  const days = params.daysValid || params.durationDays || 30;
  const expiryDate = new Date(Date.now() + days * 86400000).toISOString();
  const isProActive = params.isPro !== undefined ? params.isPro : true;
  const statusStr = params.planStatus || (isProActive ? 'active' : 'inactive');

  const updates: Record<string, any> = {
    plan_status: statusStr,
    pro_status: statusStr,
    is_pro: isProActive,
    ...(isProActive ? { is_approved_by_admin: true } : {}),
    plan_title: params.planTitle || (isProActive ? 'Monthly PRO Plan' : 'Free Plan'),
    plan_expiry_date: isProActive ? expiryDate : null,
    pro_expiry: isProActive ? expiryDate : null,
    updated_at: new Date().toISOString(),
    ...(params.additionalProfileFields || {}),
  };

  try {
    let query;
    if (params.userId) {
      query = supabase.from('profiles').update(updates).eq('id', params.userId);
    } else if (params.email) {
      query = supabase.from('profiles').update(updates).eq('email', params.email);
    } else if (params.phone) {
      query = supabase.from('profiles').update(updates).eq('phone', params.phone);
    } else {
      return { success: false, error: 'No user identifier (userId, email, or phone) provided' };
    }

    const { error } = await query;
    if (error) {
      console.error('Direct Supabase plan activation error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Direct plan activation exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Direct Supabase check against 'profiles' table to get fresh live plan status.
 * Bypasses session caching and local state delays.
 */
export async function checkUserPlanStatusDirect(params: {
  userId?: string;
  email?: string;
  phone?: string;
}): Promise<{
  isActive: boolean;
  planStatus: 'active' | 'inactive';
  isPro: boolean;
  profile?: any;
}> {
  if (!supabase) {
    return { isActive: false, planStatus: 'inactive', isPro: false, profile: null };
  }

  try {
    let query = supabase.from('profiles').select('*');
    if (params.userId) {
      query = query.eq('id', params.userId);
    } else if (params.email) {
      query = query.eq('email', params.email);
    } else if (params.phone) {
      query = query.eq('phone', params.phone);
    } else {
      return { isActive: false, planStatus: 'inactive', isPro: false, profile: null };
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return { isActive: false, planStatus: 'inactive', isPro: false, profile: null };
    }

    const isExpired = data.plan_expiry_date && new Date(data.plan_expiry_date).getTime() < Date.now();
    const isActive = !isExpired && (data.plan_status === 'active' || data.pro_status === 'active' || data.is_pro === true);

    return {
      isActive: !!isActive,
      planStatus: isActive ? 'active' : 'inactive',
      isPro: !!isActive,
      profile: data,
    };
  } catch (e) {
    console.error('Direct Supabase checkUserPlanStatusDirect error:', e);
    return { isActive: false, planStatus: 'inactive', isPro: false, profile: null };
  }
}

