
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSample() {
  const { data, error } = await supabase.from('lessons').select('*').limit(1);
  if (data && data[0]) {
    console.log("Sample lesson data:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No data found in lessons table.");
  }
}

checkSample();
