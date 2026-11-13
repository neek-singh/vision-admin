"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBatch } from "@/app/actions/web/batches";
import { Loader2, AlertCircle } from "lucide-react";

interface BatchData {
  id?: string;
  title: string;
  course_id: string;
  faculty_name: string;
  start_date: string;
  end_date: string;
  timing: string;
  max_seats: number;
  available_seats: number;
  status: string;
}

export default function BatchForm({
  batch,
  courses = [],
}: {
  batch?: any;
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BatchData>({
    id: batch?.id || undefined,
    title: batch?.title || "",
    course_id: batch?.course_id || "",
    faculty_name: batch?.faculty_name || "",
    start_date: batch?.start_date || "",
    end_date: batch?.end_date || "",
    timing: batch?.timing || "",
    max_seats: batch?.max_seats || 30,
    available_seats: batch?.available_seats || 30,
    status: batch?.status || "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Batch title is required");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await saveBatch(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/batches");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save batch. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all text-sm font-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500";
  const selectClass =
    "w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all text-sm font-normal text-slate-900 dark:text-white appearance-none cursor-pointer";
  const labelClass =
    "block text-xs font-medium text-slate-700 dark:text-slate-300 normal-case mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="px-4 sm:px-6 md:px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          {batch ? "Edit Batch" : "Create New Batch"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {batch ? "Update batch details and configuration." : "Set up a new batch for student enrollment."}
        </p>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Title + Course */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label className={labelClass}>
              Batch Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. BCC Morning Batch - Jan 2025"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Linked Course
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className={selectClass}
            >
              <option value="">Select a course...</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Faculty + Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label className={labelClass}>
              Faculty / Instructor
            </label>
            <input
              type="text"
              value={formData.faculty_name}
              onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
              placeholder="e.g. Mr. Sharma"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Timing
            </label>
            <input
              type="text"
              value={formData.timing}
              onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
              placeholder="e.g. 08:00 AM - 10:00 AM"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 3: Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label className={labelClass}>
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 4: Seats + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          <div>
            <label className={labelClass}>
              Max Seats
            </label>
            <input
              type="number"
              value={formData.max_seats}
              onChange={(e) => setFormData({ ...formData, max_seats: parseInt(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Available Seats
            </label>
            <input
              type="number"
              value={formData.available_seats}
              onChange={(e) => setFormData({ ...formData, available_seats: parseInt(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className={selectClass}
            >
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-slate-50/60 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-medium shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          <span>{batch ? "Update Batch" : "Create Batch"}</span>
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
