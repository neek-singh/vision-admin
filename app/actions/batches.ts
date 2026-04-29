"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

const batchesFilePath = "c:\\Users\\as007\\vision-web\\data\\batches.json";


export async function saveBatch(formData: any) {
  try {
    let batches: any[] = [];
    if (fs.existsSync(batchesFilePath)) {
      batches = JSON.parse(fs.readFileSync(batchesFilePath, "utf-8"));
    }

    if (formData.id) {
      batches = batches.map((b: any) => b.id === formData.id ? { ...b, ...formData } : b);
    } else {
      const newBatch = {
        ...formData,
        id: Math.random().toString(36).slice(2)
      };
      batches.push(newBatch);
    }

    fs.writeFileSync(batchesFilePath, JSON.stringify(batches, null, 2), "utf-8");

    revalidatePath("/");
    revalidatePath("/admin/batches");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to save batch to JSON:", e);
    return { error: e.message || "Failed to save batch" };
  }
}

export async function deleteBatch(id: string) {
  try {
    let batches: any[] = [];
    if (fs.existsSync(batchesFilePath)) {
      batches = JSON.parse(fs.readFileSync(batchesFilePath, "utf-8"));
    }

    const updatedBatches = batches.filter((b: any) => b.id !== id);
    fs.writeFileSync(batchesFilePath, JSON.stringify(updatedBatches, null, 2), "utf-8");

    revalidatePath("/");
    revalidatePath("/admin/batches");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete batch from JSON:", e);
    return { error: e.message || "Failed to delete batch" };
  }
}
