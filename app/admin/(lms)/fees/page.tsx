import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeesClient from "@/components/lms/fees/FeesClient";

export const revalidate = 0;

export default async function AdminFeesPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch Fee Records with Student & Course info
  const { data: fees } = await supabase
    .from("fees")
    .select(`
      *,
      students (id, name, student_id),
      courses (id, title),
      payments (amount)
    `)
    .order("created_at", { ascending: false });

  // 2. Fetch students & courses for setup
  const { data: students } = await supabase.from("students").select("id, name, student_id").order("name");
  const { data: courses } = await supabase.from("courses").select("id, title, fee, discount_fee").order("title");

  // 3. Calculate Stats
  const totalCollection = fees?.reduce((acc, f) => {
    const paid = f.payments?.reduce((pAcc: number, p: any) => pAcc + Number(p.amount), 0) || 0;
    return acc + paid;
  }, 0) || 0;

  const totalPending = fees?.reduce((acc, f) => {
    const paid = f.payments?.reduce((pAcc: number, p: any) => pAcc + Number(p.amount), 0) || 0;
    return acc + (Number(f.final_fee) - paid);
  }, 0) || 0;
  
  const today = new Date().toISOString().split('T')[0];
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", today);
    
  const todayCollection = todayPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Center</h1>
        <p className="text-slate-500 font-medium mt-1">Fee collections and payment management.</p>
      </div>

      <FeesClient 
        initialFees={fees || []} 
        students={students || []} 
        courses={courses || []}
        stats={{
          totalCollection,
          totalPending,
          todayCollection
        }}
      />
    </div>
  );
}
