import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretStr = process.env.SESSION_SECRET || "default_fallback_secret_must_change_in_production";
const key = new TextEncoder().encode(secretStr);
const COOKIE = "student_session";

export interface StudentSessionPayload {
  id: string;
  student_id: string;
  name: string;
}

export async function createStudentSession(s: StudentSessionPayload) {
  const token = await new SignJWT({
    id: s.id,
    student_id: s.student_id,
    name: s.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload?.id || !payload?.student_id) return null;
    return {
      id: payload.id as string,
      student_id: payload.student_id as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function destroyStudentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
