"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

const galleryFilePath = "c:\\Users\\as007\\vision-web\\data\\gallery.json";

export async function getImages() {
  try {
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
  const title = formData.get("title") as string;
  const file = formData.get("file") as File;

  if (!title || !file || file.size === 0) {
    return { error: "Title and image file are required." };
  }

  try {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const filePath = "c:\\Users\\as007\\vision-web\\public\\gallery\\" + fileName;

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
      title,
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
    return { error: error.message || "Failed to upload image" };
  }
}

export async function addImageUrl(title: string, imageUrl: string) {
  if (!title || !imageUrl) {
    return { error: "Title and Image URL are required." };
  }

  try {
    // Read existing JSON
    let gallery: any[] = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }

    // Append new image
    const newImage = {
      id: Math.random().toString(36).slice(2),
      title,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    gallery.unshift(newImage);
    fs.writeFileSync(galleryFilePath, JSON.stringify(gallery, null, 2), "utf-8");

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to add image URL to JSON:", error);
    return { error: error.message || "Failed to add image URL" };
  }
}

export async function deleteImage(id: string, imageUrl: string) {
  try {
    // Read existing JSON
    let gallery: any[] = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }

    // Filter out deleted image
    const updatedGallery = gallery.filter((img: any) => img.id !== id);
    fs.writeFileSync(galleryFilePath, JSON.stringify(updatedGallery, null, 2), "utf-8");

    // Delete local file
    const fileName = imageUrl.split("/").pop();
    if (fileName) {
      const filePath = "c:\\Users\\as007\\vision-web\\public\\gallery\\" + fileName;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete image from JSON:", error);
    return { error: error.message || "Failed to delete image" };
  }
}
