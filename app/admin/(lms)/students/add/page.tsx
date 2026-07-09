"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, Fingerprint, Loader2, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function AddStudentPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeredStudentId, setRegisteredStudentId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      setAvailableCourses(data || []);
    }
    fetchCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRegisteredStudentId(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email.trim() || null, phone, course: selectedCourse }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsLoading(false);
        return;
      }

      setSuccess("Student registered successfully!");
      setRegisteredStudentId(data.student?.student_id || null);
      setName(""); 
      setEmail(""); 
      setPhone(""); 
      setSelectedCourse("");
    } catch (err) {
      setError("Failed to connect to the service.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        
        {/* Back navigation */}
        <div>
          <Link 
            href="/admin/students" 
            className="inline-flex items-center gap-2 text-sm font-normal text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Students List
          </Link>
        </div>

        {/* Outer Form Card */}
        <div className="bg-white dark:bg-[#0f172a] p-6 sm:p-10 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/80 shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
            
            {/* Form Side */}
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-medium text-slate-900 dark:text-slate-100 tracking-tight">Register New Student</h1>
                <p className="text-slate-400 dark:text-slate-400 font-normal text-sm sm:text-base">Create a new student profile and generate secure access credentials.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                {error && (
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100/50 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="font-medium text-sm">{error}</p>
                  </div>
                )}

                {success && registeredStudentId && (
                  <div className="p-5 sm:p-6 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/40 space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="font-medium text-base leading-none">Student Registered!</p>
                        <p className="text-emerald-600/70 dark:text-emerald-400/70 text-xs font-normal mt-1">Now go to Student Management to generate login credentials.</p>
                      </div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-emerald-200/30 dark:border-emerald-900/20">
                      <p className="text-[10px] uppercase font-medium text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">Student ID</p>
                      <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200 select-all">{registeredStudentId}</p>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 rounded-xl">
                      <KeyRound size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Login credentials not set yet — use <strong>Generate Credentials</strong> button in Student Management.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-name" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Full Name</label>
                    <div className="relative">
                      <input
                        required
                        id="student-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                      />
                    </div>
                  </div>

                  {/* Mobile number field */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-phone" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mobile Number</label>
                    <input
                      required
                      id="student-phone"
                      type="tel"
                      pattern="[0-9]{10}"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                    />
                  </div>

                  {/* Email address field */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-email" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      id="student-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                    />
                  </div>

                  {/* Primary Course field */}
                  <div className="space-y-1.5">
                    <label htmlFor="student-course" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Primary Course</label>
                    <select
                      id="student-course"
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal appearance-none cursor-pointer"
                    >
                      <option value="">Select Primary Course</option>
                      {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row items-center justify-end border-t border-slate-100 dark:border-slate-850 gap-4">
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-wide flex items-center gap-2 mr-auto">
                    <KeyRound size={13} className="text-slate-350 dark:text-slate-650" />
                    Credentials will be set separately from Student Management
                  </p>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-slate-950 dark:bg-slate-900 hover:bg-blue-600 dark:hover:bg-blue-700 hover:text-white text-white font-medium rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                      <>
                        <UserPlus size={16} />
                        Register Student
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar / Info Side */}
            <div className="space-y-6">
              <div className="bg-slate-50/50 dark:bg-slate-900/20 p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800 space-y-6">
                <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
                  <Fingerprint className="text-blue-600 dark:text-blue-455" size={18} />
                  Quick Guidelines
                </h3>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 shadow-sm select-none">01</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Student ID is auto-generated in <span className="text-slate-700 dark:text-slate-300 font-medium">VIT2026STD001</span> format.
                    </p>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs font-medium text-amber-600 dark:text-amber-400 shadow-sm select-none">02</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      After registration, go to <span className="text-slate-700 dark:text-slate-300 font-medium">Student Management</span> and click <span className="text-amber-600 dark:text-amber-400 font-bold">Generate Credentials</span> to set login ID & password.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 shrink-0 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 shadow-sm select-none">03</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Once registered, you can <span className="text-slate-700 dark:text-slate-300 font-medium">assign courses</span> from the student list dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-2 border-dashed border-slate-200/50 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center text-center space-y-3">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={20} />
                </div>
                <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-relaxed">
                  System automatically verifies<br />for duplicate email/phone numbers.
                </p>
              </div>
            </div>

          </div>
        </div>

    </div>
  );
}
