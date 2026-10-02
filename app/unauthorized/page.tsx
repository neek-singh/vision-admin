import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert size={28} className="text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Access Denied
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            You don&apos;t have permission to access this page. Please contact the administrator.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-black transition-all hover:opacity-90"
        >
          <ArrowLeft size={15} />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
