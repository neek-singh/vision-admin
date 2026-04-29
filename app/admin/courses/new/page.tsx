import CourseForm from "../CourseForm";

export default function NewCoursePage() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-950">Add New Course</h1>
        <p className="text-gray-500 mt-2 font-medium">Create a new course offering for Vision IT Computer Institute.</p>
      </div>
      <CourseForm />
    </div>
  );
}
