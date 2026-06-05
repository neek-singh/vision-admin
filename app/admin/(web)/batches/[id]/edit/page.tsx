import BatchForm from "@/components/web/BatchForm";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

export const revalidate = 0;

interface EditBatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBatchPage({ params }: EditBatchPageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: batch, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !batch) return notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <div className="container mx-auto px-6 py-12">
      <BatchForm batch={batch} courses={courses || []} />
    </div>
  );
}
