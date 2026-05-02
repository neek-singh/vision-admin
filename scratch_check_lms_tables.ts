import { createServerSupabaseClient } from "./lib/supabase-server";

async function checkSchema() {
  const supabase = await createServerSupabaseClient();
  
  // Try to query common LMS tables
  const tables = [
    'courses', 
    'lessons', 
    'lectures', 
    'notes', 
    'study_materials', 
    'video_lectures',
    'modules',
    'chapters'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table '${table}' exists and has ${data} rows.`);
    } else {
      // console.log(`Table '${table}' not found or error: ${error.message}`);
    }
  }
}

checkSchema();
