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
  course_level?: string;
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
      course_level: "Beginner",
    }
  );

  // Helper to handle array inputs from comma-separated strings
  const handleArrayInput = (field: keyof Course, value: string) => {
    const array = value.split(",").map(item => item.trim()).filter(item => item !== "");
    setFormData({ ...formData, [field]: array });
  };

  // Structured Data Helpers
  const addCurriculumModule = () => {
    const newCurriculum = [...(formData.curriculum || []), { module_title: "", topics: [] }];
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  const updateModuleTitle = (idx: number, title: string) => {
    const newCurriculum = [...(formData.curriculum || [])];
    newCurriculum[idx].module_title = title;
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  const updateModuleTopics = (idx: number, topicsStr: string) => {
    const newCurriculum = [...(formData.curriculum || [])];
    newCurriculum[idx].topics = topicsStr.split(",").map(t => t.trim()).filter(t => t !== "");
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  const removeCurriculumModule = (idx: number) => {
    const newCurriculum = (formData.curriculum || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  const addProject = () => {
    const newProjects = [...(formData.projects || []), { title: "", description: "", image_url: "" }];
    setFormData({ ...formData, projects: newProjects });
  };

  const updateProject = (idx: number, field: string, value: string) => {
    const newProjects = [...(formData.projects || [])];
    newProjects[idx] = { ...newProjects[idx], [field]: value };
    setFormData({ ...formData, projects: newProjects });
  };

  const removeProject = (idx: number) => {
    const newProjects = (formData.projects || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, projects: newProjects });
  };

  const addFAQ = () => {
    const newFAQs = [...(formData.faqs || []), { question: "", answer: "" }];
    setFormData({ ...formData, faqs: newFAQs });
  };

  const updateFAQ = (idx: number, field: string, value: string) => {
    const newFAQs = [...(formData.faqs || [])];
    newFAQs[idx] = { ...newFAQs[idx], [field]: value };
    setFormData({ ...formData, faqs: newFAQs });
  };

  const removeFAQ = (idx: number) => {
    const newFAQs = (formData.faqs || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, faqs: newFAQs });
  };

  // Trainer Helpers
  const addTrainer = () => {
    const newTrainers = [...(formData.trainers || []), { name: "", role: "", image_url: "" }];
    setFormData({ ...formData, trainers: newTrainers });
  };

  const updateTrainer = (idx: number, field: string, value: string) => {
    const newTrainers = [...(formData.trainers || [])];
    newTrainers[idx] = { ...newTrainers[idx], [field]: value };
    setFormData({ ...formData, trainers: newTrainers });
  };

  const removeTrainer = (idx: number) => {
    const newTrainers = (formData.trainers || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, trainers: newTrainers });
  };

  // Tool Helpers
  const addTool = () => {
    const newTools = [...(formData.tools_covered || []), { name: "", image_url: "", icon_svg: "" }];
    setFormData({ ...formData, tools_covered: newTools });
  };

  const updateTool = (idx: number, field: string, value: string) => {
    const newTools = [...(formData.tools_covered || [])];
    newTools[idx] = { ...newTools[idx], [field]: value };
    setFormData({ ...formData, tools_covered: newTools });
  };

  const removeTool = (idx: number) => {
    const newTools = (formData.tools_covered || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, tools_covered: newTools });
  };

  // Company Helpers
  const addCompany = () => {
    const newCompanies = [...(formData.hiring_companies || []), { name: "", logo_url: "" }];
    setFormData({ ...formData, hiring_companies: newCompanies });
  };

  const updateCompany = (idx: number, field: string, value: string) => {
    const newCompanies = [...(formData.hiring_companies || [])];
    newCompanies[idx] = { ...newCompanies[idx], [field]: value };
    setFormData({ ...formData, hiring_companies: newCompanies });
  };

  const removeCompany = (idx: number) => {
    const newCompanies = (formData.hiring_companies || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, hiring_companies: newCompanies });
  };

  const ImagePreview = ({ url, label }: { url?: string, label: string }) => {
    if (!url) return null;
    return (
      <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm flex-shrink-0">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Error'; }}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preview: {label}</span>
          <span className="text-[10px] text-blue-600 font-mono truncate">{url}</span>
        </div>
      </div>
    );
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
    `px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === tab
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
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Course Title</label>
              <input
                type="text" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-black text-black"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Course Banner Image URL</label>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-mono text-sm font-black text-black"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="e.g. https://your-image-url.com/banner.png"
                />
                <ImagePreview url={formData.image_url} label="Course Banner" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Duration</label>
              <input
                type="text" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Learning Format</label>
              <select
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black appearance-none bg-white"
                value={formData.learning_format}
                onChange={(e) => setFormData({ ...formData, learning_format: e.target.value })}
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Original Fee (₹)</label>
              <input
                type="number" required
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.fee ?? 0}
                onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Discount Fee (₹)</label>
              <input
                type="number"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-green-50/20 font-black text-emerald-700"
                value={formData.discount_fee ?? 0}
                onChange={(e) => setFormData({ ...formData, discount_fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Admission Closes On</label>
              <input
                type="date"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.admission_closes || ""}
                onChange={(e) => setFormData({ ...formData, admission_closes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Rating (1-5)</label>
              <input
                type="number" step="0.1"
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.rating ?? 0}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Course Level</label>
              <select
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black appearance-none bg-white"
                value={formData.course_level}
                onChange={(e) => setFormData({ ...formData, course_level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Beginner → Pro">Beginner → Pro</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Description / Summary</label>
              <textarea
                required rows={4}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Who is this program for?</label>
              <textarea
                rows={2}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                value={formData.target_audience || ""}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                placeholder="e.g. Graduates, Students, Working Professionals"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Key Features (Comma separated)</label>
                <textarea
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                  value={formData.key_features?.join(", ")}
                  onChange={(e) => handleArrayInput("key_features", e.target.value)}
                  placeholder="Feature 1, Feature 2..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Career Opportunities (Comma separated)</label>
                <textarea
                  rows={3}
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                  value={formData.career_opportunities?.join(", ")}
                  onChange={(e) => handleArrayInput("career_opportunities", e.target.value)}
                  placeholder="Role 1, Role 2..."
                />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Essential Skills You Develop (Comma separated)</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 font-black text-black"
                  value={formData.skills_developed?.join(", ")}
                  onChange={(e) => handleArrayInput("skills_developed", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "syllabus" && (
          <div className="space-y-12">
            {/* Curriculum Builder */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Course Curriculum</label>
                <Button type="button" size="sm" variant="outline" onClick={addCurriculumModule} className="rounded-full px-4">+ Add Module</Button>
              </div>
              <div className="space-y-4">
                {(formData.curriculum || []).map((module, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 relative group">
                    <button
                      type="button"
                      onClick={() => removeCurriculumModule(idx)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      ×
                    </button>
                    <div className="space-y-4">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-black bg-white"
                        placeholder="Module Title (e.g. Introduction to HTML)"
                        value={module.module_title}
                        onChange={(e) => updateModuleTitle(idx, e.target.value)}
                      />
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-black bg-white"
                        placeholder="Topics (comma separated)"
                        rows={2}
                        value={module.topics?.join(", ")}
                        onChange={(e) => updateModuleTopics(idx, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                {(!formData.curriculum || formData.curriculum.length === 0) && (
                  <p className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold">No modules added yet.</p>
                )}
              </div>
            </div>

            {/* Projects Builder */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Real-World Projects</label>
                <Button type="button" size="sm" variant="outline" onClick={addProject} className="rounded-full px-4">+ Add Project</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(formData.projects || []).map((project, idx) => (
                  <div key={idx} className="p-6 bg-white rounded-[2rem] border border-slate-200 relative group shadow-sm">
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      ×
                    </button>
                    <div className="space-y-3">
                      <input
                        className="w-full px-4 py-2 rounded-lg border border-slate-100 font-bold text-black text-sm"
                        placeholder="Project Title"
                        value={project.title || ""}
                        onChange={(e) => updateProject(idx, "title", e.target.value)}
                      />
                      <textarea
                        className="w-full px-4 py-2 rounded-lg border border-slate-100 text-black text-xs"
                        placeholder="Short Description"
                        rows={2}
                        value={project.description || ""}
                        onChange={(e) => updateProject(idx, "description", e.target.value)}
                      />
                      <div className="space-y-2">
                        <input
                          className="w-full px-4 py-2 rounded-lg border border-slate-100 font-mono text-[10px]"
                          placeholder="Project Image URL"
                          value={project.image_url || ""}
                          onChange={(e) => updateProject(idx, "image_url", e.target.value)}
                        />
                        <ImagePreview url={project.image_url} label={`Project ${idx + 1}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools Manager */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Tools Covered</label>
                <Button type="button" size="sm" variant="outline" onClick={addTool} className="rounded-full px-4">+ Add Tool</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.tools_covered || []).map((tool, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 relative group shadow-sm">
                    <button
                      type="button"
                      onClick={() => removeTool(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-xs"
                    >
                      ×
                    </button>
                    <div className="space-y-3">
                      <input
                        className="w-full px-4 py-2 rounded-lg border border-slate-100 font-bold text-black text-sm"
                        placeholder="Tool Name (e.g. VS Code)"
                        value={tool.name || ""}
                        onChange={(e) => updateTool(idx, "name", e.target.value)}
                      />
                      <input
                        className="w-full px-4 py-2 rounded-lg border border-slate-100 font-mono text-black text-[10px]"
                        placeholder="Icon URL or SVG String"
                        value={tool.image_url || tool.icon_svg || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim().startsWith('<svg')) {
                            updateTool(idx, "icon_svg", val);
                            updateTool(idx, "image_url", "");
                          } else {
                            updateTool(idx, "image_url", val);
                            updateTool(idx, "icon_svg", "");
                          }
                        }}
                      />
                      <ImagePreview url={tool.image_url} label={tool.name || "Tool Icon"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hiring Companies */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Hiring Companies</label>
                <Button type="button" size="sm" variant="outline" onClick={addCompany} className="rounded-full px-4">+ Add Company</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(formData.hiring_companies || []).map((company, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 relative group shadow-sm text-center">
                    <button
                      type="button"
                      onClick={() => removeCompany(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-xs"
                    >
                      ×
                    </button>
                    <div className="space-y-2">
                      <input
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-100 font-bold text-black text-xs"
                        placeholder="Name"
                        value={company.name || ""}
                        onChange={(e) => updateCompany(idx, "name", e.target.value)}
                      />
                      <input
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-100 font-mono text-black text-[9px]"
                        placeholder="Logo URL"
                        value={company.logo_url || ""}
                        onChange={(e) => updateCompany(idx, "logo_url", e.target.value)}
                      />
                      <div className="flex justify-center">
                        <ImagePreview url={company.logo_url} label={company.name || "Company Logo"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "extra" && (
          <div className="space-y-10">
            {/* FAQ Builder */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Frequently Asked Questions</label>
                <Button type="button" size="sm" variant="outline" onClick={addFAQ} className="rounded-full px-4">+ Add FAQ</Button>
              </div>
              <div className="space-y-4">
                {(formData.faqs || []).map((faq, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative group">
                    <button
                      type="button"
                      onClick={() => removeFAQ(idx)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      ×
                    </button>
                    <div className="space-y-3">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-black bg-white"
                        placeholder="Question"
                        value={faq.question}
                        onChange={(e) => updateFAQ(idx, "question", e.target.value)}
                      />
                      <textarea
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-black bg-white"
                        placeholder="Answer"
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => updateFAQ(idx, "answer", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trainer Manager */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Program Trainers</label>
                <Button type="button" size="sm" variant="outline" onClick={addTrainer} className="rounded-full px-4">+ Add Trainer</Button>
              </div>
              <div className="space-y-4">
                {(formData.trainers || []).map((trainer, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 relative group">
                    <button
                      type="button"
                      onClick={() => removeTrainer(idx)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      ×
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Trainer Name</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-black bg-white"
                          placeholder="e.g. John Doe"
                          value={trainer.name || ""}
                          onChange={(e) => updateTrainer(idx, "name", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Role / Expertise</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-black bg-white"
                          placeholder="e.g. Senior Web Developer"
                          value={trainer.role || ""}
                          onChange={(e) => updateTrainer(idx, "role", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Profile Image URL</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs text-black bg-white"
                          placeholder="https://..."
                          value={trainer.image_url || ""}
                          onChange={(e) => updateTrainer(idx, "image_url", e.target.value)}
                        />
                        <ImagePreview url={trainer.image_url} label={trainer.name || "Trainer"} />
                      </div>
                    </div>
                  </div>
                ))}
                {(!formData.trainers || formData.trainers.length === 0) && (
                  <p className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-slate-400 font-bold">No trainers added yet.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-2xl border border-blue-100">
              <input
                type="checkbox" id="featured"
                className="w-5 h-5 rounded-md"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
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
