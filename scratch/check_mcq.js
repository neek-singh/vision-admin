const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMCQ() {
  const { data, error } = await supabase.from('lessons').select('*').eq('lesson_type', 'mcq');
  if (error) {
    console.error("Error:", error.message);
  } else if (data) {
    const nonEmpties = data.filter(d => d.notes_content && !d.notes_content.includes('MCQ_QUESTIONS_JSON:[]'));
    if (nonEmpties.length > 0) {
      console.log("Sample non-empty MCQ/Quiz lesson data:", JSON.stringify(nonEmpties[0], null, 2));
    } else {
      console.log("No non-empty MCQ lessons found. Total MCQ lessons:", data.length);
      if (data.length > 0) {
        console.log("All MCQs:");
        data.forEach(d => console.log(d.title, d.notes_content));
      }
    }
  }
}

checkMCQ();
