import { createServerSupabaseClient } from "@/lib/supabase-server";
import CurriculumClient from "@/components/lms/content/CurriculumClient";

export default async function CurriculumAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // Even though 'global' mode might not strictly need enrichedBatches for everything, 
  // it's good to keep the fetching logic consistent.
  const { data: batches } = await supabase
    .from("batches")
    .select(`
      id,
      title,
      course_id,
      courses(title)
    `)
    .order("title");

  const enrichedBatches = (batches || []).map(b => ({
    id: b.id,
    type: b.title,
    course_id: b.course_id,
    batch_display: `${(b.courses as any)?.title || 'Unknown Course'} (${b.title})`
  }));

  return (
    <div className="p-6">
      <CurriculumClient initialCourses={courses || []} availableBatches={enrichedBatches} mode="global" />
    </div>
  );
}
