"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import fs from "fs";
import path from "path";

function getGalleryPaths() {
  const candidates = [
    path.resolve(process.cwd(), "..", "vision-web"),
    "c:\\Users\\as007\\vision project\\vision-web",
    "c:\\Users\\as007\\vision-web",
  ];

  let basePath = candidates[0];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      basePath = candidate;
      break;
    }
  }

  const galleryFilePath = path.join(basePath, "features", "gallery", "data", "gallery.json");
  const galleryDir = path.join(basePath, "public", "gallery");

  return { galleryFilePath, galleryDir };
}

export async function getImages() {
  try {
    await requireAdmin();
    const { galleryFilePath } = getGalleryPaths();
    if (fs.existsSync(galleryFilePath)) {
      const fileData = fs.readFileSync(galleryFilePath, "utf-8");
      return JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Error getting gallery images:", e);
  }
  return [];
}

export async function uploadImage(formData: FormData) {
  try {
    await requireAdmin();

    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    if (!title || !file || file.size === 0) {
      return { error: "Title and image file are required." };
    }

    const { galleryFilePath, galleryDir } = getGalleryPaths();
    if (!fs.existsSync(galleryDir)) {
      fs.mkdirSync(galleryDir, { recursive: true });
    }

    const jsonDir = path.dirname(galleryFilePath);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = path.join(galleryDir, fileName);

    // Save the image file
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Read existing JSON
    let gallery: any[] = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }

    // Append new image
    const newImage = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      image_url: `/gallery/${fileName}`,
      created_at: new Date().toISOString(),
    };

    gallery.unshift(newImage);
    fs.writeFileSync(galleryFilePath, JSON.stringify(gallery, null, 2), "utf-8");

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upload image to JSON:", error);
    return { error: error.message || "Unauthorized" };
  }
}

export async function addImageUrl(title: string, imageUrl: string) {
  try {
    await requireAdmin();

    if (!title || !imageUrl) {
      return { error: "Title and Image URL are required." };
    }

    const { galleryFilePath } = getGalleryPaths();
    const jsonDir = path.dirname(galleryFilePath);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // Read existing JSON
    let gallery: any[] = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }

    // Append new image
    const newImage = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      image_url: imageUrl.trim(),
      created_at: new Date().toISOString(),
    };

    gallery.unshift(newImage);
    fs.writeFileSync(galleryFilePath, JSON.stringify(gallery, null, 2), "utf-8");

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add image URL to JSON:", error);
    return { error: error.message || "Unauthorized" };
  }
}

export async function deleteImage(id: string, imageUrl: string) {
  try {
    await requireAdmin();

    const { galleryFilePath, galleryDir } = getGalleryPaths();

    // Read existing JSON
    let gallery: any[] = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }

    // Filter out deleted image
    const updatedGallery = gallery.filter((img: any) => img.id !== id);
    fs.writeFileSync(galleryFilePath, JSON.stringify(updatedGallery, null, 2), "utf-8");

    // Delete local file if it's stored locally
    const fileName = imageUrl.split("/").pop();
    if (fileName && imageUrl.startsWith("/gallery/")) {
      const filePath = path.join(galleryDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete image from JSON:", error);
    return { error: error.message || "Unauthorized" };
  }
}
