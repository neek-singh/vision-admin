const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const filesToDelete = [
  'app/actions/admin.ts',
  'app/actions/admissions.ts',
  'app/actions/auth.ts',
  'app/actions/batches.ts',
  'app/actions/blogs.ts',
  'app/actions/contact.ts',
  'app/actions/courses.ts',
  'app/actions/fees.ts',
  'app/actions/gallery.ts',
  'app/actions/notifications.ts',
  'app/actions/push.ts',
  'app/actions/schedule.ts',
  'app/actions/stats.ts',
  'app/actions/student-auth.ts',
  'proxy.ts',
  'check_lessons.ts',
  'check_mannu.js',
  'check_mannu.ts',
  'check_modules.ts',
  'deep_diag.js',
  'deep_diag_fixed.js',
  'scratch_check_courses_cols.js',
  'scratch_check_db.ts',
  'scratch_check_enrollment.ts',
  'scratch_check_lessons.ts',
  'scratch_check_lessons_cols.js',
  'scratch_check_lms_tables.ts',
  'scratch_check_materials_cols.js',
  'scratch_check_schema.ts',
  'scratch_check_schema_standalone.ts',
  'scratch_check_tests_cols.js',
  'scratch_check_tests_cols.ts',
  'scratch_check_types.js',
  'scratch_inspect_db.js',
  'scratch_inspect_db.ts',
  'scratch_list_tables.ts',
  'temp_test.txt',
  'test_public.js',
];

const dirsToDelete = [
  'app/admin/admissions',
  'app/admin/batches',
  'app/admin/blogs',
  'app/admin/contacts',
  'app/admin/courses',
  'app/admin/fees',
  'app/admin/gallery',
  'app/admin/lms',
  'app/admin/marks',
  'app/admin/notifications',
  'app/admin/schedule',
  'app/admin/stats',
  'app/admin/students',
  'app/admin/users',
  'components/admin',
  'components/student',
];

console.log('--- Cleaning Up Old Files & Directories ---');

filesToDelete.forEach(fileRel => {
  const fullPath = path.join(rootDir, fileRel);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`Deleted file: ${fileRel}`);
    } catch (err) {
      console.error(`Failed to delete file ${fileRel}:`, err.message);
    }
  } else {
    console.log(`File does not exist: ${fileRel}`);
  }
});

dirsToDelete.forEach(dirRel => {
  const fullPath = path.join(rootDir, dirRel);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`Deleted directory: ${dirRel}`);
    } catch (err) {
      console.error(`Failed to delete directory ${dirRel}:`, err.message);
    }
  } else {
    console.log(`Directory does not exist: ${dirRel}`);
  }
});

console.log('--- Cleanup Finished ---');
