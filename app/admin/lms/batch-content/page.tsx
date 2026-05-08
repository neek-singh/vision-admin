import { createServerSupabaseClient } from "@/lib/supabase-server";
import CurriculumClient from "../content/CurriculumClient";

export default async function BatchContentPage() {
  const supabase = await createServerSupabaseClient();
  
  // Fetch batches with their linked courses
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
    type: b.title, // CurriculumClient expects 'type' as the batch identifier
    course_id: b.course_id,
    batch_display: `${b.courses?.title || 'Unknown Course'} (${b.title})`
  }));

  return (
    <div className="p-6">
      <CurriculumClient availableBatches={enrichedBatches} mode="batch" />
    </div>
  );
}
