import BatchForm from "../../BatchForm";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

export const revalidate = 0;

interface EditBatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBatchPage({ params }: EditBatchPageProps) {
  const { id } = await params;
  const batchesFilePath = "c:\\Users\\as007\\vision-web\\data\\batches.json";

  let batch = null;

  try {
    if (fs.existsSync(batchesFilePath)) {
      const batches = JSON.parse(fs.readFileSync(batchesFilePath, "utf-8"));
      batch = batches.find((b: any) => b.id === id);
    }
  } catch (e) {
    console.error("Error finding batch for editing:", e);
  }

  if (!batch) return notFound();

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-blue-950 mb-8 text-center">Edit Batch</h1>
      <BatchForm initialData={batch} />
    </div>
  );
}
