"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  FileText, 
  ExternalLink,
  GraduationCap,
  MapPin,
  Clock
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

export default function AdmissionRow({ item, index }: { item: Admission; index?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const parsedMsg = parseMessage(item.message);

  const getInitials = (name: string) => {
    if (!name) return "IN";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
        {index !== undefined && (
          <td className="px-5 py-3.5 text-xs text-slate-400 font-medium w-12 text-center">
            {index}
          </td>
        )}
        {/* Student Column */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
              {getInitials(item.student_name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                {item.student_name}
              </p>
              {item.students && item.students[0]?.student_id && (
                <span className="inline-block font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-medium mt-0.5">
                  {item.students[0].student_id}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Father's Name */}
        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
          {item.father_name || "—"}
        </td>

        {/* Contact */}
        <td className="px-5 py-3.5">
          <div className="min-w-0">
            <a 
              href={`tel:${item.phone}`} 
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.phone}
            </a>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[160px] mt-0.5">
              {item.email || "—"}
            </p>
          </div>
        </td>

        {/* Course */}
        <td className="px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[200px]" title={formattedCourse?.title}>
              {formattedCourse?.title || "General Inquiry"}
            </p>
            {formattedCourse?.course_code && (
              <span className="inline-block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md mt-0.5">
                {formattedCourse.course_code}
              </span>
            )}
          </div>
        </td>

        {/* Date */}
        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-400 shrink-0" />
            <span>
              {new Date(item.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-5 py-3.5 text-right whitespace-nowrap">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            <span>{isExpanded ? "Hide Details" : "View Details"}</span>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </td>
      </tr>

      {/* ── Expanded Details Panel ── */}
      {isExpanded && (
        <tr className="bg-slate-50/50 dark:bg-slate-950/40">
          <td colSpan={7} className="px-5 py-5 border-b border-slate-200/70 dark:border-slate-800/80">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-5 max-w-5xl mx-auto">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <User size={13} />
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Inquiry Details — {item.student_name}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Applied on {new Date(item.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>

              {/* ── Basic Info ── */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                  Basic Information
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Full Name</span>
                    <span className="text-slate-900 dark:text-white font-medium">{item.student_name}</span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Phone</span>
                    <a href={`tel:${item.phone}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">{item.phone || "—"}</a>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Email</span>
                    <span className="text-slate-900 dark:text-white font-medium break-all">{item.email || "—"}</span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Date of Birth</span>
                    <span className="text-slate-900 dark:text-white font-medium">
                      {item.dob
                        ? new Date(item.dob).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Qualification</span>
                    <span className="text-slate-900 dark:text-white font-medium">{item.qualification || "—"}</span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Gender</span>
                    <span className="text-slate-900 dark:text-white font-medium capitalize">{item.gender || "—"}</span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Category</span>
                    <span className="text-slate-900 dark:text-white font-medium">{item.category || "—"}</span>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Status</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold capitalize">{item.status || "Inquiry"}</span>
                  </div>
                </div>
              </div>

              {/* ── Guardian & Address ── */}
              {(item.father_name || item.address) && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                    Guardian &amp; Address Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {item.father_name && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Father's Name</span>
                        <span className="text-slate-900 dark:text-white font-medium">{item.father_name}</span>
                      </div>
                    )}
                    {item.mother_name && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Mother's Name</span>
                        <span className="text-slate-900 dark:text-white font-medium">{item.mother_name}</span>
                      </div>
                    )}
                    {item.address && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 sm:col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">Address</span>
                        <span className="text-slate-900 dark:text-white font-medium whitespace-pre-line leading-relaxed">
                          {formatAddress(item.address)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Inquiry Message / Notes ── */}
              {item.message && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">
                    Inquiry Notes &amp; Preferences
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {parsedMsg.school && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">School / College</span>
                        <span className="text-slate-900 dark:text-white font-medium">{parsedMsg.school}</span>
                      </div>
                    )}
                    {parsedMsg.batch && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Batch Preference</span>
                        <span className="text-slate-900 dark:text-white font-medium">{parsedMsg.batch}</span>
                      </div>
                    )}
                    {parsedMsg.motivation && (
                      <div className="bg-slate-50/60 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 sm:col-span-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">Message / Notes</span>
                        <span className="text-slate-900 dark:text-white font-medium whitespace-pre-line leading-relaxed">{parsedMsg.motivation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Uploaded Documents ── */}
              {(item.photo_url || item.signature_url || item.identity_proof_url) && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
                    Attached Documents
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {item.photo_url && (
                      <div className="flex items-center gap-3 p-3 border border-slate-200/70 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <a href={item.photo_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 block shrink-0 hover:opacity-85 transition-opacity">
                          <img src={item.photo_url} alt="Photo" className="w-full h-full object-cover" />
                        </a>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">Profile Photo</p>
                          <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    )}
                    {item.signature_url && (
                      <div className="flex items-center gap-3 p-3 border border-slate-200/70 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <a href={item.signature_url} target="_blank" rel="noreferrer" className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 block shrink-0 p-1 bg-white hover:opacity-85 transition-opacity">
                          <img src={item.signature_url} alt="Signature" className="w-full h-full object-contain" />
                        </a>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">Signature</p>
                          <a href={item.signature_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    )}
                    {item.identity_proof_url && (
                      <div className="flex items-center gap-3 p-3 border border-slate-200/70 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                        <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">Identity Document</p>
                          <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5">
                            <span>View Proof</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
