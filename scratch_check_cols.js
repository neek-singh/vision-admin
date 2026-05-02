
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    // Try to insert a dummy record and see the error or columns
    const { error } = await supabase.from('enrollments').insert({}).select();
    console.log("Insert error (to see columns):", error);
}

checkCols();
