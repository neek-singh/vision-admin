import { createServerSupabaseClient } from "@/lib/supabase-server";
import ExpensesClient from "@/components/lms/expenses/ExpensesClient";

export const revalidate = 0;

export default async function AdminExpensesPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch Expense Records
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  const expensesList = expenses || [];

  // 2. Calculate Stats
  const totalExpenses = expensesList.reduce((acc, exp) => acc + Number(exp.amount), 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayExpenses = expensesList
    .filter(exp => exp.expense_date === todayStr)
    .reduce((acc, exp) => acc + Number(exp.amount), 0);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  const thisMonthExpenses = expensesList
    .filter(exp => {
      if (!exp.expense_date) return false;
      const d = new Date(exp.expense_date);
      return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
    })
    .reduce((acc, exp) => acc + Number(exp.amount), 0);

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Expense Management</h1>
        <p className="text-slate-500 font-medium mt-1">Track and manage institution expenditures and cash flows.</p>
      </div>

      <ExpensesClient
        initialExpenses={expensesList}
        stats={{
          totalExpenses,
          thisMonthExpenses,
          todayExpenses
        }}
      />
    </div>
  );
}
