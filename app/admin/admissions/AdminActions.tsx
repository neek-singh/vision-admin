"use client";

import { updateAdmissionStatus } from "@/app/actions/admin";
import { useTransition } from "react";

export default function AdminActions({ id, status, phone, studentName, courseTitle }: any) {
    const [pending, startTransition] = useTransition();

    // Sanitize phone number for WhatsApp (Requires country code, e.g., 91 for India)
    const getWhatsAppLink = (isApprove: boolean) => {
        if (!phone) return "#";
        const cleanPhone = phone.replace(/\D/g, "");
        const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        
        const message = isApprove 
            ? `Hello ${studentName},\n\nCongratulations! 🎉 Your admission for the *${courseTitle}* course at *Vision IT Computer Institute* has been *APPROVED*. \n\nWe are excited to have you on board! Please visit the institute to complete further formalities.`
            : `Hello ${studentName},\n\nWe regret to inform you that your application for the *${courseTitle}* course at *Vision IT* could not be approved at this time.\n\nFeel free to contact us for more details.`;
            
        return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="flex items-center gap-2 justify-end">
            {status === "pending" && (
                <>
                    <button
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                await updateAdmissionStatus(id, "approved");
                            })
                        }
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        Approve
                    </button>

                    <button
                        disabled={pending}
                        onClick={() =>
                            startTransition(async () => {
                                await updateAdmissionStatus(id, "rejected");
                            })
                        }
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        Reject
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
        </div>
    );
}