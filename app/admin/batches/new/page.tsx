import BatchForm from "../BatchForm";

export default function NewBatchPage() {
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-blue-950 mb-8 text-center">Add New Batch</h1>
      <BatchForm />
    </div>
  );
}
