import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase client instance with proper database typing */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

/** Get a daily Bible verse that hasn't been shown before */
export async function getDailyVerse(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_daily_verse')
      .single();

    if (error) {
      console.error('Supabase request failed:', {
        url: error.message,
        status: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    return data?.verse_text || null;
  } catch (error) {
    console.error('Error fetching daily verse:', error);
    // Return null instead of throwing to handle the error gracefully
    return null;
  }
}

/** Error types for database operations */
export type DatabaseError = {
  code: string;
  message: string;
  details?: string;
  hint?: string;
};

/** Response type for connection verification */
export type ConnectionResponse = {
  success: boolean;
  error?: DatabaseError | string;
  data?: unknown;
};

/**
 * Gets the current authenticated user's ID
 * @returns Promise resolving to user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Verifies the database connection and authentication status
 * @returns Promise resolving to connection status and any errors
 */
export async function verifyConnection(): Promise<ConnectionResponse> {
  try {
    // Test database connection with a simple query
    const { error: dbError } = await supabase
      .from('roles')
      .select('count')
      .limit(1)
      .single();

    if (dbError) {
      return {
        success: false,
        error: {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        }
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Database connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}