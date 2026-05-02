import AdmissionForm from "./AdmissionForm";
import Image from "next/image";

export const revalidate = 3600; // Cache for 1 hour

export default async function AdmissionPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <div className="min-h-screen bg-gray-50/50 py-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="w-20 h-20 relative mb-6">
            <Image 
              src="/logo.png" 
              alt="Vision IT Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-blue-950 mb-4">
            Join Vision Learn
          </h1>
          <p className="text-gray-500 text-lg font-medium">
            Fill out the form below to start your learning journey with us.
          </p>
        </div>

        <AdmissionForm courses={courses || []} />
        
        <div className="mt-12 text-center text-sm text-gray-400 font-medium">
          <p>© {new Date().getFullYear()} Vision Learn. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
