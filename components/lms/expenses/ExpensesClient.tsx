"use client";

import { useState, useMemo } from "react";
import { 
  TrendingDown, 
  PlusCircle, 
  Search, 
  Filter, 
  Trash2, 
  Calendar, 
  X, 
  Plus, 
  Loader2, 
  IndianRupee, 
  Edit, 
  Tag, 
  User, 
  FileText,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { addExpense, updateExpense, deleteExpense } from "@/app/actions/lms/expenses";

const categories = [
  "Rent",
  "Utilities",
  "Salary",
  "Marketing",
  "Maintenance",
  "Stationery",
  "Others"
];

const paymentModes = [
  "cash",
  "upi",
  "bank_transfer",
  "cheque",
  "card"
];

export default function ExpensesClient({
  initialExpenses,
  stats
}: {
  initialExpenses: any[];
  stats: {
    totalExpenses: number;
    thisMonthExpenses: number;
    todayExpenses: number;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showModal, setShowModal] = useState<"add" | "edit" | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Rent",
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
    paid_to: "",
    payment_mode: "cash"
  });

  // Revalidate local state when initialExpenses changes
  useMemo(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = 
        !searchTerm.trim() ||
        exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.paid_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
      const matchesMode = paymentModeFilter === "all" || exp.payment_mode === paymentModeFilter;

      return matchesSearch && matchesCategory && matchesMode;
    });
  }, [expenses, searchTerm, categoryFilter, paymentModeFilter]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      alert("Please provide a valid title and amount.");
      return;
    }

    setLoading(true);
    const dataToSend = {
      title: formData.title,
      amount: Number(formData.amount),
      category: formData.category,
      expense_date: formData.expense_date,
      description: formData.description,
      paid_to: formData.paid_to,
      payment_mode: formData.payment_mode
    };

    if (showModal === "add") {
      const result = await addExpense(dataToSend);
      if (result.success) {
        alert("Expense added successfully!");
        setShowModal(null);
        resetForm();
      } else {
        alert("Error: " + result.error);
      }
    } else if (showModal === "edit" && editingExpense) {
      const result = await updateExpense(editingExpense.id, dataToSend);
      if (result.success) {
        alert("Expense updated successfully!");
        setShowModal(null);
        resetForm();
      } else {
        alert("Error: " + result.error);
      }
    }
    setLoading(false);
  };

  const handleEditClick = (exp: any) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      amount: exp.amount.toString(),
      category: exp.category,
      expense_date: exp.expense_date,
      description: exp.description || "",
      paid_to: exp.paid_to || "",
      payment_mode: exp.payment_mode
    });
    setShowModal("edit");
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    setLoading(true);
    const result = await deleteExpense(id);
    if (result.success) {
      alert("Expense deleted successfully!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      category: "Rent",
      expense_date: new Date().toISOString().split("T")[0],
      description: "",
      paid_to: "",
      payment_mode: "cash"
    });
    setEditingExpense(null);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Rent": return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30";
      case "Utilities": return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
      case "Salary": return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30";
      case "Marketing": return "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30";
      case "Maintenance": return "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30";
      case "Stationery": return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
      default: return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-900/30";
    }
  };

  return (
    <div className="space-y-10">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Total Expenditures",
            value: stats.totalExpenses,
            gradient: "from-blue-600 to-indigo-700 shadow-blue-500/10",
            subtext: "Lifetime total expense outflow"
          },
          {
            title: "This Month Expenses",
            value: stats.thisMonthExpenses,
            gradient: "from-purple-600 to-indigo-600 shadow-purple-500/10",
            subtext: `Expenses in ${new Date().toLocaleString("en-IN", { month: "long" })}`
          },
          {
            title: "Today's Expenses",
            value: stats.todayExpenses,
            gradient: "from-rose-500 to-orange-600 shadow-rose-500/10",
            subtext: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
          }
        ].map((item, idx) => (
          <div 
            key={idx} 
            className={`bg-gradient-to-br ${item.gradient} rounded-3xl p-8 text-white shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}
          >
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <TrendingDown size={180} className="stroke-[1.5]" />
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{item.title}</p>
            <h3 className="text-3xl sm:text-4xl font-black mt-4 flex items-center gap-1">
              <IndianRupee size={28} className="stroke-[3]" />
              {item.value.toLocaleString()}
            </h3>
            <p className="text-white/60 text-xs font-semibold mt-4">{item.subtext}</p>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by title, payee, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-2xl border border-slate-100 dark:border-slate-850 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-6 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-xl border border-slate-100 dark:border-slate-850 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={paymentModeFilter}
              onChange={(e) => setPaymentModeFilter(e.target.value)}
              className="pl-9 pr-6 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-xl border border-slate-100 dark:border-slate-850 outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold appearance-none cursor-pointer"
            >
              <option value="all">All Modes</option>
              {paymentModes.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>

          {/* Add Expense Button */}
          <button
            onClick={() => {
              resetForm();
              setShowModal("add");
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
          >
            <Plus size={14} className="stroke-[3]" /> Add Expense
          </button>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Title & Details</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Category</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Date</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Paid To</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest">Payment Mode</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-slate-450 dark:text-slate-500 font-semibold text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="opacity-25" size={32} />
                      No expenses found matching the criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-950/20 transition-all">
                    <td className="px-8 py-5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{exp.title}</div>
                      {exp.description && (
                        <div className="text-slate-400 text-xs mt-0.5 max-w-xs truncate">{exp.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getCategoryColor(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900 dark:text-white text-sm flex items-center">
                        <IndianRupee size={12} className="stroke-[3.5]" />
                        {exp.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-semibold text-xs">
                      {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                    </td>
                    <td className="px-6 py-5 text-slate-600 dark:text-slate-350 font-bold text-xs">
                      {exp.paid_to || "-"}
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2.5 py-1 text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded uppercase tracking-widest">
                        {exp.payment_mode}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEditClick(exp)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(exp.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="text-blue-600" />
                {showModal === "add" ? "Record New Expense" : "Modify Expense Details"}
              </h3>
              <button 
                onClick={() => setShowModal(null)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
              >
                <X size={18} className="text-slate-900 dark:text-white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <FileText size={12} /> Expense Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Broadband Electric Bill"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Amount & Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <IndianRupee size={12} /> Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 1500"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Category & Payment Mode row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Tag size={12} /> Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <CreditCard size={12} /> Payment Mode *
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                  >
                    {paymentModes.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              {/* Paid To */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <User size={12} /> Paid To (Payee)
                </label>
                <input
                  type="text"
                  value={formData.paid_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_to: e.target.value }))}
                  placeholder="Name of supplier, vendor or person"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <FileText size={12} /> Description / Comments
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional details..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 text-white text-xs font-black uppercase tracking-widest hover:from-blue-800 hover:to-blue-600 transition-all cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-60"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : null}
                  {showModal === "add" ? "Record Expense" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
