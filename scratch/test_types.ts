
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTypes() {
  const types = ['text', 'article', 'document', 'quiz', 'pdf', 'assignment'];
  for (const t of types) {
    const { error } = await supabase.from('lessons').insert({ 
      title: 'Test Type ' + t, 
      type: t,
      module_id: '8fe0de54-4779-4b4b-bff5-9a5e77509e07' // Use existing module ID
    });
    if (error) {
      console.log(`Type '${t}' failed: ${error.message}`);
    } else {
      console.log(`Type '${t}' is ALLOWED!`);
      // Clean up
      await supabase.from('lessons').delete().eq('title', 'Test Type ' + t);
    }
  }
}

testTypes();
