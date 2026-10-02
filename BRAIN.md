# VISION ADMIN â€” PROJECT BRAIN
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
Next.js 16 (App Router)  â†’  Server Actions + RSC
Supabase                 â†’  Auth (OTP + Password + Google OAuth) + DB + RLS
Tailwind CSS v4          â†’  Styling (NO shadcn/ui â€” custom components only)
Lucide React v1.14       â†’  Icons
Cloudinary               â†’  Image/File storage (next-cloudinary)
Web Push                 â†’  Push notifications
bcryptjs                 â†’  Password hashing
jsqr                     â†’  QR code scanning (attendance)
```

### Fonts (Google Fonts)
- `Geist` â†’ `--font-geist-sans`
- `Geist Mono` â†’ `--font-geist-mono`
- `Outfit` â†’ `--font-outfit`

---

## 3. DIRECTORY STRUCTURE

```
vision-admin/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ layout.tsx              # Root layout (fonts, metadata, globals.css)
â”‚   â”œâ”€â”€ page.tsx                # Root redirect
â”‚   â”œâ”€â”€ globals.css             # Global styles
â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”œâ”€â”€ layout.tsx          # Admin shell (Sidebar + Header + theme) [CLIENT ~17KB]
â”‚   â”‚   â”œâ”€â”€ page.tsx            # Admin Dashboard (Web mode) [~24KB]
â”‚   â”‚   â”œâ”€â”€ loading.tsx         # Loading skeleton
â”‚   â”‚   â”œâ”€â”€ (lms)/              # LMS route group
â”‚   â”‚   â”‚   â”œâ”€â”€ admissions/     # Enquiry admissions
â”‚   â”‚   â”‚   â”œâ”€â”€ courses/        # Course management
â”‚   â”‚   â”‚   â”œâ”€â”€ fees/           # Fees management
â”‚   â”‚   â”‚   â”œâ”€â”€ lms/            # LMS sub-pages
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ content/    # Course curriculum
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ batch-content/ # Batch-wise content
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ tests/      # Tests management
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ materials/  # Notes & PDFs
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ projects/   # Projects
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ attendance/ # Daily attendance (QR-based)
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ chats/      # LMS chat
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ analytics/  # LMS analytics
â”‚   â”‚   â”‚   â”œâ”€â”€ notifications/  # Push notifications
â”‚   â”‚   â”‚   â”œâ”€â”€ schedule/       # Academic schedule
â”‚   â”‚   â”‚   â””â”€â”€ students/       # Student management
â”‚   â”‚   â”œâ”€â”€ (system)/
â”‚   â”‚   â”‚   â””â”€â”€ users/          # Admin user management
â”‚   â”‚   â””â”€â”€ (web)/              # Website CMS route group
â”‚   â”‚       â”œâ”€â”€ analytics/      # Web analytics
â”‚   â”‚       â”œâ”€â”€ batches/        # Course batches (website)
â”‚   â”‚       â”œâ”€â”€ blogs/          # Blog management
â”‚   â”‚       â”œâ”€â”€ chats/          # Web chat
â”‚   â”‚       â”œâ”€â”€ contacts/       # General enquiries
â”‚   â”‚       â”œâ”€â”€ gallery/        # Image gallery
â”‚   â”‚       â””â”€â”€ stats/          # Website stats
â”‚   â”œâ”€â”€ actions/                # Server Actions
â”‚   â”‚   â”œâ”€â”€ lms/
â”‚   â”‚   â”‚   â”œâ”€â”€ admin.ts        # Admin CRUD (4.7KB)
â”‚   â”‚   â”‚   â”œâ”€â”€ admissions.ts   # Admission actions
â”‚   â”‚   â”‚   â”œâ”€â”€ attendance.ts   # Attendance actions
â”‚   â”‚   â”‚   â”œâ”€â”€ courses.ts      # Course CRUD (3.6KB)
â”‚   â”‚   â”‚   â”œâ”€â”€ fees.ts         # Fee management (5.3KB)
â”‚   â”‚   â”‚   â”œâ”€â”€ notifications.ts# Push notification send
â”‚   â”‚   â”‚   â”œâ”€â”€ push.ts         # Web push helpers
â”‚   â”‚   â”‚   â”œâ”€â”€ schedule.ts     # Schedule CRUD (3KB)
â”‚   â”‚   â”‚   â””â”€â”€ student-auth.ts # Student login/signup
â”‚   â”‚   â”œâ”€â”€ system/
â”‚   â”‚   â”‚   â””â”€â”€ auth.ts         # System auth actions
â”‚   â”‚   â””â”€â”€ web/
â”‚   â”‚       â”œâ”€â”€ batches.ts      # Public batch actions
â”‚   â”‚       â”œâ”€â”€ blogs.ts        # Blog CRUD
â”‚   â”‚       â”œâ”€â”€ contact.ts      # Contact form handler
â”‚   â”‚       â”œâ”€â”€ gallery.ts      # Gallery CRUD (3.6KB)
â”‚   â”‚       â””â”€â”€ stats.ts        # Stats tracker
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ cron/               # Cron jobs (Vercel)
â”‚   â”‚   â””â”€â”€ students/           # Student REST endpoints
â”‚   â”œâ”€â”€ auth/                   # Auth callback handler
â”‚   â”œâ”€â”€ admission/              # Public admission form
â”‚   â”œâ”€â”€ login/                  # Admin login page
â”‚   â””â”€â”€ student/
â”‚       â”œâ”€â”€ dashboard/          # Student portal dashboard
â”‚       â””â”€â”€ login/              # Student login
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ lms/                    # LMS-specific components
â”‚   â”‚   â”œâ”€â”€ admin/              # Admin LMS components
â”‚   â”‚   â”œâ”€â”€ admissions/         # Admission UI
â”‚   â”‚   â”œâ”€â”€ projects/           # Project components
â”‚   â”‚   â”œâ”€â”€ attendance/         # Attendance UI (QR scanner)
â”‚   â”‚   â”œâ”€â”€ calendar/           # Calendar/schedule UI
â”‚   â”‚   â”œâ”€â”€ content/            # Curriculum content UI
â”‚   â”‚   â”œâ”€â”€ courses/            # Course cards/forms
â”‚   â”‚   â”œâ”€â”€ fees/               # Fee table/forms
â”‚   â”‚   â”œâ”€â”€ materials/          # Notes UI
â”‚   â”‚   â”œâ”€â”€ notifications/      # Notification sender UI
â”‚   â”‚   â”œâ”€â”€ schedule/           # Schedule UI
â”‚   â”‚   â”œâ”€â”€ student/            # Student portal components
â”‚   â”‚   â”œâ”€â”€ students/           # Student management UI
â”‚   â”‚   â””â”€â”€ tests/              # Test/quiz UI
â”‚   â”œâ”€â”€ system/
â”‚   â”‚   â”œâ”€â”€ UserRoleManager.tsx # Role assignment component
â”‚   â”‚   â””â”€â”€ UsersClient.tsx     # Admin users table (18KB)
â”‚   â”œâ”€â”€ ui/                     # Reusable base components (NO shadcn)
â”‚   â”‚   â”œâ”€â”€ Badge.tsx           # Status badges
â”‚   â”‚   â”œâ”€â”€ Boneyard.tsx        # Skeleton loader
â”‚   â”‚   â”œâ”€â”€ Button.tsx          # Primary button
â”‚   â”‚   â”œâ”€â”€ Card.tsx            # Card wrapper
â”‚   â”‚   â”œâ”€â”€ DeleteButton.tsx    # Confirm-delete button
â”‚   â”‚   â”œâ”€â”€ Modal.tsx           # Modal dialog
â”‚   â”‚   â””â”€â”€ MultiSelect.tsx     # Multi-select dropdown
â”‚   â””â”€â”€ web/                    # Website CMS components
â”‚       â”œâ”€â”€ AdminGalleryClient.tsx # Gallery manager
â”‚       â”œâ”€â”€ BatchForm.tsx        # Batch form (9KB)
â”‚       â”œâ”€â”€ BatchListClient.tsx  # Batch list UI
â”‚       â””â”€â”€ BlogForm.tsx         # Blog editor (6.3KB)
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ supabase.ts             # Browser Supabase client (singleton export `supabase`)
â”‚   â”œâ”€â”€ supabase-browser.ts     # Alt browser client
â”‚   â”œâ”€â”€ supabase-server.ts      # Server-side Supabase client (async fn)
â”‚   â”œâ”€â”€ auth.ts                 # AuthServices object (OTP, password, google, role)
â”‚   â””â”€â”€ utils.ts                # Utility helpers
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migration_phase1.sql    # Main schema (10KB)
â”‚   â”œâ”€â”€ add_category.sql        # courses.category
â”‚   â”œâ”€â”€ add_chapters.sql        # Chapter system
â”‚   â”œâ”€â”€ add_course_level.sql    # courses.level
â”‚   â”œâ”€â”€ attendance_qr_migration.sql  # QR attendance
â”‚   â””â”€â”€ auto_attendance_migration.sql
â”œâ”€â”€ BRAIN.md                    # THIS FILE
â”œâ”€â”€ next.config.ts              # Next.js config (images: Cloudinary whitelist)
â”œâ”€â”€ package.json                # Dependencies
â””â”€â”€ public/                     # Static assets
```

---

## 4. DATABASE SCHEMA (Supabase)

### Core LMS Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Auth user profiles | `id`, `role` (admin/student) |
| `students` | Student records | `id`, `name`, `email`, `batch_id`â†’batches |
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
> NOTE: Permissive RLS â€” tighten later in production

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
/login â†’ AdminLogin â†’ OTP â†’ /auth/callback?type=admin â†’ /admin
/student/login â†’ Password/Google â†’ /auth/callback â†’ /student/dashboard
Middleware: checks session + role â†’ redirects if unauthorized
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

**File:** `app/admin/layout.tsx` (CLIENT component â€” has sidebar + header)

### Sidebar Nav Groups
```
Core:          Dashboard (â†’/admin or â†’/admin/lms based on mode)
Vision Learn:  LMS Dashboard, Enquiry Admissions, Manage Students,
               Add Student, Manage Courses, Course Curriculum,
               Batch Content, Manage Tests, Notes & Materials,
               Projects, Daily Attendance, Academic Schedule,
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
- `admin_theme` â†’ `"light"` | `"dark"`
- `sidebar_collapsed` â†’ `"true"` | `"false"`

### Sidebar Dimensions
- Expanded desktop: `270px`
- Collapsed desktop: `84px`
- Mobile: Full-width drawer (overlay)

---

## 7. UI COMPONENT GUIDE

> âŒ NO shadcn/ui â€” use these custom components

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

1. **Next.js 16** â€” Breaking changes from v14/v15. Read `node_modules/next/dist/docs/` before new features
2. **NO shadcn** â€” Only `components/ui/` custom components
3. **Tailwind v4** â€” No `tailwind.config.js`, uses `@tailwindcss/postcss` plugin
4. **Admin layout = CLIENT** â€” No `"use server"` or server imports in `app/admin/layout.tsx`
5. **Two dashboard pages** â€” `/admin` (Web mode) and `/admin/lms` (LMS mode)
6. **Cloudinary whitelist** â€” Only `res.cloudinary.com` in `next.config.ts`
7. **`data_old`** â€” Old static JSON, not production
8. **`scratch/`** â€” Dev scripts only (e.g., `cleanup.js`)
9. **Supabase client types**:
   - Browser: `import { supabase } from '@/lib/supabase'`
   - Server: `const supabase = await createServerClient()` from `@/lib/supabase-server`
10. **student vs students** â€” `components/lms/student/` = student portal, `components/lms/students/` = admin student management

---

## 11. AUDIT LOG

> Naye changes yahan note karo: date + change summary

| Date | Change |
|------|--------|
| 2026-07-01 | BRAIN.md created â€” full initial project scan |
| 2026-07-01 | Credentials flow changed: registration me password remove kiya, Student Management me "Generate Credentials" button + modal add kiya. New API: `POST /api/students/credentials` |
| 2026-07-02 | `LessonFormModal.tsx`: Block Builder (Header/Para/Image/List blocks) ko replace kiya ek simple contentEditable Rich Text Editor se. Toolbar: B, I, U, H2, Para, â€¢ List, 1. List, Image. Backward compatible: purana THEORY_BLOCKS_JSON data load hote waqt HTML me convert ho jata hai. Added custom Tab support (4 spaces), -> to â†’, => to â‡’, --- to divider, Notion/ChatGPT smart paste cleanup (links auto-converted to inline images), Full Screen toggle mode, and bulk MCQ/Quiz questions importer. |
| 2026-07-02 | `LessonPreviewModal.tsx`: Added rich-content container styling (H2 headings, custom lists, images, colors, font-weights, blocks comments removal) to ensure that previews for theory classes, assignments, and projects display HTML formatting identically to the editor. |
| 2026-07-03 | `LessonFormModal.tsx`, `LessonPreviewModal.tsx`, `globals.css`: Dark themed the "Edit Theory Lesson" modal and "Admin Preview" modal. Fixed the black text issue inside the dark editor/viewer by creating a `.dark-modal` target in `globals.css` that forces white/light colors for all heading, paragraph, list, strong, and span elements. |
| 2026-07-03 | Fixed contrast issues in the admin panel inputs, detail panels, filters, and summary elements by replacing typo `slate-955` classes with `slate-950` in `FeesClient.tsx`, `chats/page.tsx`, `UsersClient.tsx`, and `analytics/page.tsx`. |
| 2026-07-04 | Layout, page containers, and shared components responsive fixes: Fixed desktop sidebar collapse leakage on mobile menu drawer; added mobile drawer close button (X); optimized layout navbar mode switcher padding. Removed duplicate main wrappers and nested padding on dashboard (`page.tsx`), stats form (`stats/page.tsx`), and add student page (`students/add/page.tsx`). Fully dark themed `Modal`, `Card`, `Button`, `Badge` components, and stats management page. |
| 2026-07-04 | Course Curriculum page mobile responsiveness: Made stats dashboard flex-grid based, sidebar Module Roadmap navigator collapsible on mobile viewports (< 1024px) via toggle button with chevron, replaced individual class addition icons on mobile with a single clean `+ Add Class` button, and made lesson cards layout responsive (stacked controls and badges on mobile, rows on desktop). |
| 2026-07-06 | `ScheduleClient.tsx`: Highlighted Sundays in the Academic Schedule calendar (grid header, cell backgrounds, and date numbers) with a rose-themed styling to mark weekends/holidays. Updated the "Schedule Activity" (+ New Entry) modal in `ScheduleClient.tsx` to only display "Holiday" and "Event" options (removing standard curriculum types, Start Time inputs, and End Time inputs since standard lessons are scheduled via drag-and-place) to simplify manual scheduling. Configured triggers (clicking "+ New Entry" or a calendar day cell) to initialize the modal with `course_id: selectedCourseId` and `type: "holiday"`. Updated calendar filtering logic (`filteredSchedules`) to preserve global events/holidays (where `course_id` is null) and bypass the batch filter for holidays/events since they apply to all batches of a course. Hid the timing Clock block for holidays and events in the list view. `schedule.ts` (action): Resolved `invalid input syntax for type uuid` Postgres error by mapping `course_id: data.course_id || null` in the `createSchedule` insert payload, and expanded types schema definition to support holiday/event. Configured `createSchedule` to route manual schedules of type holiday/event to the `events` database table (bypassing the `schedules_type_check` database constraint), and updated `deleteSchedule` to delete from both `schedules` and `events` tables in parallel. `schedule/page.tsx`: Updated page component to query both `schedules` and `events` tables in parallel, normalize the event date structures, and pass the combined schedules list to the Schedule client calendar view. `AttendanceClient.tsx`: Added attendance deletion features including a "Clear Attendance" button to delete all daily logs for a course/date, and individual student record delete actions in the History tab. Updated the Daily Attendance page (`page.tsx` and `AttendanceClient.tsx`) to fetch `course_id` for batches and dynamically filter the Batch select options based on the chosen Course, resetting batch selection on course change. Added "Calendar & Events" page sidebar link in `layout.tsx` and LMS Dashboard utility link in `lms/page.tsx` to enable admin calendar access. |
| 2026-07-09 | `StudentIdCardModal.tsx`: Corrected a style color typo (`text-slate-505` to `text-slate-500`) in the helper text. Cleaned the modal layout by removing the Print button, individual Front/Back PDF buttons, the live card preview, the help alert box, and other editor sections (branding, details, toggles). Replaced the full-screen window with a compact centered modal dialog card (`max-w-md`), containing the Theme selector and the "Download Combined PDF" button. Fixed a compile error by removing an extra closing div tag at the bottom of the file. Resolved the viewport scrolling issue by replacing `justify-center` on the scrollable container and using `my-auto` margins on the inner contents. Changed the top header title from "ID Card Design Studio v2.0" to "ID Card". Added a custom Theme 4 ("Black & Orange Waves") featuring a soft orange top-left wave, a large soft orange circle at the top-right (changed from dark black to `#ffeada` to avoid overlap and provide readable contrast for black text), and dotted/solid orange semicircles at the bottom-right on the front side (removing the default top-left dots pattern, the front QR/barcode, and the lanyard slot, shifting student details down to y=695, moving the institute logo to the top-left at x=45 with size=140 and y=20, left-aligning the institute name next to the logo starting at x=210 and y=80/120, removing the border and shifting the "Student ID Card" text label higher to y=165 with font size=18px, shifting the profile photo higher to y=365, increasing the profile photo radius to 150, shifting name to y=555 and course pill to y=575, and setting all student details labels to pure black `#000000` for clear visibility), enabling high-quality image smoothing (`ctx.imageSmoothingQuality = "high"`) for sharp logo rendering, and a centered charcoal QR code (`color=1e1e24`) for scanning compatibility, 6 orange gradient blocks, and left-aligned orange Terms & Conditions title and points starting at x=59 on the back side canvas (removing the back side dots pattern and lanyard slot). |
| 2026-07-29 | `page.tsx` (students), `StudentTable.tsx`: Integrated student LMS active study time tracking (`student_daily_activity`), lesson progress (`lesson_progress`), and quiz attempts (`test_results`) directly into the Admin Manage Students dashboard list. Mapped stats on the server and added a new "LMS Progress" column to the table displaying daily active study time (e.g. `2h 15m active`), completed lessons count, and quiz results badge. Added a beautiful "Quiz & Test Results" modal popup displaying student quiz scores, passing status, percentage bars, and completion dates. Fully supported mobile layout responsive rendering. |
| 2026-08-18 | Renamed "Assignments" page, route, client components, and utility links to "Projects" / `/admin/lms/projects`. Left DB schema (`assignments`/`submissions` tables) intact to prevent breaking downstream data relations. |
| 2026-08-21 | `ProjectsClient.tsx`: Converted feedback textarea to text input and added dropdown datalist suggestion options for Score/Grade and Feedback fields. |

---

## HOW TO USE

- **Session start**: Sirf yahi file padho â€” project scan skip karo
- **Nayi feature**: Structure + Audit Log update karo
- **Schema change**: Section 4 update karo
- **Naya component**: Section 7 me add karo
- **Changes audit**: `git diff --stat HEAD` chala ke BRAIN se compare karo

---

## 📋 AUDIT UPDATE (2026-10-01) — GSD Core Session

### Newly Documented Features (were in code, not in brain):

| Feature | Route | Status |
|---------|-------|--------|
| **Expenses Module** | `/admin/(lms)/expenses/` | ✅ Working — tracks institute expenses |
| **LMS Progress Page** | `/admin/lms/progress/` | ✅ Working — individual student progress view |
| **Admin Delete & Message API** | `/api/admin/delete/` | ✅ Working — secure deletion & message handling for contacts/admissions |
| **Web Chats Client** | `/admin/(web)/chats/` | ✅ Working — real-time web inquiry & message management |
| **Unauthorized Fallback** | `/unauthorized/` | ✅ Working — role-based protection redirect screen |

> Updated by: GSD Core cross-project sync & audit session
