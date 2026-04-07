import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/utils/supabase/config";

export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
