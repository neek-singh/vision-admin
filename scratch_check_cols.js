
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    console.log("Checking students table...");
    const { data: students, error: sErr } = await supabase.from('students').select('*').limit(1);
    if (sErr) console.error(sErr);
    else if (students && students.length > 0) console.log("Students cols:", Object.keys(students[0]));
    else console.log("Students table empty");

    console.log("\nChecking enrollments table...");
    const { data: enrollments, error: eErr } = await supabase.from('enrollments').select('*').limit(1);
    if (eErr) console.error(eErr);
    else if (enrollments && enrollments.length > 0) console.log("Enrollments cols:", Object.keys(enrollments[0]));
    else console.log("Enrollments table empty");
}

checkCols();
