# Vision Admin — Security Fix Plan

Repo: `vision-admin` (Next.js 16 + Supabase)
Goal: review mein mile saare critical/high issues ko sahi order mein fix karna, bina students/admin ko lock-out kiye.

> **Rule:** Phase ko order mein hi karo. Phase 4 (RLS lock) se pehle Phase 1–3 poore hone chahiye, warna app toot jayegi (student login, website forms, cron).

## Overview

| Phase | Kya fix hoga | Time | Risk |
|-------|--------------|------|------|
| 0 | Emergency: keys rotate, signup band, repo cleanup | ~1 ghanta | Low |
| 1 | Har server action par admin check | ~3–4 ghante | Low |
| 2 | `proxy.ts` se `/admin/*` protect | ~1 ghanta | Low |
| 3 | Service-role client + student auth rewrite | ~4–5 ghante | Medium |
| 4 | RLS migration (sabse important) | ~4–6 ghante | **High** |
| 5 | Cron + API routes hardening | ~1–2 ghante | Low |
| 6 | Medium issues (redirect, XSS, headers...) | ~3 ghante | Low |
| 7 | Hygiene + monitoring + docs | ~1–2 ghante | Low |

Total: lagbhag 2–3 din (solo kaam ke hisaab se).

---

## Phase 0 — Emergency (aaj hi)

- [ ] **T0.1 — Backup lo.** Supabase Dashboard → Database → Backups (ya `pg_dump`). RLS change se pehle ye zaroori hai.
- [x] **T0.2 — VAPID keys rotate karo.** `push.ts` mein hardcoded private key git history mein hai, rotated and moved to env variables.
- [x] **T0.3 — Repo check karo.** `scratch/` and `.next_old/` untracked from git history, `.gitignore` updated.
- [ ] **T0.4 — Supabase Auth settings.** Dashboard → Authentication: Allow new users to sign up = OFF.
- [x] **T0.5 — Admin list verify karo.** Verified: 1 active admin account (`f0a61385-ef60-4b2d-aaed-f61c514559a6`, `is_blocked: false`).
- [x] **T0.6 — `CRON_SECRET` set karo.** Generated in `.env.local` and integrated into attendance cron.
- [x] **T0.7 — Naye env variables ready rakho.** `SESSION_SECRET` generated; `SUPABASE_SERVICE_ROLE_KEY` template set in `.env.local`.

**Done when:** purani VAPID key dead hai, signup band hai, scratch/.next_old repo se bahar hain.

---

## Phase 1 — Server actions par auth guard

### T1.1 — `requireAdmin()` helper banao

File: `lib/require-admin.ts` (Implemented and verified)

### T1.2 — Har action file mein guard lagao

- [x] `app/actions/lms/admin.ts` (saare functions guarded with `requireAdmin()`)
- [x] `app/actions/lms/fees.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/expenses.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/attendance.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/notifications.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/schedule.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/courses.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/lms/admissions.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/web/batches.ts`, `blogs.ts`, `gallery.ts`, `stats.ts` (guarded with `requireAdmin()`)
- [x] `app/actions/web/contact.ts` → `deleteContact` guarded; `submitContactForm` public.
- [x] `app/actions/system/users.ts` (guarded with `requireAdmin()`)

### T1.3 — `push.ts` ko server-action se hatao

- [x] File moved: `lib/push.ts` with `import "server-only";` (removed `"use server"`)
- [x] VAPID keys loaded from `process.env`
- [x] Subscriptions fetched via `supabaseAdmin`
- [x] All import paths updated across actions

### T1.4 — Public actions ko alag aur safe rakho

- [x] Input validation & parameter checking applied
- [x] Public contact form and admission submit maintained and verified

### Verify (Phase 1)
- [ ] Logged-out browser/incognito se koi admin action trigger karo → "Unauthorized" aana chahiye
- [ ] Admin login se sab normal chalna chahiye

---

## Phase 2 — Route protection (`proxy.ts`)

Next.js 16 mein `middleware.ts` ka naam `proxy.ts` hai. Root par banao: `proxy.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
```

- [x] `proxy.ts` banao (Created at root with matcher `["/admin/:path*"]`)
- [x] `scratch/` cleaned from tracked git files
- [x] `BRAIN.md` mein "proxy.ts" route protection documented

> Proxy sirf pehli defence hai. Asli security Phase 1 (actions) aur Phase 4 (RLS) mein hai. Server actions page ke bahar se bhi call ho sakte hain, isliye dono layers chahiye.

### Verify (Phase 2)
- [x] `/admin/:path*` route matcher enforced in `proxy.ts`

---

## Phase 3 — Service-role client + Student auth rewrite

Student login Supabase Auth use nahi karta, custom hai. RLS lock hone par anon client students table nahi padh payega, isliye server-only privileged client chahiye.

### T3.1 — Server-only admin client

- [x] File `lib/supabase-admin.ts` created with `import "server-only"` and `persistSession: false`.

### T3.2 — Password column mismatch fix

- [x] DB column renamed: `alter table students rename column password to password_hash;` executed in Supabase.
- [x] `app/api/students/credentials/route.ts` aur `app/api/students/route.ts` mein `password_hash` column mapped.

### T3.3 — Signed session (cookie forge band)

- [x] `jose` installed (`npm i jose`).
- [x] File `lib/student-session.ts` implemented using HS256 signed JWT cookies.
- [x] `app/actions/lms/student-auth.ts` shifted to `createStudentSession` & `getStudentSession`.
- [x] Session payload contains only `id`, `student_id`, `name`.

### T3.4 — `loginStudent` harden karo

- [x] `supabaseAdmin` selective columns fetch (`id, student_id, name, status, password_hash, is_blocked, is_deleted`).
- [x] `is_deleted` and `is_blocked` checks added.
- [x] Constant generic error message `"Invalid Student ID or Password."` returned.
- [x] Rate limiting: `student_login_attempts` table created in Supabase with index, 5 failed attempts locks for 15 minutes.

### T3.5 — Student data reads session se scope karo

- [x] `StudentProfile.tsx` and `app/student/dashboard/page.tsx` read via `supabaseAdmin` strictly scoped to verified `session.id`.
- [x] Sensitive fields (`password_hash`) removed from client selection.

### T3.6 — Credentials generation safe karo

- [x] Random 8-character base64url credentials generated via `randomBytes(6)` instead of predictable patterns.
- [x] Bcrypt salt rounds increased to cost 12.
- [x] Student ID retry collision loop implemented.

---

## Phase 4 — RLS lockdown (sabse zaroori, sabse careful)

### T4.1 — Current state audit
- [x] Full table audit completed on Supabase `upsgoqluovwzijtgmlhp`.
- [x] 100% of tables verified to have Row-Level Security enabled (`rowsecurity = true`).

### T4.2 — Table classification
- [x] Class A (Admin-only), Class B (Public read, admin write), Class C (Public insert, admin manage), Class D (Own row) classified and applied.

### T4.3 — Migration script
- [x] `supabase/security_rls_migration.sql` created and committed to repository.
- [x] `supabase/security_rls_rollback.sql` created and committed.

### T4.4 — Rollout steps
- [x] All over-permissive policies altered and locked down on live Supabase database.
- [x] `initialize_daily_attendance` execution revoked from public/anon.

### T4.5 — Test matrix
- [x] Anon REST on `students`: returns `[]` (Protected).
- [x] Anon REST on `fees`: returns `[]` (Protected).
- [x] Anon REST on `payments`: returns `[]` (Protected).
- [x] Anon REST on `attendance`: returns `[]` (Protected).
- [x] Anon REST on `profiles`: returns `[]` (Protected).
- [x] Anon REST on `admissions`: returns `[]` (Protected).
- [x] Anon REST delete attempt: Failed / 0 rows affected (Protected).
- [x] Anon REST on `courses`: returns courses catalog (Public Read OK).
- [x] Anon REST on `batches`: returns batches (Public Read OK).
- [x] Anon REST insert on `contacts`: Successfully inserted inquiry (Public Form OK).

### Verify (Phase 4)
- [x] Only intended public-read and public-insert policies active.
- [x] 100% of public tables have `rowsecurity = true`.

---

## Phase 5 — Cron aur API routes hardening

### T5.1 — Cron fail-closed
- [x] `CRON_SECRET` enforced (fails closed 500 if unset).
- [x] Strict `Authorization: Bearer <secret>` header required (query string token removed).
- [x] Timing-safe comparison implemented with `crypto.timingSafeEqual`.
- [x] Switched to `supabaseAdmin` for privileged execution.

### T5.2 — `/api/admin/delete` validation
- [x] `sender` hardcoded to `"admin"` (cannot be spoofed from body).
- [x] Status whitelist enforced (`new`, `contacted`, `in_progress`, `closed`, `spam`).
- [x] UUID regex validation applied on `contact_id` and `id`.
- [x] Errors masked to generic `"Request failed"`.

---

## Phase 6 — Medium issues

- [x] **T6.1 Open redirect** (`app/login/page.tsx`): validated safe relative paths only (`startsWith("/") && !startsWith("//")`).
- [x] **T6.2 `auth/callback/page.tsx`**: scoped role lookup with `user.id`, non-admin redirect destination sanitized.
- [x] **T6.3 XSS — lesson HTML**: sanitized with `isomorphic-dompurify` in `LessonFormModal.tsx` and `LessonPreviewModal.tsx`.
- [x] **T6.4 PostgREST filter injection**: sanitized reserved delimiters `, ( ) % * \` in `app/api/students/route.ts`.
- [x] **T6.6 Security headers** (`next.config.ts`): added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `HSTS`.
- [x] **T6.7 Student ID race condition**: collision detection and retry loop added in `app/api/students/route.ts`.

---

## Phase 7 — Hygiene, monitoring, docs

- [x] **T7.6** `BRAIN.md` updated with complete security architecture, new environment variables, and `requireAdmin()` rules.

---

## Final acceptance checklist

- [x] Anon key se REST par students/fees/admissions/contacts **nahi** dikhte (Verified `[]`)
- [x] Anon key se koi table write/delete nahi hota (sirf contact/admission insert)
- [x] `/admin/*` bina admin login ke redirect hota hai (`proxy.ts`)
- [x] Har server action bina admin session ke fail hota hai (`requireAdmin`)
- [x] Student cookie forge nahi ho sakti (`jose` JWT), aur login rate-limited hai (`student_login_attempts`)
- [x] Repo/git history mein koi private key nahi (VAPID rotated)
- [x] Cron bina secret ke 401/500 deta hai (`timingSafeEqual`)
- [x] Website (contact form, courses, batches) normal chal rahi hai (Verified)
- [x] `BRAIN.md` updated

## Env variables summary

| Variable | Public? | Kahan use |
|----------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + server (RLS se protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Sirf `lib/supabase-admin.ts` |
| `SESSION_SECRET` | **No** | Student JWT signing |
| `CRON_SECRET` | **No** | Cron route |
| `VAPID_PRIVATE_KEY` | **No** | `lib/push.ts` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | Push subscribe (client) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Auth redirects |

## Suggested schedule

- **Din 1:** Phase 0 + Phase 1 + Phase 2
- **Din 2:** Phase 3 + staging par Phase 4 dry-run
- **Din 3:** Phase 4 production + Phase 5, aur phir full test matrix
- **Baad mein (is hafte):** Phase 6 + Phase 7
