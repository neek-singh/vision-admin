"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyStudents } from "@/lib/notify";

export async function saveCourse(formData: any) {
  try {
    const { supabase } = await requireAdmin();

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
      return { error: "Failed to save course" };
    }

    revalidatePath("/courses");
    if (formData.id) {
      revalidatePath(`/courses/${formData.id}`);
    }
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to save course to DB:", e);
    return { error: e.message || "Unauthorized" };
  }
}

export async function deleteCourse(id: string) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting course:", error);
      return { error: "Failed to delete course" };
    }

    revalidatePath("/courses");
    revalidatePath("/admin/courses");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete course from DB:", e);
    return { error: e.message || "Unauthorized" };
  }
}

export async function getAvailableTrainers() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from("courses")
      .select("trainers")
      .not("trainers", "is", null);

    if (error) {
      console.error("Error fetching trainers:", error);
      return { error: "Failed to fetch trainers", trainers: [] };
    }

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
    return { error: e.message || "Unauthorized", trainers: [] };
  }
}

export async function toggleCourseVisibility(id: string, is_published: boolean) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("courses")
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error toggling course visibility in Supabase:", error);
      return { error: "Failed to toggle visibility" };
    }

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    if (id) {
      revalidatePath(`/courses/${id}`);
    }
    return { success: true, is_published };
  } catch (e: any) {
    console.error("Failed to toggle course visibility:", e);
    return { error: e.message || "Unauthorized" };
  }
}

export async function setAllCoursesVisibility(is_published: boolean) {
  try {
    const { supabase } = await requireAdmin();

    const { data: courses, error: fetchErr } = await supabase
      .from("courses")
      .select("id");

    if (fetchErr) {
      console.error("Error fetching course IDs:", fetchErr);
      return { error: "Failed to fetch courses" };
    }

    const ids = (courses || []).map((c: any) => c.id);
    if (ids.length > 0) {
      const { error } = await supabase
        .from("courses")
        .update({ is_published, updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) {
        console.error("Error updating all courses:", error);
        return { error: "Failed to update courses" };
      }
    }

    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true, count: ids.length, is_published };
  } catch (e: any) {
    console.error("Failed to set all courses visibility:", e);
    return { error: e.message || "Unauthorized" };
  }
}

/**
 * Notifies students when a study material is published.
 */
export async function notifyMaterialPublished(materialId: string) {
  await requireAdmin();

  try {
    const { data: mat, error } = await supabaseAdmin
      .from("materials")
      .select("id, title, course_id, batch, batches")
      .eq("id", materialId)
      .single();

    if (error || !mat) {
      return { success: false, error: "Material not found" };
    }

    const studentIds = new Set<string>();

    if (mat.course_id) {
      const { data: enrolledStudents } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("course_id", mat.course_id);

      enrolledStudents?.forEach((e: { student_id: string }) => {
        if (e.student_id) studentIds.add(e.student_id);
      });
    }

    const batchList = Array.isArray(mat.batches) && mat.batches.length > 0 
      ? mat.batches 
      : mat.batch ? [mat.batch] : [];

    if (batchList.length > 0) {
      const { data: batchStudents } = await supabaseAdmin
        .from("students")
        .select("id")
        .in("batch", batchList);

      batchStudents?.forEach((s: { id: string }) => {
        if (s.id) studentIds.add(s.id);
      });
    }

    const recipientList = Array.from(studentIds);
    if (recipientList.length === 0) {
      return { success: true, count: 0 };
    }

    const title = `Naya Study Material: ${mat.title || "Notes"}`.slice(0, 50);
    const body = `${mat.title} upload ho chuka hai. Materials section se check karein.`.slice(0, 120);

    await notifyStudents(recipientList, {
      title,
      body,
      url: "/materials",
      type: "material",
    });

    return { success: true, count: recipientList.length };
  } catch (err: unknown) {
    console.error("[notifyMaterialPublished] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Creates or updates study material using privileged supabaseAdmin (bypasses RLS 42501).
 */
export async function saveMaterial(data: {
  id?: string;
  course_id?: string | null;
  title: string;
  type: string;
  content_url?: string;
  file_size?: string;
  duration?: string;
  code_content?: string;
  batch?: string | null;
  batches?: string[] | null;
  lesson_id?: string | null;
  is_published?: boolean;
}) {
  await requireAdmin();

  try {
    const { id, batch, ...rest } = data;
    const payload: any = {
      ...rest,
      batch: batch || null,
      batches: data.batches || (batch ? [batch] : null),
    };

    let materialId = id;

    if (id) {
      const { error } = await supabaseAdmin
        .from("materials")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("materials")
        .insert([payload])
        .select("id")
        .single();
      if (error) throw error;
      materialId = inserted?.id;
    }

    if (materialId && payload.is_published) {
      notifyMaterialPublished(materialId).catch((err) => {
        console.error("Failed to notify students on material publish:", err);
      });
    }

    return { success: true, materialId };
  } catch (err: any) {
    console.error("[saveMaterial] Error:", err);
    return { success: false, error: err.message || "Failed to save material" };
  }
}

/**
 * Deletes a study material using privileged supabaseAdmin.
 */
export async function deleteMaterial(id: string) {
  await requireAdmin();

  try {
    const { error } = await supabaseAdmin.from("materials").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("[deleteMaterial] Error:", err);
    return { success: false, error: err.message || "Failed to delete material" };
  }
}

/**
 * Toggles a material's published status using privileged supabaseAdmin.
 */
export async function togglePublishMaterial(id: string, currentStatus: boolean) {
  await requireAdmin();

  try {
    const nextStatus = !currentStatus;
    const { error } = await supabaseAdmin
      .from("materials")
      .update({ is_published: nextStatus })
      .eq("id", id);
    if (error) throw error;

    if (nextStatus) {
      notifyMaterialPublished(id).catch((err) => {
        console.error("Failed to notify students on material toggle publish:", err);
      });
    }

    return { success: true, nextStatus };
  } catch (err: any) {
    console.error("[togglePublishMaterial] Error:", err);
    return { success: false, error: err.message || "Failed to toggle status" };
  }
}
