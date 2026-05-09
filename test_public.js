
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://upsgoqluovwzijtgmlhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4'
);

async function testPublicAccess() {
  console.log('Testing public access to tests and materials...');
  
  const { data: tests, error: testErr } = await supabase.from('tests').select('*').limit(1);
  console.log('Tests access:', tests ? `Success (${tests.length} items)` : `Failed: ${testErr?.message}`);
  
  const { data: materials, error: matErr } = await supabase.from('materials').select('*').limit(1);
  console.log('Materials access:', materials ? `Success (${materials.length} items)` : `Failed: ${matErr?.message}`);
}

testPublicAccess();
