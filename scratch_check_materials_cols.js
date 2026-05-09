const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('materials').select('*').limit(1);
  if (error) {
    console.error("Error fetching materials:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'materials' table:", Object.keys(data[0]));
  } else {
    console.log("Materials table is empty.");
  }
}

checkColumns();
