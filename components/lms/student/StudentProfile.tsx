import { createServerSupabaseClient } from "@/lib/supabase-server";

interface StudentProfileProps {
  studentId: string;
}

export default async function StudentProfile({ studentId }: StudentProfileProps) {
  const supabase = await createServerSupabaseClient();
  const { data: student } = await supabase
    .from("students")
    .select("*, admissions(father_name, address, dob, qualification)")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar / Profile Info */}
      <aside className="w-full md:w-1/3 space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full mx-auto flex items-center justify-center text-blue-600 text-3xl font-black mb-4">
            {student.name.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{student.name}</h2>
          <p className="text-sm text-gray-400 font-medium mb-4 uppercase tracking-widest">{student.student_id}</p>
          <div className="inline-flex px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-black">
            ACTIVE STUDENT
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Quick Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-sm text-gray-500">Course</span>
              <span className="text-sm font-bold text-blue-900">{student.course}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-sm text-gray-500">Joined</span>
              <span className="text-sm font-bold text-gray-900">
                {new Date(student.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Profile Content */}
      <div className="flex-1 space-y-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-8 py-10 text-white">
            <h1 className="text-3xl font-black mb-2">Welcome back, {student.name.split(" ")[0]}!</h1>
            <p className="text-blue-100 font-medium opacity-80">Track your progress and access your study materials here.</p>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-blue-950 border-b border-gray-50 pb-2">Personal Details</h3>
              <div className="space-y-3">
                <DetailRow label="Father's Name" value={student.admissions?.father_name} />
                <DetailRow label="Email" value={student.email} />
                <DetailRow label="Phone" value={student.phone} />
                <DetailRow label="Date of Birth" value={student.admissions?.dob ? new Date(student.admissions.dob).toLocaleDateString() : "—"} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-blue-950 border-b border-gray-50 pb-2">Academic Info</h3>
              <div className="space-y-3">
                <DetailRow label="Qualification" value={student.admissions?.qualification} />
                <DetailRow label="Address" value={student.admissions?.address} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
      <span className="text-sm font-medium text-gray-700">{value || "—"}</span>
    </div>
  );
}
