import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting database columns from information_schema...");

    const { data, error } = await supabase.rpc('get_schema_columns', {});
    if (error) {
        // If RPC fails, try generic REST query on a specific row
        console.error("RPC failed, falling back...");
    } else {
        console.log("Got schema via RPC...");
    }
}

inspect();

inspect();
