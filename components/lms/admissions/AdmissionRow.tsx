"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyAdmissionDocuments } from "@/app/actions/lms/admin";
import AdminActions from "./AdminActions";

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
        parsed.pin && `Pin Code: ${parsed.pin}`
      ].filter(Boolean);
      return parts.join(", ");
    }
  } catch (e) {
    // Fallback
  }
  return addressStr;
}

export default function AdmissionRow({ item }: { item: Admission }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const formattedCourse = Array.isArray(item.courses) ? item.courses[0] : item.courses;
  const studentId = item.students?.[0]?.student_id;

  const handleVerify = (verified: boolean) => {
    startTransition(async () => {
      const res = await verifyAdmissionDocuments(item.id, verified);
      if (res?.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td className="px-6 py-4">
          <div className="font-bold text-gray-900">{item.student_name}</div>
          <div className="text-xs text-gray-400">
            {new Date(item.created_at).toLocaleDateString("en-IN")}
          </div>
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
        <td className="px-6 py-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              item.status === "approved"
                ? "bg-green-50 text-green-700"
                : item.status === "rejected"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {item.status}
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center gap-2 justify-end">
            {item.status === "approved" && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-xl transition-all"
              >
                {isExpanded ? "Hide Pipeline" : "View Pipeline"}
              </button>
            )}
            <AdminActions
              id={item.id}
              status={item.status}
              phone={item.phone}
              studentName={item.student_name}
              courseTitle={formattedCourse?.title}
              studentId={studentId}
            />
          </div>
        </td>
      </tr>

      {isExpanded && item.status === "approved" && (
        <tr className="bg-slate-50/40">
          <td colSpan={6} className="px-6 py-5 border-t border-b border-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-4xl text-left">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">Admission Pipeline Flow</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Current Step:</span>
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    {item.flow_step || "personal"}
                  </span>
                  {item.document_verified && (
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Personal Details */}
              {item.father_name ? (
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
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Date of Birth</span>
                    <span className="text-slate-900 font-semibold">
                      {item.dob ? new Date(item.dob).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Gender</span>
                    <span className="text-slate-900 font-semibold capitalize">{item.gender || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Caste / Category</span>
                    <span className="text-slate-900 font-semibold">{item.category || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Qualification</span>
                    <span className="text-slate-900 font-semibold">{item.qualification || "—"}</span>
                  </div>
                  <div className="sm:col-span-3">
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">Address</span>
                    <span className="text-slate-900 font-semibold block whitespace-pre-line leading-relaxed">{formatAddress(item.address)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Personal details form not yet completed by the student.</p>
              )}

              {/* Uploaded Documents */}
              {(item.photo_url || item.signature_url || item.identity_proof_url) && (
                <div className="border-t border-slate-100 pt-4">
                  <span className="text-xs font-bold text-slate-900 block mb-3">Uploaded Documents</span>
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

              {/* Document Verification Control */}
              {item.flow_step === "review" && !item.document_verified && (
                <div className="border-t border-slate-100 pt-4 flex justify-end gap-3">
                  <button
                    disabled={pending}
                    onClick={() => handleVerify(false)}
                    className="px-3.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Reject Documents
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => handleVerify(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    {pending ? "Processing..." : "Approve & Verify Documents"}
                  </button>
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
