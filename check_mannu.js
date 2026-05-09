
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://upsgoqluovwzijtgmlhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4'
);

async function checkStudentBatch() {
  const { data: students } = await supabase
    .from('students')
    .select('id, name, batch')
    .ilike('name', '%Mannu%');
  
  console.log('--- STUDENTS ---');
  console.log(JSON.stringify(students, null, 2));

  if (students && students.length > 0) {
    const studentId = students[0].id;
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, batch')
      .eq('student_id', studentId);
    
    console.log('--- ENROLLMENTS ---');
    console.log(JSON.stringify(enrollments, null, 2));

    if (enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map(e => e.course_id);
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .in('course_id', courseIds);
      
      console.log('--- SCHEDULES ---');
      schedules?.forEach(s => {
        console.log(`Title: ${s.title}, Batch: [${s.batch}], Date: ${s.date}`);
      });
    }
  }
}

checkStudentBatch().catch(console.error);
