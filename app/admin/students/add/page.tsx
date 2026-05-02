"use client";

import { useState, useEffect } from "react";
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, Fingerprint, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function AddStudentPage() {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [courses, setCourses] = useState<{ id: string; title: string; course_code: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCourses, setIsFetchingCourses] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatedData, setGeneratedData] = useState<{ id: string; pass: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, course_code")
        .order("title");
      
      if (!error && data) {
        setCourses(data);
      }
      setIsFetchingCourses(false);
    }
    fetchCourses();
  }, []);

  const getAutoPassword = () => {
    if (!name || !phone || phone.length < 4) return "";
    const firstName = name.trim().split(" ")[0];
    const last4 = phone.trim().slice(-4);
    return `${firstName}@${last4}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setGeneratedData(null);
    setIsLoading(true);

    const autoPassword = getAutoPassword();

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, course, password: autoPassword, email, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setIsLoading(false);
        return;
      }

      setSuccess("Student created successfully!");
      setGeneratedData({ id: data.student?.student_id, pass: autoPassword });
      setName(""); setCourse(""); setEmail(""); setPhone("");
    } catch (err) {
      setError("Failed to connect to the service.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white py-10 px-8">
      <div className="max-w-5xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-10">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Register New Student</h1>
              <p className="text-slate-500 font-medium">Create a new student profile and generate secure access credentials.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="font-bold text-sm">{error}</p>
                </div>
              )}

              {success && generatedData && (
                <div className="p-6 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-100 space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="font-black text-lg leading-none">Account Created!</p>
                      <p className="text-emerald-600/70 text-xs font-bold mt-1">Student can now login using these details.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-200/30">
                      <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-1">Student ID</p>
                      <p className="font-mono text-base font-black text-slate-900 select-all">{generatedData.id}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-200/30">
                      <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-1">Temporary Password</p>
                      <p className="font-mono text-base font-black text-slate-900 select-all">{generatedData.pass}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-2 group">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Student Full Name</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Mobile Number</label>
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Email Address</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Assign Primary Course</label>
                  <div className="relative">
                    <select
                      required
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg appearance-none cursor-pointer"
                      disabled={isFetchingCourses}
                    >
                      <option value="">{isFetchingCourses ? "Loading..." : "Select Course"}</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.title}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <BookOpen size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-50">
                <div className="flex items-center gap-4">
                  {(name && phone.length >= 4) ? (
                    <div className="px-4 py-2 bg-blue-50 rounded-2xl flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        Password will be: <span className="bg-white px-2 py-0.5 rounded shadow-sm ml-1">{getAutoPassword()}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} /> Enter Name & Phone to see password
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isFetchingCourses}
                  className="px-10 py-4 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 disabled:opacity-50 text-sm active:translate-y-0"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : (
                    <>
                      <UserPlus size={18} />
                      Register Student Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar / Info Side */}
          <div className="space-y-8">
            <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Fingerprint className="text-blue-600" size={20} />
                Quick Guidelines
              </h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 bg-white rounded-xl flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">01</div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">
                    Student ID is auto-generated based on the current year and selected course code.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 bg-white rounded-xl flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">02</div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">
                    Password is set to <span className="text-slate-900">FirstName@Last4Digits</span> by default.
                  </p>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 bg-white rounded-xl flex items-center justify-center text-xs font-black text-blue-600 shadow-sm">03</div>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">
                    Once registered, you can assign multiple additional courses from the student list.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                System automatically verifies<br />for duplicate emails and phone numbers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
