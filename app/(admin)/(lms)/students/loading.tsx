import { Boneyard } from "@/components/ui/Boneyard";

export default function AdminTableLoading() {
  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <Boneyard className="h-10 w-64" />
        <Boneyard className="h-10 w-40 rounded-xl" />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-4">
          <Boneyard className="h-12 w-full" count={8} />
        </div>
      </div>
    </div>
  );
}
