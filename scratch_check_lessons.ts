import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLessons() {
  const { data, error } = await supabase.from('lessons').select('*').limit(1);
  if (error) {
    console.log("Error fetching lessons:", error.message);
  } else if (data && data.length > 0) {
    console.log("Lessons table exists. Columns:", Object.keys(data[0]));
  } else {
    console.log("Lessons table exists but is empty.");
  }
}

checkLessons();
