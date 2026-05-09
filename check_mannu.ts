
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkStudentBatch() {
  // Find Mannu Uikey
  const { data: students } = await supabase
    .from('students')
    .select('id, name, batch')
    .ilike('name', '%Mannu%');
  
  console.log('--- STUDENTS ---');
  console.log(students);

  if (students && students.length > 0) {
    const studentId = students[0].id;
    
    // Check enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, batch')
      .eq('student_id', studentId);
    
    console.log('--- ENROLLMENTS ---');
    console.log(enrollments);

    // Check schedules for these courses
    if (enrollments && enrollments.length > 0) {
      const courseIds = enrollments.map(e => e.course_id);
      const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .in('course_id', courseIds);
      
      console.log('--- SCHEDULES ---');
      schedules?.forEach(s => {
        console.log(`Title: ${s.title}, Batch: ${s.batch}, Date: ${s.date}`);
      });
    }
  }
}

checkStudentBatch();
