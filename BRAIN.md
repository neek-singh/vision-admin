# VISION ADMIN — PROJECT BRAIN
> Last updated: 2026-07-01 | Auto-audit: har session me changes compare karo aur update karo

---

## 1. PROJECT IDENTITY

| Key | Value |
|-----|-------|
| Name | `vision-admin` |
| Type | Next.js 16.2.4 Admin Dashboard |
| React | 19.2.4 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Media | Cloudinary (`res.cloudinary.com/ddiooxxks`) |
| Site URL | `https://admin.visionitinstitute.com` |
| Dev cmd | `npm run dev` |
| Client | Vision IT Computer Institute |

---

## 2. TECH STACK

```
Next.js 16 (App Router)  →  Server Actions + RSC
Supabase                 →  Auth (OTP + Password + Google OAuth) + DB + RLS
Tailwind CSS v4          →  Styling (NO shadcn/ui — custom components only)
Lucide React v1.14       →  Icons
Cloudinary               →  Image/File storage (next-cloudinary)
Web Push                 →  Push notifications
bcryptjs                 →  Password hashing
jsqr                     →  QR code scanning (attendance)
```

### Fonts (Google Fonts)
- `Geist` → `--font-geist-sans`
- `Geist Mono` → `--font-geist-mono`
- `Outfit` → `--font-outfit`

---

## 3. DIRECTORY STRUCTURE

```
vision-admin/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata, globals.css)
│   ├── page.tsx                # Root redirect
│   ├── globals.css             # Global styles
│   ├── admin/
│   │   ├── layout.tsx          # Admin shell (Sidebar + Header + theme) [CLIENT ~17KB]
│   │   ├── page.tsx            # Admin Dashboard (Web mode) [~24KB]
│   │   ├── loading.tsx         # Loading skeleton
│   │   ├── (lms)/              # LMS route group
│   │   │   ├── admissions/     # Enquiry admissions
│   │   │   ├── courses/        # Course management
│   │   │   ├── fees/           # Fees management
│   │   │   ├── lms/            # LMS sub-pages
│   │   │   │   ├── content/    # Course curriculum
│   │   │   │   ├── batch-content/ # Batch-wise content
│   │   │   │   ├── tests/      # Tests management
│   │   │   │   ├── materials/  # Notes & PDFs
│   │   │   │   ├── assignments/# Assignments
│   │   │   │   ├── attendance/ # Daily attendance (QR-based)
│   │   │   │   ├── chats/      # LMS chat
│   │   │   │   └── analytics/  # LMS analytics
│   │   │   ├── notifications/  # Push notifications
│   │   │   ├── schedule/       # Academic schedule
│   │   │   └── students/       # Student management
│   │   ├── (system)/
│   │   │   └── users/          # Admin user management
│   │   └── (web)/              # Website CMS route group
│   │       ├── analytics/      # Web analytics
│   │       ├── batches/        # Course batches (website)
│   │       ├── blogs/          # Blog management
│   │       ├── chats/          # Web chat
│   │       ├── contacts/       # General enquiries
│   │       ├── gallery/        # Image gallery
│   │       └── stats/          # Website stats
│   ├── actions/                # Server Actions
│   │   ├── lms/
│   │   │   ├── admin.ts        # Admin CRUD (4.7KB)
│   │   │   ├── admissions.ts   # Admission actions
│   │   │   ├── attendance.ts   # Attendance actions
│   │   │   ├── courses.ts      # Course CRUD (3.6KB)
│   │   │   ├── fees.ts         # Fee management (5.3KB)
│   │   │   ├── notifications.ts# Push notification send
│   │   │   ├── push.ts         # Web push helpers
│   │   │   ├── schedule.ts     # Schedule CRUD (3KB)
│   │   │   └── student-auth.ts # Student login/signup
│   │   ├── system/
│   │   │   └── auth.ts         # System auth actions
│   │   └── web/
│   │       ├── batches.ts      # Public batch actions
│   │       ├── blogs.ts        # Blog CRUD
│   │       ├── contact.ts      # Contact form handler
│   │       ├── gallery.ts      # Gallery CRUD (3.6KB)
│   │       └── stats.ts        # Stats tracker
│   ├── api/
│   │   ├── cron/               # Cron jobs (Vercel)
│   │   └── students/           # Student REST endpoints
│   ├── auth/                   # Auth callback handler
│   ├── admission/              # Public admission form
│   ├── login/                  # Admin login page
│   └── student/
│       ├── dashboard/          # Student portal dashboard
│       └── login/              # Student login
├── components/
│   ├── lms/                    # LMS-specific components
│   │   ├── admin/              # Admin LMS components
│   │   ├── admissions/         # Admission UI
│   │   ├── assignments/        # Assignment components
│   │   ├── attendance/         # Attendance UI (QR scanner)
│   │   ├── calendar/           # Calendar/schedule UI
│   │   ├── content/            # Curriculum content UI
│   │   ├── courses/            # Course cards/forms
│   │   ├── fees/               # Fee table/forms
│   │   ├── materials/          # Notes UI
│   │   ├── notifications/      # Notification sender UI
│   │   ├── schedule/           # Schedule UI
│   │   ├── student/            # Student portal components
│   │   ├── students/           # Student management UI
│   │   └── tests/              # Test/quiz UI
│   ├── system/
│   │   ├── UserRoleManager.tsx # Role assignment component
│   │   └── UsersClient.tsx     # Admin users table (18KB)
│   ├── ui/                     # Reusable base components (NO shadcn)
│   │   ├── Badge.tsx           # Status badges
│   │   ├── Boneyard.tsx        # Skeleton loader
│   │   ├── Button.tsx          # Primary button
│   │   ├── Card.tsx            # Card wrapper
│   │   ├── DeleteButton.tsx    # Confirm-delete button
│   │   ├── Modal.tsx           # Modal dialog
│   │   └── MultiSelect.tsx     # Multi-select dropdown
│   └── web/                    # Website CMS components
│       ├── AdminGalleryClient.tsx # Gallery manager
│       ├── BatchForm.tsx        # Batch form (9KB)
│       ├── BatchListClient.tsx  # Batch list UI
│       └── BlogForm.tsx         # Blog editor (6.3KB)
├── lib/
│   ├── supabase.ts             # Browser Supabase client (singleton export `supabase`)
│   ├── supabase-browser.ts     # Alt browser client
│   ├── supabase-server.ts      # Server-side Supabase client (async fn)
│   ├── auth.ts                 # AuthServices object (OTP, password, google, role)
│   └── utils.ts                # Utility helpers
├── supabase/
│   ├── migration_phase1.sql    # Main schema (10KB)
│   ├── add_category.sql        # courses.category
│   ├── add_chapters.sql        # Chapter system
│   ├── add_course_level.sql    # courses.level
│   ├── attendance_qr_migration.sql  # QR attendance
│   └── auto_attendance_migration.sql
├── BRAIN.md                    # THIS FILE
├── next.config.ts              # Next.js config (images: Cloudinary whitelist)
├── package.json                # Dependencies
└── public/                     # Static assets
```

---

## 4. DATABASE SCHEMA (Supabase)

### Core LMS Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Auth user profiles | `id`, `role` (admin/student) |
| `students` | Student records | `id`, `name`, `email`, `batch_id`→batches |
| `courses` | Course catalog | `id`, `title`, `category`, `level` |
| `batches` | Course batches | `id`, `title`, `course_id`, `start_date`, `end_date`, `status`, `max_seats`, `available_seats` |
| `enrollments` | Student-Course mapping | `student_id`, `course_id`, `batch_id`, `last_lesson_id` |
| `lms_modules` | Course sections | `id`, `course_id`, `batches[]`, `description`, `is_published` |
| `lessons` | Individual lessons | `id`, `module_id`, `lesson_type`, `notes_content`, `pdf_url`, `batches[]`, `scheduled_release_date`, `status` |
| `lesson_progress` | Watch history | `student_id`, `lesson_id`, `is_completed`, `watch_percentage`, `last_position` |
| `batch_lesson_overrides` | Batch-specific content | `lesson_id`, `batch_id`, `custom_video_url`, `custom_notes`, `live_class_link`, `release_date` |
| `tests` | Quizzes/exams | `id`, `course_id`, `batches[]`, `passing_marks` |
| `materials` | Notes/PDFs | `id`, `batches[]` |
| `assignments` | Homework | `id`, `batches[]`, `max_marks`, `deadline` |
| `submissions` | Assignment answers | `marks`, `feedback`, `graded_at` |
| `schedule` | Academic events | `id`, `event_type` (class/exam/deadline/event), `batch_id`, `start_time`, `end_time`, `live_link` |
| `bookmarks` | Student bookmarks | `student_id`, `lesson_id`, `note` |

### Website Tables

| Table | Purpose |
|-------|---------|
| `blogs` | Blog posts |
| `gallery` | Gallery images |
| `contacts` | General enquiries |
| `admissions` | Course enquiry/admission |
| `stats` | Website stats |

### RLS Pattern (ALL tables)
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON <table> FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for anon" ON <table> FOR ALL TO anon USING (true);
```
> NOTE: Permissive RLS — tighten later in production

---

## 5. AUTH SYSTEM

| Type | Method |
|------|--------|
| Admin login | OTP Magic Link (Supabase Auth) |
| Student login | Email/Password |
| Google OAuth | Available for students |
| Role field | `profiles.role` = `'admin'` or `'student'` |
| Session | Supabase SSR cookies |

### Auth Flow
```
/login → AdminLogin → OTP → /auth/callback?type=admin → /admin
/student/login → Password/Google → /auth/callback → /student/dashboard
Middleware: checks session + role → redirects if unauthorized
```

### AuthServices (lib/auth.ts)
```ts
AuthServices.signInAdminWithOtp(email)
AuthServices.signInWithPassword(email, password)
AuthServices.signUp(email, password, fullName)
AuthServices.signInWithGoogle()
AuthServices.getSession()
AuthServices.getUserRole()    // queries profiles table
AuthServices.isAdmin()
AuthServices.signOut()
```

---

## 6. ADMIN LAYOUT & NAVIGATION

**File:** `app/admin/layout.tsx` (CLIENT component — has sidebar + header)

### Sidebar Nav Groups
```
Core:          Dashboard (→/admin or →/admin/lms based on mode)
Vision Learn:  LMS Dashboard, Enquiry Admissions, Manage Students,
               Add Student, Manage Courses, Course Curriculum,
               Batch Content, Manage Tests, Notes & Materials,
               Assignments, Daily Attendance, Academic Schedule,
               Notifications, Fees Management, LMS Chats, LMS Analytics
Vision Web:    Batches, General Enquiries, Blogs, Gallery,
               Website Stats, Web Chats, Web Analytics
System:        Admin Users
```

### Mode Switching Logic
```ts
// Auto-detect mode from pathname
if (pathname.includes('/lms' | '/courses' | '/students' | '/admissions' | '/fees' | '/schedule'))
  setAdminMode("lms")   // shows Vision Learn group
else
  setAdminMode("web")   // shows Vision Web group
```

### localStorage Keys
- `admin_theme` → `"light"` | `"dark"`
- `sidebar_collapsed` → `"true"` | `"false"`

### Sidebar Dimensions
- Expanded desktop: `270px`
- Collapsed desktop: `84px`
- Mobile: Full-width drawer (overlay)

---

## 7. UI COMPONENT GUIDE

> ❌ NO shadcn/ui — use these custom components

| Component | Import Path | Notes |
|-----------|-------------|-------|
| `Button` | `@/components/ui/Button` | Primary action |
| `Card` | `@/components/ui/Card` | Content wrapper |
| `Badge` | `@/components/ui/Badge` | Status labels |
| `Modal` | `@/components/ui/Modal` | Overlay dialog |
| `DeleteButton` | `@/components/ui/DeleteButton` | Confirm delete |
| `MultiSelect` | `@/components/ui/MultiSelect` | Multi-option select |
| `Boneyard` | `@/components/ui/Boneyard` | Skeleton loader |

### CSS Classes (Global)
```css
.custom-scrollbar   /* Thin 4px scrollbar (sidebar) */
.glass-card         /* Glassmorphism card (light + dark) */
```

---

## 8. KEY PATTERNS

### Server Action Template
```ts
"use server"
import { createServerClient } from '@/lib/supabase-server'

export async function myAction(data: SomeType) {
  const supabase = await createServerClient()
  const { data: result, error } = await supabase.from('table').select(...)
  if (error) throw new Error(error.message)
  return result
}
```

### Client Component Supabase Usage
```tsx
"use client"
import { supabase } from '@/lib/supabase'  // browser singleton
```

### Image Upload (Cloudinary)
```tsx
import { CldUploadWidget } from 'next-cloudinary'
// cloudName: 'ddiooxxks'
// Transforms: f_auto,q_auto
```

### Path Alias
```ts
import X from '@/components/...'  // maps to ./components/...
import X from '@/lib/...'         // maps to ./lib/...
import X from '@/app/...'         // maps to ./app/...
```

---

## 9. ENVIRONMENT VARIABLES (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=           # https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # eyJ...
NEXT_PUBLIC_SITE_URL=               # https://admin.visionitinstitute.com
# Also: Cloudinary keys, Web Push VAPID keys
```

---

## 10. GOTCHAS & RULES

1. **Next.js 16** — Breaking changes from v14/v15. Read `node_modules/next/dist/docs/` before new features
2. **NO shadcn** — Only `components/ui/` custom components
3. **Tailwind v4** — No `tailwind.config.js`, uses `@tailwindcss/postcss` plugin
4. **Admin layout = CLIENT** — No `"use server"` or server imports in `app/admin/layout.tsx`
5. **Two dashboard pages** — `/admin` (Web mode) and `/admin/lms` (LMS mode)
6. **Cloudinary whitelist** — Only `res.cloudinary.com` in `next.config.ts`
7. **`data_old`** — Old static JSON, not production
8. **`scratch/`** — Dev scripts only (e.g., `cleanup.js`)
9. **Supabase client types**:
   - Browser: `import { supabase } from '@/lib/supabase'`
   - Server: `const supabase = await createServerClient()` from `@/lib/supabase-server`
10. **student vs students** — `components/lms/student/` = student portal, `components/lms/students/` = admin student management

---

## 11. AUDIT LOG

> Naye changes yahan note karo: date + change summary

| Date | Change |
|------|--------|
| 2026-07-01 | BRAIN.md created — full initial project scan |
| 2026-07-01 | Credentials flow changed: registration me password remove kiya, Student Management me "Generate Credentials" button + modal add kiya. New API: `POST /api/students/credentials` |

---

## HOW TO USE

- **Session start**: Sirf yahi file padho — project scan skip karo
- **Nayi feature**: Structure + Audit Log update karo
- **Schema change**: Section 4 update karo
- **Naya component**: Section 7 me add karo
- **Changes audit**: `git diff --stat HEAD` chala ke BRAIN se compare karo
