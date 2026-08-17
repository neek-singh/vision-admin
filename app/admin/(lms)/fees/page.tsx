import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeesClient from "@/components/lms/fees/FeesClient";

export const unstable_instant = false;

export default async function AdminFeesPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch Fee Records with Student & Course info
  const { data: fees } = await supabase
    .from("fees")
    .select(`
      *,
      students (id, name, student_id),
      courses (id, title),
      payments (id, amount, payment_date, payment_mode, transaction_id, registration_fee, course_fee, exam_fee)
    `)
    .order("created_at", { ascending: true });

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
    return acc + (Number(f.final_fee) + Number(f.increment_amount || 0) - paid);
  }, 0) || 0;
  
  // Calculate Today, Weekly and Monthly Collections
  const allPayments = fees?.flatMap(f => f.payments || []) || [];
  
  // Format dates in local timezone
  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);
  
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  const startOfWeekStr = new Date(monday.getTime() - monday.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  const todayCollection = allPayments
    .filter((p: any) => p.payment_date === todayStr)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const weeklyCollection = allPayments
    .filter((p: any) => p.payment_date && p.payment_date >= startOfWeekStr && p.payment_date <= todayStr)
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const monthlyCollection = allPayments
    .filter((p: any) => p.payment_date && p.payment_date.startsWith(currentMonthPrefix))
    .reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="container mx-auto py-6 sm:py-10">
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
          todayCollection,
          weeklyCollection,
          monthlyCollection
        }}
      />
    </div>
  );
}
