const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listStudents() {
  const { data, error } = await supabase.from('students').select('student_id, name, status').limit(5);
  if (error) {
    console.error("Error:", error.message);
  } else if (data) {
    console.log("Students:", JSON.stringify(data, null, 2));
  }
}

listStudents();
