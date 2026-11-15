"use client";

import { useState, useTransition, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Loader2, User, Phone, BookOpen, Layers, IndianRupee } from "lucide-react";
import { enrollPreAdmissionStudent } from "@/app/actions/lms/pre-admissions";

export interface PreAdmissionUser {
  id: string; // unique key in table
  studentUuid?: string;
  admissionId?: string;
  studentIdCode?: string;
  name: string;
  phone: string;
  email?: string | null;
  education?: string | null;
  interestedCourses?: string | null;
  createdAt: string;
  source: "student" | "admission";
}

interface CourseOption {
  id: string;
  title: string;
  course_code?: string;
  fee?: number;
  discount_fee?: number;
}

interface BatchOption {
  id?: string;
  title: string;
  timing?: string;
}

interface EnrollModalProps {
  user: PreAdmissionUser | null;
  courses: CourseOption[];
  batches: BatchOption[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollModal({
  user,
  courses,
  batches,
  isOpen,
  onClose,
  onSuccess,
}: EnrollModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [customBatch, setCustomBatch] = useState("");
  const [totalFee, setTotalFee] = useState<number>(0);
  const [discountFee, setDiscountFee] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("cash");
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-fill course when user has an interested course match
  useEffect(() => {
    if (!isOpen || !user) return;
    setErrorMsg("");
    setPaidAmount(0);
    setPaymentMode("cash");

    // Match course by interested course string
    let matchedCourse = courses[0];
    if (user.interestedCourses) {
      const lower = user.interestedCourses.toLowerCase();
      const match = courses.find(
        (c) =>
          lower.includes(c.title.toLowerCase()) ||
          (c.course_code && lower.includes(c.course_code.toLowerCase()))
      );
      if (match) matchedCourse = match;
    }

    if (matchedCourse) {
      setSelectedCourseId(matchedCourse.id);
      const fee = Number(matchedCourse.fee) || 10000;
      const discount = matchedCourse.discount_fee ? Math.max(0, fee - Number(matchedCourse.discount_fee)) : 0;
      setTotalFee(fee);
      setDiscountFee(discount);
    } else {
      setSelectedCourseId("");
      setTotalFee(0);
      setDiscountFee(0);
    }

    if (batches.length > 0) {
      setSelectedBatch(batches[0].title);
    } else {
      setSelectedBatch("Regular Batch");
    }
  }, [isOpen, user, courses, batches]);

  // Handle course dropdown change
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const selected = courses.find((c) => c.id === courseId);
    if (selected) {
      const fee = Number(selected.fee) || 10000;
      const discount = selected.discount_fee ? Math.max(0, fee - Number(selected.discount_fee)) : 0;
      setTotalFee(fee);
      setDiscountFee(discount);
    }
  };

  if (!isOpen || !user) return null;

  const finalFee = Math.max(0, totalFee - discountFee);
  const effectiveBatch = selectedBatch === "custom" ? customBatch : selectedBatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCourseId) {
      setErrorMsg("Please select a course for enrollment.");
      return;
    }

    if (!effectiveBatch || !effectiveBatch.trim()) {
      setErrorMsg("Please select or enter a batch.");
      return;
    }

    startTransition(async () => {
      const res = await enrollPreAdmissionStudent({
        studentUuid: user.studentUuid,
        admissionId: user.admissionId,
        studentIdCode: user.studentIdCode,
        name: user.name,
        phone: user.phone,
        email: user.email,
        education: user.education,
        courseId: selectedCourseId,
        batchTitle: effectiveBatch.trim(),
        totalFee: Number(totalFee),
        discountFee: Number(discountFee),
        paidAmount: Number(paidAmount),
        paymentMode,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Take Admission &amp; Enroll
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign course, regular batch, and create fee record
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Quick Info */}
        <div className="px-5 py-3.5 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100/60 dark:border-blue-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {user.phone ? `+91 ${user.phone}` : "No Phone"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              {user.studentIdCode || "New Admission"}
            </span>
            {user.education && (
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {user.education}
              </p>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Course Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Course <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            >
              <option value="" disabled>-- Select Course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {course.fee ? `(₹${course.fee.toLocaleString("en-IN")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assign Batch <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            >
              {batches.map((b, i) => (
                <option key={b.id || i} value={b.title}>
                  {b.title.trim()} {b.timing ? `(${b.timing})` : ""}
                </option>
              ))}
              <option value="custom">+ Custom Batch Name</option>
            </select>

            {selectedBatch === "custom" && (
              <input
                type="text"
                placeholder="Enter batch title (e.g. DCA Morning 08:00 AM)"
                value={customBatch}
                onChange={(e) => setCustomBatch(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>

          {/* Fee Breakdown Grid */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Fee Structure &amp; Initial Payment
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Total Course Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalFee}
                  onChange={(e) => setTotalFee(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountFee}
                  onChange={(e) => setDiscountFee(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Final Payable Fee:
              </span>
              <span className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                ₹{finalFee.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Initial Payment Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={finalFee}
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank_transfer">Net Banking</option>
                  <option value="card">Debit / Credit Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Confirm Admission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
