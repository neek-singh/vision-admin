import Link from "next/link";
import { Button } from "@/components/ui/Button";
import DeleteButton from "@/components/admin/DeleteButton";
import fs from "fs";
import path from "path";

export const revalidate = 0;

export default async function AdminBatchesPage() {
  const batchesFilePath = "c:\\Users\\as007\\vision-web\\data\\batches.json";

  let batchesList: any[] = [];

  try {
    if (fs.existsSync(batchesFilePath)) {
      const fileData = fs.readFileSync(batchesFilePath, "utf-8");
      batchesList = JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Error reading batches in admin:", e);
  }

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-950">Manage Batches</h1>
        <Button href="/admin/batches/new">Add New Batch</Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Course</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batchesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No upcoming cohorts tracked.
                  </td>
                </tr>
              ) : (
                batchesList.map((batch) => (
                  <tr key={batch.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{batch.course}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{batch.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{batch.time}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs uppercase tracking-wide">
                        {batch.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex gap-4 justify-end items-center">
                      <Link 
                        href={`/admin/batches/${batch.id}/edit`} 
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={batch.id} table="batches" title={batch.course} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
