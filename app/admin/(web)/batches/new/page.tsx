import BatchForm from "@/components/web/BatchForm";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function NewBatchPage() {
  const supabase = await createServerSupabaseClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <div className="container mx-auto px-6 py-12">
      <BatchForm courses={courses || []} />
    </div>
  );
}
