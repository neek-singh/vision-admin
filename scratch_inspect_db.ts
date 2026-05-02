
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting database...");

    // Try to get students
    const { data: students, error: sError } = await supabase.from('students').select('*').limit(1);
    if (sError) console.error("Students error:", sError);
    else console.log("Student columns:", Object.keys(students[0] || {}));

    // Try to get enrollments
    const { data: enrollments, error: eError } = await supabase.from('enrollments').select('*').limit(1);
    if (eError) console.error("Enrollments error:", eError);
    else console.log("Enrollment columns:", Object.keys(enrollments[0] || {}));

    // Check specific student amarjeet
    const { data: amarjeet } = await supabase.from('students').select('*').ilike('name', '%amarjeet%');
    console.log("Amarjeet data:", amarjeet);

    if (amarjeet && amarjeet.length > 0) {
        const { data: amEnroll } = await supabase.from('enrollments').select('*').eq('student_id', amarjeet[0].id);
        console.log("Amarjeet Enrollments (by UUID):", amEnroll);

        const { data: amEnrollStr } = await supabase.from('enrollments').select('*').eq('student_id', amarjeet[0].student_id);
        console.log("Amarjeet Enrollments (by String ID):", amEnrollStr);
    }
}

inspect();
