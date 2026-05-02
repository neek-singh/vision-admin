import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .limit(1);

  if (error) {
    console.error("Error fetching students:", error);
  } else if (data && data.length > 0) {
    console.log("Columns found in students table:", Object.keys(data[0]));
  } else {
    console.log("No students found, but query succeeded.");
  }
}

checkSchema();
