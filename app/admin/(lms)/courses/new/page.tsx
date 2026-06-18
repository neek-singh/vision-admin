import CourseForm from "@/components/lms/courses/CourseForm";

export default function NewCoursePage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Add New Course</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-normal">Create a new course offering for Vision IT Computer Institute.</p>
      </div>
      <CourseForm />
    </div>
  );
}
