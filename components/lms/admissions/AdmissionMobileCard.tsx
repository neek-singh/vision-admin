"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  Calendar, 
  ExternalLink, 
  FileText 
} from "lucide-react";

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
}

export default function AdmissionMobileCard({ item }: { item: Admission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const parsedMsg = parseMessage(item.message);

  const getInitials = (name: string) => {
    if (!name) return "IN";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const rawCode = formattedCourse?.course_code || "Course";
  const displayBadgeCode = rawCode.includes("-") && rawCode.length > 12
    ? rawCode.split("-").map((w) => w[0]).join("").toUpperCase()
    : rawCode.toUpperCase();

  return (
    <div className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
      {/* Header row */}
      <div className="flex justify-between items-start gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
            {getInitials(item.student_name)}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">
              {item.student_name}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {new Date(item.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          {displayBadgeCode}
        </span>
      </div>

      {/* Details Box */}
      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Contact</span>
          <a href={`tel:${item.phone}`} className="text-slate-800 dark:text-slate-200 font-medium block hover:underline">{item.phone}</a>
          <span className="text-[10px] text-slate-400 block truncate mt-0.5">{item.email}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Course</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium block line-clamp-1">{formattedCourse?.title}</span>
          <span className="text-[10px] text-slate-400 block truncate mt-0.5 uppercase">{formattedCourse?.course_code}</span>
        </div>
      </div>

      {/* Toggle button */}
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── Expanded Drawer ── */}
      {isExpanded && (
        <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3.5 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Personal Info</span>
            <div className="space-y-1.5 text-[11px]">
              <div><span className="text-slate-400">DOB:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{item.dob || "—"}</span></div>
              <div><span className="text-slate-400">Qualification:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{item.qualification || "—"}</span></div>
              {item.father_name && <div><span className="text-slate-400">Father:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{item.father_name}</span></div>}
              {item.mother_name && <div><span className="text-slate-400">Mother:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{item.mother_name}</span></div>}
              {item.address && <div><span className="text-slate-400">Address:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{formatAddress(item.address)}</span></div>}
            </div>
          </div>

          {item.message && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Notes &amp; Motivation</span>
              {parsedMsg.school && <p className="text-[11px]"><span className="text-slate-400">School/College:</span> {parsedMsg.school}</p>}
              {parsedMsg.batch && <p className="text-[11px]"><span className="text-slate-400">Batch:</span> {parsedMsg.batch}</p>}
              {parsedMsg.motivation && <p className="text-[11px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">{parsedMsg.motivation}</p>}
            </div>
          )}

          {(item.photo_url || item.signature_url || item.identity_proof_url) && (
            <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2.5 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Documents</span>
              <div className="flex flex-wrap gap-2">
                {item.photo_url && (
                  <a href={item.photo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-800">
                    <span>Photo</span>
                    <ExternalLink size={10} />
                  </a>
                )}
                {item.signature_url && (
                  <a href={item.signature_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-800">
                    <span>Signature</span>
                    <ExternalLink size={10} />
                  </a>
                )}
                {item.identity_proof_url && (
                  <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200/60 dark:border-slate-800">
                    <span>Identity Proof</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
