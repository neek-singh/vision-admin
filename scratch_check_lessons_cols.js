const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('lessons').select('*').limit(1);
  if (error) {
    console.error("Error fetching lessons:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns in 'lessons' table:", Object.keys(data[0]));
  } else {
    console.log("Lessons table is empty.");
  }
}

checkColumns();
