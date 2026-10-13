"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveCourse, getAvailableTrainers } from "@/app/actions/lms/courses";
import {
  Info,
  FileText,
  Layers,
  Users,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";

// Helper component for auto-expanding textareas
function AutoExpandTextarea({
  id,
  required = false,
  rows = 3,
  className,
  value,
  onChange,
  placeholder
}: {
  id: string;
  required?: boolean;
  rows?: number;
  className?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      required={required}
      rows={rows}
      className={className}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      placeholder={placeholder}
      style={{ resize: "none", overflowY: "hidden" }}
    />
  );
}

// Helper component for interactive tag lists
function TagListBuilder({
  label,
  id,
  items = [],
  placeholder = "Add new item...",
  onChange
}: {
  label: string;
  id: string;
  items: string[];
  placeholder?: string;
  onChange: (newItems: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setInputValue("");
    }
  };

  const removeItem = (indexToRemove: number) => {
    onChange(items.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">Press Enter or Add</span>
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          id={id}
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
        >
          Add
        </button>
      </div>

      {/* Display Tags */}
      <div className="flex flex-wrap gap-1.5 pt-0.5 min-h-[22px]">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-md border border-slate-200/70 dark:border-slate-700/70"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="w-3.5 h-3.5 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-[10px]"
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No items added yet.</span>
        )}
      </div>
    </div>
  );
}

type Course = {
  id?: string;
  title: string;
  description: string;
  duration: string;
  fee: number;
  discount_fee?: number;
  image_url?: string;
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
  is_published?: boolean;
  course_level?: string;
  category?: string;
};

export default function CourseForm({ course }: { course?: Course }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(0);

  const [availableTrainers, setAvailableTrainers] = useState<{ name: string; role: string; image_url: string }[]>([]);
  const [showNewTrainerForm, setShowNewTrainerForm] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ name: "", role: "", image_url: "" });

  useEffect(() => {
    async function loadTrainers() {
      const res = await getAvailableTrainers();
      const dbTrainers = res?.trainers || [];
      
      const defaults = [
        { name: "Ishwar Singh", role: "Senior Developer & Founder", image_url: "" },
        { name: "Neek Singh", role: "Tech Lead & Co-Founder", image_url: "" }
      ];

      const merged = [...dbTrainers];
      defaults.forEach(def => {
        if (!merged.some(t => t?.name && def?.name && t.name.toLowerCase() === def.name.toLowerCase())) {
          merged.push(def);
        }
      });
      setAvailableTrainers(merged);
    }
    loadTrainers();
  }, []);

  const [formData, setFormData] = useState<Course>(
    course
      ? {
          ...course,
          is_published: course.is_published !== undefined ? course.is_published : true,
        }
      : {
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
          is_published: true,
          course_level: "Beginner",
          category: "Software Development",
        }
  );

  const toggleTrainerSelection = (trainer: { name: string; role: string; image_url: string }) => {
    const trainers = formData.trainers || [];
    const exists = trainers.some(t => t?.name && trainer?.name && t.name.toLowerCase() === trainer.name.toLowerCase());
    
    if (exists) {
      setFormData({
        ...formData,
        trainers: trainers.filter(t => t?.name && trainer?.name && t.name.toLowerCase() !== trainer.name.toLowerCase())
      });
    } else {
      setFormData({
        ...formData,
        trainers: [...trainers, trainer]
      });
    }
  };

  const handleAddNewTrainer = () => {
    const nameTrimmed = newTrainer.name.trim();
    if (!nameTrimmed) return;

    const trainerToAdd = {
      name: nameTrimmed,
      role: newTrainer.role.trim(),
      image_url: newTrainer.image_url.trim()
    };

    if (!availableTrainers.some(t => t?.name && t.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      setAvailableTrainers([...availableTrainers, trainerToAdd]);
    }

    const trainers = formData.trainers || [];
    if (!trainers.some(t => t?.name && t.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      setFormData({
        ...formData,
        trainers: [...trainers, trainerToAdd]
      });
    }

    setNewTrainer({ name: "", role: "", image_url: "" });
    setShowNewTrainerForm(false);
  };

  const predefinedCategories = [
    "Certificate Courses",
    "Diploma Courses",
    "Programming Languages",
    "Web Development",
    "Artificial Intelligence",
    "Data Science & Analytics",
    "Cloud & DevOps",
    "Cyber Security",
    "Mobile App Development",
    "Database Technologies",
    "Office & Productivity Tools",
    "Software Development",
    "Game Development",
    "Basic Computer"
  ];

  const isPredefined = formData.category ? predefinedCategories.includes(formData.category) : true;
  const [selectCategory, setSelectCategory] = useState(
    formData.category ? (isPredefined ? formData.category : "Other") : "Software Development"
  );
  const [customCategory, setCustomCategory] = useState(
    formData.category ? (isPredefined ? "" : formData.category) : ""
  );

  const handleCategoryChange = (val: string) => {
    setSelectCategory(val);
    if (val !== "Other") {
      setFormData(prev => ({ ...prev, category: val }));
    } else {
      setFormData(prev => ({ ...prev, category: customCategory }));
    }
  };

  const handleCustomCategoryChange = (val: string) => {
    setCustomCategory(val);
    setFormData(prev => ({ ...prev, category: val }));
  };

  // Structured Data Helpers
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
    setExpandedFaqIdx(newFAQs.length - 1);
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

  const ImagePreview = ({ url, label }: { url?: string; label: string }) => {
    if (!url) return null;
    return (
      <div className="mt-1.5 flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-slate-800">
        <div className="relative w-8 h-8 rounded-md overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-cover"
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none';
              const sib = (e.target as HTMLImageElement).nextSibling as HTMLElement;
              if (sib) sib.style.display = 'flex';
            }}
          />
          <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-400">
            N/A
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Preview: {label}
          </span>
          <span className="block text-[11px] text-blue-600 dark:text-blue-400 truncate font-mono">
            {url}
          </span>
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

  const tabs = [
    { id: "basic", label: "Basic Info", icon: Info },
    { id: "details", label: "Course Content", icon: FileText },
    { id: "syllabus", label: "Projects & Tools", icon: Layers },
    { id: "extra", label: "Trainers & FAQ", icon: Users },
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden text-slate-800 dark:text-slate-100">
      {/* ── Segmented Tab Header ── */}
      <div className="flex items-center gap-1.5 p-2 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold border border-slate-200/70 dark:border-slate-750"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 font-medium"
              }`}
            >
              <Icon size={14} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Contents ── */}
      <div className="p-5 sm:p-6">
        {/* TAB 1: BASIC INFO */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="course-title-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="course-title-input"
                required
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Full Stack Web Development"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label htmlFor="course-category-select-form" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                id="course-category-select-form"
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium cursor-pointer"
                value={selectCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {predefinedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other (Custom Category)</option>
              </select>
            </div>

            {/* Custom Category input */}
            {selectCategory === "Other" && (
              <div className="sm:col-span-2 lg:col-span-3 space-y-1 animate-in fade-in duration-200">
                <label htmlFor="course-custom-category-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Custom Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="course-custom-category-input"
                  required
                  className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  value={customCategory}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  placeholder="e.g. Graphic Design & Multimedia"
                />
              </div>
            )}

            {/* Website Visibility Card */}
            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md ${formData.is_published ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  {formData.is_published ? <Eye size={15} /> : <EyeOff size={15} />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.is_published ? "Visible on Public Website" : "Hidden from Public Website"}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {formData.is_published
                      ? "Course is live on website catalog, searches, and enquiry forms."
                      : "Course is hidden from public website and visitors (Draft mode)."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_published: !prev.is_published }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.is_published ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    formData.is_published ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Banner URL */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <label htmlFor="course-banner-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Course Banner Image URL
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  id="course-banner-input"
                  className="flex-1 px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                />
                {formData.image_url && (
                  <a
                    href={formData.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 transition-colors shrink-0"
                    title="Open banner in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <ImagePreview url={formData.image_url} label="Course Banner" />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label htmlFor="course-duration-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Duration <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="course-duration-input"
                required
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months"
              />
            </div>

            {/* Learning Format */}
            <div className="space-y-1">
              <label htmlFor="course-format-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Learning Format
              </label>
              <select
                id="course-format-select"
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium cursor-pointer"
                value={formData.learning_format || "Offline"}
                onChange={(e) => setFormData({ ...formData, learning_format: e.target.value })}
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Course Level */}
            <div className="space-y-1">
              <label htmlFor="course-level-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Course Level
              </label>
              <select
                id="course-level-select"
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium cursor-pointer"
                value={formData.course_level || "Beginner"}
                onChange={(e) => setFormData({ ...formData, course_level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Beginner → Pro">Beginner → Pro</option>
              </select>
            </div>

            {/* Original Fee */}
            <div className="space-y-1">
              <label htmlFor="course-fee-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Original Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                id="course-fee-input"
                required
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                value={formData.fee ?? 0}
                onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
              />
            </div>

            {/* Discount Fee */}
            <div className="space-y-1">
              <label htmlFor="course-discount-fee-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Discount Fee (₹)
              </label>
              <input
                type="number"
                id="course-discount-fee-input"
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-semibold"
                value={formData.discount_fee ?? 0}
                onChange={(e) => setFormData({ ...formData, discount_fee: Number(e.target.value) })}
              />
            </div>

            {/* Rating */}
            <div className="space-y-1">
              <label htmlFor="course-rating-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Rating (1 - 5)
              </label>
              <input
                type="number"
                id="course-rating-input"
                step="0.1"
                min="1"
                max="5"
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                value={formData.rating ?? 4.8}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {/* TAB 2: COURSE CONTENT */}
        {activeTab === "details" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="course-desc-textarea" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Description / Summary <span className="text-rose-500">*</span>
              </label>
              <AutoExpandTextarea
                id="course-desc-textarea"
                required={true}
                rows={3}
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-normal leading-relaxed"
                value={formData.description || ""}
                onChange={(val) => setFormData({ ...formData, description: val })}
                placeholder="Detailed description of the course..."
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="course-audience-textarea" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Who is this program for?
              </label>
              <AutoExpandTextarea
                id="course-audience-textarea"
                rows={2}
                className="w-full px-3 py-2 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-normal"
                value={formData.target_audience || ""}
                onChange={(val) => setFormData({ ...formData, target_audience: val })}
                placeholder="e.g. 10th / 12th pass students, college graduates, working professionals"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <TagListBuilder
                label="Key Features"
                id="course-features-tag-list"
                placeholder="e.g. 100% Practical Training"
                items={formData.key_features || []}
                onChange={(newItems) => setFormData({ ...formData, key_features: newItems })}
              />
              <TagListBuilder
                label="Career Opportunities"
                id="course-career-tag-list"
                placeholder="e.g. Web Developer, Frontend Engineer"
                items={formData.career_opportunities || []}
                onChange={(newItems) => setFormData({ ...formData, career_opportunities: newItems })}
              />
              <div className="col-span-full">
                <TagListBuilder
                  label="Essential Skills You Develop"
                  id="course-skills-tag-list"
                  placeholder="e.g. HTML, CSS, JavaScript, React"
                  items={formData.skills_developed || []}
                  onChange={(newItems) => setFormData({ ...formData, skills_developed: newItems })}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS & TOOLS */}
        {activeTab === "syllabus" && (
          <div className="space-y-6">
            {/* Real-World Projects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Real-World Projects
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Hands-on projects students will build during the course.</p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 border border-blue-200/50 dark:border-blue-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  Add Project
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(formData.projects || []).map((project, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 px-1.5">
                      #{idx + 1}
                    </span>
                    <input
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Project ${idx + 1} Title`}
                      value={project.title || ""}
                      onChange={(e) => updateProject(idx, "title", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove Project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {(formData.projects || []).length === 0 && (
                  <p className="col-span-full text-center py-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No projects added yet. Click &quot;Add Project&quot; to include practical course projects.
                  </p>
                )}
              </div>
            </div>

            {/* Tools Covered */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Tools Covered
                  </label>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Software, technologies, and IDEs taught in this course.</p>
                </div>
                <button
                  type="button"
                  onClick={addTool}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 border border-blue-200/50 dark:border-blue-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  Add Tool
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {(formData.tools_covered || []).map((tool, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
                    <input
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Tool ${idx + 1} Name (e.g. VS Code, Git)`}
                      value={tool.name || ""}
                      onChange={(e) => updateTool(idx, "name", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeTool(idx)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Remove Tool"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {(formData.tools_covered || []).length === 0 && (
                  <p className="col-span-full text-center py-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No tools added yet. Click &quot;Add Tool&quot; to list tools covered.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRAINERS & FAQ */}
        {activeTab === "extra" && (
          <div className="space-y-6">
            {/* FAQ Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Add common queries and answers for prospective students.</p>
                </div>
                <button
                  type="button"
                  onClick={addFAQ}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 border border-blue-200/50 dark:border-blue-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  Add FAQ
                </button>
              </div>

              <div className="space-y-2">
                {(formData.faqs || []).map((faq, idx) => {
                  const isExpanded = expandedFaqIdx === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-lg border transition-all duration-150 overflow-hidden ${
                        isExpanded 
                          ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10 shadow-2xs" 
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            isExpanded
                              ? "bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            Q{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-xs truncate flex-1 font-medium ${
                            faq.question 
                              ? "text-slate-800 dark:text-slate-200" 
                              : "text-slate-400 dark:text-slate-500 italic"
                          }`}>
                            {faq.question || "Untitled Question"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFAQ(idx);
                              if (expandedFaqIdx === idx) {
                                setExpandedFaqIdx(null);
                              } else if (expandedFaqIdx !== null && expandedFaqIdx > idx) {
                                setExpandedFaqIdx(expandedFaqIdx - 1);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete FAQ"
                          >
                            <Trash2 size={13} />
                          </button>
                          <span className="p-1 text-slate-400">
                            <ChevronDown 
                              size={14} 
                              className={`transform transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-white/70 dark:bg-slate-900/60 animate-in fade-in duration-150">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Question</label>
                            <input
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Enter question..."
                              value={faq.question || ""}
                              onChange={(e) => updateFAQ(idx, "question", e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Answer</label>
                            <AutoExpandTextarea
                              id={`faq-answer-${idx}`}
                              rows={2}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                              placeholder="Enter answer..."
                              value={faq.answer || ""}
                              onChange={(val) => updateFAQ(idx, "answer", val)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {(!formData.faqs || formData.faqs.length === 0) && (
                  <div className="text-center py-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-xs">No FAQs added yet. Click &quot;Add FAQ&quot; above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trainers Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Program Trainers
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">Select which trainers will appear for this course.</p>
                </div>
                {!showNewTrainerForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewTrainerForm(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 border border-blue-200/50 dark:border-blue-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    Create New Trainer
                  </button>
                )}
              </div>

              {/* Trainer cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {availableTrainers.map((t, tIdx) => {
                  const isSelected = (formData.trainers || []).some(
                    x => x?.name && t?.name && x.name.toLowerCase() === t.name.toLowerCase()
                  );
                  const initials = (t?.name || "TR")
                    .split(" ")
                    .map(w => w?.[0] || "")
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={tIdx}
                      onClick={() => toggleTrainerSelection(t)}
                      className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-500/80 bg-blue-50/20 dark:bg-blue-950/20 shadow-2xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
                        {t.image_url ? (
                          <img
                            src={t.image_url}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const sibling = (e.target as HTMLImageElement).nextSibling as HTMLElement;
                              if (sibling) sibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span className={t.image_url ? "hidden" : "block"}>{initials}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{t.name}</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{t.role || "Trainer"}</p>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-slate-700 bg-transparent" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline New Trainer Form */}
              {showNewTrainerForm && (
                <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                  <h4 className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">New Trainer Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Trainer Name</label>
                      <input
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. John Doe"
                        value={newTrainer.name}
                        onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Role / Expertise</label>
                      <input
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. Lead Instructor"
                        value={newTrainer.role}
                        onChange={(e) => setNewTrainer({ ...newTrainer, role: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Image URL (Optional)</label>
                      <input
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="https://..."
                        value={newTrainer.image_url}
                        onChange={(e) => setNewTrainer({ ...newTrainer, image_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTrainerForm(false);
                        setNewTrainer({ name: "", role: "", image_url: "" });
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewTrainer}
                      className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    >
                      Save & Select
                    </button>
                  </div>
                </div>
              )}

              {/* Featured Course Checkbox Card */}
              <div className="flex items-center gap-3 p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <input
                  type="checkbox"
                  id="featured"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <label htmlFor="featured" className="text-xs font-semibold text-blue-900 dark:text-blue-200 cursor-pointer">
                  Feature on Homepage
                  <span className="block text-[11px] font-normal text-blue-700/80 dark:text-blue-300/80">Highlight this course in the homepage featured section.</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Form Actions Footer ── */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 dark:bg-slate-950/50 border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
          All changes are saved directly to the database.
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={13} strokeWidth={2.5} />
                <span>{course ? "Save Changes" : "Create Course"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
