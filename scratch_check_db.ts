
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchedules() {
  const { data: schedules, error } = await supabase.from('schedules').select('*').limit(10);
  if (error) {
    console.error(error);
    return;
  }
  console.log('--- SCHEDULES ---');
  schedules.forEach(s => {
    console.log(`ID: ${s.id}, Type: ${s.type}, Title: ${s.title}, Course: ${s.course_id}, Batch: ${s.batch}`);
  });
}

checkSchedules();
