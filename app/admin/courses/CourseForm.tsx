"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveCourse } from "@/app/actions/courses";

type Course = {
  id?: string;
  title: string;
  description: string;
  duration: string;
  fee: number;
  discount_fee?: number;
  image_url?: string;
  // Advanced fields
  rating?: number;
  enrolled_count?: number;
  admission_closes?: string;
  learning_format?: string;
  key_features?: string[];
  career_opportunities?: string[];
  hiring_companies?: any[];
  skills_developed?: string[];
  curriculum?: any[];
  tools_covered?: any[];
  projects?: any[];
  trainers?: any[];
  target_audience?: string;
  faqs?: any[];
  is_featured?: boolean;
};

export default function CourseForm({ course }: { course?: Course }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const [formData, setFormData] = useState<Course>(
    course || {
      title: "",
      description: "",
      duration: "",
      fee: 0,
      discount_fee: 0,
      image_url: "",
      rating: 4.8,
      enrolled_count: 120,
      learning_format: "Offline",
      target_audience: "",
      key_features: [],
      career_opportunities: [],
      skills_developed: [],
      curriculum: [],
      tools_covered: [],
      projects: [],
      trainers: [],
      faqs: [],
      is_featured: false,
    }
  );

  // Helper to handle array inputs from comma-separated strings
  const handleArrayInput = (field: keyof Course, value: string) => {
    const array = value.split(",").map(item => item.trim()).filter(item => item !== "");
    setFormData({ ...formData, [field]: array });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await saveCourse(formData);
      if (result.error) throw new Error(result.error);
      
      router.push("/admin/courses");
      router.refresh();
    } catch (error: any) {
      alert("Error saving course: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (tab: string) => 
    `px-6 py-3 font-bold text-sm transition-all border-b-2 ${
      activeTab === tab 
      ? "border-blue-600 text-blue-600" 
      : "border-transparent text-gray-400 hover:text-gray-600"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
      <div className="flex border-b border-gray-50 px-8 bg-gray-50/50">
        <button type="button" onClick={() => setActiveTab("basic")} className={tabClass("basic")}>Basic Info</button>
        <button type="button" onClick={() => setActiveTab("details")} className={tabClass("details")}>Course Content</button>
        <button type="button" onClick={() => setActiveTab("syllabus")} className={tabClass("syllabus")}>Curriculum & Projects</button>
        <button type="button" onClick={() => setActiveTab("extra")} className={tabClass("extra")}>Trainers & FAQ</button>
      </div>

      <div className="p-8">
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 col-span-full">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Course Title</label>
              <input
                type="text" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Course Banner Image (Local URL)</label>
              <input
                type="text"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono text-sm"
                value={formData.image_url || ""}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="e.g. /courses/webdev.png"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Duration</label>
              <input
                type="text" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Learning Format</label>
              <select
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.learning_format}
                onChange={(e) => setFormData({ ...formData, learning_format: e.target.value })}
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Original Fee (₹)</label>
              <input
                type="number" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.fee ?? 0}
                onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Discount Fee (₹)</label>
              <input
                type="number"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-green-50/20"
                value={formData.discount_fee ?? 0}
                onChange={(e) => setFormData({ ...formData, discount_fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Admission Closes On</label>
              <input
                type="date"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.admission_closes || ""}
                onChange={(e) => setFormData({ ...formData, admission_closes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Rating (1-5)</label>
              <input
                type="number" step="0.1"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.rating ?? 0}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description / Summary</label>
              <textarea
                required rows={4}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Who is this program for?</label>
              <textarea
                rows={2}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                value={formData.target_audience || ""}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="e.g. Graduates, Students, Working Professionals"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Key Features (Comma separated)</label>
                <textarea
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                  value={formData.key_features?.join(", ")}
                  onChange={(e) => handleArrayInput("key_features", e.target.value)}
                  placeholder="Feature 1, Feature 2..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Career Opportunities (Comma separated)</label>
                <textarea
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                  value={formData.career_opportunities?.join(", ")}
                  onChange={(e) => handleArrayInput("career_opportunities", e.target.value)}
                  placeholder="Role 1, Role 2..."
                />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Essential Skills You Develop (Comma separated)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200"
                  value={formData.skills_developed?.join(", ")}
                  onChange={(e) => handleArrayInput("skills_developed", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "syllabus" && (
          <div className="space-y-6">
            <p className="text-sm text-amber-600 bg-amber-50 p-4 rounded-xl font-medium">
              Note: For now, enter JSON format for Curriculum, Projects, and Tools. We will implement a visual builder soon.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Curriculum (JSON)</label>
              <textarea
                rows={6}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-mono text-xs"
                value={JSON.stringify(formData.curriculum, null, 2)}
                onChange={(e) => {
                  try { setFormData({ ...formData, curriculum: JSON.parse(e.target.value) }); } catch {}
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Projects (JSON)</label>
              <textarea
                rows={4}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-mono text-xs"
                value={JSON.stringify(formData.projects, null, 2)}
                onChange={(e) => {
                  try { setFormData({ ...formData, projects: JSON.parse(e.target.value) }); } catch {}
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tools Covered (JSON)</label>
              <textarea
                rows={4}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-mono text-xs"
                value={JSON.stringify(formData.tools_covered, null, 2)}
                onChange={(e) => {
                  try { setFormData({ ...formData, tools_covered: JSON.parse(e.target.value) }); } catch {}
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "extra" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Program Trainers (JSON)</label>
              <textarea
                rows={4}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-mono text-xs"
                value={JSON.stringify(formData.trainers, null, 2)}
                onChange={(e) => {
                  try { setFormData({ ...formData, trainers: JSON.parse(e.target.value) }); } catch {}
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">FAQs (JSON)</label>
              <textarea
                rows={6}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-mono text-xs"
                value={JSON.stringify(formData.faqs, null, 2)}
                onChange={(e) => {
                  try { setFormData({ ...formData, faqs: JSON.parse(e.target.value) }); } catch {}
                }}
              />
            </div>
            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-2xl border border-blue-100">
               <input 
                 type="checkbox" id="featured"
                 className="w-5 h-5 rounded-md"
                 checked={formData.is_featured}
                 onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
               />
               <label htmlFor="featured" className="font-bold text-blue-900">Show on Home Page (Featured)</label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-8 bg-gray-50 border-t border-gray-100">
        <Button type="submit" disabled={loading} className="px-10 py-6 rounded-2xl text-lg shadow-xl shadow-blue-100">
          {loading ? "Saving..." : course ? "Update Course" : "Add Course"}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          className="px-10 py-6 rounded-2xl text-lg bg-white"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
