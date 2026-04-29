"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveBatch } from "@/app/actions/batches";

type BatchData = {
  id?: string;
  course: string;
  date: string;
  time: string;
  type: string;
  seats: string;
};

export default function BatchForm({ initialData }: { initialData?: BatchData }) {
  const router = useRouter();

  const [formData, setFormData] = useState<BatchData>({
    course: initialData?.course || "",
    date: initialData?.date || "",
    time: initialData?.time || "",
    type: initialData?.type || "Morning Batch",
    seats: initialData?.seats || "Only 10 seats left",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course.trim()) return setError("Course title required");
    if (!formData.date.trim()) return setError("Start date required");
    if (!formData.time.trim()) return setError("Timings required");

    setIsSubmitting(true);
    setError("");

    try {
      const result = await saveBatch({
        ...formData,
        id: initialData?.id
      });

      if (result.error) throw new Error(result.error);

      router.push("/admin/batches");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process updates.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      {error && <p className="text-red-500 font-semibold text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Course Title</label>
        <input
          type="text"
          name="course"
          value={formData.course}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
          placeholder="e.g., Full Stack Web Development"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
          <input
            type="text"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            placeholder="e.g., May 10, 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Time Slots</label>
          <input
            type="text"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            placeholder="e.g., 09:00 AM - 11:00 AM"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Batch Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-bold text-slate-800"
          >
            <option value="Morning Batch">Morning Batch</option>
            <option value="Afternoon Batch">Afternoon Batch</option>
            <option value="Evening Batch">Evening Batch</option>
            <option value="Online Batch">Online Batch</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Available Seats</label>
          <input
            type="text"
            name="seats"
            value={formData.seats}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            placeholder="e.g., Only 4 seats left"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold flex items-center justify-center border-none">
        {isSubmitting ? "Saving..." : "Save Batch"}
      </Button>
    </form>
  );
}
