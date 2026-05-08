
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log("Checking columns for 'lessons' table...");
  const { data, error } = await supabase.from('lessons').select('*').limit(1);
  if (error) {
    console.error("Error fetching from lessons:", error.message);
  } else if (data && data.length > 0) {
    console.log("Existing columns:", Object.keys(data[0]));
  } else {
    console.log("Table is empty. Cannot determine columns via select *.");
  }
}

checkColumns();
