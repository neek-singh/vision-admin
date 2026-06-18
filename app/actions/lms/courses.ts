"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function saveCourse(formData: any) {
  try {
    const supabase = await createServerSupabaseClient();

    // Clean data
    const cleanData = { ...formData };

    // Auto-generate course_code if missing
    if (!cleanData.course_code) {
      cleanData.course_code = cleanData.title
        ?.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (!cleanData.course_code) {
        cleanData.course_code = `course-${Math.random().toString(36).slice(2, 7)}`;
      }
    }

    // Convert empty strings to null for optional fields
    if (cleanData.admission_closes === "") {
      cleanData.admission_closes = null;
    }
    if (cleanData.image_url === "") {
      cleanData.image_url = null;
    }
    if (cleanData.target_audience === "") {
      cleanData.target_audience = null;
    }

    // Remove undefined fields
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    let result;
    if (cleanData.id) {
      // Update
      result = await supabase
        .from("courses")
        .update(cleanData)
        .eq("id", cleanData.id);
    } else {
      // Insert
      const { id, ...insertData } = cleanData;
      result = await supabase
        .from("courses")
        .insert(insertData);
    }

    if (result.error) {
      console.error("Supabase error saving course:", result.error);
      throw new Error(result.error.message);
    }

    revalidatePath("/courses");
    if (formData.id) {
      revalidatePath(`/courses/${formData.id}`);
    }
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to save course to DB:", e);
    return { error: e.message || "Failed to save course" };
  }
}

export async function deleteCourse(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/courses");
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete course from DB:", e);
    return { error: e.message || "Failed to delete course" };
  }
}

export async function getAvailableTrainers() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("courses")
      .select("trainers")
      .not("trainers", "is", null);

    if (error) throw error;

    const trainersMap = new Map<string, { name: string; role: string; image_url: string }>();
    data.forEach((course: any) => {
      if (Array.isArray(course.trainers)) {
        course.trainers.forEach((trainer: any) => {
          if (trainer && trainer.name && trainer.name.trim()) {
            const key = trainer.name.trim().toLowerCase();
            if (!trainersMap.has(key)) {
              trainersMap.set(key, {
                name: trainer.name.trim(),
                role: (trainer.role || "").trim(),
                image_url: (trainer.image_url || "").trim()
              });
            }
          }
        });
      }
    });

    return { success: true, trainers: Array.from(trainersMap.values()) };
  } catch (e: any) {
    console.error("Failed to fetch trainers:", e);
    return { error: e.message || "Failed to fetch trainers", trainers: [] };
  }
}
