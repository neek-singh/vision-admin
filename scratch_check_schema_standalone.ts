import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // Common LMS table names
  const tables = [
    'courses', 
    'lessons', 
    'lectures', 
    'notes', 
    'study_materials', 
    'video_lectures',
    'modules',
    'chapters',
    'enrollments',
    'lms_content'
  ];

  console.log("Checking tables...");
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (!error) {
        console.log(`Table '${table}' exists. Rows: ${count}`);
      } else {
        // console.log(`Table '${table}' error: ${error.message}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

checkSchema();
