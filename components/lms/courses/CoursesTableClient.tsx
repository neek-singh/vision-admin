"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Pencil, Clock, BookOpen, Loader2, Eye, EyeOff } from "lucide-react";
import DeleteButton from "@/components/ui/DeleteButton";
import { toggleCourseVisibility, setAllCoursesVisibility } from "@/app/actions/lms/courses";

type Course = {
  id: string;
  title: string;
  course_code: string;
  duration: string;
  fee?: number;
  discount_fee?: number;
  learning_format?: string;
  category?: string;
  is_published?: boolean;
  enrollments?: { count: number }[];
};

export default function CoursesTableClient({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Visible" | "Hidden">("All");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  // Dynamically collect all unique categories from courses
  const categoriesList = Array.from(
    new Set(
      courses
        .map((c) => c.category)
        .filter((cat): cat is string => !!cat)
    )
  ).sort();

  const visibleCount = courses.filter((c) => c.is_published !== false).length;
  const hiddenCount = courses.filter((c) => c.is_published === false).length;

  // Toggle single course visibility with optimistic update
  const handleToggleVisibility = async (courseId: string, currentStatus?: boolean) => {
    const isCurrentlyPublished = currentStatus !== false;
    const newStatus = !isCurrentlyPublished;

    setTogglingId(courseId);

    // Optimistic UI update
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, is_published: newStatus } : c))
    );

    try {
      const res = await toggleCourseVisibility(courseId, newStatus);
      if (res?.error) {
        // Rollback
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, is_published: isCurrentlyPublished } : c))
        );
        alert("Failed to update visibility: " + res.error);
      }
    } catch (err: any) {
      // Rollback
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, is_published: isCurrentlyPublished } : c))
      );
      alert("Error: " + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk make all visible or hidden
  const handleBulkSetVisibility = async (makeVisible: boolean) => {
    setIsBulkUpdating(true);
    setCourses((prev) => prev.map((c) => ({ ...c, is_published: makeVisible })));

    try {
      const res = await setAllCoursesVisibility(makeVisible);
      if (res?.error) {
        setCourses(initialCourses);
        alert("Failed to update courses: " + res.error);
      }
    } catch (err: any) {
      setCourses(initialCourses);
      alert("Error: " + err.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Search, category, status filter and enrolled-wise sorting (highest enrolled on top)
  const filteredCourses = courses
    .filter((course) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.course_code.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.duration && course.duration.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "All" || course.category === selectedCategory;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Visible" && course.is_published !== false) ||
        (statusFilter === "Hidden" && course.is_published === false);

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      const countA = a.enrollments?.[0]?.count || 0;
      const countB = b.enrollments?.[0]?.count || 0;
      if (countB !== countA) {
        return countB - countA; // Highest enrolled courses first
      }
      return a.title.localeCompare(b.title);
    });

  const hasDiscount = (c: Course) => !!c.discount_fee && c.discount_fee > 0;

  // Category badge color helper
  const getCategoryColor = (cat?: string) => {
    if (!cat) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    const lower = cat.toLowerCase();
    if (lower.includes("ai") || lower.includes("intelligence")) {
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200/70 dark:border-violet-800/40";
    }
    if (lower.includes("data") || lower.includes("analytics")) {
      return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200/70 dark:border-cyan-800/40";
    }
    if (lower.includes("office") || lower.includes("productivity")) {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/40";
    }
    if (lower.includes("cyber") || lower.includes("security") || lower.includes("hacking")) {
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/40";
    }
    if (lower.includes("web") || lower.includes("programming") || lower.includes("development")) {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/40";
    }
    if (lower.includes("diploma") || lower.includes("certificate")) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/40";
    }
    return "bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  return (
    <div className="space-y-3.5">
      
      {/* ── Search and Filter Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              id="course-search-input"
              placeholder="Search by name, category, duration..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filters: Status & Category & Action Button & Counter */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {/* Website Visibility Filter */}
            <select
              id="course-status-select"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | "Visible" | "Hidden")}
            >
              <option value="All">All Status ({courses.length})</option>
              <option value="Visible">Visible ({visibleCount})</option>
              <option value="Hidden">Hidden ({hiddenCount})</option>
            </select>

            {/* Category Filter */}
            <select
              id="course-category-select"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories ({courses.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Bulk Visibility Action Button */}
            {hiddenCount > 0 ? (
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => handleBulkSetVisibility(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Make all courses live on the website"
              >
                {isBulkUpdating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Eye size={13} />
                )}
                <span>Make All Live</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={() => handleBulkSetVisibility(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Hide all courses from the website"
              >
                {isBulkUpdating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <EyeOff size={13} />
                )}
                <span>Hide All</span>
              </button>
            )}

            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {filteredCourses.length} {filteredCourses.length === 1 ? "course" : "courses"}
            </span>
          </div>

        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3.5 py-2.5 w-64">Course Name</th>
                <th className="px-3.5 py-2.5 w-44">Category</th>
                <th className="px-3.5 py-2.5 w-36">Duration</th>
                <th className="px-3.5 py-2.5 w-24 text-center">Enrolled</th>
                <th className="px-3.5 py-2.5 w-32 text-right">Fees</th>
                <th className="px-3.5 py-2.5 w-24 text-center">Website</th>
                <th className="px-3.5 py-2.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                        <BookOpen size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No courses found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Try adjusting your search criteria or filters.
                      </p>
                      {(searchTerm || selectedCategory !== "All" || statusFilter !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("All");
                            setStatusFilter("All");
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const enrolledCount = course.enrollments?.[0]?.count || 0;
                  const isLive = course.is_published !== false;
                  const isToggling = togglingId === course.id;

                  return (
                    <tr 
                      key={course.id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* 1. Course Name */}
                      <td className="px-3.5 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {course.title}
                          </p>
                        </div>
                      </td>

                      {/* 2. Category */}
                      <td className="px-3.5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryColor(course.category)}`}>
                          {course.category || "Unassigned"}
                        </span>
                      </td>

                      {/* 3. Duration */}
                      <td className="px-3.5 py-3">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>{course.duration || "Self Paced"}</span>
                        </div>
                      </td>

                      {/* 4. Enrolled (Only Number) */}
                      <td className="px-3.5 py-3 text-center">
                        <span 
                          className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-2 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 tabular-nums"
                          title={`${enrolledCount} students enrolled`}
                        >
                          {enrolledCount}
                        </span>
                      </td>

                      {/* 5. Fees */}
                      <td className="px-3.5 py-3 text-right">
                        <div className="whitespace-nowrap">
                          {hasDiscount(course) ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                ₹{Number(course.discount_fee).toLocaleString("en-IN")}
                              </span>
                              <span className="text-[10px] text-slate-400 line-through">
                                ₹{Number(course.fee).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {course.fee ? `₹${Number(course.fee).toLocaleString("en-IN")}` : "Free"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Website Visibility (Only Button) */}
                      <td className="px-3.5 py-3 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isLive}
                          disabled={isToggling}
                          onClick={() => handleToggleVisibility(course.id, course.is_published)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 active:scale-95 shadow-2xs ${
                            isLive ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                          }`}
                          title={isLive ? "Live on website (Click to hide)" : "Hidden from website (Click to make live)"}
                        >
                          {isToggling ? (
                            <span className="w-full flex items-center justify-center">
                              <Loader2 size={10} className="animate-spin text-white" />
                            </span>
                          ) : (
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                isLive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          )}
                        </button>
                      </td>

                      {/* 7. Actions */}
                      <td className="px-3.5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/courses/${course.id}/edit`}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Course"
                          >
                            <Pencil size={13} />
                          </Link>
                          <DeleteButton
                            id={course.id}
                            table="courses"
                            title={course.title}
                            showText={false}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredCourses.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No courses found.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const enrolledCount = course.enrollments?.[0]?.count || 0;
              const isLive = course.is_published !== false;
              const isToggling = togglingId === course.id;

              return (
                <div key={course.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {course.title}
                      </p>
                    </div>
                    
                    <div className="text-right shrink-0">
                      {hasDiscount(course) ? (
                        <>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            ₹{Number(course.discount_fee).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-slate-400 line-through">
                            ₹{Number(course.fee).toLocaleString("en-IN")}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {course.fee ? `₹${Number(course.fee).toLocaleString("en-IN")}` : "Free"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {/* Status Toggle Button (Only Button) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isLive}
                      disabled={isToggling}
                      onClick={() => handleToggleVisibility(course.id, course.is_published)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 active:scale-95 ${
                        isLive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                      title={isLive ? "Live on website (Click to hide)" : "Hidden from website (Click to make live)"}
                    >
                      {isToggling ? (
                        <span className="w-full flex items-center justify-center">
                          <Loader2 size={8} className="animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                            isLive ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      )}
                    </button>

                    <span className={`px-2 py-0.5 rounded-full font-semibold border ${getCategoryColor(course.category)}`}>
                      {course.category || "General"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Clock size={10} />
                      <span>{course.duration || "N/A"}</span>
                    </span>

                    {/* Enrolled (Only Number) */}
                    <span 
                      className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 tabular-nums"
                      title={`${enrolledCount} enrolled`}
                    >
                      {enrolledCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <Link
                      href={`/admin/courses/${course.id}/edit`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg"
                    >
                      <Pencil size={11} />
                      <span>Edit</span>
                    </Link>
                    <DeleteButton
                      id={course.id}
                      table="courses"
                      title={course.title}
                      showText={false}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
