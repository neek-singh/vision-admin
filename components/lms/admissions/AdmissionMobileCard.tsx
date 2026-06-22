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

export default function AdmissionMobileCard({ item }: { item: Admission }) {
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
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-900">{item.student_name}</h4>
          <p className="text-[10px] text-slate-400 uppercase font-bold">
            {new Date(item.created_at).toLocaleDateString("en-IN")}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            item.status === "approved"
              ? "bg-green-50 text-green-700"
              : item.status === "rejected"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {item.status}
        </span>
      </div>

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

      <div className="pt-2 border-t border-slate-50 flex flex-wrap items-center justify-between gap-2">
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

      {isExpanded && item.status === "approved" && (
        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4 text-xs font-medium text-slate-700">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="font-extrabold text-slate-900">Pipeline Flow</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                {item.flow_step || "personal"}
              </span>
              {item.document_verified && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                  Verified
                </span>
              )}
            </div>
          </div>

          {item.father_name ? (
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Father's Name</span>
                <span className="text-slate-900 font-semibold">{item.father_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Mother's Name</span>
                <span className="text-slate-900 font-semibold">{item.mother_name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Date of Birth</span>
                <span className="text-slate-900 font-semibold">
                  {item.dob ? new Date(item.dob).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }) : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Gender & Qualification & Category</span>
                <span className="text-slate-900 font-semibold capitalize">
                  {item.gender || "—"} | {item.qualification || "—"} | {item.category || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Address</span>
                <span className="text-slate-900 font-semibold block whitespace-pre-line leading-relaxed">
                  {formatAddress(item.address)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">Personal details form not yet completed.</p>
          )}

          {(item.photo_url || item.signature_url || item.identity_proof_url) && (
            <div className="border-t border-slate-200/60 pt-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-900 block">Uploaded Documents</span>
              <div className="flex flex-col gap-2">
                {item.photo_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Profile Photo</span>
                    <a href={item.photo_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">
                      View Image
                    </a>
                  </div>
                )}
                {item.signature_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Signature</span>
                    <a href={item.signature_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">
                      View Signature
                    </a>
                  </div>
                )}
                {item.identity_proof_url && (
                  <div className="flex justify-between items-center p-2 border border-slate-100 rounded-lg bg-white">
                    <span className="text-[10px] text-slate-500">Identity Proof</span>
                    <a href={item.identity_proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold hover:underline">
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {item.flow_step === "review" && !item.document_verified && (
            <div className="border-t border-slate-200/60 pt-3 flex flex-col gap-2">
              <button
                disabled={pending}
                onClick={() => handleVerify(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                {pending ? "Processing..." : "Approve & Verify Documents"}
              </button>
              <button
                disabled={pending}
                onClick={() => handleVerify(false)}
                className="w-full py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Reject Documents
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
