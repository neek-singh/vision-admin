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
      students (id, name, student_id, phone, status, dropout_date, dropout_reason, is_deleted),
      courses (id, title),
      payments (id, amount, payment_date, payment_mode, transaction_id, registration_fee, course_fee, exam_fee),
      installments (id, amount, due_date, status)
    `)
    .order("created_at", { ascending: true });

  // 2. Fetch students & courses for setup (only active non-trashed students)
  const { data: students } = await supabase
    .from("students")
    .select("id, name, student_id, phone, status, dropout_date, dropout_reason, is_deleted")
    .eq("is_deleted", false)
    .neq("status", "dropped_out")
    .order("name");
  const { data: courses } = await supabase.from("courses").select("id, title, fee, discount_fee").order("title");

  // 3. Calculate Stats
  const totalCollection = fees?.reduce((acc, f) => {
    const paid = f.payments?.reduce((pAcc: number, p: any) => pAcc + Number(p.amount), 0) || 0;
    return acc + paid;
  }, 0) || 0;

  const totalPending = fees
    ?.filter(f => f.students && f.students.status !== "dropped_out" && !f.students.is_deleted)
    ?.reduce((acc, f) => {
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

  const paymentModes = allPayments.reduce((acc: { cash: number; online: number; bank: number }, p: any) => {
    const mode = (p.payment_mode || 'cash').toLowerCase();
    if (mode === 'cash') acc.cash += Number(p.amount || 0);
    else if (mode === 'online' || mode === 'upi') acc.online += Number(p.amount || 0);
    else acc.bank += Number(p.amount || 0);
    return acc;
  }, { cash: 0, online: 0, bank: 0 });

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Financial Center</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">Fee Desk</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fee collections, installments, and ledger balance</p>
        </div>
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
          monthlyCollection,
          paymentModes
        }}
      />
    </div>
  );
}
