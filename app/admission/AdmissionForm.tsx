"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitAdmission } from "@/app/actions/admissions";
import { Button } from "@/components/ui/Button";

interface Course {
  id: string;
  title: string;
}

export default function AdmissionForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const result = await submitAdmission(data);

    if (result.success) {
      setMessage({ type: "success", text: "Admission form submitted successfully! We will contact you soon." });
      e.currentTarget.reset();
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to submit form. Please try again." });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
      {message && (
        <div className={`mb-8 p-4 rounded-2xl text-sm font-bold ${
          message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
            <input
              required
              name="name"
              type="text"
              placeholder="Enter your full name"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Father's Name</label>
            <input
              required
              name="father_name"
              type="text"
              placeholder="Enter father's name"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
            <input
              required
              name="email"
              type="email"
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Mobile Number</label>
            <input
              required
              name="phone"
              type="tel"
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Date of Birth</label>
            <input
              required
              name="dob"
              type="date"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Select Course</label>
            <select
              required
              name="course_id"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"
            >
              <option value="">Choose a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Qualification</label>
          <input
            required
            name="qualification"
            type="text"
            placeholder="e.g. 12th Pass, Graduate"
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 ml-1">Full Address</label>
          <textarea
            required
            name="address"
            rows={3}
            placeholder="Enter your complete address"
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
          ></textarea>
        </div>

        <div className="pt-4">
          <button
            disabled={isSubmitting}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Apply Now"}
          </button>
        </div>
      </form>
    </div>
  );
}
