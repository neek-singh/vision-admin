"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const statsFilePath = "c:\\Users\\as007\\vision-web\\data\\stats.json";


export async function updateStats(formData: FormData) {
  try {
    const expert_mentors = formData.get("expert_mentors") as string;
    const students_trained = formData.get("students_trained") as string;
    const practical_learning = formData.get("practical_learning") as string;
    const courses_offered = formData.get("courses_offered") as string;

    const newStats = {
      expert_mentors: expert_mentors || "10+",
      students_trained: students_trained || "500+",
      practical_learning: practical_learning || "90%",
      courses_offered: courses_offered || "10+",
    };

    // Write to file
    fs.writeFileSync(statsFilePath, JSON.stringify(newStats, null, 2), "utf-8");

    revalidatePath("/about");
    revalidatePath("/admin/stats");

    return;
  } catch (error: any) {
    console.error("Failed to update stats:", error);
  }
}
