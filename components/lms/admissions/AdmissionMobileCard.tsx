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

export default function AdmissionMobileCard({ item }: { item: Admission }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const parsedMsg = parseMessage(item.message);

  return (
    <div className="p-4 space-y-4">
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-900">{item.student_name}</h4>
          <p className="text-[10px] text-slate-400 uppercase font-bold">
            {new Date(item.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700">
          {formattedCourse?.course_code || "Course"}
        </span>
      </div>

      {/* Contact + Course */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</p>
          <p className="text-xs font-bold text-slate-700">{item.phone}</p>
          <p className="text-[10px] text-slate-500 truncate">{item.email}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Course</p>
          <p className="text-xs font-bold text-blue-600 line-clamp-1">{formattedCourse?.title}</p>
          <p className="text-[9px] text-slate-400 uppercase font-black">{formattedCourse?.course_code}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-200 w-full text-center"
        >
          {isExpanded ? "Hide Details" : "View Details"}
        </button>
      </div>

      {/* ── Expanded Details Panel ── */}
      {isExpanded && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 text-xs font-medium text-slate-700">

          {/* Basic Info */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Basic Information</span>
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Date of Birth</span>
                <span className="text-slate-900 font-semibold">
                  {item.dob ? new Date(item.dob).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Qualification</span>
                <span className="text-slate-900 font-semibold">{item.qualification || "—"}</span>
              </div>
            </div>
          </div>

          {/* Message / Notes */}
          {item.message && (
            <div className="border-t border-slate-200/60 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Inquiry Notes</span>
              {parsedMsg.school && (
                <div className="bg-white border border-slate-100 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">School / College</span>
                  <span className="text-slate-900 font-semibold">{parsedMsg.school}</span>
                </div>
              )}
              {parsedMsg.batch && (
                <div className="bg-white border border-slate-100 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Batch Preference</span>
                  <span className="text-slate-900 font-semibold">{parsedMsg.batch}</span>
                </div>
              )}
              {parsedMsg.motivation && (
                <div className="bg-white border border-slate-100 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Message</span>
                  <span className="text-slate-900 font-semibold whitespace-pre-line leading-relaxed">{parsedMsg.motivation}</span>
                </div>
              )}
            </div>
          )}

          {/* Full Personal Details */}
          {item.father_name && (
            <div className="border-t border-slate-200/60 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Personal Details</span>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Father's Name</span>
                <span className="text-slate-900 font-semibold">{item.father_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Mother's Name</span>
                <span className="text-slate-900 font-semibold">{item.mother_name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Gender &amp; Category</span>
                <span className="text-slate-900 font-semibold capitalize">{item.gender || "—"} | {item.category || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Address</span>
                <span className="text-slate-900 font-semibold block whitespace-pre-line leading-relaxed">{formatAddress(item.address)}</span>
              </div>
            </div>
          )}

          {/* Documents */}
          {(item.photo_url || item.signature_url || item.identity_proof_url) && (
            <div className="border-t border-slate-200/60 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Uploaded Documents</span>
              <div className="flex flex-col gap-2">
                {item.photo_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Profile Photo</span>
                    <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">View Image</a>
                  </div>
                )}
                {item.signature_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Signature</span>
                    <a href={item.signature_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">View Signature</a>
                  </div>
                )}
                {item.identity_proof_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Identity Proof</span>
                    <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">View Document</a>
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
