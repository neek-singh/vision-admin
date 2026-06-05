"use client";

import { useState } from "react";
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
  Receipt
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
  
  // Setup Form State
  const [setupData, setSetupData] = useState({
    student_id: "",
    course_id: "",
    total_fee: 0,
    discount: 0,
    installments: [] as { amount: number; due_date: string }[]
  });

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_mode: "cash",
    transaction_id: ""
  });

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const finalFee = setupData.total_fee - setupData.discount;
    const result = await setupStudentFee({
      ...setupData,
      final_fee: finalFee
    });
    if (result.success) {
      setShowSetup(false);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Collection" amount={stats.totalCollection} icon={<Wallet className="text-emerald-600" />} color="bg-emerald-50" sub="Overall received" />
        <StatCard title="Total Outstanding" amount={stats.totalPending} icon={<AlertCircle className="text-rose-600" />} color="bg-rose-50" sub="Balance due" />
        <StatCard title="Today Income" amount={stats.todayCollection} icon={<TrendingUp className="text-blue-600" />} color="bg-blue-50" sub="Collected today" />
      </div>

      {/* Main Actions & Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Financial Records</h2>
            <p className="text-sm text-slate-500 font-medium">Manage course fees and transactions.</p>
          </div>
          <button 
            onClick={() => setShowSetup(true)}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
          >
            <PlusCircle size={18} /> New Record
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <th className="px-8 py-4">Student</th>
                <th className="px-8 py-4">Course</th>
                <th className="px-8 py-4">Final Fee</th>
                <th className="px-8 py-4">Paid</th>
                <th className="px-8 py-4">Balance</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {initialFees.map((fee) => {
                const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                const balance = Number(fee.final_fee) - totalPaid;
                return (
                  <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-900">{(fee.students as any)?.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{(fee.students as any)?.student_id}</div>
                    </td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-600">{(fee.courses as any)?.title || "N/A"}</td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-slate-900">₹{fee.final_fee}</div>
                      {fee.discount > 0 && <div className="text-[9px] text-slate-400">Disc: ₹{fee.discount}</div>}
                    </td>
                    <td className="px-8 py-5 text-emerald-600 font-black text-sm">₹{totalPaid}</td>
                    <td className={`px-8 py-5 font-black text-sm ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{balance}</td>
                    <td className="px-8 py-5">
                      <StatusBadge status={fee.status} />
                    </td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                       <button 
                        onClick={() => setShowPayment(fee)}
                        disabled={fee.status === 'paid'}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-30"
                       >
                         <Plus size={20} />
                       </button>
                       <button 
                        onClick={() => setShowHistory(fee)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="View History"
                       >
                         <History size={18} />
                       </button>
                       <button 
                        onClick={() => handleDelete(fee.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Record"
                       >
                         <Trash2 size={18} />
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden divide-y divide-gray-50">
          {initialFees.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 font-bold">
              No fee records found.
            </div>
          ) : (
            initialFees.map((fee) => {
              const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
              const balance = Number(fee.final_fee) - totalPaid;
              return (
                <div key={fee.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight">{(fee.students as any)?.name}</h4>
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{(fee.students as any)?.student_id}</p>
                    </div>
                    <StatusBadge status={fee.status} />
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Course Title</span>
                        <p className="text-xs font-black text-blue-600">{(fee.courses as any)?.title || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Final Fee</span>
                        <p className="text-sm font-black text-slate-900">₹{fee.final_fee}</p>
                      </div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-200/50">
                      <div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Paid Amount</span>
                        <p className="text-sm font-black text-emerald-600">₹{totalPaid}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Balance Due</span>
                        <p className={`text-sm font-black ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>₹{balance}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                     <button 
                        onClick={() => setShowPayment(fee)}
                        disabled={fee.status === 'paid'}
                        className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                      >
                        <Plus size={14} /> Add Payment
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowHistory(fee)}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-100"
                        >
                          <History size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(fee.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-100"
                        >
                          <Trash2 size={18} />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">Create Fee Record</h3>
               <button onClick={() => setShowSetup(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={handleSetup} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</label>
                      <select required className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold" value={setupData.student_id} onChange={(e) => setSetupData({...setupData, student_id: e.target.value})}>
                        <option value="">Choose Student...</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</label>
                      <select 
                        required 
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold" 
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
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fee</label>
                      <input required type="number" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold" value={setupData.total_fee} onChange={(e) => setSetupData({...setupData, total_fee: Number(e.target.value)})}/>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount</label>
                      <input type="number" className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold" value={setupData.discount} onChange={(e) => setSetupData({...setupData, discount: Number(e.target.value)})}/>
                   </div>
                </div>
                <button disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Confirm Record
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
             <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
               <h3 className="text-xl font-black text-slate-900">Add Payment</h3>
               <button onClick={() => setShowPayment(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={handlePayment} className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</label>
                   <input required type="number" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-black text-lg" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}/>
                </div>
                <div className="grid grid-cols-3 gap-2">
                   {['cash', 'upi', 'bank'].map(mode => (
                     <button key={mode} type="button" onClick={() => setPaymentData({...paymentData, payment_mode: mode})} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${paymentData.payment_mode === mode ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400'}`}>{mode}</button>
                   ))}
                </div>
                <button disabled={loading || paymentData.amount <= 0} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />} Record Transaction
                </button>
             </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
             <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
               <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                 <History className="text-indigo-600" /> Payment History
               </h3>
               <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20}/></button>
             </div>

             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</p>
                  <h4 className="text-xl font-black text-slate-900">{(showHistory.students as any)?.name}</h4>
                  <p className="text-xs font-bold text-slate-500">{(showHistory.courses as any)?.title}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const history = showHistory;
                      setShowHistory(null);
                      setShowPayment(history);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <Plus size={14}/> Add Custom Payment
                  </button>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-50">
                {/* Installments Section */}
                <div className="p-8 space-y-4">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Calendar size={14}/> Installment Plan
                   </h5>
                   <div className="space-y-3">
                      {(!showHistory.installments || showHistory.installments.length === 0) ? (
                        <div className="py-10 text-center text-slate-300 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           Full Payment Plan
                        </div>
                      ) : (
                        showHistory.installments.map((inst: any) => {
                          const isOverdue = inst.status === 'pending' && new Date(inst.due_date) < new Date();
                          return (
                            <div key={inst.id} className={`p-4 rounded-2xl border transition-all ${isOverdue ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-50'}`}>
                               <div className="flex items-center justify-between">
                                  <div>
                                     <p className="text-sm font-black text-slate-900">₹{inst.amount.toLocaleString()}</p>
                                     <p className={`text-[9px] font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                       Due: {new Date(inst.due_date).toLocaleDateString()}
                                       {isOverdue && " (OVERDUE)"}
                                     </p>
                                  </div>
                                  {inst.status === 'pending' ? (
                                    <button 
                                      onClick={() => {
                                        const hist = showHistory;
                                        setShowHistory(null);
                                        setShowPayment(hist);
                                        setPaymentData({ ...paymentData, amount: Number(inst.amount) });
                                      }}
                                      className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                      Pay
                                    </button>
                                  ) : (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase">Paid</span>
                                  )}
                               </div>
                            </div>
                          );
                        })
                      )}
                   </div>
                </div>

                {/* History Section */}
                <div className="p-8 space-y-4">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <History size={14}/> Transaction History
                   </h5>
                   <div className="space-y-3">
                      {(!showHistory.payments || showHistory.payments.length === 0) ? (
                        <div className="py-10 text-center text-slate-300 text-xs font-bold">No transactions.</div>
                      ) : (
                        showHistory.payments.map((pay: any, index: number) => (
                          <div key={`${pay.id}-${index}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 group">
                             <div>
                                <p className="text-xs font-black text-slate-900">₹{pay.amount.toLocaleString()}</p>
                                <p className="text-[9px] font-bold text-slate-400">{new Date(pay.payment_date).toLocaleDateString()} • {pay.payment_mode}</p>
                             </div>
                             <button onClick={() => window.print()} className="p-2 text-slate-300 hover:text-indigo-600 transition-all">
                               <Download size={14}/>
                             </button>
                          </div>
                        ))
                      )}
                   </div>
                </div>
             </div>
             
             <div className="p-8 bg-slate-50 flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Transactions: {showHistory.payments?.length || 0}</p>
                <button onClick={() => setShowHistory(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black">Close History</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, amount, icon, color, sub }: any) {
  return (
    <div className={`p-8 rounded-[2.5rem] border border-white shadow-sm ${color} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-20 transform scale-150">{icon}</div>
      <div className="relative z-10 space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">₹{amount.toLocaleString()}</h3>
        <p className="text-[10px] font-bold text-slate-500 opacity-60">{sub}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = { paid: "bg-emerald-50 text-emerald-700", partial: "bg-blue-50 text-blue-700", due: "bg-rose-50 text-rose-700" };
  const labels: any = { paid: "Paid", partial: "Partial", due: "Due" };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
