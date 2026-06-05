"use client";

import { updateAdmissionStatus } from "@/app/actions/lms/admin";
import { useState, useTransition } from "react";
import { CheckCircle2, Copy, X, Smartphone } from "lucide-react";
import DeleteButton from "@/components/ui/DeleteButton";

export default function AdminActions({ id, status, phone, studentName, courseTitle, studentId }: any) {
    const [pending, startTransition] = useTransition();
    const [showModal, setShowModal] = useState(false);
    const [creds, setCreds] = useState<any>(null);

    // Sanitize phone number for WhatsApp
    const getWhatsAppLink = (isApprove: boolean, customId?: string, customPass?: string) => {
        if (!phone) return "#";
        const cleanPhone = phone.replace(/\D/g, "");
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        
        const firstName = studentName.split(" ")[0];
        const last4Phone = phone.slice(-4);
        const autoPassword = customPass || `${firstName}@${last4Phone}`;
        const displayId = customId || studentId || "(Check Dashboard)";
        
        const message = isApprove 
            ? `🎓 Vision Learn Login Details\n\nStudent ID: ${displayId}\nPassword: ${autoPassword}\n\nLogin: https://learn.visionitinstitute.com`
            : `Hello ${studentName},\n\nWe regret to inform you that your application for the *${courseTitle}* course at *Vision Learn* could not be approved at this time.\n\nFeel free to contact us for more details.`;
            
        return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied!");
    };

    return (
        <div className="flex items-center gap-2 justify-end">
            {status === "pending" && (
                <>
                    <button
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                const result = await updateAdmissionStatus(id, "approved");
                                if (result?.error) {
                                    alert(result.error);
                                } else if (result?.credentials) {
                                    setCreds(result.credentials);
                                    setShowModal(true);
                                }
                            })
                        }
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        {pending ? "..." : "Approve"}
                    </button>

                    <button
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                const result = await updateAdmissionStatus(id, "rejected");
                                if (result?.error) {
                                    alert(result.error);
                                }
                            })
                        }
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        {pending ? "..." : "Reject"}
                    </button>
                </>
            )}

            {status === "approved" && (
                <a
                    href={getWhatsAppLink(true)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm shadow-emerald-200 transition-all"
                >
                    <span>WhatsApp</span> 📲
                </a>
            )}

            {status === "rejected" && (
                <a
                    href={getWhatsAppLink(false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                >
                    <span>Notify WhatsApp</span> 📲
                </a>
            )}

            <DeleteButton id={id} table="admissions" title={studentName} />

            {/* Credential Modal */}
            {showModal && creds && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-blue-50/50 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                                <CheckCircle2 size={24} />
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <h3 className="text-xl font-black text-blue-950 mb-1">Admission Approved!</h3>
                        <p className="text-sm text-gray-400 font-medium mb-8">Generated credentials for {studentName}</p>

                        <div className="space-y-4 mb-8">
                            <div className="bg-gray-50 p-4 rounded-2xl relative group">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Student ID</p>
                                <p className="font-mono font-black text-blue-900">{creds.studentId}</p>
                                <button onClick={() => handleCopy(creds.studentId)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg">
                                    <Copy size={14} className="text-blue-600" />
                                </button>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl relative group">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Password</p>
                                <p className="font-mono font-black text-blue-900">{creds.password}</p>
                                <button onClick={() => handleCopy(creds.password)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm rounded-lg">
                                    <Copy size={14} className="text-blue-600" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <a
                                href={getWhatsAppLink(true, creds.studentId, creds.password)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 transition-all"
                            >
                                <Smartphone size={18} />
                                Send on WhatsApp
                            </a>
                            <button
                                onClick={() => setShowModal(false)}
                                className="py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
