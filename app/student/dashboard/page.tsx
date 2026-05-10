import { getStudentSession, logoutStudent } from "@/app/actions/student-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import StudentProfile from "@/components/student/StudentProfile";
import LMSModules from "@/components/student/LMSModules";
import { BoneyardProfile, BoneyardCard } from "@/components/ui/Boneyard";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function StudentDashboardPage() {
  const session = await getStudentSession();

  if (!session) {
    redirect("/student/login");
  }

  // We fetch the basic student object just for the course title to pass to LMSModules
  // The rest of the data is fetched inside StudentProfile for lazy loading
  const supabase = await createServerSupabaseClient();
  const { data: student } = await supabase
    .from("students")
    .select("course")
    .eq("id", session.id)
    .single();

  if (!student) {
    redirect("/student/login");
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex items-center justify-center">
            <Image 
              src="https://res.cloudinary.com/ddiooxxks/image/upload/f_auto,q_auto/logo_unnut8.png" 
              alt="Vision IT Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <span className="text-xl font-black text-blue-950 hidden md:block">Vision Learn</span>
        </div>
        
        <form action={async () => {
          "use server";
          await logoutStudent();
          redirect("/student/login");
        }}>
          <button className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-2 px-4 py-2 hover:bg-red-50 rounded-xl">
            Logout
          </button>
        </form>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="space-y-8">
          {/* Lazy Loaded Student Profile & Details */}
          <Suspense fallback={<BoneyardProfile />}>
            <StudentProfile studentId={session.id} />
          </Suspense>

          {/* Lazy Loaded LMS Modules */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Learning Path</h3>
            <Suspense fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <BoneyardCard />
                <BoneyardCard />
              </div>
            }>
              <LMSModules courseTitle={student.course} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
