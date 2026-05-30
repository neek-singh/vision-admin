"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import DeleteButton from "@/components/admin/DeleteButton";

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
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.category && course.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || course.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by title, code or category..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-sm transition-all text-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="sm:w-64">
          <select
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 text-sm font-semibold text-slate-700 bg-white appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem', backgroundRepeat: 'no-repeat', paddingRight: '2.5rem' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50/50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">Course Title</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider text-center">Students</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider">Fee</th>
                <th className="px-6 py-4 font-black text-[10px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500 font-bold">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm">No courses found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-snug">{course.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-wider">{course.course_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {course.category ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                          {course.category}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-xs font-semibold">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-100">
                        {course.duration}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black border border-emerald-100">
                        {course.enrollments?.[0]?.count || 0} ENROLLED
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {course.discount_fee && course.discount_fee > 0 ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-emerald-600 text-sm">₹{course.discount_fee}</span>
                          <span className="text-[10px] text-gray-400 line-through">₹{course.fee}</span>
                        </div>
                      ) : (
                        <span className="font-black text-gray-900 text-sm">₹{course.fee}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-5 items-center">
                        <Link 
                          href={`/admin/courses/${course.id}/edit`} 
                          className="text-blue-600 hover:text-blue-800 font-black text-xs uppercase tracking-wider"
                        >
                          Edit
                        </Link>
                        <DeleteButton id={course.id} table="courses" title={course.title} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredCourses.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-500 font-bold">
              No courses found.
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col min-w-0">
                    <h4 className="font-black text-slate-900 text-base leading-tight break-words">{course.title}</h4>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-wider">
                        {course.duration}
                      </span>
                      {course.category && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {course.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fee Structure</p>
                    {course.discount_fee && course.discount_fee > 0 ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-emerald-600 text-base">₹{course.discount_fee}</span>
                        <span className="text-[10px] text-slate-400 line-through">₹{course.fee}</span>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 text-base">₹{course.fee}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Students</p>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black border border-emerald-100">
                      {course.enrollments?.[0]?.count || 0} ACTIVE
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-50">
                  <Link 
                    href={`/admin/courses/${course.id}/edit`} 
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-center"
                  >
                    Edit Course
                  </Link>
                  <div className="flex-1">
                    <DeleteButton id={course.id} table="courses" title={course.title} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
