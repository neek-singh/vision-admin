import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vision IT Computer Institute',
    short_name: 'Vision IT',
    description: 'Enterprise Institute Administration & Vision Learn LMS Platform.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'portrait-primary',
    dir: 'ltr',
    lang: 'en-IN',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Attendance Scanner',
        short_name: 'Attendance',
        description: 'Launch student QR check-in camera scanner',
        url: '/lms/attendance',
        icons: [{ src: '/icons/shortcuts/attendance.png', sizes: '96x96' }],
      },
      {
        name: 'Fee Counter',
        short_name: 'Fees',
        description: 'Collect student fee payment and print receipt',
        url: '/fees',
        icons: [{ src: '/icons/shortcuts/fees.png', sizes: '96x96' }],
      },
      {
        name: 'Student Directory',
        short_name: 'Students',
        description: 'Lookup student profile and contact details',
        url: '/students',
        icons: [{ src: '/icons/shortcuts/students.png', sizes: '96x96' }],
      },
      {
        name: 'Student LMS Portal',
        short_name: 'LMS',
        description: 'Access student curriculum, study notes, and tests',
        url: '/student/dashboard',
        icons: [{ src: '/icons/shortcuts/lms.png', sizes: '96x96' }],
      },
    ],
  };
}
