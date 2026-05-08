
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMoreTypes() {
  const { data } = await supabase.from('lessons').select('type, lesson_type').limit(100);
  if (data) {
    const types = new Set(data.map(d => d.type));
    const lTypes = new Set(data.map(d => d.lesson_type));
    console.log("Unique types:", Array.from(types));
    console.log("Unique lesson_types:", Array.from(lTypes));
  }
}

checkMoreTypes();
