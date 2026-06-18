"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveCourse, getAvailableTrainers } from "@/app/actions/lms/courses";

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
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[10px] text-slate-400 dark:text-slate-550">Press Enter or click Add</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          id={id}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100/40 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-950/60 font-medium text-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          Add
        </button>
      </div>
      
      {/* Display Tags */}
      <div className="flex flex-wrap gap-2 pt-1">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-slate-800/80"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all text-[11px]"
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic font-normal">No items added yet.</span>
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
      category: "Software Development",
    }
  );

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
      <div className="mt-2 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0 flex items-center justify-center">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none';
              const sib = (e.target as HTMLImageElement).nextSibling as HTMLElement;
              if (sib) sib.style.display = 'flex';
            }}
          />
          <div className="hidden absolute inset-0 items-center justify-center bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 font-medium">
            No Image
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Preview: {label}</span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 truncate">{url}</span>
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
    `px-6 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === tab
      ? "border-blue-600 text-blue-600 dark:text-blue-400"
      : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-white dark:bg-[#0f172a] p-2 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 px-8 bg-slate-50/50 dark:bg-slate-900/20">
        <button type="button" onClick={() => setActiveTab("basic")} className={tabClass("basic")}>Basic Info</button>
        <button type="button" onClick={() => setActiveTab("details")} className={tabClass("details")}>Course Content</button>
        <button type="button" onClick={() => setActiveTab("syllabus")} className={tabClass("syllabus")}>Projects & Tools</button>
        <button type="button" onClick={() => setActiveTab("extra")} className={tabClass("extra")}>Trainers & FAQ</button>
      </div>

      <div className="p-8">
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 col-span-full">
              <label htmlFor="course-title-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Title</label>
              <input
                type="text"
                id="course-title-input"
                required
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <label htmlFor="course-banner-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Banner Image URL</label>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  id="course-banner-input"
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-mono"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="e.g. https://your-image-url.com/banner.png"
                />
                <ImagePreview url={formData.image_url} label="Course Banner" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="course-duration-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</label>
              <input
                type="text"
                id="course-duration-input"
                required
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="course-format-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Learning Format</label>
              <select
                id="course-format-select"
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal appearance-none cursor-pointer"
                value={formData.learning_format || ""}
                onChange={(e) => setFormData({ ...formData, learning_format: e.target.value })}
              >
                <option value="Offline">Offline</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="course-fee-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Original Fee (₹)</label>
              <input
                type="number"
                id="course-fee-input"
                required
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.fee ?? 0}
                onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="course-discount-fee-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Discount Fee (₹)</label>
              <input
                type="number"
                id="course-discount-fee-input"
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-emerald-50/10 dark:bg-emerald-950/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-emerald-600 dark:text-emerald-400 text-sm font-normal"
                value={formData.discount_fee ?? 0}
                onChange={(e) => setFormData({ ...formData, discount_fee: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="course-rating-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rating (1-5)</label>
              <input
                type="number"
                id="course-rating-input"
                step="0.1"
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.rating ?? 0}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="course-level-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Level</label>
              <select
                id="course-level-select"
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal appearance-none cursor-pointer"
                value={formData.course_level || ""}
                onChange={(e) => setFormData({ ...formData, course_level: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Beginner → Pro">Beginner → Pro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="course-category-select-form" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Course Category</label>
              <select
                id="course-category-select-form"
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal appearance-none cursor-pointer"
                value={selectCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="Certificate Courses">Certificate Courses</option>
                <option value="Diploma Courses">Diploma Courses</option>
                <option value="Programming Languages">Programming Languages</option>
                <option value="Web Development">Web Development</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Data Science & Analytics">Data Science & Analytics</option>
                <option value="Cloud & DevOps">Cloud & DevOps</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="Database Technologies">Database Technologies</option>
                <option value="Office & Productivity Tools">Office & Productivity Tools</option>
                <option value="Software Development">Software Development</option>
                <option value="Game Development">Game Development</option>
                <option value="Other">Other (Custom Category)</option>
              </select>
            </div>
            {selectCategory === "Other" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="course-custom-category-input" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custom Category Name</label>
                <input
                  type="text"
                  id="course-custom-category-input"
                  required
                  className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                  value={customCategory}
                  onChange={(e) => handleCustomCategoryChange(e.target.value)}
                  placeholder="e.g. Graphic Design"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="course-desc-textarea" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description / Summary</label>
              <AutoExpandTextarea
                id="course-desc-textarea"
                required={true}
                rows={4}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.description || ""}
                onChange={(val) => setFormData({ ...formData, description: val })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="course-audience-textarea" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Who is this program for?</label>
              <AutoExpandTextarea
                id="course-audience-textarea"
                rows={2}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                value={formData.target_audience || ""}
                onChange={(val) => setFormData({ ...formData, target_audience: val })}
                placeholder="e.g. Graduates, Students, Working Professionals"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                placeholder="e.g. Web Developer"
                items={formData.career_opportunities || []}
                onChange={(newItems) => setFormData({ ...formData, career_opportunities: newItems })}
              />
              <div className="col-span-full">
                <TagListBuilder
                  label="Essential Skills You Develop"
                  id="course-skills-tag-list"
                  placeholder="e.g. HTML, CSS, JavaScript"
                  items={formData.skills_developed || []}
                  onChange={(newItems) => setFormData({ ...formData, skills_developed: newItems })}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "syllabus" && (
          <div className="space-y-12">
            {/* Projects Builder */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Real-World Projects</label>
                <Button type="button" size="sm" variant="outline" onClick={addProject} className="rounded-full px-4">+ Add Project</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(formData.projects || []).map((project, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder={`Project ${idx + 1} Title`}
                      value={project.title || ""}
                      onChange={(e) => updateProject(idx, "title", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-50/10 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                      title="Remove Project"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(formData.projects || []).length === 0 && (
                  <p className="col-span-full text-center py-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-medium">No projects added yet.</p>
                )}
              </div>
            </div>

            {/* Tools Manager */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tools Covered</label>
                <Button type="button" size="sm" variant="outline" onClick={addTool} className="rounded-full px-4">+ Add Tool</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(formData.tools_covered || []).map((tool, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder={`Tool ${idx + 1} Name`}
                      value={tool.name || ""}
                      onChange={(e) => updateTool(idx, "name", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeTool(idx)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-50/10 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                      title="Remove Tool"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
                {(formData.tools_covered || []).length === 0 && (
                  <p className="col-span-full text-center py-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-medium">No tools added yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "extra" && (
          <div className="space-y-10">
            {/* FAQ Builder */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Frequently Asked Questions</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Manage the FAQ list for this course.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addFAQ} className="rounded-full px-4 flex items-center gap-1.5 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add FAQ
                </Button>
              </div>
              <div className="space-y-3">
                {(formData.faqs || []).map((faq, idx) => {
                  const isExpanded = expandedFaqIdx === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded 
                          ? "border-blue-200 dark:border-blue-900/60 bg-blue-50/10 dark:bg-blue-950/5 shadow-md shadow-blue-500/5" 
                          : "border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                        className="flex items-center justify-between p-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`text-xs font-mono px-2 py-1 rounded-lg shrink-0 transition-colors ${
                            isExpanded
                              ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}>
                            Q{String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className={`text-sm truncate flex-1 font-normal ${
                            faq.question 
                              ? "text-slate-700 dark:text-slate-200" 
                              : "text-slate-400 dark:text-slate-500 italic"
                          }`}>
                            {faq.question || "Untitled Question"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
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
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-950/40 cursor-pointer"
                            title="Delete FAQ"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                          <span className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors border border-transparent">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Question</label>
                            <input
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder="Enter the question..."
                              value={faq.question || ""}
                              onChange={(e) => updateFAQ(idx, "question", e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Answer</label>
                            <AutoExpandTextarea
                              id={`faq-answer-${idx}`}
                              rows={2}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder="Enter the answer..."
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
                  <div className="text-center py-10 bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-455 dark:text-slate-500 text-xs font-normal mb-1">No FAQs added yet.</p>
                    <p className="text-slate-400 dark:text-slate-600 text-[11px] font-normal">Click "Add FAQ" above to add some common questions and answers.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trainer Selection Manager */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Program Trainers</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-550 font-normal">Select the trainers who will teach this course.</p>
                </div>
                {!showNewTrainerForm && (
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowNewTrainerForm(true)} 
                    className="rounded-full px-4 flex items-center gap-1.5 font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create New Trainer
                  </Button>
                )}
              </div>

              {/* Grid of checkable Available Trainers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {availableTrainers.map((t, tIdx) => {
                  const isSelected = (formData.trainers || []).some(
                    x => x?.name && t?.name && x.name.toLowerCase() === t.name.toLowerCase()
                  );
                  const initials = (t?.name || "Trainer")
                    .split(" ")
                    .map(w => w?.[0] || "")
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={tIdx}
                      onClick={() => toggleTrainerSelection(t)}
                      className={`relative flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "border-blue-500/80 bg-blue-50/10 dark:bg-blue-950/10 shadow-sm shadow-blue-500/5"
                          : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 font-medium text-xs select-none">
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

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-550 truncate font-normal">{t.role || "Trainer"}</p>
                      </div>

                      {/* Checkmark indicator */}
                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-750 flex items-center justify-center bg-transparent transition-colors">
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Create New Trainer Form */}
              {showNewTrainerForm && (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-4 duration-250">
                  <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wide">Create New Trainer Profile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-550 dark:text-slate-450 uppercase tracking-wide">Trainer Name</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="e.g. John Doe"
                        value={newTrainer.name}
                        onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-555 dark:text-slate-455 uppercase tracking-wide">Role / Expertise</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="e.g. Lead Dev & Founder"
                        value={newTrainer.role}
                        onChange={(e) => setNewTrainer({ ...newTrainer, role: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-555 dark:text-slate-455 uppercase tracking-wide">Profile Image URL (Optional)</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder="https://..."
                        value={newTrainer.image_url}
                        onChange={(e) => setNewTrainer({ ...newTrainer, image_url: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTrainerForm(false);
                        setNewTrainer({ name: "", role: "", image_url: "" });
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewTrainer}
                      className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    >
                      Save & Select
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
              <input
                type="checkbox" id="featured"
                className="w-5 h-5 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              />
              <label htmlFor="featured" className="font-medium text-blue-800 dark:text-blue-300 cursor-pointer">Show on Home Page (Featured)</label>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 p-8 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80">
        <Button type="submit" disabled={loading} className="px-8 py-3 rounded-xl text-base shadow-lg shadow-blue-500/10 font-medium">
          {loading ? "Saving..." : course ? "Update Course" : "Add Course"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="px-8 py-3 rounded-xl text-base bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-600 dark:text-slate-300 transition-colors"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
