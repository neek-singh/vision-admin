import { createServerSupabaseClient } from "./lib/supabase-server";

async function listTables() {
  const supabase = await createServerSupabaseClient();
  // We can't directly list tables with Supabase client easily, but we can try to query common ones or use RPC if defined.
  // Instead, let's try to query 'courses' and 'lectures' which are common in LMS.
  
  const tables = ['students', 'admissions', 'courses', 'lectures', 'notes', 'content'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}' error:`, error.message);
    } else {
      console.log(`Table '${table}' exists. Count:`, data?.length);
    }
  }
}

listTables();
