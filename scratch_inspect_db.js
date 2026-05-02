
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting database...");

    try {
        const { data: students, error: sError } = await supabase.from('students').select('*').limit(1);
        if (sError) console.error("Students error:", sError);
        else console.log("Student sample:", students[0]);

        const { data: enrollments, error: eError } = await supabase.from('enrollments').select('*').limit(1);
        if (eError) console.error("Enrollments error:", eError);
        else console.log("Enrollment sample:", enrollments[0]);

        const { data: amarjeet } = await supabase.from('students').select('*').ilike('name', '%amarjeet%');
        console.log("Amarjeet data:", amarjeet);

        if (amarjeet && amarjeet.length > 0) {
            const sid = amarjeet[0].id;
            const s_vid = amarjeet[0].student_id;
            console.log(`Checking enrollments for UUID: ${sid} and StringID: ${s_vid}`);

            const { data: amEnroll } = await supabase.from('enrollments').select('*').eq('student_id', sid);
            console.log("Amarjeet Enrollments (by UUID):", amEnroll);

            const { data: amEnrollStr } = await supabase.from('enrollments').select('*').eq('student_id', s_vid);
            console.log("Amarjeet Enrollments (by String ID):", amEnrollStr);
        }
    } catch (e) {
        console.error("Script error:", e);
    }
}

inspect();
