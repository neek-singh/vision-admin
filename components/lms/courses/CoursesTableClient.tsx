"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, X, Pencil, Clock, Users, BookOpen } from "lucide-react";
import DeleteButton from "@/components/ui/DeleteButton";

type Course = {
  id: string;
  title: string;
  course_code: string;
  duration: string;
  fee?: number;
  discount_fee?: number;
  learning_format?: string;
  category?: string;
  enrollments?: { count: number }[];
};

export default function CoursesTableClient({ initialCourses }: { initialCourses: Course[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Dynamically collect all unique categories from courses
  const categoriesList = Array.from(
    new Set(
      initialCourses
        .map((c) => c.category)
        .filter((cat): cat is string => !!cat)
    )
  ).sort();

  // Search and category filter matching
  const filteredCourses = initialCourses.filter((course) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      course.title.toLowerCase().includes(q) ||
      course.course_code.toLowerCase().includes(q) ||
      (course.category && course.category.toLowerCase().includes(q)) ||
      (course.duration && course.duration.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;

    return matchesSearch && matchesCategory;
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
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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

          {/* Category Filter & Counter */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              id="course-category-select"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories ({initialCourses.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
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
                <th className="px-3.5 py-2.5 w-72">Course Name</th>
                <th className="px-3.5 py-2.5 w-52">Category</th>
                <th className="px-3.5 py-2.5 w-40">Duration</th>
                <th className="px-3.5 py-2.5 w-32 text-center">Enrolled</th>
                <th className="px-3.5 py-2.5 w-36 text-right">Fees</th>
                <th className="px-3.5 py-2.5 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                        <BookOpen size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No courses found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Try adjusting your search criteria or category filter.
                      </p>
                      {(searchTerm || selectedCategory !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("All");
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
                          {course.course_code && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-slate-800">
                              {course.course_code}
                            </span>
                          )}
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

                      {/* 4. Enrolled */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          <Users size={11} className="text-slate-400" />
                          <span>{enrolledCount} enrolled</span>
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

                      {/* 6. Actions */}
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

              return (
                <div key={course.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {course.title}
                      </p>
                      {course.course_code && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {course.course_code}
                        </p>
                      )}
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
                    <span className={`px-2 py-0.5 rounded-full font-semibold border ${getCategoryColor(course.category)}`}>
                      {course.category || "General"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Clock size={10} />
                      <span>{course.duration || "N/A"}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Users size={10} />
                      <span>{enrolledCount} enrolled</span>
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
