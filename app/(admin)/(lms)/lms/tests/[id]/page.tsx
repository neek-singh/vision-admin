import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { X, Clock, HelpCircle, BookOpen, ChevronRight } from "lucide-react";
import QuestionsClient from "@/components/lms/tests/QuestionsClient";

export const unstable_instant = false;

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

  const qCount = questions?.length || 0;
  const courseTitle = (test.courses as any)?.title || "Course Test";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Breadcrumb & Info */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Link href="/lms" className="hover:text-slate-700 transition-colors">LMS</Link>
            <ChevronRight size={13} />
            <Link href="/lms/tests" className="hover:text-slate-700 transition-colors">Tests</Link>
            <ChevronRight size={13} />
            <span className="text-slate-600 font-bold">Question Bank</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            {test.title}
          </h1>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold">
              <BookOpen size={13} />
              {courseTitle}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-xs font-bold">
              <Clock size={13} />
              {qCount} Mins ({qCount > 0 ? "1 min/Q" : "0 mins"})
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
              <HelpCircle size={13} />
              {qCount} Questions
            </span>
          </div>
        </div>

        {/* Close Button */}
        <Link
          href="/lms/tests"
          className="self-start md:self-center flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          title="Back to Tests Dashboard"
        >
          <X size={16} />
          <span>Close</span>
        </Link>
      </div>

      <QuestionsClient testId={id} initialQuestions={questions || []} />
    </div>
  );
}
