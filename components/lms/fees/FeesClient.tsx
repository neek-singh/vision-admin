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
  ChevronDown,
  MessageCircle,
  FileSpreadsheet,
  ArrowUpDown,
  Copy,
  Check,
  Send,
  Smartphone,
  Banknote
} from "lucide-react";
import { setupStudentFee, recordPayment, deleteFeeRecord, deletePayment, incrementStudentFee } from "@/app/actions/lms/fees";

// Helper: Get the latest due month key (YYYY-MM) and name
// Students pay fee for Month M in Month M+1 (e.g. September fee is paid in October)
export const getLatestDueMonth = (date = new Date()) => {
  const due = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const yyyy = due.getFullYear();
  const mm = String(due.getMonth() + 1).padStart(2, "0");
  return {
    key: `${yyyy}-${mm}`,
    shortName: due.toLocaleDateString("en-US", { month: "short" }),
    longName: due.toLocaleDateString("en-US", { month: "long" }),
    year: yyyy,
    monthNum: due.getMonth() + 1,
    formatted: due.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  };
};

// Helper: Calculate complete month-by-month status adhering to 1-month delayed billing (M paid in M+1)
export const getStudentMonthStatus = (fee: any, currentDate = new Date()) => {
  const studentInfo = fee.students as any;
  const isDropout = studentInfo?.status === "dropped_out";
  const totalPaid = (fee.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const totalPayable = Number(fee.final_fee || 0) + Number(fee.increment_amount || 0);
  const balance = totalPayable - totalPaid;

  // If entire course fee is cleared, no unpaid months
  if (balance <= 0) {
    return {
      unpaidMonths: [] as string[],
      allDueMonths: [] as string[],
      isMonthPaid: (_targetKey?: string) => true,
      paidMonthsCount: 999,
      dueMonths: []
    };
  }

  // 1. If explicit installments exist
  if (fee.installments && fee.installments.length > 0) {
    const pendingInst = fee.installments.filter((inst: any) => inst.status === "pending");
    const todayStr = currentDate.toISOString().split("T")[0];
    const dueInst = pendingInst.filter((inst: any) => !inst.due_date || inst.due_date <= todayStr);
    const unpaidMonths = dueInst.map((inst: any) => {
      if (!inst.due_date) return "Installment Due";
      const [y, m] = inst.due_date.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    });
    return {
      unpaidMonths,
      allDueMonths: unpaidMonths,
      isMonthPaid: (targetKey?: string) => {
        if (!targetKey) return false;
        return !dueInst.some((inst: any) => inst.due_date && inst.due_date.startsWith(targetKey));
      },
      paidMonthsCount: fee.installments.length - pendingInst.length,
      dueMonths: []
    };
  }

  // 2. Standard monthly tuition tracking (Month M is paid in Month M+1)
  const monthlyRate = 1000;
  const courseFeePaid = (fee.payments || []).reduce((sum: number, p: any) => {
    const cf = Number(p.course_fee || 0);
    if (cf > 0) return sum + cf;
    const reg = Number(p.registration_fee || 0);
    const exam = Number(p.exam_fee || 0);
    if (reg === 0 && exam === 0) return sum + Number(p.amount || 0);
    return sum;
  }, 0);

  const paidMonthsCount = Math.floor(courseFeePaid / monthlyRate);

  const createdDate = fee.created_at ? new Date(fee.created_at) : new Date();
  const start = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1);
  // In month M+1, fee for month M is due. So latest due month is currentDate - 1 month
  let end = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

  if (isDropout && studentInfo?.dropout_date) {
    const dropDate = new Date(studentInfo.dropout_date);
    if (!isNaN(dropDate.getTime())) {
      const dropMonth = new Date(dropDate.getFullYear(), dropDate.getMonth(), 1);
      if (dropMonth < end) end = dropMonth;
    }
  }

  if (start > end) {
    return {
      unpaidMonths: [] as string[],
      allDueMonths: [] as string[],
      isMonthPaid: (_targetKey?: string) => true,
      paidMonthsCount,
      dueMonths: []
    };
  }

  const dueMonths: { key: string; label: string; shortName: string }[] = [];
  const iter = new Date(start);
  while (iter <= end) {
    const yyyy = iter.getFullYear();
    const mm = String(iter.getMonth() + 1).padStart(2, "0");
    dueMonths.push({
      key: `${yyyy}-${mm}`,
      label: iter.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      shortName: iter.toLocaleDateString("en-US", { month: "short" })
    });
    iter.setMonth(iter.getMonth() + 1);
  }

  const unpaidMonths: string[] = [];
  dueMonths.forEach((m, idx) => {
    if (idx >= paidMonthsCount) {
      unpaidMonths.push(m.label);
    }
  });

  const allDueMonths = dueMonths.map(m => m.label);

  const isMonthPaid = (targetKey?: string) => {
    if (!targetKey) return false;
    const idx = dueMonths.findIndex(m => m.key === targetKey);
    if (idx === -1) {
      const [ty, tm] = targetKey.split("-");
      const targetDate = new Date(Number(ty), Number(tm) - 1, 1);
      if (targetDate < start) return true; // not yet enrolled in that month
      return false;
    }
    return idx < paidMonthsCount;
  };

  return {
    unpaidMonths,
    allDueMonths,
    isMonthPaid,
    paidMonthsCount,
    dueMonths
  };
};

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
  const [showIncrement, setShowIncrement] = useState<any | null>(null);
  const [incrementAmount, setIncrementAmount] = useState<number>(0);
  
  // Monthly Fee Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState<any | null>(null);
  const [reminderMonthlyRate, setReminderMonthlyRate] = useState<number>(1000);
  const [selectedUnpaidMonths, setSelectedUnpaidMonths] = useState<string[]>([]);
  const [reminderCandidateMonths, setReminderCandidateMonths] = useState<string[]>([]);
  const [reminderCustomPhone, setReminderCustomPhone] = useState<string>("");
  const [customReminderMessage, setCustomReminderMessage] = useState<string | null>(null);
  const [copiedSMS, setCopiedSMS] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, paid, partial, due
  const [courseFilter, setCourseFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState("active"); // default: active students only (excludes dropped_out)
  const [sortBy, setSortBy] = useState<"default" | "balance_desc" | "balance_asc" | "name_asc" | "fee_desc">("default");

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
    transaction_id: "",
    payment_date: "",
    fee_type: "course" // "course", "registration", "exam"
  });

  // Dynamically extract unique months from all fees and payments
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    
    // Add months from fee creation dates
    initialFees.forEach(fee => {
      if (fee.created_at) {
        months.add(fee.created_at.substring(0, 7)); // "YYYY-MM"
      }
      // Add months from payments
      fee.payments?.forEach((p: any) => {
        if (p.payment_date) {
          months.add(p.payment_date.substring(0, 7));
        }
      });
    });

    // Also ensure current month is in the list
    const currentMonth = new Date().toISOString().substring(0, 7);
    months.add(currentMonth);

    // Convert to sorted array (descending)
    return Array.from(months).sort().reverse();
  }, [initialFees]);

  // Dynamically compute the income for the selected month
  const selectedMonthIncome = useMemo(() => {
    const targetMonth = monthFilter === "all" ? new Date().toISOString().substring(0, 7) : monthFilter;
    
    return initialFees.reduce((acc, fee) => {
      const monthPayments = fee.payments?.filter((p: any) => p.payment_date && p.payment_date.substring(0, 7) === targetMonth) || [];
      const sum = monthPayments.reduce((sumAcc: number, p: any) => sumAcc + Number(p.amount), 0);
      return acc + sum;
    }, 0);
  }, [initialFees, monthFilter]);

  // Card headers based on selected month
  const monthCardTitle = useMemo(() => {
    if (monthFilter === "all") return "This Month Income";
    const [year, month] = monthFilter.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    return `${monthName} Income`;
  }, [monthFilter]);

  const monthCardSub = useMemo(() => {
    if (monthFilter === "all") return "Collected this month";
    const [year, month] = monthFilter.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "long" });
    return `Collected in ${monthName}`;
  }, [monthFilter]);

  // Memoized Filtered & Sorted Fees
  const filteredFees = useMemo(() => {
    const defaultDue = getLatestDueMonth();
    const targetMonthKey = monthFilter === "all" ? defaultDue.key : monthFilter;

    const list = initialFees.filter(fee => {
      const student = fee.students as any;
      if (!student || student?.is_deleted) return false;
      const course = fee.courses as any;
      
      const matchesSearch = 
        !searchTerm.trim() ||
        student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      const studentStatus = student?.status || "active";
      const isDropout = studentStatus === "dropped_out";

      // Calculate total paid and overall balance
      const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
      const totalPayable = Number(fee.final_fee) + Number(fee.increment_amount || 0);
      const balance = totalPayable - totalPaid;
      const hasBalance = balance > 0;

      // Smart dynamic status: resolves discrepancy when balance is 0 or advance
      const computedStatus = isDropout ? "dropped_out" : balance <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";

      // Check whether targetMonth fee is paid
      const monthStatus = getStudentMonthStatus(fee);
      const isMonthPaid = monthStatus.isMonthPaid(targetMonthKey);

      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "unpaid_month" 
          ? (!isDropout && hasBalance && !isMonthPaid) 
          : computedStatus === statusFilter);

      const matchesCourse = 
        courseFilter === "all" || 
        fee.course_id === courseFilter;

      const matchesStudentStatus = 
        studentStatusFilter === "all" ||
        (studentStatusFilter === "active" && !isDropout) ||
        (studentStatusFilter === "dropped_out" && isDropout);

      const matchesMonth =
        statusFilter === "unpaid_month" || // bypass month check to show all unpaid students
        monthFilter === "all" ||
        (fee.created_at && fee.created_at.substring(0, 7) === monthFilter) ||
        (fee.payments && fee.payments.some((p: any) => p.payment_date && p.payment_date.substring(0, 7) === monthFilter));

      return matchesSearch && matchesStatus && matchesCourse && matchesMonth && matchesStudentStatus;
    });

    // Apply sorting
    if (sortBy === "balance_desc") {
      list.sort((a, b) => {
        const balA = (Number(a.final_fee) + Number(a.increment_amount || 0)) - (a.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0);
        const balB = (Number(b.final_fee) + Number(b.increment_amount || 0)) - (b.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0);
        return balB - balA;
      });
    } else if (sortBy === "balance_asc") {
      list.sort((a, b) => {
        const balA = (Number(a.final_fee) + Number(a.increment_amount || 0)) - (a.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0);
        const balB = (Number(b.final_fee) + Number(b.increment_amount || 0)) - (b.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0);
        return balA - balB;
      });
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => ((a.students as any)?.name || "").localeCompare((b.students as any)?.name || ""));
    } else if (sortBy === "fee_desc") {
      list.sort((a, b) => (Number(b.final_fee) + Number(b.increment_amount || 0)) - (Number(a.final_fee) + Number(a.increment_amount || 0)));
    }

    return list;
  }, [initialFees, searchTerm, statusFilter, courseFilter, monthFilter, studentStatusFilter, sortBy]);

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
    const registration_fee = paymentData.fee_type === 'registration' ? paymentData.amount : 0;
    const course_fee = paymentData.fee_type === 'course' ? paymentData.amount : 0;
    const exam_fee = paymentData.fee_type === 'exam' ? paymentData.amount : 0;

    const result = await recordPayment({
      fee_id: showPayment.id,
      student_id: showPayment.student_id,
      ...paymentData,
      registration_fee,
      course_fee,
      exam_fee
    });
    if (result.success) {
      setShowPayment(null);
      setPaymentData({ 
        amount: 0, 
        payment_mode: "cash", 
        transaction_id: "",
        payment_date: "",
        fee_type: "course"
      });
      alert("Payment recorded!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const handleIncrementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incrementAmount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    setLoading(true);
    const result = await incrementStudentFee(showIncrement.id, incrementAmount);
    if (result.success) {
      setShowIncrement(null);
      setIncrementAmount(0);
      alert("Fee increased successfully!");
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

  const handleDeletePayment = async (paymentId: string, feeId: string) => {
    if (!confirm("Are you sure you want to delete this payment transaction? This will update the student's payment status and installment schedule.")) return;
    setLoading(true);
    const result = await deletePayment(paymentId, feeId);
    if (result.success) {
      alert("Payment transaction deleted successfully!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  // Keep showHistory in sync with updated initialFees
  useEffect(() => {
    if (showHistory) {
      const updatedFee = initialFees.find(f => f.id === showHistory.id);
      if (updatedFee) {
        setShowHistory(updatedFee);
      }
    }
  }, [initialFees, showHistory]);

  const receiptSharedCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 12px;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 24px;
    }
    .receipt-container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .hd {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #cbd5e1;
      margin-bottom: 14px;
    }
    .hd img {
      width: 46px;
      height: 46px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .hd-info { flex: 1; }
    .hd-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .hd-addr {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .doc-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0f172a;
    }
    .doc-date {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
    }
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 18px;
    }
    .info-cell {
      display: flex;
      flex-direction: column;
    }
    .info-cell.full {
      grid-column: span 2;
    }
    .info-lbl {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .info-val {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
    }
    .info-val.mono {
      font-family: 'Courier New', monospace;
      font-size: 11.5px;
    }
    .sec-head {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      margin-bottom: 8px;
    }
    .pay-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    .pay-table th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      background: #f8fafc;
      padding: 8px 10px;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .pay-table th:last-child {
      text-align: right;
    }
    .pay-table td {
      font-size: 11px;
      color: #334155;
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .pay-table td:last-child {
      text-align: right;
    }
    .ref-no {
      font-family: 'Courier New', monospace;
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .breakdown-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .bd-chip {
      font-size: 9.5px;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    .total-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      padding: 10px 16px;
      border-radius: 6px;
      margin-bottom: 22px;
    }
    .total-box-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #334155;
    }
    .total-box-val {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .footer {
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-msg {
      font-size: 9.5px;
      color: #94a3b8;
      font-weight: 500;
    }
    .sig-block {
      text-align: center;
      font-size: 9.5px;
      color: #64748b;
    }
    .sig-line {
      width: 90px;
      border-top: 1px solid #94a3b8;
      margin: 0 auto 4px auto;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .receipt-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
    }
  `;

  const renderStudentReceiptStatementHtml = (data: {
    studentName: string;
    studentId: string;
    courseTitle: string;
    payments: Array<{
      paymentDate: string;
      paymentMode: string;
      transactionId?: string | null;
      amount: number;
      registrationFee?: number;
      courseFee?: number;
      examFee?: number;
    }>;
    receiptTitle?: string;
  }, index = 0, total = 1) => {
    const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "/logo.png";
    const totalAmountPaid = data.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const formatBreakdown = (p: any) => {
      const parts: string[] = [];
      const reg = Number(p.registrationFee || 0);
      const crs = Number(p.courseFee || 0);
      const exm = Number(p.examFee || 0);
      if (reg > 0) parts.push(`Registration Fee`);
      if (crs > 0) parts.push(`Course Fee`);
      if (exm > 0) parts.push(`Exam Fee`);
      if (parts.length === 0) {
        parts.push(`Course Fee`);
      }
      return parts.map(t => `<span class="bd-chip">${t}</span>`).join(' ');
    };

    const formatPaymentMode = (mode: string) => {
      if (!mode) return 'N/A';
      const clean = String(mode).trim();
      if (clean.toLowerCase() === 'upi') return 'UPI';
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    };

    return `
      <div class="receipt-container" style="${index > 0 ? 'page-break-before: always; margin-top: 30px;' : ''}">
        <div class="hd">
          <img src="${logoUrl}" alt="Logo" />
          <div class="hd-info">
            <div class="hd-name">VISION IT COMPUTER INSTITUTE</div>
            <div class="hd-addr">Kadampara Chowk, Pratappur, Surajpur (C.G.) — 497223</div>
          </div>
        </div>

        <div class="title-row">
          <div class="doc-title">${data.receiptTitle || "PAYMENT RECEIPT"}</div>
          <div class="doc-date">Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="student-info-grid">
          <div class="info-cell">
            <span class="info-lbl">STUDENT NAME</span>
            <span class="info-val">${data.studentName}</span>
          </div>
          <div class="info-cell">
            <span class="info-lbl">STUDENT ID</span>
            <span class="info-val mono">${data.studentId}</span>
          </div>
          <div class="info-cell full">
            <span class="info-lbl">COURSE ENROLLED</span>
            <span class="info-val">${data.courseTitle}</span>
          </div>
        </div>

        <div class="sec-head">PAYMENT HISTORY</div>
        <table class="pay-table">
          <thead>
            <tr>
              <th style="width: 28px;">#</th>
              <th>PAYMENT DATE</th>
              <th>PAYMENT MODE</th>
              <th>FEE BREAKDOWN</th>
              <th style="text-align: right;">AMOUNT PAID</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments.map((p, idx) => `
              <tr>
                <td style="color: #94a3b8; font-size: 10px;">${idx + 1}</td>
                <td style="font-weight: 500;">${p.paymentDate}</td>
                <td>
                  ${formatPaymentMode(p.paymentMode)}
                  ${p.transactionId ? `<div class="ref-no">Ref: ${p.transactionId}</div>` : ''}
                </td>
                <td>
                  <div class="breakdown-tags">
                    ${formatBreakdown(p)}
                  </div>
                </td>
                <td style="font-weight: 700; color: #0f172a;">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <span class="total-box-lbl">TOTAL AMOUNT PAID</span>
          <span class="total-box-val">₹${totalAmountPaid.toLocaleString('en-IN')}</span>
        </div>

        <div class="footer">
          <div class="footer-msg">Thank you for your payment!</div>
          <div class="sig-block">
            <div class="sig-line"></div>
            Authorised Signatory
          </div>
        </div>
      </div>
    `;
  };

  const handleDownloadReceipt = (pay: any, student: any, course: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Please allow popups to download/print receipts.");
      return;
    }

    const studentData = {
      studentName: student?.name || "Student",
      studentId: student?.student_id || student?.roll_no || "N/A",
      courseTitle: course?.title || "N/A",
      receiptTitle: "PAYMENT RECEIPT",
      payments: [{
        paymentDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
        paymentMode: pay.payment_mode || 'N/A',
        transactionId: pay.transaction_id,
        amount: Number(pay.amount || 0),
        registrationFee: Number(pay.registration_fee || 0),
        courseFee: Number(pay.course_fee || 0),
        examFee: Number(pay.exam_fee || 0)
      }]
    };

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Receipt — ${pay.transaction_id || pay.id || 'payment'}</title>
        <style>${receiptSharedCSS}</style>
      </head>
      <body>
        ${renderStudentReceiptStatementHtml(studentData, 0, 1)}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleDownloadAllCourseReceipts = (courseId: string) => {
    const courseFees = initialFees.filter(fee => fee.course_id === courseId && fee.payments && fee.payments.length > 0);

    if (courseFees.length === 0) {
      alert("No payment transactions recorded for students in this course.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Please allow popups to download/print receipts.");
      return;
    }

    const selectedCourseTitle = courses.find(c => c.id === courseId)?.title || 'Course';

    const studentsToPrint = courseFees.map(fee => ({
      studentName: fee.students?.name || 'Student',
      studentId: fee.students?.student_id || fee.students?.roll_no || 'N/A',
      courseTitle: fee.courses?.title || selectedCourseTitle,
      receiptTitle: "COURSE FEE RECEIPT STATEMENT",
      payments: fee.payments.map((pay: any) => ({
        paymentDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
        paymentMode: pay.payment_mode || 'N/A',
        transactionId: pay.transaction_id,
        amount: Number(pay.amount || 0),
        registrationFee: Number(pay.registration_fee || 0),
        courseFee: Number(pay.course_fee || 0),
        examFee: Number(pay.exam_fee || 0)
      }))
    }));

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Receipts — ${selectedCourseTitle.replace(/\\s+/g, '_')}</title>
        <style>${receiptSharedCSS}</style>
      </head>
      <body>
        ${studentsToPrint.map((st, idx) => renderStudentReceiptStatementHtml(st, idx, studentsToPrint.length)).join('')}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleDownloadAllStudentReceipts = (feeRecord: any) => {
    if (!feeRecord?.payments || feeRecord.payments.length === 0) {
      alert("No payment transactions recorded for this student.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Please allow popups to download/print receipts.");
      return;
    }

    const studentName = feeRecord.students?.name || 'Student';
    const studentId = feeRecord.students?.student_id || feeRecord.students?.roll_no || 'N/A';
    const courseTitle = feeRecord.courses?.title || 'N/A';

    const studentData = {
      studentName,
      studentId,
      courseTitle,
      receiptTitle: "FEE PAYMENT STATEMENT",
      payments: feeRecord.payments.map((pay: any) => ({
        paymentDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
        paymentMode: pay.payment_mode || 'N/A',
        transactionId: pay.transaction_id,
        amount: Number(pay.amount || 0),
        registrationFee: Number(pay.registration_fee || 0),
        courseFee: Number(pay.course_fee || 0),
        examFee: Number(pay.exam_fee || 0)
      }))
    };

    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Receipt Statement — ${studentName.replace(/\\s+/g, '_')}</title>
        <style>${receiptSharedCSS}</style>
      </head>
      <body>
        ${renderStudentReceiptStatementHtml(studentData, 0, 1)}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  // Helper: Detect unpaid months for a student
  const getUnpaidMonths = (fee: any) => {
    return getStudentMonthStatus(fee).unpaidMonths;
  };

  // Open the Reminder Modal with intelligent defaults
  const handleOpenReminderModal = (fee: any, balance: number) => {
    const { unpaidMonths, allDueMonths } = getStudentMonthStatus(fee);
    setSelectedUnpaidMonths(unpaidMonths);
    setReminderCandidateMonths(allDueMonths.length > 0 ? allDueMonths : (unpaidMonths.length > 0 ? unpaidMonths : [getLatestDueMonth().formatted]));
    setReminderMonthlyRate(1000); // Default ₹1,000 per month
    setReminderCustomPhone((fee.students as any)?.phone || "");
    setCustomReminderMessage(null);
    setCopiedSMS(false);
    setShowReminderModal({ fee, balance });
  };

  // Generated Reminder Message string (Devnagari Hindi)
  const generatedReminderMessage = useMemo(() => {
    if (!showReminderModal) return "";
    const student = showReminderModal.fee.students as any;
    const course = showReminderModal.fee.courses as any;
    const studentName = student?.name || "Student";
    const courseTitle = course?.title || "Computer Course";
    
    const monthsText = selectedUnpaidMonths.length > 0 
      ? selectedUnpaidMonths.join(", ") 
      : "Current Month";

    const totalCalculatedDue = selectedUnpaidMonths.length > 0 
      ? selectedUnpaidMonths.length * reminderMonthlyRate 
      : reminderMonthlyRate;

    return `Dear ${studentName},\n\nयह Vision IT Computer Institute की तरफ से आपकी मासिक फीस (Monthly Fees) का रिमाइंडर नोटिस है।\n\n📚 Course: ${courseTitle}\n🗓️ बकाया माह (Pending Months): ${monthsText}\n💰 मासिक फीस (Monthly Due): ₹${reminderMonthlyRate.toLocaleString('en-IN')} (कुल fee: ₹${totalCalculatedDue.toLocaleString('en-IN')})\n\nकृपया अपनी मासिक फीस समय पर इंस्टीट्यूट ऑफिस में जमा करें या ऑनलाइन UPI से भुगतान करें।\n\nकिसी भी जानकारी या सहायता के लिए संपर्क करें:\n📞 +91 81031 70595\n\nThank You! 🙏\nVision IT Computer Institute`;
  }, [showReminderModal, selectedUnpaidMonths, reminderMonthlyRate]);

  // Send via WhatsApp from modal
  const handleSendWhatsAppFromModal = () => {
    if (!showReminderModal) return;
    let phone = reminderCustomPhone.replace(/[^0-9]/g, "");
    if (!phone) {
      alert("Please enter a valid mobile number.");
      return;
    }
    if (phone.length === 10) {
      phone = `91${phone}`;
    }
    const messageToSend = customReminderMessage !== null ? customReminderMessage : generatedReminderMessage;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageToSend)}`;
    window.open(url, "_blank");
  };

  // Copy SMS text from modal
  const handleCopySMS = async () => {
    try {
      const messageToSend = customReminderMessage !== null ? customReminderMessage : generatedReminderMessage;
      await navigator.clipboard.writeText(messageToSend);
      setCopiedSMS(true);
      setTimeout(() => setCopiedSMS(false), 2500);
    } catch {
      alert("Unable to copy to clipboard automatically. Please copy the message manually.");
    }
  };

  // 1-Click WhatsApp Fee Reminder handler (opens modal)
  const handleWhatsAppReminder = (fee: any, balance: number) => {
    handleOpenReminderModal(fee, balance);
  };

  // 1-Click Export Filtered Ledger to CSV
  const handleExportCSV = () => {
    if (filteredFees.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Student ID",
      "Phone",
      "Course",
      "Total Fee",
      "Discount",
      "Extra Amount",
      "Paid Amount",
      "Balance",
      "Status"
    ];

    const rows = filteredFees.map(fee => {
      const student = fee.students as any;
      const course = fee.courses as any;
      const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
      const finalFee = Number(fee.final_fee) + Number(fee.increment_amount || 0);
      const balance = finalFee - totalPaid;
      const status = balance <= 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Due";

      return [
        `"${(student?.name || "").replace(/"/g, '""')}"`,
        `"${(student?.student_id || "").replace(/"/g, '""')}"`,
        `"${(student?.phone || "").replace(/"/g, '""')}"`,
        `"${(course?.title || "").replace(/"/g, '""')}"`,
        finalFee,
        fee.discount || 0,
        fee.increment_amount || 0,
        totalPaid,
        balance,
        status
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `Vision_Fees_Ledger_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="space-y-4 animate-in fade-in duration-300 pb-12">
      
      {/* Analytics KPI Row 1: Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Total Collection</span>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              ₹{stats.totalCollection.toLocaleString()}
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5">Overall received fees</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-center shrink-0">
            <Wallet size={19} />
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Total Outstanding</span>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              ₹{stats.totalPending.toLocaleString()}
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5">Remaining balance due</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 flex items-center justify-center shrink-0">
            <AlertCircle size={19} />
          </div>
        </div>

        {/* Collection Ratio with Integrated Compact Radial */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <Sparkles size={11} className="text-amber-500" /> Collection Ratio
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              {collectionPercentage}% <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Received</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block mt-0.5 truncate">
              ₹{stats.totalCollection.toLocaleString()} of ₹{totalOverall.toLocaleString()}
            </span>
          </div>

          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="19"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="4.5"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="19"
                className="stroke-emerald-500 transition-all duration-700"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 19}
                strokeDashoffset={(2 * Math.PI * 19) - (collectionPercentage / 100) * (2 * Math.PI * 19)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[11px] font-black text-slate-900 dark:text-white">{collectionPercentage}%</span>
          </div>
        </div>
      </div>

      {/* Analytics KPI Row 2: Cash Flow Velocity (Today, This Week, This Month) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Today Income */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Today Income</span>
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              ₹{stats.todayCollection.toLocaleString()}
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">Collected today</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-center shrink-0">
            <TrendingUp size={16} />
          </div>
        </div>

        {/* This Week Income */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">This Week Income</span>
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              ₹{(stats.weeklyCollection || 0).toLocaleString()}
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">Collected this week</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 flex items-center justify-center shrink-0">
            <CalendarCheck size={16} />
          </div>
        </div>

        {/* This Month Income */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">{monthCardTitle}</span>
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white mt-0.5">
              ₹{selectedMonthIncome.toLocaleString()}
            </div>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">{monthCardSub}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30 flex items-center justify-center shrink-0">
            <Calendar size={16} />
          </div>
        </div>
      </div>

      {/* Payment Mode Distribution Bar */}
      {stats.paymentModes && stats.totalCollection > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Payment Mode Breakdown
            </span>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> Cash: ₹{(stats.paymentModes.cash || 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span> UPI / Online: ₹{(stats.paymentModes.online || 0).toLocaleString()}
              </span>
              {(stats.paymentModes.bank || 0) > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-purple-600 dark:text-purple-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span> Bank: ₹{(stats.paymentModes.bank || 0).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {stats.paymentModes.cash > 0 && (
              <div 
                style={{ width: `${(stats.paymentModes.cash / stats.totalCollection) * 100}%` }} 
                className="bg-emerald-500 h-full" 
                title={`Cash: ₹${stats.paymentModes.cash.toLocaleString()}`}
              />
            )}
            {stats.paymentModes.online > 0 && (
              <div 
                style={{ width: `${(stats.paymentModes.online / stats.totalCollection) * 100}%` }} 
                className="bg-blue-500 h-full" 
                title={`Online/UPI: ₹${stats.paymentModes.online.toLocaleString()}`}
              />
            )}
            {stats.paymentModes.bank > 0 && (
              <div 
                style={{ width: `${(stats.paymentModes.bank / stats.totalCollection) * 100}%` }} 
                className="bg-purple-500 h-full" 
                title={`Bank: ₹${stats.paymentModes.bank.toLocaleString()}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Actions, Search, & Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        
        {/* Table Header Section */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Financial Records</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {filteredFees.length} records
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Student billings, installments, and payment ledger</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Export current filtered records to CSV for Excel / Audit"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> Export CSV
            </button>
            <button 
              onClick={() => setShowSetup(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <PlusCircle size={14} /> New Billing Setup
            </button>
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 justify-between">
           {/* Search field */}
           <div className="relative w-full lg:w-64 shrink-0">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
             <input 
               type="text"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Search student or course..."
               className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition-all"
             />
             {searchTerm && (
               <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"><X size={12}/></button>
             )}
           </div>

           {/* Filter controls */}
           <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
             {/* Course filter select */}
             <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 gap-1.5 shrink-0 text-xs">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Course:</span>
               <select 
                 value={courseFilter}
                 onChange={(e) => setCourseFilter(e.target.value)}
                 className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 border-none outline-none py-0.5 cursor-pointer max-w-[140px] truncate"
               >
                 <option value="all">All Courses</option>
                 {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>)}
               </select>
             </div>

             {/* Month filter select */}
             <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 gap-1.5 shrink-0 text-xs">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Month:</span>
               <select 
                 value={monthFilter}
                 onChange={(e) => setMonthFilter(e.target.value)}
                 className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 border-none outline-none py-0.5 cursor-pointer"
               >
                 <option value="all">All Months</option>
                 {availableMonths.map(ym => {
                   const [year, month] = ym.split("-");
                   const date = new Date(Number(year), Number(month) - 1, 1);
                   const formatted = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                   return <option key={ym} value={ym} className="dark:bg-slate-900">{formatted}</option>;
                 })}
               </select>
             </div>

             {/* Student status filter */}
             <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 gap-1.5 shrink-0 text-xs">
               <span className="text-[10px] font-bold text-slate-400 uppercase">Student:</span>
               <select 
                 value={studentStatusFilter}
                 onChange={(e) => setStudentStatusFilter(e.target.value)}
                 className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 border-none outline-none py-0.5 cursor-pointer"
               >
                 <option value="active">Active Only</option>
                 <option value="dropped_out">Dropped Out (Left)</option>
                 <option value="all">All Records</option>
               </select>
             </div>

             {/* Sort selector */}
             <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 gap-1 shrink-0 text-xs">
               <ArrowUpDown size={11} className="text-slate-400" />
               <select
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value as any)}
                 className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 border-none outline-none py-0.5 cursor-pointer"
               >
                 <option value="default">Sort: Default</option>
                 <option value="balance_desc">Highest Balance</option>
                 <option value="balance_asc">Lowest Balance</option>
                 <option value="name_asc">Name (A-Z)</option>
                 <option value="fee_desc">Highest Fee</option>
               </select>
             </div>

             {courseFilter !== "all" && (
               <button
                 type="button"
                 onClick={() => handleDownloadAllCourseReceipts(courseFilter)}
                 className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all border border-emerald-200/50 dark:border-emerald-900/30 shrink-0"
                 title="Download All Receipts for Selected Course"
               >
                 <Download size={13} /> Bulk Receipts
               </button>
             )}

             {/* Status Badge filter tabs */}
             <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
               {[
                 { id: "all", label: "All" },
                 { id: "paid", label: "Paid" },
                 { id: "partial", label: "Partial" },
                 { id: "due", label: "Due" },
                 { 
                    id: "unpaid_month", 
                    label: monthFilter === "all" ? `Unpaid (${getLatestDueMonth().shortName})` : "Unpaid" 
                  }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setStatusFilter(tab.id)}
                   className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                     statusFilter === tab.id 
                       ? "bg-white text-slate-900 shadow-2xs font-bold dark:bg-slate-900 dark:text-white"
                       : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
            <div className="px-6 py-12 text-center text-slate-400 font-medium text-xs">
              No matching financial records found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/30 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-2.5">
                    <button 
                      type="button"
                      onClick={() => setSortBy(prev => prev === "name_asc" ? "default" : "name_asc")}
                      className="flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Student <ArrowUpDown size={11} className={sortBy === "name_asc" ? "text-blue-600 dark:text-blue-400" : ""} />
                    </button>
                  </th>
                  <th className="px-4 py-2.5">Course</th>
                  <th className="px-4 py-2.5">
                    <button 
                      type="button"
                      onClick={() => setSortBy(prev => prev === "fee_desc" ? "default" : "fee_desc")}
                      className="flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Final Fee <ArrowUpDown size={11} className={sortBy === "fee_desc" ? "text-blue-600 dark:text-blue-400" : ""} />
                    </button>
                  </th>
                  <th className="px-4 py-2.5">Paid</th>
                  <th className="px-4 py-2.5">
                    <button 
                      type="button"
                      onClick={() => setSortBy(prev => prev === "balance_desc" ? "balance_asc" : prev === "balance_asc" ? "default" : "balance_desc")}
                      className="flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Balance <ArrowUpDown size={11} className={sortBy.startsWith("balance") ? "text-rose-600 dark:text-rose-400" : ""} />
                    </button>
                  </th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredFees.map((fee) => {
                  const isDropout = (fee.students as any)?.status === "dropped_out";
                  const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
                  const totalPayable = Number(fee.final_fee) + Number(fee.increment_amount || 0);
                  const balance = totalPayable - totalPaid;
                  const computedStatus = isDropout ? "dropped_out" : balance <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";

                  // Active month fee tracking (Month M is paid in Month M+1, e.g. September fee in October)
                  const defaultDue = getLatestDueMonth();
                  const activeMonthKey = monthFilter === "all" ? defaultDue.key : monthFilter;
                  const [activeYear, activeMonthNum] = activeMonthKey.split("-");
                  const activeMonthName = new Date(Number(activeYear), Number(activeMonthNum) - 1, 1).toLocaleDateString("en-US", { month: "short" });
                  
                  const monthStatus = getStudentMonthStatus(fee);
                  const isTargetMonthPaid = monthStatus.isMonthPaid(activeMonthKey);

                  return (
                    <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">{(fee.students as any)?.name}</span>
                          {isDropout && (
                            <span 
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 shrink-0" 
                              title={`Left on ${(fee.students as any)?.dropout_date || 'N/A'}${(fee.students as any)?.dropout_reason ? ` • ${(fee.students as any)?.dropout_reason}` : ''}`}
                            >
                              Left
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{(fee.students as any)?.student_id}</div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">{(fee.courses as any)?.title || "N/A"}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">₹{totalPayable.toLocaleString()}</div>
                        {fee.discount > 0 && <span className="text-[9px] font-semibold text-rose-500 block">Disc: -₹{fee.discount.toLocaleString()}</span>}
                        {fee.increment_amount > 0 && <span className="text-[9px] font-semibold text-amber-500 block">Extra: +₹{fee.increment_amount.toLocaleString()}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          ₹{totalPaid.toLocaleString()}
                        </div>
                        {isDropout ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                            Left on {(fee.students as any)?.dropout_date || "N/A"}
                          </span>
                        ) : balance <= 0 ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                            Cleared
                          </span>
                        ) : isTargetMonthPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-200/50 dark:border-emerald-800/40" title={`${activeMonthName} fee is paid`}>
                            ✓ {activeMonthName}: Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.5 rounded-md mt-0.5 border border-rose-200/50 dark:border-rose-800/40" title={`${activeMonthName} fee is due/unpaid`}>
                            ✗ {activeMonthName}: Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isDropout ? (
                          <div>
                            <span className="font-semibold text-xs text-slate-400 dark:text-slate-500 line-through">
                              ₹{balance.toLocaleString()}
                            </span>
                            <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500">
                              Discontinued
                            </span>
                          </div>
                        ) : balance < 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                            ₹{Math.abs(balance).toLocaleString()} Adv
                          </span>
                        ) : balance === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 font-semibold text-xs inline-flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> ₹0
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-rose-600 dark:text-rose-400">
                            ₹{balance.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={computedStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                           {/* 1-Click WhatsApp Fee Due Reminder */}
                           {balance > 0 && !isDropout && (
                             <button
                               type="button"
                               onClick={() => handleWhatsAppReminder(fee, balance)}
                               className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-all cursor-pointer"
                               title={`Send WhatsApp fee reminder to ${(fee.students as any)?.name}`}
                             >
                               <MessageCircle size={15} className="fill-emerald-600/10" />
                             </button>
                           )}
                           <button 
                            onClick={() => {
                              setShowPayment(fee);
                              const today = new Date();
                              const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                              setPaymentData({ 
                                amount: Math.max(0, balance), 
                                payment_mode: "cash", 
                                transaction_id: "", 
                                payment_date: formatDateStr(today),
                                fee_type: "course"
                              });
                            }}
                            disabled={computedStatus === 'paid'}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                            title="Add Payment"
                           >
                             <Plus size={15} className="stroke-[2.5]" />
                           </button>
                           <button 
                            onClick={() => setShowIncrement(fee)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Increase Fee"
                           >
                             <ArrowUpRight size={15} />
                           </button>
                           <button 
                            onClick={() => setShowHistory(fee)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="View History"
                           >
                             <History size={15} />
                           </button>
                           {fee.payments && fee.payments.length > 0 && (
                             <button 
                              onClick={() => handleDownloadAllStudentReceipts(fee)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all cursor-pointer"
                              title="Download All Receipts"
                             >
                               <Download size={15} />
                             </button>
                           )}
                           <button 
                            onClick={() => handleDelete(fee.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                            title="Delete Record"
                           >
                             <Trash2 size={15} />
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
            <div className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
              No matching records found.
            </div>
          ) : (
            filteredFees.map((fee) => {
              const isDropout = (fee.students as any)?.status === "dropped_out";
              const totalPaid = fee.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
              const totalPayable = Number(fee.final_fee) + Number(fee.increment_amount || 0);
              const balance = totalPayable - totalPaid;
              const computedStatus = isDropout ? "dropped_out" : balance <= 0 ? "paid" : totalPaid > 0 ? "partial" : "due";

              // Active month fee tracking (Month M is paid in Month M+1, e.g. September fee in October)
              const defaultDue = getLatestDueMonth();
              const activeMonthKey = monthFilter === "all" ? defaultDue.key : monthFilter;
              const [activeYear, activeMonthNum] = activeMonthKey.split("-");
              const activeMonthName = new Date(Number(activeYear), Number(activeMonthNum) - 1, 1).toLocaleDateString("en-US", { month: "short" });
              
              const monthStatus = getStudentMonthStatus(fee);
              const isTargetMonthPaid = monthStatus.isMonthPaid(activeMonthKey);

              return (
                <div key={fee.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">{(fee.students as any)?.name}</h4>
                        {isDropout && (
                          <span 
                            className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40 shrink-0" 
                            title={`Left on ${(fee.students as any)?.dropout_date || 'N/A'}`}
                          >
                            Left
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{(fee.students as any)?.student_id}</p>
                    </div>
                    <StatusBadge status={computedStatus} />
                  </div>

                  <div className="bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Course</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{(fee.courses as any)?.title || "N/A"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Total</span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">₹{totalPayable.toLocaleString()}</p>
                        {fee.discount > 0 && <span className="text-[9px] text-rose-500 block">Disc -₹{fee.discount.toLocaleString()}</span>}
                        {fee.increment_amount > 0 && <span className="text-[9px] text-amber-500 block">+₹{fee.increment_amount.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Paid</span>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                        {isDropout ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                            Left on {(fee.students as any)?.dropout_date || "N/A"}
                          </span>
                        ) : balance <= 0 ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">Cleared</span>
                        ) : isTargetMonthPaid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.2 rounded mt-0.5">
                            ✓ {activeMonthName}: Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.2 rounded mt-0.5">
                            ✗ {activeMonthName}: Unpaid
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Balance</span>
                        {isDropout ? (
                          <p className="font-semibold text-slate-400 dark:text-slate-500 line-through">₹{balance.toLocaleString()}</p>
                        ) : balance < 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            ₹{Math.abs(balance).toLocaleString()} Adv
                          </span>
                        ) : balance === 0 ? (
                          <p className="font-semibold text-slate-400 dark:text-slate-500">₹0</p>
                        ) : (
                          <p className="font-semibold text-rose-600 dark:text-rose-400">₹{balance.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                     <button 
                        onClick={() => {
                          setShowPayment(fee);
                          const today = new Date();
                          const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          setPaymentData({ 
                            amount: Math.max(0, balance), 
                            payment_mode: "cash", 
                            transaction_id: "", 
                            payment_date: formatDateStr(today),
                            fee_type: "course"
                          });
                        }}
                        disabled={computedStatus === 'paid' || isDropout}
                        className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 cursor-pointer shadow-sm shadow-blue-500/20"
                      >
                        <Plus size={13} className="stroke-[2.5]" /> Add Payment
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        {balance > 0 && !isDropout && (
                          <button
                            type="button"
                            onClick={() => handleWhatsAppReminder(fee, balance)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all border border-emerald-200/70 dark:border-emerald-800/60 cursor-pointer"
                            title="WhatsApp Reminder"
                          >
                            <MessageCircle size={14} className="fill-emerald-600/10" />
                          </button>
                        )}
                        <button 
                          onClick={() => setShowIncrement(fee)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="Increase Fee"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                        <button 
                          onClick={() => setShowHistory(fee)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="View History"
                        >
                          <History size={14} />
                        </button>
                        {fee.payments && fee.payments.length > 0 && (
                          <button 
                            onClick={() => handleDownloadAllStudentReceipts(fee)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
                            title="Download All Receipts"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(fee.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all border border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
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
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.student_id} 
                        onChange={(e) => setSetupData({...setupData, student_id: e.target.value})}
                      >
                        <option value="">Choose Student...</option>
                        {students
                          .filter(s => s.status !== "dropped_out" && !initialFees.some(f => f.student_id === s.id))
                          .map(s => (
                            <option key={s.id} value={s.id} className="dark:bg-slate-900">
                              {s.name} ({s.student_id})
                            </option>
                          ))
                        }
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Select Course</label>
                      <select 
                        required 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
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
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.total_fee || ""} 
                        onChange={(e) => setSetupData({...setupData, total_fee: Number(e.target.value)})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Discount Deduction (₹)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                        value={setupData.discount || ""} 
                        onChange={(e) => setSetupData({...setupData, discount: Number(e.target.value)})}
                      />
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
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
                  <div className="space-y-4 animate-in fade-in duration-300 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
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
                                  className="w-full px-3 py-2 text-xs font-bold bg-white disabled:bg-slate-50/80 dark:bg-slate-900 dark:disabled:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 disabled:text-slate-500"
                                />
                              </div>
                              <div className="flex-[3] space-y-1">
                                <input 
                                  required
                                  type="date"
                                  value={inst.due_date}
                                  disabled={splitMode !== "custom"}
                                  onChange={(e) => updateInstallmentField(idx, 'due_date', e.target.value)}
                                  className="w-full px-3 py-2 text-xs font-semibold bg-white disabled:bg-slate-50/80 dark:bg-slate-900 dark:disabled:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 disabled:text-slate-500"
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
      {showPayment && (() => {
        const totalPaidSoFar = (showPayment.payments || []).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
        const currentBalanceDue = Math.max(0, Number(showPayment.final_fee || 0) - totalPaidSoFar);
        const studentName = (showPayment.students as any)?.name || "Student";
        const courseTitle = (showPayment.courses as any)?.title || "Course";

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-[480px] overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
              
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                    <CreditCard size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Record Student Payment
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Add fee transaction entry
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPayment(null)} 
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
              
              <form onSubmit={handlePayment} className="p-3.5 space-y-2.5">
                
                {/* Student Info Compact Strip */}
                <div className="px-3 py-1.5 bg-slate-50/90 dark:bg-slate-950/50 rounded-xl border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                      {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {studentName}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                        • {courseTitle}
                      </span>
                    </div>
                  </div>
                  {currentBalanceDue > 0 && (
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Due:</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/40">
                        ₹{currentBalanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount Paid & Fee Component in 2-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Amount Paid */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Amount Paid (₹) <span className="text-rose-500">*</span>
                      </label>
                      {currentBalanceDue > 0 && currentBalanceDue !== paymentData.amount && (
                        <button
                          type="button"
                          onClick={() => setPaymentData({ ...paymentData, amount: currentBalanceDue })}
                          className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                        >
                          Full Due (₹{currentBalanceDue.toLocaleString('en-IN')})
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none">
                        ₹
                      </span>
                      <input 
                        required 
                        type="number" 
                        min="1"
                        placeholder="0"
                        className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300" 
                        value={paymentData.amount || ""} 
                        onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  {/* Fee Component */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Fee Component
                    </label>
                    <select 
                      required 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 transition-all cursor-pointer h-[34px]"
                      value={paymentData.fee_type} 
                      onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})}
                    >
                      <option value="course">Course Fee</option>
                      <option value="registration">Registration Fee</option>
                      <option value="exam">Exam Fee</option>
                    </select>
                  </div>
                </div>

                {/* Payment Date & Payment Mode in 2-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Payment Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Payment Date
                    </label>
                    <input 
                      required 
                      type="date" 
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-semibold text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 transition-all h-[34px]" 
                      value={paymentData.payment_date || new Date().toISOString().split('T')[0]} 
                      onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                        { id: 'bank', label: 'Bank', icon: Receipt },
                      ].map(({ id, label, icon: IconComponent }) => {
                        const isActive = paymentData.payment_mode === id;
                        return (
                          <button 
                            key={id} 
                            type="button" 
                            onClick={() => setPaymentData({...paymentData, payment_mode: id})} 
                            className={`h-[34px] px-1 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                                : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            <IconComponent size={12} className={isActive ? 'text-white' : 'text-slate-400'} />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Reference ID (Optional) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Transaction / Reference ID
                    </label>
                    <span className="text-[9px] text-slate-400 font-normal">Optional</span>
                  </div>
                  <input 
                    type="text" 
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-medium text-xs text-slate-900 dark:text-slate-100 focus:border-emerald-500 transition-all placeholder:text-slate-400" 
                    placeholder={paymentData.payment_mode === 'cash' ? "Receipt / Voucher No. (optional)" : "e.g. UPI Ref / UTR / TXN12345"}
                    value={paymentData.transaction_id}
                    onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowPayment(null)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer text-[11px]"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || paymentData.amount <= 0} 
                    className="flex-[2] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-lg font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="animate-spin" size={13} /> : <CheckCircle2 size={13} />}
                    <span>Record Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* History Modal - Compact & Minimal Upgrade */}
      {showHistory && (() => {
        const history = showHistory;
        const student = (history.students as any) || {};
        const course = (history.courses as any) || {};
        const totalFee = Number(history.final_fee) || 0;
        const totalPaid = history.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
        const balance = Math.max(0, totalFee - totalPaid);
        const isPaid = history.status === "paid" || balance <= 0;
        const paymentsList = history.payments || [];
        const installmentsList = history.installments || [];

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col">
              
              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <History size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Account Statement
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Fee statement & payment records
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {paymentsList.length > 0 && (
                    <button 
                      onClick={() => handleDownloadAllStudentReceipts(history)} 
                      className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-lg transition-all cursor-pointer shadow-2xs"
                      title="Download All Receipts"
                    >
                      <Download size={13} className="text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">Download All</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowHistory(null)} 
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Student Summary & Financial Chips */}
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {student?.name || "Student"}
                    </h4>
                    {student?.roll_no && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                        #{student.roll_no}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">
                    {course?.title || "No course assigned"}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  {/* Financial Stats Pill */}
                  <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 px-3 py-1 rounded-lg text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Total</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">₹{totalFee.toLocaleString()}</span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-500 block leading-none">Paid</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800" />
                    <div>
                      <span className={`text-[9px] uppercase font-bold block leading-none ${balance > 0 ? "text-amber-500" : "text-slate-400"}`}>Due</span>
                      <span className={`font-bold ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>₹{balance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Download All Receipts Button */}
                  {paymentsList.length > 0 && (
                    <button 
                      onClick={() => handleDownloadAllStudentReceipts(history)}
                      className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
                      title="Download All Receipts"
                    >
                      <Download size={13} className="text-blue-600 dark:text-blue-400" />
                      <span>All Receipts</span>
                    </button>
                  )}

                  {/* Record Payment Button */}
                  <button 
                    onClick={() => {
                      setShowHistory(null);
                      setShowPayment(history);
                      const today = new Date();
                      const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setPaymentData({ 
                        amount: balance, 
                        payment_mode: "cash", 
                        transaction_id: "", 
                        payment_date: formatDateStr(today), 
                        fee_type: "course" 
                      });
                    }}
                    disabled={isPaid}
                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* Split Panels: Installments & Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Installments Section */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" /> Installment Plan
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {installmentsList.length > 0 ? `${installmentsList.length} Splits` : "One-Time"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {installmentsList.length === 0 ? (
                      <div className="py-5 px-3 text-center bg-slate-50/60 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CalendarCheck size={14} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Full Settlement Plan
                        </p>
                        <p className="text-[10px] text-slate-400">
                          No recurring installments configured
                        </p>
                      </div>
                    ) : (
                      installmentsList.map((inst: any, idx: number) => {
                        const isOverdue = inst.status === "pending" && new Date(inst.due_date) < new Date();
                        const isInstPaid = inst.status === "paid";

                        return (
                          <div 
                            key={inst.id} 
                            className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                              isInstPaid 
                                ? "bg-emerald-50/30 border-emerald-100 dark:border-emerald-950/30 dark:bg-emerald-950/10" 
                                : isOverdue 
                                  ? "bg-rose-50/40 border-rose-200 dark:border-rose-950/40 dark:bg-rose-950/10" 
                                  : "bg-white dark:bg-slate-950/50 border-slate-200/70 dark:border-slate-800"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  Inst {idx + 1}
                                </span>
                                <span className={`text-[9px] font-semibold ${isOverdue ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                                  • {inst.due_date ? new Date(inst.due_date).toLocaleDateString() : "No date"}
                                  {isOverdue && " (Overdue)"}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                ₹{Number(inst.amount).toLocaleString()}
                              </p>
                            </div>
                            
                            {inst.status === "pending" ? (
                              <button 
                                onClick={() => {
                                  setShowHistory(null);
                                  setShowPayment(history);
                                  const today = new Date();
                                  const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                  setPaymentData({ 
                                    amount: Number(inst.amount), 
                                    payment_mode: "cash", 
                                    transaction_id: "", 
                                    payment_date: formatDateStr(today), 
                                    fee_type: "course" 
                                  });
                                }}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0"
                              >
                                Pay Split
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                                <Check size={10} /> Paid
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Payments Log Section */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider flex items-center gap-1.5">
                      <History size={13} className="text-slate-400" /> Transaction History
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {paymentsList.length} Entries
                      </span>
                      {paymentsList.length > 0 && (
                        <button
                          onClick={() => handleDownloadAllStudentReceipts(history)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200/70 dark:border-blue-800/80 text-[10px] font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Download All Receipts"
                        >
                          <Download size={10} />
                          <span>All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {paymentsList.length === 0 ? (
                      <div className="py-5 px-3 text-center bg-slate-50/60 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
                        <History className="text-slate-300 dark:text-slate-600" size={18} />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          No transactions recorded
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Click "Record Payment" to log a transaction
                        </p>
                      </div>
                    ) : (
                      paymentsList.map((pay: any, index: number) => (
                        <div 
                          key={`${pay.id}-${index}`} 
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/60 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-all gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                ₹{Number(pay.amount).toLocaleString()}
                              </p>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {pay.payment_mode || "Cash"}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : "No date"}
                              {pay.transaction_id && ` • Ref: ${pay.transaction_id}`}
                            </p>

                            {(Number(pay.registration_fee) > 0 || Number(pay.course_fee) > 0 || Number(pay.exam_fee) > 0) && (
                              <div className="flex flex-wrap gap-1 text-[9px] text-slate-500 font-medium mt-1">
                                {Number(pay.registration_fee) > 0 && (
                                  <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-slate-700/50">
                                    Reg: ₹{Number(pay.registration_fee).toLocaleString()}
                                  </span>
                                )}
                                {Number(pay.course_fee) > 0 && (
                                  <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-slate-700/50">
                                    Course: ₹{Number(pay.course_fee).toLocaleString()}
                                  </span>
                                )}
                                {Number(pay.exam_fee) > 0 && (
                                  <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-slate-700/50">
                                    Exam: ₹{Number(pay.exam_fee).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => handleDownloadReceipt(pay, student, course)} 
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                              title="Download Receipt"
                            >
                              <Download size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(pay.id, history.id)} 
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30"
                              title="Delete Payment"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
              
              {/* Minimal Footer */}
              <div className="px-5 py-2.5 bg-slate-50/70 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-medium text-slate-400">
                  Total {paymentsList.length} transaction{paymentsList.length === 1 ? "" : "s"} recorded
                </span>
                <button 
                  onClick={() => setShowHistory(null)} 
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Increment Modal */}
      {showIncrement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
               <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                 <ArrowUpRight size={20} className="text-amber-500" /> Increase Course Fee
               </h3>
               <button 
                 onClick={() => {
                   setShowIncrement(null);
                   setIncrementAmount(0);
                 }} 
                 className="p-2 hover:bg-slate-105 rounded-lg cursor-pointer"
               >
                 <X size={18} className="text-slate-900 dark:text-white" />
               </button>
             </div>
             
             <form onSubmit={handleIncrementSubmit} className="p-8 space-y-6">
                <div className="space-y-1">
                   <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                     Student: <span className="font-bold text-slate-900 dark:text-white">{(showIncrement.students as any)?.name}</span>
                   </p>
                   <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                     Course: <span className="font-bold text-slate-900 dark:text-white">{(showIncrement.courses as any)?.title}</span>
                   </p>
                   <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                     Current Billing Fee: <span className="font-bold text-slate-900 dark:text-white">₹{(Number(showIncrement.final_fee) + Number(showIncrement.increment_amount || 0)).toLocaleString()}</span>
                   </p>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Increment Amount (₹)</label>
                   <input 
                     required 
                     type="number" 
                     min="1"
                     className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500" 
                     value={incrementAmount || ""} 
                     onChange={(e) => setIncrementAmount(Number(e.target.value))}
                     placeholder="Enter amount to increase"
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>Confirm Fee Increase</>
                  )}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Monthly Fee Reminder Modal (SMS & WhatsApp) */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-900/30">
                  <MessageCircle size={18} className="fill-emerald-600/10" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Monthly Fee Reminder</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Auto-generated SMS & WhatsApp notice</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReminderModal(null)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              
              {/* Student Summary & Phone Input */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Student</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {(showReminderModal.fee.students as any)?.name}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-400">
                      {(showReminderModal.fee.students as any)?.student_id} • {(showReminderModal.fee.courses as any)?.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Balance Due</span>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      ₹{showReminderModal.balance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Dropout Warning Banner */}
                {(showReminderModal.fee.students as any)?.status === "dropped_out" && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="block text-[11px]">Notice: Student Dropped Out</strong>
                      <span className="text-[10px]">
                        Left on {(showReminderModal.fee.students as any)?.dropout_date || "N/A"}. Reason: {(showReminderModal.fee.students as any)?.dropout_reason || "Not specified"}. Dues are limited to pre-dropout period.
                      </span>
                    </div>
                  </div>
                )}

                {/* Mobile / WhatsApp Number Field */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Student Mobile / WhatsApp Number:
                  </label>
                  <div className="relative">
                    <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      value={reminderCustomPhone}
                      onChange={(e) => setReminderCustomPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 font-semibold text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Rate & Unpaid Months Config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Monthly Fee Rate (₹):
                    </label>
                    <input 
                      type="number"
                      value={reminderMonthlyRate || ""}
                      onChange={(e) => setReminderMonthlyRate(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 font-bold text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-4">
                    {[500, 1000, 1500, 2000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setReminderMonthlyRate(amt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          reminderMonthlyRate === amt 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detected Unpaid Months Selection */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Pending Month(s) to Mention:
                    </label>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {selectedUnpaidMonths.length} month(s) × ₹{reminderMonthlyRate} = ₹{(selectedUnpaidMonths.length * reminderMonthlyRate).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reminderCandidateMonths.map((m) => (
                      <button 
                        key={m}
                        type="button"
                        onClick={() => {
                          if (selectedUnpaidMonths.includes(m)) {
                            setSelectedUnpaidMonths(selectedUnpaidMonths.filter(x => x !== m));
                          } else {
                            setSelectedUnpaidMonths([...selectedUnpaidMonths, m]);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          selectedUnpaidMonths.includes(m)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                            : 'bg-slate-50 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        {selectedUnpaidMonths.includes(m) ? "✓" : "✗"} {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message Live Preview */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Message Preview (SMS / WhatsApp):
                </label>
                <div className="relative">
                  <textarea
                    rows={8}
                    value={customReminderMessage !== null ? customReminderMessage : generatedReminderMessage}
                    onChange={(e) => setCustomReminderMessage(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-y select-all"
                  />
                  {customReminderMessage !== null && customReminderMessage !== generatedReminderMessage && (
                    <button
                      type="button"
                      onClick={() => setCustomReminderMessage(null)}
                      className="absolute right-2.5 bottom-3 text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Reset to Template
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <button 
                type="button"
                onClick={handleCopySMS}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  copiedSMS 
                    ? 'bg-emerald-500 text-white border-emerald-600' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {copiedSMS ? <Check size={14} /> : <Copy size={14} />}
                {copiedSMS ? "SMS Text Copied!" : "Copy SMS Text"}
              </button>

              <button 
                type="button"
                onClick={handleSendWhatsAppFromModal}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <Send size={14} /> Send on WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { 
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40", 
    partial: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40", 
    due: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40",
    dropped_out: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700"
  };
  const dots: Record<string, string> = {
    paid: "bg-emerald-500",
    partial: "bg-blue-500",
    due: "bg-rose-500",
    dropped_out: "bg-slate-400"
  };
  const labels: Record<string, string> = { 
    paid: "Paid", 
    partial: "Partial", 
    due: "Due",
    dropped_out: "Dropped Out"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${styles[status] || styles.due}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.due}`} />
      {labels[status] || status}
    </span>
  );
}
