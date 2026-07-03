const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPasswords() {
  const { data, error } = await supabase.from('students').select('student_id, name, phone').limit(5);
  if (data) {
    console.log("Students details:");
    data.forEach(s => {
      const nameParts = (s.name || "").trim().split(' ');
      const firstName = nameParts[0]?.toLowerCase();
      const phoneStr = (s.phone || "").toString().trim();
      const last4 = phoneStr.slice(-4);
      console.log(`Student ID: ${s.student_id}, Name: ${s.name}, Phone: ${s.phone}, Expected Password: ${firstName}@${last4}`);
    });
  }
}

checkPasswords();
