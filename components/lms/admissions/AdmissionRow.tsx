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
}

export default function AdmissionRow({ item, index }: { item: Admission; index?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const parsedMsg = parseMessage(item.message);

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-slate-50/60 transition-colors group">
        {index !== undefined && (
          <td className="px-6 py-4 text-xs font-bold text-slate-300 w-10">{index}</td>
        )}
        <td className="px-6 py-4">
          <div className="font-bold text-gray-900">{item.student_name}</div>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">{item.father_name || "—"}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          <div>{item.phone}</div>
          <div className="text-xs text-gray-400">{item.email}</div>
        </td>
        <td className="px-6 py-4">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
            {formattedCourse?.title || "Unknown Course"}
          </span>
          <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
            {formattedCourse?.course_code}
          </div>
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">
          {new Date(item.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-200"
            >
              {isExpanded ? "Hide Details" : "View Details"}
            </button>
          </div>
        </td>
      </tr>

      {/* ── Expanded Details Panel (all statuses) ── */}
      {isExpanded && (
        <tr className="bg-slate-50/40">
          <td colSpan={7} className="px-6 py-5 border-t border-b border-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-5xl text-left">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Inquiry Details — {item.student_name}
                </h3>
              </div>

              {/* ── Basic Info (always visible) ── */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Basic Information</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Student Name</span>
                    <span className="text-slate-900 font-semibold">{item.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Phone</span>
                    <span className="text-slate-900 font-semibold">{item.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Email</span>
                    <span className="text-slate-900 font-semibold break-all">{item.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Date of Birth</span>
                    <span className="text-slate-900 font-semibold">
                      {item.dob
                        ? new Date(item.dob).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Qualification</span>
                    <span className="text-slate-900 font-semibold">{item.qualification || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Applied On</span>
                    <span className="text-slate-900 font-semibold">
                      {new Date(item.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Inquiry Message / Notes ── */}
              {item.message && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Inquiry Notes</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {parsedMsg.school && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">School / College</span>
                        <span className="text-slate-900 font-semibold">{parsedMsg.school}</span>
                      </div>
                    )}
                    {parsedMsg.batch && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">Batch Preference</span>
                        <span className="text-slate-900 font-semibold">{parsedMsg.batch}</span>
                      </div>
                    )}
                    {parsedMsg.motivation && (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:col-span-3">
                        <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">Message / Motivation</span>
                        <span className="text-slate-900 font-semibold whitespace-pre-line leading-relaxed">{parsedMsg.motivation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Full Personal Details ── */}
              {item.father_name && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Personal Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-medium text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Father's Name</span>
                      <span className="text-slate-900 font-semibold">{item.father_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Mother's Name</span>
                      <span className="text-slate-900 font-semibold">{item.mother_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Gender</span>
                      <span className="text-slate-900 font-semibold capitalize">{item.gender || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Caste / Category</span>
                      <span className="text-slate-900 font-semibold">{item.category || "—"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Address</span>
                      <span className="text-slate-900 font-semibold block whitespace-pre-line leading-relaxed">{formatAddress(item.address)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Uploaded Documents ── */}
              {(item.photo_url || item.signature_url || item.identity_proof_url) && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Uploaded Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {item.photo_url && (
                      <div className="flex flex-col items-center p-3 border border-slate-100 rounded-xl bg-slate-50 gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profile Photo</span>
                        <a href={item.photo_url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 block hover:opacity-80 transition-opacity">
                          <img src={item.photo_url} alt="Photo" className="w-full h-full object-cover" />
                        </a>
                      </div>
                    )}
                    {item.signature_url && (
                      <div className="flex flex-col items-center p-3 border border-slate-100 rounded-xl bg-slate-50 gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signature</span>
                        <a href={item.signature_url} target="_blank" rel="noreferrer" className="h-10 border border-slate-200 block hover:opacity-80 transition-opacity p-1 bg-white">
                          <img src={item.signature_url} alt="Signature" className="max-h-full object-contain" />
                        </a>
                      </div>
                    )}
                    {item.identity_proof_url && (
                      <div className="flex flex-col items-center p-3 border border-slate-100 rounded-xl bg-slate-50 gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identity / Marksheet</span>
                        <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors inline-flex items-center gap-1">
                          View Document
                        </a>
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
