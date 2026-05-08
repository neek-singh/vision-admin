const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon for now, but service role is better for seeding

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const jsonPath = "c:\\Users\\as007\\vision-web\\data\\batches.json";

async function migrate() {
  if (!fs.existsSync(jsonPath)) {
    console.log("No batches.json found at", jsonPath);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const batches = JSON.parse(rawData);

  console.log(`Found ${batches.length} batches in JSON. Migrating...`);

  // First, get all courses to map titles to IDs
  const { data: courses } = await supabase.from('courses').select('id, title');
  const courseMap = (courses || []).reduce((acc, c) => {
    acc[c.title] = c.id;
    return acc;
  }, {});

  for (const b of batches) {
    const courseId = courseMap[b.course] || null;
    
    const { data, error } = await supabase
      .from('batches')
      .insert([
        {
          title: b.type || b.course,
          course_id: courseId,
          timing: b.time || null,
          start_date: b.date ? new Date(b.date).toISOString().split('T')[0] : null,
          status: 'active'
        }
      ]);

    if (error) {
      console.error(`Error migrating batch ${b.type}:`, error.message);
    } else {
      console.log(`Successfully migrated: ${b.type}`);
    }
  }

  console.log("Migration complete.");
}

migrate();
