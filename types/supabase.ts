/** Represents JSON-compatible values that can be stored in the database */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Main database interface containing all public schema definitions */
export interface Database {
  public: {
    Tables: {
      /** Defines system roles and their hierarchy */
      roles: {
        Row: {
          /** Unique identifier for the role */
          id: string
          /** Role name (admin, staff, user, guest) */
          name: string
          /** Optional description of the role's purpose */
          description: string | null
          /** Numeric level determining role hierarchy (higher = more privileges) */
          level: number
          /** Timestamp of role creation */
          created_at: string | null
          /** Timestamp of last role update */
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          level: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          level?: number
          created_at?: string | null
          updated_at?: string | null
        }
      }
      /** Defines permissions associated with roles */
      role_permissions: {
        Row: {
          /** Unique identifier for the permission */
          id: string
          /** Reference to the associated role */
          role_id: string
          /** Resource type the permission applies to */
          resource: string
          /** Allowed action on the resource */
          action: string
          /** Optional JSON conditions for fine-grained control */
          conditions: Json | null
          /** Timestamp of permission creation */
          created_at: string | null
        }
        Insert: {
          id?: string
          role_id: string
          resource: string
          action: string
          conditions?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          role_id?: string
          resource?: string
          action?: string
          conditions?: Json | null
          created_at?: string | null
        }
      }
      /** Tracks role assignment history */
      role_transitions: {
        Row: {
          /** Unique identifier for the transition */
          id: string
          /** User whose role changed */
          user_id: string
          /** Previous role, if any */
          old_role_id: string | null
          /** New assigned role */
          new_role_id: string
          /** User who made the change */
          changed_by: string
          /** Optional reason for the change */
          reason: string | null
          /** When the transition occurred */
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          old_role_id?: string | null
          new_role_id: string
          changed_by: string
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          old_role_id?: string | null
          new_role_id?: string
          changed_by?: string
          reason?: string | null
          created_at?: string | null
        }
      }
      /** Maps users to their assigned roles */
      user_roles: {
        Row: {
          /** Unique identifier for the role assignment */
          id: string
          /** User receiving the role */
          user_id: string
          /** Role being assigned */
          role_id: string
          /** User who assigned the role */
          assigned_by: string | null
          /** When the role was assigned */
          assigned_at: string | null
          /** Optional role expiration date */
          expires_at: string | null
          /** Whether the role is currently active */
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string | null
          expires_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          assigned_by?: string | null
          assigned_at?: string | null
          expires_at?: string | null
          is_active?: boolean
        }
      }
      /** Stores two-factor authentication settings */
      two_factor_auth: {
        Row: {
          /** Unique identifier for the 2FA record */
          id: string
          /** Associated user */
          user_id: string
          /** Encrypted 2FA secret */
          secret: string
          /** List of backup codes */
          backup_codes: string[]
          /** Whether 2FA is currently enabled */
          is_enabled: boolean
          /** Last time 2FA was used */
          last_used_at: string | null
          /** When 2FA was set up */
          created_at: string | null
          /** Last configuration update */
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          secret: string
          backup_codes: string[]
          is_enabled?: boolean
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          secret?: string
          backup_codes?: string[]
          is_enabled?: boolean
          last_used_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      /** Stores daily Bible verses */
      bible_verses: {
        Row: {
          id: string
          serial_number: string
          verse_text: string
          created_at: string
        }
        Insert: {
          id?: string
          serial_number: string
          verse_text: string
          created_at?: string
        }
        Update: {
          id?: string
          serial_number?: string
          verse_text?: string
          created_at?: string
        }
      }
    }
  }
}