
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import QuestionsClient from "./QuestionsClient";

export default async function TestQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  
  const { data: test } = await supabase
    .from("tests")
    .select(`*, courses(title)`)
    .eq("id", id)
    .single();

  if (!test) notFound();

  const { data: questions } = await supabase
    .from("test_questions")
    .select("*")
    .eq("test_id", id)
    .order("order_index", { ascending: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{test.title}</h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">{test.courses?.title} • Question Bank</p>
        </div>
      </div>

      <QuestionsClient testId={id} initialQuestions={questions || []} />
    </div>
  );
}
