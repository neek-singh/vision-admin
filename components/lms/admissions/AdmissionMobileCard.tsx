"use client";

import { useState } from "react";

interface Course {
  title: string;
  course_code: string;
}

interface Student {
  student_id: string;
}

interface Admission {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  father_name: string | null;
  mother_name?: string | null;
  qualification: string | null;
  dob: string | null;
  gender: string | null;
  category?: string | null;
  address: string | null;
  photo_url: string | null;
  signature_url: string | null;
  identity_proof_url: string | null;
  flow_step: string | null;
  document_verified: boolean;
  message: string | null;
  courses: Course | Course[];
  students?: Student[];
}

function formatAddress(addressStr: string | null): string {
  if (!addressStr) return "—";
  try {
    if (addressStr.startsWith("{") || addressStr.startsWith("[")) {
      const parsed = JSON.parse(addressStr);
      const parts = [
        parsed.village && `Village/City: ${parsed.village}`,
        parsed.post && `Post: ${parsed.post}`,
        parsed.district && `District: ${parsed.district}`,
        parsed.state && `State: ${parsed.state}`,
        parsed.pin && `Pin Code: ${parsed.pin}`,
      ].filter(Boolean);
      return parts.join(", ");
    }
  } catch (e) {
    // Fallback
  }
  return addressStr;
}

function parseMessage(msg: string | null): { school?: string; batch?: string; motivation?: string } {
  if (!msg) return {};
  const result: { school?: string; batch?: string; motivation?: string } = {};
  const schoolMatch = msg.match(/School\/College Name:\s*(.+)/);
  const batchMatch = msg.match(/Batch Preference:\s*(.+)/);
  const motivMatch = msg.match(/Motivation:\s*([\s\S]+)/);
  if (schoolMatch) result.school = schoolMatch[1].trim();
  if (batchMatch) result.batch = batchMatch[1].trim();
  if (motivMatch) result.motivation = motivMatch[1].trim();
  if (!schoolMatch && !batchMatch) result.motivation = msg;
  return result;
}export default function AdmissionMobileCard({ item }: { item: Admission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const parsedMsg = parseMessage(item.message);

  const capitalizedName = item.student_name.replace(/\b\w/g, (c) => c.toUpperCase());
  const rawCode = formattedCourse?.course_code || "Course";
  const displayBadgeCode = rawCode.includes("-") && rawCode.length > 12
    ? rawCode.split("-").map((w) => w[0]).join("").toUpperCase()
    : rawCode.toUpperCase();

  return (
    <div className="p-5 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <h4 className="font-black text-slate-900 dark:text-white text-sm">{capitalizedName}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
            {new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30 shrink-0">
          {displayBadgeCode}
        </span>
      </div>

      {/* Details Box */}
      <div className="bg-slate-50/50 dark:bg-slate-850/30 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 grid grid-cols-2 gap-3.5 text-xs leading-relaxed">
        <div>
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Contact</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold block">{item.phone}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-550 block truncate mt-0.5">{item.email}</span>
        </div>
        <div>
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Course</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold block line-clamp-1">{formattedCourse?.title}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-550 block truncate mt-0.5 uppercase tracking-wide">Code: {displayBadgeCode}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl border border-slate-200/60 dark:border-slate-700/80 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
          <svg 
            className={`w-3.5 h-3.5 transform transition-transform text-slate-450 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ── Expanded Details Panel ── */}
      {isExpanded && (
        <div className="bg-slate-50/30 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4 space-y-4 text-xs font-medium text-slate-700 dark:text-slate-305">

          {/* Basic Info */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Basic Information</span>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Date of Birth</span>
                <span className="text-slate-905 dark:text-white font-semibold">
                  {item.dob ? new Date(item.dob).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Qualification</span>
                <span className="text-slate-905 dark:text-white font-semibold">{item.qualification || "—"}</span>
              </div>
            </div>
          </div>

          {/* Message / Notes */}
          {item.message && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Inquiry Notes</span>
              {parsedMsg.school && (
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2.5">
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-1">School / College</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{parsedMsg.school}</span>
                </div>
              )}
              {parsedMsg.batch && (
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2.5">
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Batch Preference</span>
                  <span className="text-slate-900 dark:text-white font-semibold">{parsedMsg.batch}</span>
                </div>
              )}
              {parsedMsg.motivation && (
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2.5">
                  <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-1">Message</span>
                  <span className="text-slate-900 dark:text-white font-semibold whitespace-pre-line leading-relaxed">{parsedMsg.motivation}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Personal Details */}
          {item.father_name && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Personal Details</span>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Father's Name</span>
                <span className="text-slate-905 dark:text-white font-semibold">{item.father_name}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Mother's Name</span>
                <span className="text-slate-905 dark:text-white font-semibold">{item.mother_name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Gender &amp; Category</span>
                <span className="text-slate-905 dark:text-white font-semibold capitalize">{item.gender || "—"} | {item.category || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider">Address</span>
                <span className="text-slate-905 dark:text-white font-semibold block whitespace-pre-line leading-relaxed">{formatAddress(item.address)}</span>
              </div>
            </div>
          )}

          {/* Documents */}
          {(item.photo_url || item.signature_url || item.identity_proof_url) && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Uploaded Documents</span>
              <div className="flex flex-col gap-2">
                {item.photo_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 dark:border-slate-800/50 rounded-lg bg-white dark:bg-slate-850">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Profile Photo</span>
                    <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">View Image</a>
                  </div>
                )}
                {item.signature_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 dark:border-slate-800/50 rounded-lg bg-white dark:bg-slate-850">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Signature</span>
                    <a href={item.signature_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">View Signature</a>
                  </div>
                )}
                {item.identity_proof_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 dark:border-slate-800/50 rounded-lg bg-white dark:bg-slate-850">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Identity Proof</span>
                    <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline">View Document</a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
