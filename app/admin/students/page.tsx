import { createServerSupabaseClient } from "@/lib/supabase-server";
import StudentTable from "./StudentTable";
import fs from "fs";

export const revalidate = 0;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";

  const supabase = await createServerSupabaseClient();

  let dbQuery = supabase
    .from("students")
    .select(`
      *,
      enrollments(
        id,
        batch,
        courses(id, title, course_code)
      )
    `)
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,student_id.ilike.%${query}%`);
  }

  const { data: students, error } = await dbQuery;

  if (error) {
    console.error("Error fetching students:", error);
  }

  // Fetch batches.json
  let batchesList: any[] = [];
  try {
    const batchesFilePath = "c:\\Users\\as007\\vision-web\\data\\batches.json";
    if (fs.existsSync(batchesFilePath)) {
      const fileData = fs.readFileSync(batchesFilePath, "utf-8");
      batchesList = JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Error reading batches:", e);
  }

  // Extract unique batch type names
  const batchNames = Array.from(new Set(batchesList.map(b => b.type).filter(Boolean)));

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-blue-950">Manage Students</h1>
        <div className="flex gap-4">
          <a
            href="/admin/students/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
          >
            Add Student
          </a>
        </div>
      </div>

      <StudentTable initialStudents={students || []} availableBatches={batchNames} />
    </div>
  );
}
