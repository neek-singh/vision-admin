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
    const targetMonth = monthFilter === "all" ? new Date().toISOString().substring(0, 7) : monthFilter;

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

      // Calculate payments made in the selected month
      const totalPaidInMonth = fee.payments
        ?.filter((p: any) => p.payment_date && p.payment_date.substring(0, 7) === targetMonth)
        ?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;

      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "unpaid_month" 
          ? (!isDropout && hasBalance && totalPaidInMonth === 0) 
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

  const handleDownloadReceipt = (pay: any, student: any, course: any) => {
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Please allow popups to download/print receipts.");
      return;
    }

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt_${pay.transaction_id || pay.id || 'payment'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
          }
          .header {
            display: flex;
            align-items: center;
            border-bottom: 2px dashed #e2e8f0;
            padding-bottom: 24px;
            margin-bottom: 24px;
            gap: 20px;
          }
          .logo-img {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          .header-text {
            flex: 1;
            text-align: center;
            margin-right: 70px;
          }
          .logo {
            font-size: 20px;
            font-weight: 900;
            color: #000000;
            letter-spacing: -0.02em;
            margin: 0;
            line-height: 1.2;
          }
          .address {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            margin-top: 4px;
            line-height: 1.4;
          }
          .subtitle {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 6px;
          }
          .receipt-title {
            text-align: center;
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 24px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 2px;
          }
          .meta-value {
            font-weight: 600;
            color: #334155;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
            margin-bottom: 12px;
            margin-top: 24px;
          }
          .details-list {
            margin-bottom: 24px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            padding: 8px 0;
            border-bottom: 1px solid #f8fafc;
          }
          .details-row.total {
            border-top: 2px solid #e2e8f0;
            border-bottom: 2px solid #e2e8f0;
            font-weight: 800;
            font-size: 16px;
            padding: 12px 0;
            color: #0f172a;
            margin-top: 12px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          @media print {
            body {
              padding: 20px;
            }
            .receipt-container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img src="${window.location.origin}/logo.png" alt="Logo" class="logo-img" />
            <div class="header-text">
              <div class="logo">VISION IT COMPUTER INSTITUTE</div>
              <div class="address">Kadampara Chowk, Pratappur, Surajpur (C.G.) - 497223</div>
              <div class="subtitle">Center for Excellence & Learning</div>
            </div>
          </div>
          <div class="receipt-title">Payment Receipt</div>
          
          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Student Name</span>
              <span class="meta-value">${student?.name || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Student ID</span>
              <span class="meta-value">${student?.student_id || 'N/A'}</span>
            </div>
            <div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">Course Enrolled</span>
              <span class="meta-value">${course?.title || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Payment Date</span>
              <span class="meta-value">${pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Payment Mode</span>
              <span class="meta-value" style="text-transform: uppercase;">${pay.payment_mode || 'N/A'}</span>
            </div>
            ${pay.transaction_id ? `
            <div class="meta-item" style="grid-column: span 2;">
              <span class="meta-label">Transaction ID / Reference</span>
              <span class="meta-value" style="font-family: monospace;">${pay.transaction_id}</span>
            </div>` : ''}
          </div>
          
          <div class="section-title">Fee Breakdown</div>
          <div class="details-list">
            ${Number(pay.registration_fee) > 0 ? `
            <div class="details-row">
              <span>Registration Fee (One-Time)</span>
              <span>₹${Number(pay.registration_fee).toLocaleString('en-IN')}</span>
            </div>` : ''}
            ${Number(pay.course_fee) > 0 ? `
            <div class="details-row">
              <span>Course Fee</span>
              <span>₹${Number(pay.course_fee).toLocaleString('en-IN')}</span>
            </div>` : ''}
            ${Number(pay.exam_fee) > 0 ? `
            <div class="details-row">
              <span>Examination Fee (One-Time)</span>
              <span>₹${Number(pay.exam_fee).toLocaleString('en-IN')}</span>
            </div>` : ''}
            
            <!-- Fallback if breakdown not populated -->
            ${(!pay.registration_fee && !pay.course_fee && !pay.exam_fee) ? `
            <div class="details-row">
              <span>Fee Payment</span>
              <span>₹${Number(pay.amount).toLocaleString('en-IN')}</span>
            </div>` : ''}

            <div class="details-row total">
              <span>Total Amount Paid</span>
              <span>₹${Number(pay.amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank you for your payment!<br>
            This is a computer generated receipt, no signature required.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleDownloadAllCourseReceipts = (courseId: string) => {
    const courseFees = initialFees.filter(fee => fee.course_id === courseId);
    const allPaymentsToPrint: any[] = [];
    
    courseFees.forEach(fee => {
      if (fee.payments && fee.payments.length > 0) {
        fee.payments.forEach((pay: any) => {
          allPaymentsToPrint.push({
            id: pay.id,
            amount: Number(pay.amount),
            paymentDate: pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A',
            paymentMode: pay.payment_mode || 'N/A',
            transactionId: pay.transaction_id,
            registrationFee: Number(pay.registration_fee || 0),
            courseFee: Number(pay.course_fee || 0),
            examFee: Number(pay.exam_fee || 0),
            studentName: fee.students?.name || 'N/A',
            studentId: fee.students?.student_id || 'N/A',
            courseTitle: fee.courses?.title || 'N/A'
          });
        });
      }
    });

    if (allPaymentsToPrint.length === 0) {
      alert("No payment transactions recorded for students in this course.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Please allow popups to download/print receipts.");
      return;
    }

    const selectedCourseTitle = courses.find(c => c.id === courseId)?.title || 'course';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipts_${selectedCourseTitle.replace(/\s+/g, '_')}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 16px 24px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .header {
            display: flex;
            align-items: center;
            border-bottom: 2px dashed #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 10px;
            gap: 16px;
          }
          .logo-img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .header-text {
            flex: 1;
            text-align: center;
            margin-right: 48px;
          }
          .logo {
            font-size: 15px;
            font-weight: 900;
            color: #000000;
            letter-spacing: -0.02em;
            margin: 0;
            line-height: 1.2;
          }
          .address {
            font-size: 9px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
            line-height: 1.3;
          }
          .subtitle {
            font-size: 8px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 3px;
          }
          .receipt-title {
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          .meta-label {
            font-size: 9px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1px;
          }
          .meta-value {
            font-weight: 600;
            color: #334155;
          }
          .section-title {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
            margin-bottom: 8px;
            margin-top: 12px;
          }
          .details-list {
            margin-bottom: 12px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            padding: 5px 0;
            border-bottom: 1px solid #f8fafc;
          }
          .details-row.total {
            border-top: 2px solid #e2e8f0;
            border-bottom: 2px solid #e2e8f0;
            font-weight: 800;
            font-size: 13px;
            padding: 8px 0;
            color: #0f172a;
            margin-top: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 9px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          @media print {
            body {
              padding: 0;
            }
            .receipt-container {
              border: none;
              box-shadow: none;
              padding: 10px 0;
            }
          }
        </style>
      </head>
      <body>
        ${allPaymentsToPrint.map((item, idx) => `
          <div class="receipt-container" style="${(idx > 0 && idx % 3 === 0) ? 'page-break-before: always;' : (idx > 0 ? 'margin-top: 20px;' : '')}">
            <div class="header">
              <img src="${window.location.origin}/logo.png" alt="Logo" class="logo-img" />
              <div class="header-text">
                <div class="logo">VISION IT COMPUTER INSTITUTE</div>
                <div class="address">Kadampara Chowk, Pratappur, Surajpur (C.G.) - 497223</div>
                <div class="subtitle">Center for Excellence & Learning</div>
              </div>
            </div>
            <div class="receipt-title">Payment Receipt</div>
            
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Student Name</span>
                <span class="meta-value">${item.studentName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Student ID</span>
                <span class="meta-value">${item.studentId}</span>
              </div>
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">Course Enrolled</span>
                <span class="meta-value">${item.courseTitle}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Payment Date</span>
                <span class="meta-value">${item.paymentDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Payment Mode</span>
                <span class="meta-value" style="text-transform: uppercase;">${item.paymentMode}</span>
              </div>
              ${item.transactionId ? `
              <div class="meta-item" style="grid-column: span 2;">
                <span class="meta-label">Transaction ID / Reference</span>
                <span class="meta-value" style="font-family: monospace;">${item.transactionId}</span>
              </div>` : ''}
            </div>
            
            <div class="section-title">Fee Breakdown</div>
            <div class="details-list">
              ${item.registrationFee > 0 ? `
              <div class="details-row">
                <span>Registration Fee (One-Time)</span>
                <span>₹${item.registrationFee.toLocaleString('en-IN')}</span>
              </div>` : ''}
              ${item.courseFee > 0 ? `
              <div class="details-row">
                <span>Course Fee</span>
                <span>₹${item.courseFee.toLocaleString('en-IN')}</span>
              </div>` : ''}
              ${item.examFee > 0 ? `
              <div class="details-row">
                <span>Examination Fee (One-Time)</span>
                <span>₹${item.examFee.toLocaleString('en-IN')}</span>
              </div>` : ''}
              
              <!-- Fallback if breakdown not populated -->
              ${(!item.registrationFee && !item.courseFee && !item.examFee) ? `
              <div class="details-row">
                <span>Fee Payment</span>
                <span>₹${item.amount.toLocaleString('en-IN')}</span>
              </div>` : ''}

              <div class="details-row total">
                <span>Total Amount Paid</span>
                <span>₹${item.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div class="footer">
              Thank you for your payment!<br>
              This is a computer generated receipt, no signature required.
            </div>
          </div>
        `).join('')}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
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
    // 1. If explicit installments exist
    if (fee.installments && fee.installments.length > 0) {
      const pendingInst = fee.installments.filter((inst: any) => inst.status === 'pending');
      if (pendingInst.length > 0) {
        return pendingInst.map((inst: any) => {
          if (!inst.due_date) return "Installment Due";
          const [y, m] = inst.due_date.split("-");
          const d = new Date(Number(y), Number(m) - 1, 1);
          return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        });
      }
    }

    // 2. Scan calendar months from enrollment (fee.created_at) to current month (or dropout date)
    const unpaid: string[] = [];
    const createdDate = fee.created_at ? new Date(fee.created_at) : new Date();
    const currentDate = new Date();
    
    const start = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1);
    let end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // If student has dropped out, cap dues generation to the month they dropped out!
    const studentInfo = fee.students as any;
    if (studentInfo?.status === "dropped_out" && studentInfo?.dropout_date) {
      const dropDate = new Date(studentInfo.dropout_date);
      if (!isNaN(dropDate.getTime())) {
        end = new Date(dropDate.getFullYear(), dropDate.getMonth(), 1);
      }
    }

    if (start > end) {
      end = new Date(start);
    }

    const paidMonthsSet = new Set<string>();
    fee.payments?.forEach((p: any) => {
      if (p.payment_date) {
        paidMonthsSet.add(p.payment_date.substring(0, 7)); // "YYYY-MM"
      }
    });

    const iter = new Date(start);
    while (iter <= end) {
      const yyyy = iter.getFullYear();
      const mm = String(iter.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      
      if (!paidMonthsSet.has(key)) {
        unpaid.push(iter.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
      }
      iter.setMonth(iter.getMonth() + 1);
    }

    if (unpaid.length === 0) {
      unpaid.push(currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
    }

    return unpaid;
  };

  // Open the Reminder Modal with intelligent defaults
  const handleOpenReminderModal = (fee: any, balance: number) => {
    const unpaid = getUnpaidMonths(fee);
    setSelectedUnpaidMonths(unpaid);
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

    return `Dear ${studentName},\n\nयह Vision IT Computer Institute की तरफ से आपकी मासिक फीस (Monthly Fees) का रिमाइंडर नोटिस है।\n\n📚 Course: ${courseTitle}\n🗓️ बकाया माह (Pending Months): ${monthsText}\n💰 मासिक फीस (Monthly Due): ₹${reminderMonthlyRate.toLocaleString('en-IN')} (कुल बकाया: ₹${totalCalculatedDue.toLocaleString('en-IN')})\n\nकृपया अपनी बकाया मासिक फीस समय पर इंस्टीट्यूट ऑफिस में जमा करें या ऑनलाइन UPI से भुगतान करें।\n\nकिसी भी जानकारी या सहायता के लिए संपर्क करें:\n📞 +91 81031 70595\n\nThank You! 🙏\nVision IT Computer Institute`;
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
                    label: monthFilter === "all" ? "Unpaid (Month)" : "Unpaid" 
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

                  // Active month fee tracking
                  const activeMonthKey = monthFilter === "all" ? new Date().toISOString().substring(0, 7) : monthFilter;
                  const [activeYear, activeMonthNum] = activeMonthKey.split("-");
                  const activeMonthName = new Date(Number(activeYear), Number(activeMonthNum) - 1, 1).toLocaleDateString("en-US", { month: "short" });
                  const monthPaidAmount = fee.payments
                    ?.filter((p: any) => p.payment_date && p.payment_date.substring(0, 7) === activeMonthKey)
                    ?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

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
                        ) : monthPaidAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-200/50 dark:border-emerald-800/40" title={`Paid in ${activeMonthName}`}>
                            ✓ {activeMonthName}: ₹{monthPaidAmount.toLocaleString()}
                          </span>
                        ) : balance <= 0 ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                            Cleared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.5 rounded-md mt-0.5 border border-rose-200/50 dark:border-rose-800/40" title={`No payment in ${activeMonthName}`}>
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

              // Active month fee tracking
              const activeMonthKey = monthFilter === "all" ? new Date().toISOString().substring(0, 7) : monthFilter;
              const [activeYear, activeMonthNum] = activeMonthKey.split("-");
              const activeMonthName = new Date(Number(activeYear), Number(activeMonthNum) - 1, 1).toLocaleDateString("en-US", { month: "short" });
              const monthPaidAmount = fee.payments
                ?.filter((p: any) => p.payment_date && p.payment_date.substring(0, 7) === activeMonthKey)
                ?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

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
                        ) : monthPaidAmount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.2 rounded mt-0.5">
                            ✓ {activeMonthName}: ₹{monthPaidAmount.toLocaleString()}
                          </span>
                        ) : balance <= 0 ? (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">Cleared</span>
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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
             
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
                      const today = new Date();
                      const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setPaymentData({ 
                        amount: bal, 
                        payment_mode: "cash", 
                        transaction_id: "",
                        payment_date: formatDateStr(today),
                        fee_type: "course"
                      });
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
                                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
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
                        <div className="py-12 text-center text-slate-350 dark:text-slate-550 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 flex flex-col items-center justify-center gap-2">
                           <History className="opacity-30" size={24} />
                           No payment transactions recorded.
                        </div>
                      ) : (
                        showHistory.payments.map((pay: any, index: number) => (
                          <div key={`${pay.id}-${index}`} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 group transition-all">
                             <div>
                                <p className="text-sm font-black text-slate-900 dark:text-white">₹{pay.amount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-0.5">
                                  {pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : ""} • <span className="uppercase">{pay.payment_mode}</span>
                                </p>
                                {(Number(pay.registration_fee) > 0 || Number(pay.course_fee) > 0 || Number(pay.exam_fee) > 0) && (
                                   <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-550 mt-1 bg-slate-100/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md max-w-fit border border-slate-150/40 dark:border-slate-800/30">
                                     {Number(pay.registration_fee) > 0 && <span>Reg: ₹{Number(pay.registration_fee).toLocaleString()}</span>}
                                     {Number(pay.registration_fee) > 0 && (Number(pay.course_fee) > 0 || Number(pay.exam_fee) > 0) && <span>•</span>}
                                     {Number(pay.course_fee) > 0 && <span>Course: ₹{Number(pay.course_fee).toLocaleString()}</span>}
                                     {Number(pay.exam_fee) > 0 && (Number(pay.course_fee) > 0 || Number(pay.registration_fee) > 0) && <span>•</span>}
                                     {Number(pay.exam_fee) > 0 && <span>Exam: ₹{Number(pay.exam_fee).toLocaleString()}</span>}
                                   </div>
                                )}
                                {pay.transaction_id && (
                                  <p className="text-[9px] font-mono text-slate-400 mt-1">Ref: {pay.transaction_id}</p>
                                )}
                             </div>
                             <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => handleDownloadReceipt(pay, showHistory.students, showHistory.courses)} 
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                                  title="Download / Print Receipt"
                                >
                                  <Download size={14}/>
                                </button>
                                <button 
                                  onClick={() => handleDeletePayment(pay.id, showHistory.id)} 
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                                  title="Delete Payment"
                                >
                                  <Trash2 size={14}/>
                                </button>
                             </div>
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
                    {selectedUnpaidMonths.map((m) => (
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
