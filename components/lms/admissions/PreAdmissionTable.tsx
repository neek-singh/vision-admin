"use client";

import { useState } from "react";
import { 
  Phone, 
  MessageCircle, 
  GraduationCap, 
  Search, 
  RotateCcw, 
  Copy, 
  Check, 
  UserPlus, 
  BookOpen, 
  Calendar,
  Layers,
  Trash2,
  PhoneCall
} from "lucide-react";
import EnrollModal, { PreAdmissionUser } from "./EnrollModal";
import { deletePreAdmissionUser } from "@/app/actions/lms/pre-admissions";

interface PreAdmissionTableProps {
  users: PreAdmissionUser[];
  courses: Array<{ id: string; title: string; course_code?: string; fee?: number; discount_fee?: number }>;
  batches: Array<{ id?: string; title: string; timing?: string }>;
}

export default function PreAdmissionTable({
  users,
  courses,
  batches,
}: PreAdmissionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEducation, setSelectedEducation] = useState<string>("all");
  const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<PreAdmissionUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyId = (studentId: string) => {
    if (!studentId) return;
    navigator.clipboard.writeText(studentId);
    setCopiedId(studentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getWhatsAppUrl = (user: PreAdmissionUser) => {
    const cleanPhone = (user.phone || "").replace(/\D/g, "");
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const studentIdStr = user.studentIdCode ? ` (${user.studentIdCode})` : "";
    const interestStr = user.interestedCourses ? ` for ${user.interestedCourses}` : "";
    const msg = `Hello ${user.name}${studentIdStr}! Greetings from Vision IT Institute. We received your registration${interestStr}. We would like to assist you with batch timings and admission confirmation.`;
    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.studentIdCode && u.studentIdCode.toLowerCase().includes(q)) ||
      u.phone.includes(q) ||
      (u.interestedCourses && u.interestedCourses.toLowerCase().includes(q)) ||
      (u.education && u.education.toLowerCase().includes(q));

    const matchesEdu =
      selectedEducation === "all" ||
      (u.education && u.education.toLowerCase().includes(selectedEducation.toLowerCase()));

    return matchesQuery && matchesEdu;
  });

  const handleDelete = async (u: PreAdmissionUser) => {
    if (!confirm(`Remove "${u.name}" from pre-admissions?`)) return;
    const res = await deletePreAdmissionUser(u.id, u.source);
    if (res?.error) {
      alert(res.error);
    } else {
      showToast("User removed from list.");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student ID, name, mobile, course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Education Level Quick Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "All Levels" },
            { id: "School", label: "School" },
            { id: "College", label: "College" },
            { id: "Working", label: "Working" },
            { id: "Other", label: "Other" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedEducation(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap text-xs transition-all ${
                selectedEducation === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-4 py-3 w-12 text-center">#</th>
              <th className="px-4 py-3">Student ID</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Mobile Number</th>
              <th className="px-4 py-3">Education Level</th>
              <th className="px-4 py-3">Interested Courses</th>
              <th className="px-4 py-3">Registration Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="max-w-xs mx-auto text-center space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      No pre-admission users found
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchQuery
                        ? "No results matching your search terms."
                        : "All registered students have been admitted or no pending signups."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, index) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Student ID */}
                  <td className="px-4 py-3 font-mono">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                      <span>{u.studentIdCode || "Pending"}</span>
                      {u.studentIdCode && (
                        <button
                          type="button"
                          onClick={() => handleCopyId(u.studentIdCode!)}
                          title="Copy Student ID"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          {copiedId === u.studentIdCode ? (
                            <Check size={11} className="text-emerald-500" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Student Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {u.name}
                        </span>
                        {u.email && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {u.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Mobile Number */}
                  <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-medium">
                    {u.phone ? `+91 ${u.phone}` : "—"}
                  </td>

                  {/* Education Level */}
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/40">
                      {u.education || "Student"}
                    </span>
                  </td>

                  {/* Interested Courses */}
                  <td className="px-4 py-3">
                    <div className="max-w-[200px] text-slate-800 dark:text-slate-200 font-medium truncate" title={u.interestedCourses || "General Inquiry"}>
                      {u.interestedCourses || "General Inquiry"}
                    </div>
                  </td>

                  {/* Registration Date */}
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Call Action */}
                      <a
                        href={u.phone ? `tel:${u.phone}` : "#"}
                        title={`Call ${u.name}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/50 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
                      >
                        <PhoneCall size={13} />
                      </a>

                      {/* WhatsApp Action */}
                      <a
                        href={getWhatsAppUrl(u)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Chat on WhatsApp"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 transition-colors"
                      >
                        <MessageCircle size={13} />
                      </a>

                      {/* Take Admission / Enroll Action */}
                      <button
                        type="button"
                        onClick={() => setSelectedUserForEnroll(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-2xs active:scale-95"
                      >
                        <UserPlus size={12} />
                        <span>Take Admission</span>
                      </button>

                      {/* Delete / Dismiss */}
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        title="Remove Lead"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (<= 768px) */}
      <div className="md:hidden space-y-2.5">
        {filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              No pre-admission users found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All registered users are admitted or no pending signups.
            </p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                      {u.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {u.phone ? `+91 ${u.phone}` : "No Phone"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {u.studentIdCode || "Lead"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatDate(u.createdAt)}
                  </p>
                </div>
              </div>

              {/* Education & Interested Courses */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Education:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {u.education || "Student"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Interests:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 text-right truncate max-w-[180px]">
                    {u.interestedCourses || "General"}
                  </span>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={u.phone ? `tel:${u.phone}` : "#"}
                  className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <Phone size={13} className="text-slate-500" />
                  <span>Call</span>
                </a>

                <a
                  href={getWhatsAppUrl(u)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <MessageCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedUserForEnroll(u)}
                  className="col-span-2 min-h-[42px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                >
                  <UserPlus size={14} />
                  <span>Take Admission / Enroll</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Enroll Modal */}
      <EnrollModal
        user={selectedUserForEnroll}
        courses={courses}
        batches={batches}
        isOpen={Boolean(selectedUserForEnroll)}
        onClose={() => setSelectedUserForEnroll(null)}
        onSuccess={() => showToast("Student enrolled and fees record generated successfully!")}
      />
    </div>
  );
}
