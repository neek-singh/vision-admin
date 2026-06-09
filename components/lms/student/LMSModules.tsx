import { createServerSupabaseClient } from "@/lib/supabase-server";

interface LMSModulesProps {
  courseTitle: string;
}

export default async function LMSModules({ courseTitle }: LMSModulesProps) {
  const supabase = await createServerSupabaseClient();
  
  // Fetch real counts for the student's course
  // We'll try to find course ID first to be more accurate
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("title", courseTitle)
    .single();

  let videoCount = 0;
  let notesCount = 0;
  let projectCount = 0;

  if (course) {
    // Fetch all lessons for this course to count types in memory
    // This is robust against both legacy type values and new lesson_type values
    const { data: lessons } = await supabase
      .from("lessons")
      .select("type, lesson_type")
      .eq("course_id", course.id);

    if (lessons) {
      lessons.forEach((l: any) => {
        const type = l.lesson_type || l.type || 'video';
        if (type === 'video') {
          videoCount++;
        } else if (type === 'notes') {
          notesCount++;
        } else if (type === 'project') {
          projectCount++;
        }
      });
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <ModuleCard 
        title="Video Lectures" 
        count={videoCount.toString()} 
        icon="📺" 
        description={videoCount > 0 ? "Resume your learning" : "Coming soon"}
      />
      <ModuleCard 
        title="Study Notes" 
        count={notesCount.toString()} 
        icon="📚" 
        description={notesCount > 0 ? "Review materials" : "Stay tuned"}
      />
      <ModuleCard 
        title="Practical Projects" 
        count={projectCount.toString()} 
        icon="📁" 
        description={projectCount > 0 ? "Work on projects" : "Stay tuned"}
      />
    </div>
  );
}

function ModuleCard({ title, count, icon, description }: { title: string; count: string; icon: string; description: string }) {
  const isAvailable = parseInt(count) > 0;

  return (
    <div className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all group ${
      isAvailable ? 'hover:shadow-md cursor-pointer' : 'opacity-80 cursor-not-allowed'
    }`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-3xl grayscale group-hover:grayscale-0 transition-all">{icon}</div>
          <div>
            <h4 className="font-bold text-blue-950 group-hover:text-blue-600 transition-colors">{title}</h4>
            <p className="text-xs text-gray-400 font-medium">{count} items available • {description}</p>
          </div>
        </div>
        <div className={`text-gray-300 transition-transform ${isAvailable ? 'group-hover:translate-x-1' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
