const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://upsgoqluovwzijtgmlhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwc2dvcWx1b3Z3emlqdGdtbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk4MTksImV4cCI6MjA5MTgyNTgxOX0.TLh-X-Go2O78S0S2de3Lw2eKzpAI8qlXw0whuCXf0O4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMCQ() {
  const { data, error } = await supabase.from('lessons').select('id, title, notes_content').eq('lesson_type', 'mcq');
  if (data) {
    const nonEmpties = data.filter(d => d.notes_content && !d.notes_content.includes('MCQ_QUESTIONS_JSON:[]'));
    if (nonEmpties.length > 0) {
      const match = nonEmpties[0].notes_content.match(/<!-- MCQ_QUESTIONS_JSON:(.*?) -->/);
      if (match) {
        console.log("Quiz title:", nonEmpties[0].title);
        const questions = JSON.parse(match[1]);
        console.log("Questions count:", questions.length);
        console.log("Sample Question:", JSON.stringify(questions[0], null, 2));
      } else {
        console.log("Could not find MCQ_QUESTIONS_JSON in notes_content.");
      }
    } else {
      console.log("No non-empty MCQ lessons found.");
    }
  }
}

checkMCQ();
