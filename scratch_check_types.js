
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'enrollments' });
    if (error) {
        console.log("RPC failed, trying fallback...");
        // Fallback: try to see if it accepts UUID
        const { error: uuidErr } = await supabase.from('enrollments').insert({ student_id: '00000000-0000-0000-0000-000000000000' }).select();
        console.log("UUID insert error:", uuidErr?.message);
    } else {
        console.log("Columns info:", data);
    }
}

checkTypes();
