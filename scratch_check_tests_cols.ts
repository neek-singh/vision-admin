import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('tests').select('*').limit(1);
  if (error) {
    console.error("Error fetching tests:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'tests' table:", Object.keys(data[0]));
  } else {
    // If table is empty, try to get schema via RPC or just assume common columns
    console.log("Tests table is empty. Trying to insert and rollback or just guessing...");
  }
}

checkColumns();
