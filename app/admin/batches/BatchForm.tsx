"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBatch } from "@/app/actions/batches";
import { Loader2 } from "lucide-react";

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
      alert("Batch title is required");
      return;
    }

    setLoading(true);
    try {
      const result = await saveBatch(formData);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        router.push("/admin/batches");
        router.refresh();
      }
    } catch (err) {
      alert("Failed to save batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-slate-900">
          {batch ? "Edit Batch" : "Create New Batch"}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {batch ? "Update batch details and configuration." : "Set up a new batch for student enrollment."}
        </p>
      </div>

      <div className="p-8 space-y-6">
        {/* Row 1: Title + Course */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Batch Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. BCC Morning Batch - Jan 2025"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Linked Course
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900 appearance-none"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Faculty / Instructor
            </label>
            <input
              type="text"
              value={formData.faculty_name}
              onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
              placeholder="e.g. Mr. Sharma"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Timing
            </label>
            <input
              type="text"
              value={formData.timing}
              onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
              placeholder="e.g. 08:00 AM - 10:00 AM"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Row 3: Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Row 4: Seats + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Max Seats
            </label>
            <input
              type="number"
              value={formData.max_seats}
              onChange={(e) => setFormData({ ...formData, max_seats: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Available Seats
            </label>
            <input
              type="number"
              value={formData.available_seats}
              onChange={(e) => setFormData({ ...formData, available_seats: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900 appearance-none"
            >
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {batch ? "Update Batch" : "Create Batch"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
