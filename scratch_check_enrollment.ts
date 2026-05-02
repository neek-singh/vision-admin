
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Note: anon key might not be enough for schema, but let's try RPC or query

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking enrollments table...");
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching enrollments:", error);
  } else {
    console.log("Enrollment sample data:", data);
  }

  const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'enrollments' });
  if (colError) {
      // Fallback: try to see if student_id is UUID or text
      console.log("RPC failed, checking columns via sample data if possible...");
  } else {
      console.log("Columns:", cols);
  }
}

checkSchema();
