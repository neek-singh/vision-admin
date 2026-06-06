"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Wallet, 
  PlusCircle, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Download, 
  Search,
  Filter,
  Trash2,
  Calendar,
  X,
  Plus,
  Loader2,
  IndianRupee,
  Receipt,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  CalendarCheck,
  ChevronDown
} from "lucide-react";
import { setupStudentFee, recordPayment, deleteFeeRecord } from "@/app/actions/lms/fees";

export default function FeesClient({ 
  initialFees, 
  students,
  courses,
  stats 
}: { 
  initialFees: any[], 
  students: any[],
  courses: any[],
  stats: any 
}) {
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showPayment, setShowPayment] = useState<any | null>(null);
  const [showHistory, setShowHistory] = useState<any | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, paid, partial, due
  const [courseFilter, setCourseFilter] = useState("all");

  // Setup Form State
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [splitMode, setSplitMode] = useState("2"); // "1", "2", "3", "4", "6", "custom"
  const [setupData, setSetupData] = useState({
    student_id: "",
    course_id: "",
    total_fee: 0,
    discount: 0,
    installments: [] as { amount: number; due_date: string }[]
  });

  const finalFeeAmount = setupData.total_fee - setupData.discount;
  const installmentsSum = setupData.installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
  const isInstallmentSumValid = !enableInstallments || installmentsSum === finalFeeAmount;

  // Auto-generate splits logic
  const handleAutoGenerateSplits = (admission: number, mode: string, finalFee: number) => {
    if (finalFee <= 0) return [];
    
    const currentDate = new Date();
    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const newInstallments = [];
    
    // First installment is the admission fee
    const admissionAmt = Math.min(admission, finalFee);
    if (admissionAmt > 0) {
      newInstallments.push({
        amount: admissionAmt,
        due_date: formatDate(currentDate) // Today
      });
    }

    const remainingFee = finalFee - admissionAmt;
    if (remainingFee > 0) {
      if (mode === "custom") {
        // In custom mode, if installments list is empty, default to 1 split of the remaining fee
        return newInstallments.length > 0 
          ? newInstallments 
          : [{ amount: remainingFee, due_date: formatDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1))) }];
      }

      const monthsCount = parseInt(mode) || 1;
      const baseAmt = Math.floor(remainingFee / monthsCount);
      const remainder = remainingFee % monthsCount;

      for (let i = 1; i <= monthsCount; i++) {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + i);
        
        // Add the remainder to the first monthly split to ensure exact sum matching
        const splitAmt = i === 1 ? baseAmt + remainder : baseAmt;
        
        newInstallments.push({
          amount: splitAmt,
          due_date: formatDate(nextMonth)
        });
      }
    }

    return newInstallments;
  };

  // Re-calculate installments dynamically when settings change
  useEffect(() => {
    if (enableInstallments && splitMode !== "custom") {
      const generated = handleAutoGenerateSplits(admissionFee, splitMode, finalFeeAmount);
      setSetupData(prev => ({
        ...prev,
        installments: generated
      }));
    }
  }, [admissionFee, splitMode, finalFeeAmount, enableInstallments]);

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_mode: "cash",
    transaction_id: ""
  });

  // Memoized Filtered Fees
  const filteredFees = useMemo(() => {
    return initialFees.filter(fee => {
      const student = fee.students as any;
      const course = fee.courses as any;
      
      const matchesSearch = 
        !searchTerm.trim() ||
        student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === "all" || 
        fee.status === statusFilter;

      const matchesCourse = 
        courseFilter === "all" || 
        fee.course_id === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [initialFees, searchTerm, statusFilter, courseFilter]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enableInstallments && installmentsSum !== finalFeeAmount) {
      alert("Installment amounts must sum up exactly to the Final Fee!");
      return;
    }
    setLoading(true);
    const finalFee = setupData.total_fee - setupData.discount;
    const result = await setupStudentFee({
      ...setupData,
      final_fee: finalFee,
      installments: enableInstallments ? setupData.installments : []
    });
    if (result.success) {
      setShowSetup(false);
      setSetupData({
        student_id: "",
        course_id: "",
        total_fee: 0,
        discount: 0,
        installments: []
      });
      setEnableInstallments(false);
      setAdmissionFee(0);
      setSplitMode("2");
      alert("Fee record created!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await recordPayment({
      fee_id: showPayment.id,
      student_id: showPayment.student_id,
      ...paymentData
    });
    if (result.success) {
      setShowPayment(null);
      setPaymentData({ amount: 0, payment_mode: "cash", transaction_id: "" });
      alert("Payment recorded!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee record? This will remove all payments and installments too.")) return;
    setLoading(true);
    const result = await deleteFeeRecord(id);
    if (result.success) {
      alert("Record deleted!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  // Installment helpers
  const addInstallmentField = () => {
    setSetupData(prev => {
      const lastInst = prev.installments[prev.installments.length - 1];
      let newDate = "";
      
      const formatDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      if (lastInst && lastInst.due_date) {
        const lastDate = new Date(lastInst.due_date);
        if (!isNaN(lastDate.getTime())) {
          lastDate.setMonth(lastDate.getMonth() + 1);
          newDate = formatDate(lastDate);
        }
      }

      if (!newDate) {
        const today = new Date();
        today.setMonth(today.getMonth() + 1);
        newDate = formatDate(today);
      }

      return {
        ...prev,
        installments: [...prev.installments, { amount: 0, due_date: newDate }]
      };
    });
  };

  const removeInstallmentField = (idx: number) => {
    setSetupData(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== idx)
    }));
  };

  const updateInstallmentField = (idx: number, field: 'amount' | 'due_date', val: any) => {
    setSetupData(prev => ({
      ...prev,
      installments: prev.installments.map((inst, i) => i === idx ? { ...inst, [field]: val } : inst)
    }));
  };



  // Donut chart stats
  const totalOverall = stats.totalCollection + stats.totalPending;
  const collectionPercentage = totalOverall > 0 ? Math.round((stats.totalCollection / totalOverall) * 100) : 0;
  
  const strokeWidth = 8;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (collectionPercentage / 100) * circumference;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Stats Cards Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard 
            title="Total Collection" 
            amount={stats.totalCollection} 
            icon={<Wallet className="text-emerald-600 dark:text-emerald-400" size={24} />} 
            color="border-emerald-100/50 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:to-slate-900" 
            sub="Overall received fees" 
            accentColor="emerald"
          />
          <StatCard 
            title="Total Outstanding" 
            amount={stats.totalPending} 
            icon={<AlertCircle className="text-rose-600 dark:text-rose-455" size={24} />} 
            color="border-rose-100/50 bg-gradient-to-br from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:to-slate-900" 
            sub="Remaining balance due" 
            accentColor="rose"
          />
          <StatCard 
            title="Today Income" 
            amount={stats.todayCollection} 
            icon={<TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />} 
            color="border-blue-100/50 bg-gradient-to-br from-blue-50/40 via-white to-white dark:from-blue-950/20 dark:to-slate-900" 
            sub="Collected today" 
            accentColor="blue"
          />
        </div>

        {/* Right Column - Premium SVG Progress Ring */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/80 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="space-y-1.5 flex-1 pr-4">
             <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
               <Sparkles size={12} className="text-amber-500" />
               Collection Ratio
             </div>
             <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{collectionPercentage}% Recieved</h4>
             <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 leading-relaxed">
               ₹{stats.totalCollection.toLocaleString()} collected of ₹{totalOverall.toLocaleString()} total billing.
             </p>
          </div>

          <div className="relative flex items-center justify-center shrink-0">
             <svg className="w-24 h-24 transform -rotate-90">
               {/* Background Track */}
               <circle
                 cx="48"
                 cy="48"
                 r={radius}
                 className="stroke-slate-100 dark:stroke-slate-800"
                 strokeWidth={strokeWidth}
                 fill="transparent"
               />
               {/* Progress Ring */}
               <circle
                 cx="48"
                 cy="48"
                 r={radius}
                 className="stroke-emerald-500 transition-all duration-700"
                 strokeWidth={strokeWidth}
                 fill="transparent"
                 strokeDasharray={circumference}
                 strokeDashoffset={strokeDashoffset}
                 strokeLinecap="round"
               />
             </svg>
             <div className="absolute flex flex-col items-center">
                <span className="text-sm font-black text-slate-900 dark:text-white">{collectionPercentage}%</span>
             </div>
          </div>
        </div>

      </div>

      {/* Main Actions, Search, & Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Header Section */}
        <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Financial Records</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage student course billings, installments, and collections.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setShowSetup(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95"
            >
              <PlusCircle size={14} /> New Billing Setup
            </button>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50/40 dark:bg-slate-900/50 border-b border-slate-50 dark:border-slate-800/80 flex flex-col lg:flex-row items-center gap-4 justify-between">
           {/* Search field */}
           <div className="relative w-full lg:max-w-xs shrink-0">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550" size={16} />
             <input 
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Search student or course..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950/40 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs font-bold text-slate-850 dark:text-slate-200"
             />
             {searchTerm && (
               <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-655"><X size={12}/></button>
             )}
           </div>

           {/* Filter controls */}
           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
             {/* Course filter select */}
             <div className="flex items-center bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 gap-2 shrink-0">
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase">Course:</span>
               <select 
                 value={courseFilter}
                 onChange={(e) => setCourseFilter(e.target.value)}
                 className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 border-none outline-none py-0.5 cursor-pointer"
               >
                 <option value="all">All Courses</option>
                 {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>)}
               </select>
             </div>

             {/* Status Badge filter tabs */}
             <div className="flex items-center gap-1 bg-white dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
               {[
                 { id: "all", label: "All Records" },
                 { id: "paid", label: "Fully Paid" },
                 { id: "partial", label: "Partially Paid" },
                 { id: "due", label: "Balance Due" }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setStatusFilter(tab.id)}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                     statusFilter === tab.id 
                       ? "bg-slate-900 text-white dark:bg-slate-800"
                       : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-205"
                   }`}
                 >
                   {tab.label}
                 </button>
               ))}
             </div>
           </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          {filteredFees.length === 0 ? (
            <div className="px-8 py-20 text-center text-slate-455 font-bold">
              No matching financial records found.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 dark:bg-slate-900/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-850">
                  <th className="px-8 py-4">Student</th>
                  <th className="px-8 py-4">Course</th>
                  <th className="px-8 py-4">Final Fee</th>
                  <th className="px-8 py-4">Paid</th>
                  <th className="px-8 py-4">Balance</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {filteredFees.map((fee) => {
                  const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                  const balance = Number(fee.final_fee) - totalPaid;
                  return (
                    <tr key={fee.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{(fee.students as any)?.name}</div>
                        <div className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">{(fee.students as any)?.student_id}</div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-655 dark:text-slate-300">{(fee.courses as any)?.title || "N/A"}</td>
                      <td className="px-8 py-5">
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">₹{fee.final_fee.toLocaleString()}</div>
                        {fee.discount > 0 && <div className="text-[9px] font-semibold text-rose-500">Disc: ₹{fee.discount.toLocaleString()}</div>}
                      </td>
                      <td className="px-8 py-5 text-emerald-600 dark:text-emerald-450 font-black text-sm">₹{totalPaid.toLocaleString()}</td>
                      <td className={`px-8 py-5 font-black text-sm ${balance > 0 ? 'text-rose-600 dark:text-rose-455' : 'text-slate-400 dark:text-slate-550'}`}>₹{balance.toLocaleString()}</td>
                      <td className="px-8 py-5">
                        <StatusBadge status={fee.status} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                           <button 
                            onClick={() => {
                              setShowPayment(fee);
                              setPaymentData({ amount: balance, payment_mode: "cash", transaction_id: "" });
                            }}
                            disabled={fee.status === 'paid'}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-all disabled:opacity-30 cursor-pointer"
                            title="Add Payment"
                           >
                             <Plus size={18} className="stroke-[3]" />
                           </button>
                           <button 
                            onClick={() => setShowHistory(fee)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                            title="View History"
                           >
                             <History size={16} />
                           </button>
                           <button 
                            onClick={() => handleDelete(fee.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                            title="Delete Record"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredFees.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 font-bold">
              No matching records found.
            </div>
          ) : (
            filteredFees.map((fee) => {
              const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
              const balance = Number(fee.final_fee) - totalPaid;
              return (
                <div key={fee.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{(fee.students as any)?.name}</h4>
                      <p className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">{(fee.students as any)?.student_id}</p>
                    </div>
                    <StatusBadge status={fee.status} />
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-1">Course Title</span>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 line-clamp-1">{(fee.courses as any)?.title || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block mb-1">Final Fee</span>
                        <p className="text-sm font-black text-slate-900 dark:text-slate-100">₹{fee.final_fee.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-200/40 dark:border-slate-800/80">
                      <div>
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Paid Amount</span>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-rose-450 uppercase tracking-widest block mb-1">Balance Due</span>
                        <p className={`text-sm font-black ${balance > 0 ? 'text-rose-600 dark:text-rose-455' : 'text-slate-400 dark:text-slate-500'}`}>₹{balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                     <button 
                        onClick={() => {
                          setShowPayment(fee);
                          setPaymentData({ amount: balance, payment_mode: "cash", transaction_id: "" });
                        }}
                        disabled={fee.status === 'paid'}
                        className="flex-1 py-3 bg-blue-50 hover:bg-blue-100/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 cursor-pointer"
                      >
                        <Plus size={14} className="stroke-[3]" /> Add Payment
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowHistory(fee)}
                          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                        >
                          <History size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(fee.id)}
                          className="p-3 text-slate-400 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all border border-slate-100 dark:border-slate-800 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
               <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                 <CalendarCheck size={20} className="text-blue-600" /> Create Fee Billing Record
               </h3>
               <button 
                 onClick={() => {
                   setShowSetup(false);
                   setEnableInstallments(false);
                   setAdmissionFee(0);
                   setSplitMode("2");
                 }} 
                 className="p-2 hover:bg-slate-105 rounded-lg cursor-pointer"
               >
                 <X size={18} className="text-slate-900 dark:text-white" />
               </button>
             </div>
             
             <form onSubmit={handleSetup} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Select Student</label>
                      <select 
                        required 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.student_id} 
                        onChange={(e) => setSetupData({...setupData, student_id: e.target.value})}
                      >
                        <option value="">Choose Student...</option>
                        {students.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name} ({s.student_id})</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Select Course</label>
                      <select 
                        required 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.course_id} 
                        onChange={(e) => {
                          const courseId = e.target.value;
                          const selectedCourse = courses.find(c => c.id === courseId);
                          setSetupData({
                            ...setupData, 
                            course_id: courseId,
                            total_fee: selectedCourse?.fee || 0,
                            discount: (selectedCourse?.fee && selectedCourse?.discount_fee) ? (selectedCourse.fee - selectedCourse.discount_fee) : 0
                          });
                        }}
                      >
                        <option value="">Choose Course...</option>
                        {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Base Course Fee (₹)</label>
                      <input 
                        required 
                        type="number" 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.total_fee || ""} 
                        onChange={(e) => setSetupData({...setupData, total_fee: Number(e.target.value)})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Discount Deduction (₹)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.discount || ""} 
                        onChange={(e) => setSetupData({...setupData, discount: Number(e.target.value)})}
                      />
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-955 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Final billing fee: <span className="text-blue-600 dark:text-blue-400">₹{finalFeeAmount.toLocaleString()}</span></h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Calculated as: Fee - Discount</p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={enableInstallments} 
                        onChange={(e) => {
                          setEnableInstallments(e.target.checked);
                          if (!e.target.checked) {
                            setAdmissionFee(0);
                            setSplitMode("2");
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide">Installment Plan</span>
                    </label>
                  </div>
                </div>

                {enableInstallments && (
                  <div className="space-y-4 animate-in fade-in duration-300 bg-slate-50/50 dark:bg-slate-955/20 border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
                     {/* Admission & Monthly Auto-Split controls */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-850">
                       <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Admission Fee (₹)</label>
                         <input 
                           type="number"
                           placeholder="Upfront Admission Fee"
                           value={admissionFee || ""}
                           onChange={(e) => setAdmissionFee(Math.min(finalFeeAmount, Math.max(0, Number(e.target.value))))}
                           className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                         />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Installment Splits Duration</label>
                         <select 
                           value={splitMode}
                           onChange={(e) => setSplitMode(e.target.value)}
                           className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 cursor-pointer"
                         >
                           <option value="1">1 Month Split</option>
                           <option value="2">2 Months (Equal splits)</option>
                           <option value="3">3 Months (Equal splits)</option>
                           <option value="4">4 Months (Equal splits)</option>
                           <option value="6">6 Months (Equal splits)</option>
                           <option value="custom">Custom Splits (Manual)</option>
                         </select>
                       </div>
                     </div>

                     <div className="flex items-center justify-between">
                       <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Installment Splits ({setupData.installments.length})</label>
                       {splitMode === "custom" ? (
                         <button 
                           type="button" 
                           onClick={addInstallmentField}
                           className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all"
                         >
                           <Plus size={10} /> Add Split
                         </button>
                       ) : (
                         <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/20 rounded-lg text-[9px] font-bold uppercase tracking-wider">Auto Splits Active</span>
                       )}
                     </div>

                     <div className="space-y-3">
                        {setupData.installments.map((inst, idx) => {
                          const isAdmission = idx === 0 && admissionFee > 0;
                          return (
                            <div key={idx} className="flex gap-4 items-center">
                              <div className="flex-[2] space-y-1">
                                <input 
                                  required
                                  type="number"
                                  placeholder={isAdmission ? "Admission Fee (₹)" : "Amount (₹)"}
                                  value={inst.amount || ""}
                                  disabled={splitMode !== "custom"}
                                  onChange={(e) => updateInstallmentField(idx, 'amount', Number(e.target.value))}
                                  className="w-full px-3 py-2 text-xs font-bold bg-white disabled:bg-slate-50/80 dark:bg-slate-900 dark:disabled:bg-slate-955/40 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 disabled:text-slate-500"
                                />
                              </div>
                              <div className="flex-[3] space-y-1">
                                <input 
                                  required
                                  type="date"
                                  value={inst.due_date}
                                  disabled={splitMode !== "custom"}
                                  onChange={(e) => updateInstallmentField(idx, 'due_date', e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-semibold bg-white disabled:bg-slate-50/80 dark:bg-slate-900 dark:disabled:bg-slate-955/40 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 disabled:text-slate-500"
                                />
                              </div>
                              <button 
                                type="button" 
                                disabled={splitMode !== "custom" || setupData.installments.length <= 1}
                                onClick={() => removeInstallmentField(idx)}
                                className="p-2 text-slate-350 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                                title="Remove Split"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                     <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
                       <span className={isInstallmentSumValid ? "text-slate-400" : "text-rose-500"}>
                         Splits Sum: ₹{installmentsSum.toLocaleString()} / ₹{finalFeeAmount.toLocaleString()}
                       </span>
                       {!isInstallmentSumValid && (
                         <span className="text-[10px] text-rose-500 uppercase tracking-wider flex items-center gap-1 font-bold animate-pulse">
                           <AlertCircle size={10} /> Total mismatch
                         </span>
                       )}
                     </div>
                  </div>
                )}

                <div className="pt-4 flex gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowSetup(false);
                      setEnableInstallments(false);
                      setAdmissionFee(0);
                      setSplitMode("2");
                    }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-300 font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={loading || !isInstallmentSumValid} 
                    className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Confirm setup
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="px-8 py-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
               <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                 <CreditCard className="text-emerald-600" size={18} /> Record Student Payment
               </h3>
               <button onClick={() => setShowPayment(null)} className="p-2 hover:bg-slate-105 rounded-lg cursor-pointer"><X size={18}/></button>
             </div>
             
             <form onSubmit={handlePayment} className="p-8 space-y-6">
                <div className="space-y-2">
                   <div className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Recording for:</div>
                   <h4 className="text-lg font-black text-slate-900 dark:text-white">{(showPayment.students as any)?.name}</h4>
                   <p className="text-xs font-bold text-slate-500">{(showPayment.courses as any)?.title}</p>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Amount Paid (₹)</label>
                   <input 
                     required 
                     type="number" 
                     className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-black text-xl text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                     value={paymentData.amount || ""} 
                     onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                   />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1.5 block">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                     {['cash', 'upi', 'bank'].map(mode => (
                       <button 
                         key={mode} 
                         type="button" 
                         onClick={() => setPaymentData({...paymentData, payment_mode: mode})} 
                         className={`py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                           paymentData.payment_mode === mode 
                             ? 'bg-emerald-600 border-emerald-605 text-white shadow-sm shadow-emerald-500/20' 
                             : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                         }`}
                       >
                         {mode}
                       </button>
                     ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Transaction / Reference ID (Optional)</label>
                   <input 
                     type="text" 
                     className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                     placeholder="e.g. TXN987654321"
                     value={paymentData.transaction_id}
                     onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
                   />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowPayment(null)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-655 dark:text-slate-300 font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={loading || paymentData.amount <= 0} 
                    className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-705 text-white rounded-xl font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Record Transaction
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
             
             {/* Header */}
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
               <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                 <History className="text-indigo-600" /> Account Statement & Details
               </h3>
               <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-slate-105 rounded-lg cursor-pointer"><X size={18} className="text-slate-900 dark:text-white" /></button>
             </div>

             {/* Student Card Summary */}
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white dark:bg-slate-900">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Student Information</p>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{(showHistory.students as any)?.name}</h4>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{(showHistory.courses as any)?.title}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      const history = showHistory;
                      const totalPaid = history.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                      const bal = Number(history.final_fee) - totalPaid;
                      setShowHistory(null);
                      setShowPayment(history);
                      setPaymentData({ amount: bal, payment_mode: "cash", transaction_id: "" });
                    }}
                    disabled={showHistory.status === 'paid'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    <Plus size={12} className="stroke-[3]"/> Record Payment
                  </button>
                </div>
             </div>

             {/* Timelines split panels */}
             <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Installments Section */}
                <div className="p-8 space-y-6">
                   <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800/80 pb-2 shrink-0">
                     <Calendar size={14} className="text-slate-400"/> Installment Schedule
                   </h5>
                   <div className="space-y-4">
                      {(!showHistory.installments || showHistory.installments.length === 0) ? (
                        <div className="py-12 text-center text-slate-350 dark:text-slate-550 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
                           <CalendarCheck className="opacity-30" size={24} />
                           Full Settlement Plan
                        </div>
                      ) : (
                        showHistory.installments.map((inst: any, idx: number) => {
                          const isOverdue = inst.status === 'pending' && new Date(inst.due_date) < new Date();
                          return (
                            <div key={inst.id} className={`p-4 rounded-xl border relative transition-all ${
                              inst.status === 'paid' 
                                ? 'bg-emerald-50/20 border-emerald-100 dark:border-emerald-950/20' 
                                : isOverdue 
                                  ? 'bg-rose-50/30 border-rose-200 dark:border-rose-950/30' 
                                  : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800'
                            }`}>
                               <div className="flex items-center justify-between gap-4">
                                  <div>
                                     <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Installment {idx + 1}</p>
                                     <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">₹{inst.amount.toLocaleString()}</p>
                                     <p className={`text-[10px] font-bold mt-1 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                       Due: {inst.due_date ? new Date(inst.due_date).toLocaleDateString() : "No Date"}
                                       {isOverdue && " (OVERDUE)"}
                                     </p>
                                  </div>
                                  
                                  {inst.status === 'pending' ? (
                                    <button 
                                      onClick={() => {
                                        const hist = showHistory;
                                        setShowHistory(null);
                                        setShowPayment(hist);
                                        setPaymentData({ amount: Number(inst.amount), payment_mode: "cash", transaction_id: "" });
                                      }}
                                      className="px-3 py-1.5 bg-white dark:bg-slate-900 text-blue-600 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm cursor-pointer"
                                    >
                                      Pay Split
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-md uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/20">Paid</span>
                                  )}
                               </div>
                            </div>
                          );
                        })
                      )}
                   </div>
                </div>

                {/* Payments Log Section */}
                <div className="p-8 space-y-6">
                   <h5 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 dark:border-slate-800/80 pb-2 shrink-0">
                     <History size={14} className="text-slate-400"/> Transaction History Log
                   </h5>
                   <div className="space-y-3">
                      {(!showHistory.payments || showHistory.payments.length === 0) ? (
                        <div className="py-12 text-center text-slate-350 dark:text-slate-550 text-xs font-bold bg-slate-50/50 dark:bg-slate-955/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 flex flex-col items-center justify-center gap-2">
                           <History className="opacity-30" size={24} />
                           No payment transactions recorded.
                        </div>
                      ) : (
                        showHistory.payments.map((pay: any, index: number) => (
                          <div key={`${pay.id}-${index}`} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 group transition-all">
                             <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">₹{pay.amount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-0.5">
                                  {new Date(pay.payment_date).toLocaleDateString()} • <span className="uppercase">{pay.payment_mode}</span>
                                </p>
                                {pay.transaction_id && (
                                  <p className="text-[9px] font-mono text-slate-400 mt-1">Ref: {pay.transaction_id}</p>
                                )}
                             </div>
                             <button 
                               onClick={() => window.print()} 
                               className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                               title="Print Receipt"
                             >
                               <Download size={14}/>
                             </button>
                          </div>
                        ))
                      )}
                   </div>
                </div>

             </div>
             
             {/* Footer summary */}
             <div className="p-8 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase">
                  Account Billings Log: {showHistory.payments?.length || 0} payments
                </div>
                <button onClick={() => setShowHistory(null)} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">Close History</button>
             </div>

          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, amount, icon, color, sub, accentColor }: any) {
  const accentStyles: Record<string, string> = {
    emerald: "group-hover:bg-emerald-500 group-hover:text-white",
    rose: "group-hover:bg-rose-500 group-hover:text-white",
    blue: "group-hover:bg-blue-600 group-hover:text-white"
  };

  return (
    <div className={`p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group hover:-translate-y-0.5 ${color}`}>
      <div className={`absolute top-4 right-4 p-2 rounded-xl transition-all duration-300 ${accentStyles[accentColor]}`}>
        {icon}
      </div>
      <div className="relative z-10 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">₹{amount.toLocaleString()}</h3>
        <p className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 opacity-80">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { 
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30", 
    partial: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30", 
    due: "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30" 
  };
  const labels: any = { paid: "Paid", partial: "Partial", due: "Due" };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
