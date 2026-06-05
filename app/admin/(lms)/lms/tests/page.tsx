import { createServerSupabaseClient } from "@/lib/supabase-server";
import TestsClient from "@/components/lms/tests/TestsClient";

export default async function TestsAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const { data: tests } = await supabase
    .from("tests")
    .select(`
      *,
      courses(title),
      test_questions(count)
    `)
    .order("created_at", { ascending: false });

  const { data: batchesData } = await supabase
    .from("batches")
    .select("title")
    .order("title");

  const batchNames = batchesData?.map(b => b.title) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test Builder</h1>
          <p className="text-sm text-slate-500 font-medium">Create and manage online quizzes.</p>
        </div>
      </div>

      <TestsClient courses={courses || []} initialTests={tests || []} availableBatches={batchNames} />
    </div>
  );
}
