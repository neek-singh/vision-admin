import { createServerSupabaseClient } from "@/lib/supabase-server";
import WebAnalyticsClient from "@/components/web/WebAnalyticsClient";
import fs from "fs";
import path from "path";

export const unstable_instant = false;

function getBlogsData() {
  const candidates = [
    path.resolve(process.cwd(), "..", "vision-web"),
    "c:\\Users\\as007\\vision project\\vision-web",
    "c:\\Users\\as007\\vision-web",
  ];
  let basePath = candidates[0];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      basePath = candidate;
      break;
    }
  }
  const filePath = path.join(basePath, "features", "blog", "data", "blogs.json");
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading blogs.json for analytics:", e);
  }
  return [];
}

export default async function WebAnalyticsPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch real data concurrently from Supabase
  const [
    studentsRes,
    contactsRes,
    admissionsRes,
    paymentsRes,
    coursesCountRes,
    batchesCountRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, student_id, course, batch, status, admission_date, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, name, email, phone, message, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("admissions")
      .select("id, student_name, course_id, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, amount, payment_date, payment_mode, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("batches")
      .select("id", { count: "exact", head: true }),
  ]);

  const blogs = getBlogsData();

  return (
    <div className="container mx-auto px-6 lg:px-8 py-8 max-w-6xl">
      <WebAnalyticsClient
        students={studentsRes.data || []}
        contacts={contactsRes.data || []}
        admissions={admissionsRes.data || []}
        payments={paymentsRes.data || []}
        blogs={blogs || []}
        coursesCount={coursesCountRes.count || 0}
        batchesCount={batchesCountRes.count || 0}
      />
    </div>
  );
}
