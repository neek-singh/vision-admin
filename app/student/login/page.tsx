"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginStudent } from "@/app/actions/student-auth";
import Link from "next/link";
import Image from "next/image";

export default function StudentLoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginStudent(formData);

    if (result.success) {
      router.push("/student/dashboard");
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-20 h-20 relative mb-6">
            <Image 
              src="https://res.cloudinary.com/ddiooxxks/image/upload/f_auto,q_auto/logo_unnut8.png" 
              alt="Vision IT Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-black text-blue-950 mb-2">Vision Learn</h1>
          <p className="text-gray-500 font-medium">Student Login Panel</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-gray-100 p-8 md:p-10">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Student ID</label>
              <input
                required
                name="student_id"
                type="text"
                placeholder="VIT2026STD001"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
              <input
                required
                name="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Login to Dashboard"}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-gray-400 font-medium">
            <p>Forgot password? Contact Administrator.</p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-600 font-bold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
