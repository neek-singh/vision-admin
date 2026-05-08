import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("courses:", Object.keys((await supabase.from('courses').select('*').limit(1)).data?.[0] || {}));
    console.log("lms_modules:", Object.keys((await supabase.from('lms_modules').select('*').limit(1)).data?.[0] || {}));
    console.log("lessons:", Object.keys((await supabase.from('lessons').select('*').limit(1)).data?.[0] || {}));
}

check();
