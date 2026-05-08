"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "blue" | "emerald" | "rose" | "amber" | "indigo" | "slate";
  className?: string;
}

export default function Badge({ children, variant = "slate", className = "" }: BadgeProps) {
  const variants = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
