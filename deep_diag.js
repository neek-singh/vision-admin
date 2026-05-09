
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://upsgoqluovwzijtgmlhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4'
);

async function deepDiagnostics() {
  const studentId = '04be3618-b2a1-4235-9686-2a4066986420'; // Mannu Uikey
  const courseId = '197f7c89-e410-4768-8b49-567b4b4e3e9e';
  
  console.log('--- DIAGNOSTICS ---');
  
  const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
  console.log('Student Batch:', student?.batch);
  
  const { data: enrollments } = await supabase.from('enrollments').select('*').eq('student_id', studentId);
  console.log('Enrollments:', JSON.stringify(enrollments, null, 2));
  
  const { data: schedules } = await supabase.from('schedules').select('*').eq('course_id', courseId);
  console.log('Schedules count:', schedules?.length);
  schedules?.forEach(s => {
    console.log(`- Sched: "${s.title}" | Batch: "${s.batch}" | Date: ${s.date} ${s.start_time}`);
  });
  
  const { data: tests } = await supabase.from('tests').select('*').eq('course_id', courseId);
  console.log('Tests count:', tests?.length);
  tests?.forEach(t => {
    console.log(`- Test: "${t.title}" | Published: ${t.is_published}`);
  });
  
  const { data: materials } = await supabase.from('materials').select('*').eq('course_id', courseId);
  console.log('Materials count:', materials?.length);
  materials?.forEach(m => {
    console.log(`- Material: "${m.title}" | Published: ${m.is_published}`);
  });
}

deepDiagnostics();
