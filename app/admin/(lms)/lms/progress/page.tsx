import { createServerSupabaseClient } from "@/lib/supabase-server";
import ProgressTable from "@/components/lms/progress/ProgressTable";

export const unstable_instant = false;

export default async function LMSProgressPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch students & enrollments
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select(`
      *,
      enrollments(
        id,
        batch,
        courses(id, title, course_code)
      )
    `)
    .order("name", { ascending: true });

  if (studentsError) {
    console.error("Error fetching students:", studentsError);
  }

  // 2. Fetch modules
  const { data: modules } = await supabase
    .from("lms_modules")
    .select("id, course_id");

  // 3. Fetch lessons
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, module_id, lesson_type")
    .eq("status", "published");

  // 4. Fetch user progress
  const { data: progressData } = await supabase
    .from("user_progress")
    .select("user_id, lesson_id, completed, created_at")
    .eq("completed", true);

  // 5. Fetch active study time
  const { data: activityData } = await supabase
    .from("student_daily_activity")
    .select("student_id, active_seconds, updated_at");

  // 6. Fetch all tests/quizzes
  const { data: testsData } = await supabase
    .from("tests")
    .select("id, course_id");

  // 7. Fetch quiz/test results per student with test course_id
  const { data: quizData } = await supabase
    .from("test_results")
    .select(`
      student_id,
      score,
      total_questions,
      test_id,
      tests (
        course_id
      )
    `);

  // Map module to course
  const moduleToCourseMap: Record<string, string> = {};
  modules?.forEach(m => {
    moduleToCourseMap[m.id] = m.course_id;
  });

  // Count non-MCQ lessons and MCQ lessons (quizzes) per course
  const courseLessonsCountMap: Record<string, number> = {};
  const courseQuizzesCountMap: Record<string, number> = {};

  lessons?.forEach(l => {
    const courseId = moduleToCourseMap[l.module_id];
    if (courseId) {
      if (l.lesson_type === "mcq") {
        courseQuizzesCountMap[courseId] = (courseQuizzesCountMap[courseId] || 0) + 1;
      } else {
        courseLessonsCountMap[courseId] = (courseLessonsCountMap[courseId] || 0) + 1;
      }
    }
  });

  // Add standalone tests to courseQuizzesCountMap
  testsData?.forEach(t => {
    if (t.course_id) {
      courseQuizzesCountMap[t.course_id] = (courseQuizzesCountMap[t.course_id] || 0) + 1;
    }
  });

  // Map lesson to course and lesson type
  const lessonToCourseMap: Record<string, string> = {};
  const lessonTypeMap: Record<string, string> = {};
  lessons?.forEach(l => {
    const courseId = moduleToCourseMap[l.module_id];
    if (courseId) {
      lessonToCourseMap[l.id] = courseId;
      lessonTypeMap[l.id] = l.lesson_type || "video";
    }
  });

  // Map completed lessons and completed quizzes per student per course
  const completedLessonsMap: Record<string, Record<string, number>> = {};
  const completedQuizzesMap: Record<string, Record<string, number>> = {};

  progressData?.forEach(p => {
    const studentId = p.user_id;
    const courseId = lessonToCourseMap[p.lesson_id];
    const type = lessonTypeMap[p.lesson_id];
    
    if (studentId && courseId) {
      if (type === "mcq") {
        if (!completedQuizzesMap[studentId]) {
          completedQuizzesMap[studentId] = {};
        }
        completedQuizzesMap[studentId][courseId] = (completedQuizzesMap[studentId][courseId] || 0) + 1;
      } else {
        if (!completedLessonsMap[studentId]) {
          completedLessonsMap[studentId] = {};
        }
        completedLessonsMap[studentId][courseId] = (completedLessonsMap[studentId][courseId] || 0) + 1;
      }
    }
  });

  // Track completed unique tests from test_results
  const completedTestsSet: Record<string, Record<string, Set<string>>> = {};
  quizData?.forEach(q => {
    const studentId = q.student_id;
    const courseId = (q.tests as any)?.course_id;
    const testId = q.test_id;
    if (studentId && courseId && testId) {
      if (!completedTestsSet[studentId]) {
        completedTestsSet[studentId] = {};
      }
      if (!completedTestsSet[studentId][courseId]) {
        completedTestsSet[studentId][courseId] = new Set();
      }
      completedTestsSet[studentId][courseId].add(testId);
    }
  });

  // Track last active timestamp per student
  const lastActiveMap: Record<string, string> = {};
  activityData?.forEach(row => {
    if (row.student_id && row.updated_at) {
      const existing = lastActiveMap[row.student_id];
      if (!existing || new Date(row.updated_at) > new Date(existing)) {
        lastActiveMap[row.student_id] = row.updated_at;
      }
    }
  });
  progressData?.forEach(row => {
    if (row.user_id && row.created_at) {
      const existing = lastActiveMap[row.user_id];
      if (!existing || new Date(row.created_at) > new Date(existing)) {
        lastActiveMap[row.user_id] = row.created_at;
      }
    }
  });

  // Aggregate active seconds per student
  const activeTimeMap: Record<string, number> = {};
  activityData?.forEach(row => {
    if (row.student_id) {
      activeTimeMap[row.student_id] = (activeTimeMap[row.student_id] || 0) + (row.active_seconds || 0);
    }
  });

  // Flat list of progress records per student enrollment
  const progressRecords: any[] = [];
  const uniqueCourses = new Map<string, { id: string; title: string; course_code: string }>();

  // Target active study time (e.g. 5 hours = 18000 seconds)
  const TARGET_STUDY_SECS = 5 * 3600;

  (students || []).forEach(student => {
    student.enrollments?.forEach((enrollment: any) => {
      const course = enrollment.courses;
      if (!course) return;

      if (!uniqueCourses.has(course.id)) {
        uniqueCourses.set(course.id, {
          id: course.id,
          title: course.title,
          course_code: course.course_code
        });
      }

      const courseId = course.id;
      
      // Lessons progress (non-MCQ)
      const completed = completedLessonsMap[student.id]?.[courseId] || 0;
      const total = courseLessonsCountMap[courseId] || 0;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Active study time
      const activeSeconds = activeTimeMap[student.id] || 0;
      const studyTimeProgress = Math.min(Math.round((activeSeconds / TARGET_STUDY_SECS) * 100), 100);

      // Quizzes progress (MCQ lessons + test results)
      const completedQuizzes = (completedQuizzesMap[student.id]?.[courseId] || 0) + (completedTestsSet[student.id]?.[courseId]?.size || 0);
      const totalQuizzes = courseQuizzesCountMap[courseId] || 0;
      const quizProgressPercent = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;

      const lastActive = lastActiveMap[student.id] || null;

      // Status logic
      let status = "On Track";
      if (progressPercent === 100) {
        status = "Completed";
      } else if (!lastActive) {
        status = "At Risk";
      } else {
        const daysSinceActive = (new Date().getTime() - new Date(lastActive).getTime()) / (1000 * 3600 * 24);
        if (daysSinceActive > 7) {
          status = "At Risk";
        } else if (daysSinceActive > 3 || (progressPercent < 5 && activeSeconds > 0)) {
          status = "Slow Progress";
        }
      }

      progressRecords.push({
        id: `${student.id}-${courseId}`,
        studentId: student.student_id || student.id.slice(0, 8),
        name: student.name,
        email: student.email || "no-email@visionit.com",
        phone: student.phone || "No phone",
        courseName: course.title,
        courseCode: course.course_code,
        progress: progressPercent,
        completedLessons: completed,
        totalLessons: total,
        activeSeconds,
        studyTimeProgress,
        quizzesDone: completedQuizzes,
        totalQuizzes,
        quizProgress: quizProgressPercent,
        lastActive,
        status
      });
    });
  });

  const availableCoursesList = Array.from(uniqueCourses.values());

  // Aggregate stats
  const totalCompleted = progressRecords.filter(r => r.status === "Completed").length;
  // Active in last 48 hours
  const activeNowCount = progressRecords.filter(r => {
    if (!r.lastActive) return false;
    const hrs = (new Date().getTime() - new Date(r.lastActive).getTime()) / (1000 * 3600);
    return hrs <= 48;
  }).length;
  const atRiskCount = progressRecords.filter(r => r.status === "At Risk").length;

  const stats = {
    totalCompleted,
    activeNowCount,
    atRiskCount
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProgressTable 
        initialRecords={progressRecords} 
        availableCourses={availableCoursesList}
        stats={stats}
      />
    </div>
  );
}
