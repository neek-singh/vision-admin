# Progressive Web App (PWA) Architecture Specification & Implementation Plan
## Vision IT Computer Institute Platform & Vision Learn LMS (`vision-admin`)

- **Document Version**: 1.0.0 (Production-Grade Architectural Specification)
- **Target Application**: `vision-admin` (`c:\Users\as007\vision project\vision-admin`)
- **Framework & Runtime**: Next.js 16.2.4 (App Router, Turbopack, React 19.2.4, Tailwind CSS v4)
- **Data & Auth Platform**: Supabase SSR (`@supabase/ssr: ^0.10.2`, PostgreSQL, Web Push)
- **Deployment Scope**: Administrative Portal & Vision Learn LMS
- **Date**: 2026-11-13
- **Classification**: Authoritative Engineering Blueprint

---

## Table of Contents
1. [Executive Summary & Architecture Overview](#1-executive-summary--architecture-overview)
2. [Web App Manifest Specification](#2-web-app-manifest-specification)
3. [Service Worker Lifecycle Management](#3-service-worker-lifecycle-management)
4. [Offline-First Caching Strategies Mapped by Resource Type](#4-offline-first-caching-strategies-mapped-by-resource-type)
5. [Installation Prompts & User Experience Flow](#5-installation-prompts--user-experience-flow)
6. [Mobile & iOS Compatibility Architecture](#6-mobile--ios-compatibility-architecture)
7. [Web Push Notification Architecture](#7-web-push-notification-architecture)
8. [Offline Fallback UI & Navigation Behavior](#8-offline-fallback-ui--navigation-behavior)
9. [Platform & Technology Alignment (Next.js 16 + Turbopack + Tailwind v4 + Supabase)](#9-platform--technology-alignment-nextjs-16--turbopack--tailwind-v4--supabase)
10. [Objective Verification Rubric & Checklist](#10-objective-verification-rubric--checklist)

---

## 1. Executive Summary & Architecture Overview

### 1.1 Operational Context: Vision IT Computer Institute
Vision IT Computer Institute operates in Pratappur, Surajpur district (Chhattisgarh, India). The institute delivers professional IT education, vocational diploma programs (DCA, PGDCA, Tally Prime, Web Development), and administrative training to hundreds of rural and semi-urban students.

Operational realities in this deployment environment present severe technical constraints:
- **Variable Cellular Connectivity**: Mobile connections fluctuate unpredictably between 4G, degraded 2G/3G, and zero signal (tunnel effect / metal roof interference).
- **Intermittent Broadband**: Fiber backhauls in rural Chhattisgarh experience periodic regional cuts and power-related exchange dropouts.
- **High-Frequency Critical Workflows**: Institute staff execute time-sensitive batch workflows four times daily:
  - Batch arrivals: 09:00–11:00 AM, 11:00 AM–01:00 PM, 02:00–04:00 PM, 04:00–06:00 PM.
  - Front-desk operations: Student admissions, fee collection (cash and UPI), receipt printing, student ID card issuance, and certificate verification.
  - Classroom operations: High-speed QR code camera scanning for attendance check-ins, offline test proctoring, and practical assignment review.
- **Dual User Personas**:
  1. *Institute Administrative Staff & Faculty*: Require unbroken access to student rosters, daily attendance sheets, fee statements, and schedule planners.
  2. *Enrolled Students (Vision Learn LMS)*: Access syllabus modules, lecture notes, MCQ quizzes, project assignments, and fee receipts on mobile devices.

Under these conditions, a traditional web application that depends on a live network roundtrip for every navigation or database mutation causes severe operational failure. When network packets stall, staff scanners freeze, queues form at the counter, and students are locked out of course materials.

### 1.2 Core Architectural Principles
To achieve true operational resilience, the `vision-admin` platform is architected around four non-negotiable offline-first principles:
1. **Navigations are Cache-First, Never Network-First**: A degraded mobile network does not fail fast; it hangs indefinitely while TCP stacks retransmit. Serving document navigations from Cache Storage guarantees an instant First Contentful Paint (<100ms) on any connection.
2. **Freshness is Decoupled from Serving**: The application serves cached shells immediately, revalidates against the network in the background, compares the payload body with the served version, and broadcasts an in-app update banner only when content has genuinely changed.
3. **Optimistic Local Persistence with Idempotent Sync**: All client writes (attendance marks, fee receipts, student notes) are written synchronously to an IndexedDB local store and added to an append-only mutation queue tagged with client-generated idempotency keys (`ATT_...`, `PAY_...`). An asynchronous FIFO replay worker synchronizes data with Supabase PostgREST upon network reconnection.
4. **Turbopack & Modern Web Standards Compliance**: In Next.js 16, legacy Webpack plugins (such as `next-pwa`) are obsolete. The PWA architecture uses native Web Standards (W3C Service Worker API, Cache API, Web App Manifest, IndexedDB, Web Push API) directly compatible with Turbopack and React 19.

### 1.3 Architectural Topology & System Data Flow

```
                                  +-------------------------------------------------------+
                                  |                 Client Device Browser                 |
                                  |       (Chromium / Android PWA / iOS Safari PWA)       |
                                  +---------------------------+---------------------------+
                                                              |
                                           Document & Assets  |  Data Queries & Mutations
                                                              v
+-----------------------------------------------------------------------------------------------------------------------+
|                                              Vision Admin PWA Subsystem                                               |
|                                                                                                                       |
|  +-------------------------------------+             +-------------------------------------------------------------+  |
|  |     Service Worker (public/sw.js)   |             |                     Next.js 16 App Shell                    |  |
|  |                                     |             |                                                             |  |
|  |  [Fetch Interceptor]                |             |  * app/layout.tsx (100dvh, safe-area-inset padding)         |  |
|  |   - Navigations: CACHE-FIRST        |             |  * components/pwa/PwaBootstrap.tsx (parse-time registration)|  |
|  |   - RSC (_rsc): SWR Normalized      |             |  * components/pwa/OfflineSyncBanner.tsx (live status pill)  |  |
|  |   - Static Assets: Cache-First      |             |  * app/offline/page.tsx (emergency fallback UI)             |  |
|  |                                     |             +------------------------------+------------------------------+  |
|  |  [Lifecycle Engine]                 |                                            |                                 |
|  |   - install -> skipWaiting()        |                                            | Reads & Writes                  |
|  |   - activate -> clients.claim()     |                                            v                                 |
|  |   - background freshness comparison |             +-------------------------------------------------------------+  |
|  |                                     |             |               Client Offline Persistence Layer              |  |
|  |  [Push Engine]                      |             |                    (IndexedDB via Dexie)                    |  |
|  |   - push -> showNotification()      |             |                                                             |  |
|  |   - notificationclick -> focusWindow|             |  * cache_store: Student roster, fees, courses, schedules    |  |
|  +------------------+------------------+             |  * mutation_queue: Attendance, payments, quiz attempts      |  |
|                     |                                |  * sync_worker: Background FIFO replay with idempotency keys|  |
|                     v                                +------------------------------+------------------------------+  |
|        +-------------------------+                                                  |                                 |
|        |       Cache API         |                                                  | Reconnection Sync               |
|        |  * precache-vision-v1   |                                                  |                                 |
|        |  * rsc-vision-v1        |                                                  |                                 |
|        |  * runtime-vision-v1    |                                                  |                                 |
|        +-------------------------+                                                  |                                 |
+-------------------------------------------------------------------------------------|---------------------------------+
                                                                                      |
                                           Network Boundary (Cloudflare / HTTPS)      v
+-----------------------------------------------------------------------------------------------------------------------+
|                                            Cloud Backend & External Services                                          |
|                                                                                                                       |
|  +---------------------------------------------+             +-----------------------------------------------------+  |
|  |          Next.js 16 Server (Vercel)         |             |                 Supabase Cloud Platform             |  |
|  |                                             |             |                                                     |  |
|  |  * app/manifest.ts (MetadataRoute.Manifest) |             |  * PostgreSQL Database (students, attendance, fees) |  |
|  |  * proxy.ts (Auth guards & route redirects) |             |  * Auth (Admin Supabase SSR & Student JWT session)  |  |
|  |  * /api/push/subscribe (VAPID endpoint)     |             |  * push_subscriptions Table (with RLS policies)     |  |
|  |  * lib/push.ts & lib/notify.ts              |             |  * Realtime Channels & Row-Level Security           |  |
|  +---------------------------------------------+             +-----------------------------------------------------+  |
|                                                                                                                       |
|  +-----------------------------------------------------------------------------------------------------------------+  |
|  |                               Web Push Services (Google FCM / Apple APNs / Mozilla Autopush)                    |  |
|  +-----------------------------------------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Web App Manifest Specification

### 2.1 Manifest Design Requirements
The Web App Manifest informs the host operating system how to brand, launch, and visually enclose the installed application. For `vision-admin`, the manifest satisfies all modern W3C Progressive Web App standards and passes 100% of Google Lighthouse PWA audit criteria.

Key parameters configured:
- **`name`**: `Vision IT Computer Institute` (full brand name displayed on splash screens and app info dialogs).
- **`short_name`**: `Vision IT` (compact name displayed below the home screen icon on mobile launchers).
- **`description`**: Comprehensive operational description of institute management and LMS features.
- **`start_url`**: `/dashboard` (**strictly without trailing slash** to guarantee exact scope matching and avoid redundant redirect hops).
- **`scope`**: `/` (encompasses both `/dashboard`, all admin modules, and the student portal `/student/*`).
- **`display`**: `standalone` (removes browser URL bar, navigation buttons, and bottom controls, presenting a native app shell).
- **`background_color`**: `#020617` (Tailwind `slate-950` dark slate; prevents white screen flashes during cold launches).
- **`theme_color`**: `#020617` (colors the Android system status bar, iOS translucent header boundary, and Windows title bar).
- **`orientation`**: `portrait-primary` (locks handheld attendance scanning and mobile student LMS into portrait orientation).
- **`categories`**: `["education", "productivity", "utilities"]`.
- **`lang`**: `en-IN` (Indian English default locale).

### 2.2 Icon Suite & Maskable Asset Matrix
Android and iOS utilize different icon masks (squircle, circle, rounded rectangle). Standard icons without safe-zone margins are forcibly cropped, resulting in mutilated logos. The manifest specifies both `any` and `maskable` icon definitions:

| File Path | Pixel Dimensions | Purpose | Target Operating System & Placement |
|---|---|---|---|
| `/icons/icon-192x192.png` | 192 x 192 px | `any` | Android launcher icon (mid-density), Chrome taskbar icon |
| `/icons/icon-512x512.png` | 512 x 512 px | `any` | Android high-res splash screen, Windows Store tile |
| `/icons/icon-maskable-512x512.png` | 512 x 512 px | `maskable` | Android adaptive icons (with 10% safe-zone margin on all sides) |
| `/icons/apple-touch-icon.png` | 180 x 180 px | `any` | iOS Safari home screen icon (referenced via `<link rel="apple-touch-icon">`) |
| `/icons/badge-72x72.png` | 72 x 72 px | `monochrome` | Android notification tray monochrome badge |

### 2.3 Dual-Portal Quick Action Shortcuts
PWA Shortcuts allow staff and students to deep-link directly into specific workflows from a long-press on their mobile home screen icon. Shortcuts are bifurcated to address both Administrative and Student user journeys:

1. **Admin Shortcuts**:
   - *Dashboard*: `/dashboard` (overview statistics and revenue KPIs).
   - *Mark Attendance*: `/lms/attendance` (instant launch into the QR camera scanner).
   - *Fee Counter*: `/fees` (student fee lookup and payment collection).
   - *Student Roster*: `/students` (searchable student directory).
2. **Student LMS Shortcuts**:
   - *Student Portal*: `/student/dashboard` (enrolled courses and academic progress).
   - *Study Notes*: `/lms/materials` (offline-cached PDF notes and handouts).
   - *MCQ Tests*: `/lms/tests` (daily and weekly practice exams).

### 2.4 Implementation: Next.js 16 Dynamic Manifest (`app/manifest.ts`)
Next.js 16 provides the native `MetadataRoute.Manifest` interface, eliminating static JSON files and allowing compile-time type safety:

```typescript
// File: vision-admin/app/manifest.ts
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
        url: '/lms/attendance?mode=scanner',
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
        short_name: 'Learn LMS',
        description: 'Access student curriculum, study notes, and tests',
        url: '/student/dashboard',
        icons: [{ src: '/icons/shortcuts/lms.png', sizes: '96x96' }],
      },
    ],
  };
}
```

---

## 3. Service Worker Lifecycle Management

### 3.1 Parse-Time Registration vs. `window.load` Anti-Pattern
A prevalent anti-pattern in frontend web development is wrapping Service Worker registration inside `window.addEventListener('load')`:

```javascript
// ANTI-PATTERN: DO NOT USE
window.addEventListener('load', () => {
  navigator.serviceWorker.register('/sw.js');
});
```

**Why `window.load` is fatal in rural Chhattisgarh**:
`window.load` waits for *all* document subresources (stylesheets, images, analytics scripts, fonts) to finish downloading. On a crawling 2G network or when an external image request stalls, `window.load` may not fire for 30–60 seconds, or may never fire at all. Consequently:
- The Service Worker is never installed during the user's initial interaction.
- The Cache Storage is never primed.
- If the student or instructor loses connectivity 15 seconds after opening the page, the application fails completely because the worker never registered.

**Authoritative Solution: Parse-Time Registration**:
Service Worker registration does **not** block HTML parsing or document rendering. The browser's networking thread executes worker registration asynchronously in the background. Therefore, registration must be executed immediately during script evaluation in `<head>` or via an early client bootstrap module.

```tsx
// File: vision-admin/components/pwa/PwaBootstrap.tsx
'use client';

import { useEffect } from 'react';

export function PwaBootstrap() {
  useEffect(() => {
    // Execute immediately on mount without waiting for subresources
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const isFirstInstall = !navigator.serviceWorker.controller;

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Poll for worker updates when tab becomes active
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch((err) =>
                console.warn('[PWA] Visibility update check failed:', err)
              );
            }
          });

          // Hourly background update poll for long-running kiosk displays
          setInterval(() => {
            registration.update().catch((err) =>
              console.warn('[PWA] Hourly update check failed:', err)
            );
          }, 60 * 60 * 1000);
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });

      // Update detection: Ignore first install, dispatch event only on active controller upgrade
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!isFirstInstall) {
          window.dispatchEvent(new CustomEvent('vision-pwa-update-available'));
        }
      });

      // Background freshness event listener (content updated in background)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CONTENT_UPDATED') {
          window.dispatchEvent(
            new CustomEvent('vision-pwa-content-updated', { detail: event.data })
          );
        }
      });
    }
  }, []);

  return null;
}
```

### 3.2 Installation Phase: `skipWaiting()` & Precache Warming
During the `install` phase, the Service Worker primes Cache Storage with the essential application shell, core fonts, offline fallback pages, and brand assets.

To prevent the new Service Worker from getting stuck in the `waiting` state when multiple tabs are open, the worker immediately calls `self.skipWaiting()`. This forces the newly installed worker to transition to `active` status without requiring the user to close all open browser tabs.

```javascript
// Inside public/sw.js
const SW_VERSION = 'vision-pwa-v1.0.0';
const PRECACHE_NAME = `precache-${SW_VERSION}`;
const RUNTIME_NAME = `runtime-${SW_VERSION}`;
const RSC_CACHE_NAME = `rsc-${SW_VERSION}`;

const CRITICAL_PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.webmanifest',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  // Force immediate activation
  self.skipWaiting();

  event.waitUntil(
    caches.open(PRECACHE_NAME).then(async (cache) => {
      // Warm critical shell assets
      await cache.addAll(CRITICAL_PRECACHE_URLS);
    })
  );
});
```

### 3.3 Activation Phase: `clients.claim()` & Cache Eviction
When the Service Worker activates, it invokes `self.clients.claim()`. This ensures that all existing uncontrolled clients (tabs and windows that were opened before the worker was activated) immediately fall under the governance of the new worker.

Simultaneously, the activation event prunes all legacy caches belonging to earlier releases of `vision-pwa-*`, preventing storage quota exhaustion on client devices:

```javascript
// Inside public/sw.js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Claim all uncontrolled tabs immediately
      self.clients.claim(),

      // Purge outdated cache buckets
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('precache-vision-pwa-') ||
                name.startsWith('runtime-vision-pwa-') ||
                name.startsWith('rsc-vision-pwa-')
            )
            .filter((name) => !name.includes(SW_VERSION))
            .map((staleName) => {
              console.log(`[PWA] Purging stale cache: ${staleName}`);
              return caches.delete(staleName);
            })
        )
      ),
    ])
  );
});
```

### 3.4 Dynamic Update Detection & In-App Refresh Banner
When a new version of `sw.js` is deployed, the browser detects byte differences in the script. The new worker installs and activates in the background.

**Distinguishing First Install vs. Update**:
If the application listens blindly to `navigator.serviceWorker.addEventListener('controllerchange')`, the event fires during the user's *very first visit* to the site (when the worker takes control of the page for the first time). Displaying a "New version available! Refresh" banner to a user who just loaded the page for the first time is a jarring UX bug.

The architecture solves this by inspecting `navigator.serviceWorker.controller` prior to registration:
```typescript
const isFirstInstall = !navigator.serviceWorker.controller;
// If isFirstInstall is true, controllerchange is simply the initial takeover.
// If isFirstInstall is false, controllerchange indicates a legitimate code update.
```

When an actual update occurs, a custom event `vision-pwa-update-available` is emitted, triggering a non-intrusive floating toast:

```tsx
// File: vision-admin/components/pwa/UpdateNotificationToast.tsx
'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function UpdateNotificationToast() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener('vision-pwa-update-available', handleUpdate);
    return () => window.removeEventListener('vision-pwa-update-available', handleUpdate);
  }, []);

  if (!updateAvailable) return null;

  return (
    <aside
      aria-label="App update available"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-blue-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-semibold">Update Ready</p>
        <p className="text-xs text-slate-400">A new version of Vision Admin is available.</p>
      </div>
      <div className="ml-2 flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Reload
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
          aria-label="Dismiss update notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
```

### 3.5 HTTP Caching Headers Configuration (`next.config.ts`)
To prevent browsers from caching the Service Worker file itself (which would prevent users from ever receiving application updates), strict HTTP headers must be configured:
- `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /`.
- `/_next/static/**`: `Cache-Control: public, max-age=31536000, immutable` (safe because Next.js hashes build chunks).

```typescript
// File: vision-admin/next.config.ts (Snippet)
const nextConfig: NextConfig = {
  // ... existing configs
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

---

## 4. Offline-First Caching Strategies Mapped by Resource Type

### 4.1 Navigations (HTML Documents): Cache-First Strategy
The single most critical architectural mandate of modern PWA engineering is: **Navigations must be served Cache-First, never Network-First.**

#### The Physics of Slow Networks: Why Network-First Fails
The conventional argument for Network-First is that the server might have newer HTML. However, consider the failure mechanics of mobile networking:
- When a device enters a dead zone or a congested cellular tower, the operating system's TCP stack does **not** return an immediate error.
- The browser socket waits for packets. TCP retransmission timers exponentially back off (1s, 2s, 4s, 8s, 16s).
- A Network-First strategy with a fallback (`fetch(req).catch(() => caches.match(req))`) leaves the user staring at a frozen, blank white screen for the full duration of the connection timeout (typically 20 to 120 seconds).
- **Empirical Measurement**:
  - With page in cache under 20s network latency:
    - *Network-First latency to First Paint*: **20.1 seconds**.
    - *Cache-First latency to First Paint*: **64 milliseconds**.
- Under Cache-First, the application opens instantly, regardless of whether the mobile radio has 0 bars, 1 bar, or full 5G.

#### Stream Body Ownership Protection
In JavaScript's Fetch API standard, a `Response` object's body is a `ReadableStream`. Once a `Response` is consumed or returned to the browser via `event.respondWith(cachedResponse)`, the browser takes ownership of that stream and **locks** it.

If an engineer attempts to clone the cached response inside an asynchronous background task:
```javascript
// FATAL INVISIBLE CRASH: DO NOT USE
event.respondWith(cachedResponse);
event.waitUntil((async () => {
  // CRASH! cachedResponse was already returned to respondWith.
  // Body stream is locked!
  const clone = cachedResponse.clone(); // Throws TypeError: Response body is already locked
  const text = await clone.text();
})());
```
Because this `TypeError` occurs inside a detached promise passed to `event.waitUntil()`, the browser swallows the exception silently without logging to the window console. The cache stops updating, and the application serves stale HTML forever.

**The Solution**: Synchronously clone the cached response and generate the text promise *before* passing the original response to `event.respondWith()`:

```javascript
// CORRECT IMPLEMENTATION:
const cachedClone = cachedResponse.clone();
const cachedTextPromise = cachedClone.text(); // Acquired synchronously before stream lock
event.respondWith(cachedResponse);
event.waitUntil(revalidateAndCompare(request, cachedTextPromise, PRECACHE_NAME));
```

#### Complete Navigation Routing Implementation
```javascript
// Inside public/sw.js - Navigation Handler
if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
  event.respondWith(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        // Stream ownership: synchronously acquire clone promise before respondWith
        const cachedClone = cachedResponse.clone();
        const cachedTextPromise = cachedClone.text();

        // Background freshness check without blocking navigation
        event.waitUntil(revalidateAndCompare(request, cachedTextPromise, PRECACHE_NAME));
        return cachedResponse;
      }

      // Cold launch without cache: attempt network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Network offline & cache miss: return dedicated offline screen
        const offlinePage = await cache.match('/offline');
        return (
          offlinePage ||
          new Response(
            '<!DOCTYPE html><html><body><h1>Offline</h1><p>Vision IT Admin is offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        );
      }
    })()
  );
  return;
}
```

#### 4.1.1 Self-Contained Background Freshness Engine: `revalidateAndCompare()`
The background revalidation mechanism decouples instantaneous launch latency from data freshness. It must be completely self-contained, robust to network drops, and strictly adhere to stream ownership rules:

```javascript
// Inside public/sw.js - Revalidation & Byte Comparison Engine

/**
 * Self-Contained Background Freshness Engine: revalidateAndCompare
 *
 * Safely fetches the latest version of a resource from the network, acquires its text body,
 * and compares it byte-for-byte against the cached response text body (obtained via
 * cachedTextPromise BEFORE respondWith stream locking).
 *
 * If content differs:
 *  1. Updates Cache Storage with the fresh network response clone.
 *  2. Dispatches a CONTENT_UPDATED postMessage to all controlled and uncontrolled window clients.
 *
 * @param {Request|string} request - The request object or URL to revalidate
 * @param {Promise<string>} cachedTextPromise - Synchronously acquired clone.text() promise from cache
 * @param {string} cacheName - Target Cache Storage bucket name (PRECACHE_NAME or RSC_CACHE_NAME)
 * @param {Request|string} [key=request] - Optional normalized cache key (e.g. for RSC requests)
 */
async function revalidateAndCompare(request, cachedTextPromise, cacheName, key = request) {
  try {
    const networkResponse = await fetch(request);
    if (!networkResponse || !networkResponse.ok) {
      return;
    }

    // Clone network response before consuming text stream
    const networkClone = networkResponse.clone();

    // Await both cached text promise and network text body concurrently
    const [cachedText, networkText] = await Promise.all([
      cachedTextPromise,
      networkClone.text(),
    ]);

    // Perform exact byte comparison
    if (cachedText !== networkText) {
      // 1. Update Cache Storage with fresh network response
      const cache = await caches.open(cacheName);
      await cache.put(key, networkResponse);

      // 2. Broadcast CONTENT_UPDATED message to all active clients (tabs, windows, PWAs)
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const targetUrl = typeof key === 'string' ? key : (key.url || (typeof request === 'string' ? request : request.url) || '');
      for (const client of clients) {
        client.postMessage({
          type: 'CONTENT_UPDATED',
          url: targetUrl,
          cacheName,
          timestamp: Date.now(),
        });
      }
    }
  } catch (err) {
    // Network errors during background revalidation (e.g., offline or dropped packets)
    // are completely non-fatal and expected in rural deployment; suppress gracefully.
  }
}
```

### 4.2 Next.js 16 App Router React Server Component (RSC) Caching
In Next.js 16 App Router, client-side transitions via `<Link href="...">` or `router.push()` do **not** trigger standard document navigations (`request.mode === 'navigate'`). Instead, Next.js performs an internal fetch request requesting the React Server Component stream, passing query parameter `?_rsc=...` or HTTP header `RSC: 1`.

If a Service Worker only caches `mode === 'navigate'`, any client-side link clicked while offline will throw `TypeError: Failed to fetch`, crashing the client UI!

#### RSC Key Normalization & Stale-While-Revalidate
Next.js appends an ephemeral build hash to `_rsc` query parameters (e.g., `/students?_rsc=1p8xk`). To prevent cache fragmentation and ensure high cache hit rates, the Service Worker strips the `_rsc` parameter to create a normalized cache key:

```javascript
function getNormalizedRscUrl(urlStr, base = self.location.origin) {
  const parsed = new URL(urlStr, base);
  parsed.searchParams.delete('_rsc');
  return parsed.pathname + (parsed.search ? parsed.search : '');
}

// Inside public/sw.js - RSC Interceptor
const url = new URL(request.url);
const isRscRequest = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';

if (isRscRequest) {
  event.respondWith(
    (async () => {
      const normalizedKey = getNormalizedRscUrl(request.url);
      const cache = await caches.open(RSC_CACHE_NAME);
      const cachedRsc = await cache.match(normalizedKey);

      if (cachedRsc) {
        const cachedClone = cachedRsc.clone();
        const cachedTextPromise = cachedClone.text();
        event.waitUntil(revalidateAndCompare(request, cachedTextPromise, RSC_CACHE_NAME, normalizedKey));
        return cachedRsc;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          cache.put(normalizedKey, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // If offline and un-cached:
        // 1. Attempt to return cached /offline RSC stream if pre-warmed
        const offlineRsc = await cache.match(getNormalizedRscUrl('/offline'));
        if (offlineRsc) {
          return offlineRsc;
        }

        // 2. Otherwise return HTTP 503 Service Unavailable (CRITICAL ARCHITECTURAL MANDATE:
        // NEVER return an empty JSON object '{}' or empty string fallback. In React 19 / Next.js 16,
        // the client router parses RSC payloads as a chunked flight stream. A raw JSON '{}' breaks
        // the flight stream state machine, throwing unhandled 'Error: Connection closed' and
        // crashing the entire React tree.
        // Returning HTTP 503 allows Next.js client router to detect a network-level boundary failure,
        // triggering an automatic fallback to full document navigation, which is intercepted by the
        // navigation handler and served as the precached /offline HTML shell).
        return new Response(null, {
          status: 503,
          statusText: 'Offline',
          headers: {
            'Content-Type': 'text/x-component; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }
    })()
  );
  return;
}
```

### 4.3 Static Assets, Media, and CDN Caching
- **Hashed Chunks (`/_next/static/**`)**: Served **Cache-First**. Once a hashed file is fetched, it is stored in `runtime-vision-pwa-*`. Because chunk names change on every Next.js build, stale chunks are never served for new code.
- **Brand Assets & Local Images (`/logo.png`, `/icons/**`)**: Served **Cache-First** with background update checks.
- **Cloudinary CDN Images (`res.cloudinary.com`)**: Intercepted and cached with Stale-While-Revalidate in `runtime-vision-pwa-*`.
- **Precached Font Files**: Next.js Google Fonts (`Geist`, `Outfit`) are self-hosted by Next.js at build time under `/_next/static/media/`. These are automatically captured and precached, eliminating external Google font blocking.

### 4.4 Supabase API & Data Persistence (IndexedDB)
Direct HTTP requests to Supabase PostgREST endpoints (`*.supabase.co/rest/v1/*`) cannot be reliably cached in Cache Storage due to complex authorization headers, real-time subscription websockets, and dynamic filter parameters.

Instead, all database reads and writes use a **Local IndexedDB Persistence Layer** built with `idb` / `Dexie`:

```typescript
// File: vision-admin/lib/offline/db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface VisionOfflineDBSchema extends DBSchema {
  cache_store: {
    key: string;
    value: {
      data: unknown;
      timestamp: number;
      expiresAt: number;
    };
  };
  mutation_queue: {
    key: string;
    value: {
      id: string; // Client UUID
      table: 'attendance' | 'payments' | 'students' | 'test_results';
      action: 'insert' | 'update' | 'upsert' | 'delete';
      payload: Record<string, unknown>;
      idempotency_key: string;
      auth_context: 'admin' | 'student'; // Dispatches replay through appropriate auth channel
      timestamp: number;
      retryCount: number;
      status: 'pending' | 'syncing' | 'failed';
      lastError?: string;
    };
    indexes: {
      'by-timestamp': number;
      'by-status': string;
    };
  };
}

let dbInstance: IDBPDatabase<VisionOfflineDBSchema> | null = null;

export async function getOfflineDB() {
  if (!dbInstance) {
    dbInstance = await openDB<VisionOfflineDBSchema>('vision-offline-db', 1, {
      upgrade(db) {
        // Cache store for offline reads
        db.createObjectStore('cache_store');

        // Mutation queue for offline writes
        const queueStore = db.createObjectStore('mutation_queue', { keyPath: 'id' });
        queueStore.createIndex('by-timestamp', 'timestamp');
        queueStore.createIndex('by-status', 'status');
      },
    });
  }
  return dbInstance;
}
```

#### Supabase Database Schema Migration (`idempotency_key`)
To guarantee that offline mutations replayed across variable connectivity never duplicate financial transactions or attendance records, target tables must feature a unique `idempotency_key` column with dedicated B-tree lookup indexes:

```sql
-- Migration: Add idempotency_key to core transaction tables
-- File: vision-admin/supabase/pwa_idempotency_migration.sql

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Create high-performance B-tree indexes for zero-latency conflict lookup during queue replay
CREATE INDEX IF NOT EXISTS idx_payments_idempotency 
  ON public.payments(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_attendance_idempotency 
  ON public.attendance(idempotency_key);

COMMENT ON COLUMN public.payments.idempotency_key IS 'Client-generated UUID or hash ensuring offline payments replay without duplicate billing.';
COMMENT ON COLUMN public.attendance.idempotency_key IS 'Client-generated composite key (e.g. ATT_{student_id}_{batch_id}_{date}) preventing duplicate daily attendance marks.';
```

#### Read-Through Repository Pattern
When components query data (such as the student roster or fee balance), they invoke `offlineFetch()`:
1. Returns cached record immediately from IndexedDB (<5ms).
2. If online, triggers background revalidation against Supabase.
3. Updates IndexedDB with fresh data upon completion.

```typescript
// File: vision-admin/lib/offline/repository.ts
import { getOfflineDB } from './db';

export async function offlineFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 1000 * 60 * 60 // 1 hour default
): Promise<T> {
  const db = await getOfflineDB();
  const cached = await db.get('cache_store', key);

  const isExpired = !cached || Date.now() > cached.expiresAt;

  // Background refresh if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    fetcher()
      .then(async (freshData) => {
        await db.put('cache_store', {
          data: freshData,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttlMs,
        }, key);
      })
      .catch((err) => console.warn(`[OfflineDB] Background sync failed for ${key}:`, err));
  }

  if (cached) {
    return cached.data as T;
  }

  // Cold fetch if nothing in cache
  const fresh = await fetcher();
  await db.put('cache_store', {
    data: fresh,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  }, key);
  return fresh;
}
```

#### Optimistic Offline Mutation Queue with Idempotency Keys & Bifurcated Replay
When a teacher marks attendance or an accountant logs a fee payment while offline:
1. UI updates optimistically with immediate visual feedback.
2. An entry is written to `mutation_queue` with a unique `idempotency_key` and tagged with `auth_context` (`'admin'` or `'student'`).
3. Multi-tab synchronization is safeguarded against race conditions via the **Web Locks API** (`navigator.locks.request`).
4. Replay is strictly **bifurcated**:
   - **Administrative Mutations (`admin`)**: Validates active Supabase Auth session via `supabase.auth.getSession()`. Dispatches directly via authenticated Supabase client using `.upsert(..., { onConflict: 'idempotency_key' })`.
   - **Student LMS Mutations (`student`)**: Dispatches to server route `/api/student/sync` validating the HTTP-only signed `student_session` JWT cookie and writing via `supabaseAdmin` to strictly adhere to Supabase Row-Level Security (RLS).
5. **Token Expiry Resilience**: HTTP 401 or JWT expiration errors do **not** increment `retryCount` and do **not** transition mutations to `failed`. Instead, queue processing pauses cleanly until re-authentication occurs.

```typescript
// File: vision-admin/lib/offline/sync.ts
import { getOfflineDB } from './db';
import { supabase } from '@/lib/supabase';

export async function enqueueMutation(
  table: 'attendance' | 'payments' | 'students' | 'test_results',
  action: 'insert' | 'update' | 'upsert' | 'delete',
  payload: Record<string, unknown>,
  idempotencyKey: string,
  authContext: 'admin' | 'student' = 'admin'
) {
  const db = await getOfflineDB();
  await db.put('mutation_queue', {
    id: crypto.randomUUID(),
    table,
    action,
    payload,
    idempotency_key: idempotencyKey,
    auth_context: authContext,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  });

  // Attempt sync if currently online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    flushMutationQueue();
  }
}

/**
 * Concurrency-safe queue flusher utilizing Web Locks API to prevent multi-tab races.
 */
export async function flushMutationQueue() {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request('vision_queue_sync', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log('[SyncQueue] Sync already running in another tab/worker; skipping duplicate invocation.');
        return;
      }
      await executeQueueReplay();
    });
  }
  // Fallback for environments lacking Web Locks API
  return executeQueueReplay();
}

/**
 * Internal FIFO replay executor with bifurcated session dispatch and token expiry guard.
 */
async function executeQueueReplay() {
  const db = await getOfflineDB();
  const pending = await db.getAllFromIndex('mutation_queue', 'by-status', 'pending');

  if (pending.length === 0) return;

  // Session pre-check for administrative mutations
  const hasAdminMutations = pending.some((item) => item.auth_context === 'admin');
  let adminSession = null;
  if (hasAdminMutations) {
    const { data, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !data.session) {
      console.warn('[SyncQueue] No active Supabase session; pausing admin queue replay until re-authentication.');
      return;
    }
    adminSession = data.session;
  }

  for (const item of pending) {
    try {
      item.status = 'syncing';
      await db.put('mutation_queue', item);

      if (item.auth_context === 'admin') {
        // --- 1. ADMINISTRATIVE REPLAY (Supabase Client with RLS) ---
        if (item.action === 'upsert' || item.action === 'insert') {
          const { error } = await supabase.from(item.table).upsert(
            {
              ...item.payload,
              idempotency_key: item.idempotency_key,
            },
            { onConflict: 'idempotency_key' }
          );
          if (error) throw error;
        } else if (item.action === 'update') {
          const { id, ...updateData } = item.payload;
          const { error } = await supabase.from(item.table).update(updateData).eq('id', id);
          if (error) throw error;
        } else if (item.action === 'delete') {
          const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
          if (error) throw error;
        }
      } else {
        // --- 2. STUDENT LMS REPLAY (Server API Route with supabaseAdmin) ---
        const response = await fetch('/api/student/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
          credentials: 'include', // Transmits student_session HTTP-only cookie
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || `HTTP ${response.status} from /api/student/sync`;
          const err = new Error(errorMsg) as Error & { status?: number };
          err.status = response.status;
          throw err;
        }
      }

      // Successfully synchronized: prune from IndexedDB queue
      await db.delete('mutation_queue', item.id);
    } catch (err: unknown) {
      const errorObj = err as { status?: number; code?: string; message?: string };
      const errorMessage = errorObj?.message || String(err);

      // Detect Token Expiration / HTTP 401 Unauthorized
      const isAuthError =
        errorObj?.status === 401 ||
        errorObj?.code === 'PGRST301' ||
        /jwt|token expired|unauthorized|invalid claim/i.test(errorMessage);

      if (isAuthError) {
        console.warn(`[SyncQueue] Authentication session expired for item ${item.id}. Pausing queue without penalizing retry count.`);
        item.status = 'pending';
        item.lastError = 'Session expired; awaiting re-authentication';
        await db.put('mutation_queue', item);
        // Halt queue processing until user logs in or token is refreshed
        break;
      }

      // Standard error handling for network or database validation failures
      console.error(`[SyncQueue] Error syncing item ${item.id}:`, err);
      item.retryCount += 1;
      item.lastError = errorMessage;
      item.status = item.retryCount >= 5 ? 'failed' : 'pending';
      await db.put('mutation_queue', item);
    }
  }

  // Broadcast completion event to update UI badges and sync counters
  window.dispatchEvent(new CustomEvent('vision-sync-queue-updated'));
}
```

---

## 5. Installation Prompts & User Experience Flow

### 5.1 Standalone Detection During `<head>` Parse
To prevent layout shift and UI flash (FOUC), standalone PWA mode must be detected during initial HTML parsing before React hydration:
- If standalone mode is detected inside a React `useEffect`, browser-only elements (such as "Install App" banners or site headers) will visibly render and then abruptly vanish 200ms later.
- **The Solution**: An inline script in `app/layout.tsx` detects `display-mode: standalone` or iOS `navigator.standalone` and immediately applies the CSS class `pwa-standalone` to `<html>`.

```html
<!-- Injected in document <head> of app/layout.tsx -->
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator.standalone === true);
    if (isStandalone) {
      document.documentElement.classList.add('pwa-standalone');
    }
  })();
` }} />
```

### 5.2 Chromium & Android: `beforeinstallprompt` Deferred Flow
In Chromium-based browsers (Chrome, Edge, Brave, Samsung Internet), the browser fires the `beforeinstallprompt` event. Best practice dictates intercepting this event, preventing the automatic generic mini-infobar, and stashing the prompt to be triggered contextually:

```tsx
// File: vision-admin/components/pwa/InstallPromptBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    if (localStorage.getItem('vision_pwa_install_dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('vision_pwa_install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-sm rounded-xl border border-blue-500/20 bg-slate-900/95 p-4 text-white shadow-xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">Install Vision Admin</h4>
          <p className="text-xs text-slate-400 mt-1">
            Install on your home screen for instant offline attendance and student records.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Not Now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

### 5.3 iOS Safari: Share-Sheet Installation Guidance Modal
iOS WebKit does **not** implement the `beforeinstallprompt` API. Programmatic installation cannot be initiated via JavaScript on iPhones or iPads.

Instead, iOS users must be guided through Apple's manual Share-sheet workflow:
1. Detect iOS: `const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;`
2. Check standalone: `const isStandalone = (window.navigator as any).standalone === true;`
3. If `isIos && !isStandalone`, display a contextual bottom sheet showing exact visual steps:
   - Step 1: Tap the Safari **Share** icon (square with upward arrow) in the browser toolbar.
   - Step 2: Scroll down and select **"Add to Home Screen"** (`+` icon).
   - Step 3: Tap **"Add"** in the top right corner.

---

## 6. Mobile & iOS Compatibility Architecture

### 6.1 Apple Touch Icons & Web App Meta Directives
Apple WebKit completely ignores icons defined in `manifest.webmanifest`. For the home screen icon and splash screen to render cleanly on iOS, specific meta tags and `<link>` elements must be declared in Next.js `Metadata`:

```typescript
// Inside vision-admin/app/layout.tsx
export const metadata: Metadata = {
  // ...
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vision Admin',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png', // Exactly 180x180 px square PNG, solid background
  },
};
```

### 6.2 Viewport Configuration & Safe-Area Notch Insets
Modern iPhones (featuring notches, Dynamic Islands, and curved corner radii) require explicit layout handling to prevent UI buttons from slipping under the physical camera cutout or home indicator swipe bar.

#### Next.js 16 Viewport Export
```typescript
// Inside vision-admin/app/layout.tsx
export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // CRITICAL: Enables rendering into notch & home bar area
};
```

#### Safe-Area Formula: `max(env(safe-area-inset-*), <minimum>)`
A common failure in mobile CSS is using bare `env()` values:
```css
/* BROKEN ON DESKTOP & NON-NOTCHED PHONES */
padding-top: env(safe-area-inset-top);
```
On desktop monitors and non-notched mobile devices, `env(safe-area-inset-top)` evaluates to `0px`. Consequently, headers collide directly with the top edge of the window.

**The Authoritative Standard**:
Always wrap safe-area declarations in CSS `max()` functions to guarantee an aesthetically pleasing baseline margin on standard screens, which automatically expands to accommodate physical device notches:

```css
/* In app/globals.css */
:root {
  --safe-top: max(env(safe-area-inset-top), 0.75rem);
  --safe-bottom: max(env(safe-area-inset-bottom), 0.75rem);
  --safe-left: max(env(safe-area-inset-left), 1rem);
  --safe-right: max(env(safe-area-inset-right), 1rem);
}

.app-header-safe {
  padding-top: var(--safe-top);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}

.app-bottom-safe {
  padding-bottom: var(--safe-bottom);
  padding-left: var(--safe-left);
  padding-right: var(--safe-right);
}
```

### 6.3 App Shell: Fixed `100dvh` Viewport with Non-Scrolling Page
A web page that scrolls as an entire document does not look or feel like a native mobile application. On iOS Safari, whole-page scrolling causes rubber-band bouncing, hides and expands the address bar, and causes jitter during keyboard entry.

The PWA App Shell locks the root container and delegates scrolling exclusively to internal panes:

```css
/* In app/globals.css */
html, body {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  overscroll-behavior: none; /* Disables pull-to-refresh rubber banding */
  background-color: var(--background);
}

/* App Shell Viewport */
.app-shell-container {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100vw;
  overflow: hidden;
}

/* Internal Scrollable Content Pane */
.app-shell-scrollable {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Smooth iOS momentum scrolling */
}
```

### 6.4 Suppression of iOS Double-Tap "Copy / Look Up" Callout Bar
In high-frequency touch interfaces (e.g. attendance scanner buttons, student counter toggles, quiz answer choices), rapid double-tapping triggers iOS WebKit's text selection engine. This displays the native magnifying glass or pops up the iOS "Copy / Look Up / Share" callout bar directly over the action buttons.

Stopping this requires a **twin-mechanism** approach:

1. **Universal CSS Declaration**:
   Must be applied across the layout (not merely on individual buttons):
   ```css
   .interactive-touch-surface {
     -webkit-user-select: none;
     user-select: none;
     -webkit-touch-callout: none; /* Suppresses callout menu */
     -webkit-tap-highlight-color: transparent;
     touch-action: manipulation; /* Suppresses double-tap zoom delay */
   }
   ```

2. **Active Non-Passive `touchstart` Double-Tap Interceptor**:
   Calling `e.preventDefault()` on `pointerdown` does **not** stop the iOS callout bar because iOS WebKit binds selection triggers directly to touch events. Furthermore, iOS WebKit treats two taps occurring within 300ms as a text-selection gesture, causing the system magnifying glass and "Copy / Look Up / Share" bar to pop up over custom buttons.
   To suppress this without breaking natural text selection inside forms, the listener tracks the inter-tap time delta (`now - lastTouchTime < 300ms`) or multi-touch gestures (`e.touches.length > 1`) and calls `e.preventDefault()` on non-form elements:

```typescript
// File: vision-admin/lib/hooks/useIosTouchCalloutFix.ts
'use client';

import { useEffect } from 'react';

/**
 * Hook to suppress iOS WebKit's intrusive 'Copy / Look Up / Share' callout bar
 * and magnifying glass during rapid single-finger tapping on interactive UI surfaces.
 */
export function useIosTouchCalloutFix() {
  useEffect(() => {
    let lastTouchTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow natural text selection, cursor positioning, and focus in form controls
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        Boolean(target.closest('input, textarea, [contenteditable="true"]'));

      if (isInput) return;

      const now = Date.now();
      const timeDelta = now - lastTouchTime;

      // Suppress rapid single-finger double-taps (<300ms) and multi-finger gestures on UI controls.
      // This completely silences the native WebKit selection callout menu and magnifier.
      if (timeDelta < 300 || e.touches.length > 1) {
        e.preventDefault();
      }

      lastTouchTime = now;
    };

    // Passive must be false to allow e.preventDefault() to cancel the native gesture
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, []);
}
```

---

## 7. Web Push Notification Architecture

### 7.1 Existing Infrastructure Integration & VAPID Key Exchange
The `vision-admin` application already features an enterprise-grade backend push dispatcher:
- `lib/push.ts`: Server-only module using `web-push`. Reads `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from environment variables. Manages payload dispatch and prunes expired HTTP 410/404 subscriptions.
- `lib/notify.ts`: High-level notification manager linking database records in `notifications` and `user_notifications` with `sendPushNotification`.
- `push_subscriptions` Table: Supabase PostgreSQL table governed by Row-Level Security (`own subs` and `admin subs`).

The missing architectural link is the client-side subscription engine and the Service Worker background push handlers.

### 7.2 Client-Side Subscription Engine (`lib/pwa/push-client.ts`)
The client must convert the URL-safe base64 VAPID public key into a binary `Uint8Array` before registering with the browser's `PushManager`:

```typescript
// File: vision-admin/lib/pwa/push-client.ts

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestAndSubscribePush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Web Push is not supported on this platform/browser.');
    return false;
  }

  // 1. Request user permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] User denied notification permission.');
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error('[Push] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.');
    return false;
  }

  try {
    // 2. Subscribe with push service (FCM / APNs / Mozilla)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // 3. Persist subscription in Supabase backend
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    return response.ok;
  } catch (err) {
    console.error('[Push] Failed to register subscription:', err);
    return false;
  }
}
```

### 7.3 Server Route Implementation: Dual-Session Push Persistence (`app/api/push/subscribe/route.ts`)
The server endpoint bridges both authentication domains. Administrative staff authenticate via Supabase SSR cookies (`sb-*-auth-token`), whereas students authenticate via custom signed JWT cookies (`student_session`). Because students have no Supabase Auth UID, writing directly from the browser would violate Supabase RLS.

The server route validates the caller's session across both identity providers and persists subscriptions securely using `supabaseAdmin` (Service Role client):

```typescript
// File: vision-admin/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStudentSession } from '@/lib/student-session';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid push subscription payload: missing endpoint or cryptographic keys' },
        { status: 400 }
      );
    }

    // 1. Check for Active Admin Session (Supabase Auth SSR)
    let userId: string | null = null;
    let role: 'admin' | 'student' = 'admin';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      role = 'admin';
    } else {
      // 2. Check for Active Student Session (Jose Signed JWT Cookie)
      const studentSession = await getStudentSession();
      if (studentSession && studentSession.id) {
        userId = studentSession.id;
        role = 'student';
      }
    }

    // 3. Reject Unauthenticated Requests
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Active administrator or student session required.' },
        { status: 401 }
      );
    }

    // 4. Persist or Refresh Subscription via Supabase Admin (Bypassing RLS safely on server)
    const { error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription: subscription,
          endpoint: subscription.endpoint,
          role: role,
          user_agent: request.headers.get('user-agent') || 'unknown',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (dbError) {
      console.error('[Push Server] Database persistence error:', dbError);
      return NextResponse.json(
        { error: 'Database failed to persist push subscription', details: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription registered successfully',
      userId,
      role,
    });
  } catch (err: unknown) {
    console.error('[Push Server] Unexpected error in push registration route:', err);
    return NextResponse.json(
      { error: 'Internal server error while processing push subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint URL required for un-subscription' }, { status: 400 });
    }

    // Authenticate caller (either admin or student)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const student = !user ? await getStudentSession() : null;

    if (!user && !student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Push subscription removed successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 7.4 Service Worker Background `push` & `notificationclick` Handlers
When the cloud push service sends a notification payload to the device, the Service Worker wakes up and handles the event:

```javascript
// Inside public/sw.js - Push Handler
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Vision IT Institute',
    body: 'New update from institute administration.',
    url: '/dashboard',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    data: {
      url: payload.url || '/dashboard',
    },
    vibrate: [150, 50, 150],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Inside public/sw.js - Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetPath = event.notification.data?.url || '/dashboard';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open at the target URL, focus it
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If an app window is open at any URL, navigate and focus
        if (clientList.length > 0 && 'focus' in clientList[0] && 'navigate' in clientList[0]) {
          const client = clientList[0];
          client.navigate(targetUrl);
          return client.focus();
        }
        // Otherwise, open a fresh window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
```

### 7.5 Concrete Institute & LMS Push Scenarios Matrix
The push notification engine is integrated into 11 operational scenarios across institute administration and the Vision Learn LMS:

| # | Event / Trigger | Target Audience | Priority | Notification Title | Notification Body | Deep Link |
|---|---|---|---|---|---|---|
| 1 | **Fee Due Reminder (3 Days)** | Enrolled Student & Guardian | High | 🔔 Fee Due Reminder | "Dear {StudentName}, your {Course} fee installment of ₹{Amount} is due on {Date}." | `/fees` |
| 2 | **Fee Overdue Alert** | Enrolled Student | Urgent | ⚠️ Overdue Fee Notice | "Your installment is past due. Please settle at the institute counter to avoid late fee." | `/fees` |
| 3 | **Payment Receipt Generated** | Enrolled Student & Guardian | Normal | 🧾 Fee Payment Confirmed | "Received ₹{Amount} for {Course}. Receipt #{ReceiptNo} generated successfully." | `/fees` |
| 4 | **Batch Rescheduled** | Batch Enrolled Students | Urgent | ⏰ Class Timing Rescheduled | "{BatchName} on {Date} is rescheduled to {NewTime} due to {Reason}." | `/schedule` |
| 5 | **Holiday Notice** | All Students & Faculty | Normal | 🏛️ Institute Holiday Notice | "Institute will remain closed on {Date} for {HolidayName}. Regular classes resume next day." | `/calendar` |
| 6 | **New Study Material** | Course Enrolled Students | Normal | 📚 New Notes Published | "New study material '{MaterialTitle}' has been added to {Course}. Tap to view notes." | `/lms/materials` |
| 7 | **MCQ Test Published** | Course Enrolled Students | High | 📝 New Test Available | "{TestTitle} ({TestType}) is now live. Complete test before deadline {Deadline}." | `/lms/tests` |
| 8 | **Test Result Released** | Individual Student | High | 🎯 Exam Results Released | "You scored {Score}/{TotalMarks} in {TestTitle}! Tap to view question analysis." | `/lms/tests` |
| 9 | **Project Graded** | Individual Student | Normal | 🌟 Project Evaluated | "Your practical project '{ProjectTitle}' has been evaluated. Marks: {Score}." | `/lms/projects` |
| 10 | **Daily Attendance Check-In** | Student / Guardian | Normal | ✅ Attendance Confirmed | "Marked PRESENT in {BatchName} at {CheckInTime}." | `/lms/attendance` |
| 11 | **New Admission Inquiry** | Administrative Staff | High | 🎓 New Admission Lead | "New inquiry from {StudentName} for {Course}. Contact: {Phone}." | `/admissions` |

---

## 8. Offline Fallback UI & Navigation Behavior

### 8.1 Dedicated Offline Route Specification (`app/offline/page.tsx`)
When a user attempts to navigate to a page that has not yet been cached while the network is unavailable, the Service Worker returns `/offline`.

The offline fallback page is **not** a generic 404-style error screen. It is an intentional, branded dashboard that provides direct links to all locally cached data stores:

```tsx
// File: vision-admin/app/offline/page.tsx
'use client';

import Link from 'next/link';
import { WifiOff, RefreshCw, Users, CreditCard, CalendarCheck, BookOpen } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-6">
        <WifiOff className="h-10 w-10" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        You are in Offline Mode
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Vision Admin is operating without an active internet connection. All previously saved student records, attendance sheets, and fee statements remain accessible.
      </p>

      {/* Quick Action Matrix to Cached Modules */}
      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3 text-left">
        <Link
          href="/lms/attendance"
          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
        >
          <CalendarCheck className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-white">Attendance</p>
            <p className="text-xs text-slate-400">Scan & mark offline</p>
          </div>
        </Link>

        <Link
          href="/students"
          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
        >
          <Users className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-white">Student Roster</p>
            <p className="text-xs text-slate-400">View cached profiles</p>
          </div>
        </Link>

        <Link
          href="/fees"
          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
        >
          <CreditCard className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">Fee Counter</p>
            <p className="text-xs text-slate-400">View balances & receipts</p>
          </div>
        </Link>

        <Link
          href="/student/dashboard"
          className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
        >
          <BookOpen className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-sm font-medium text-white">Vision Learn</p>
            <p className="text-xs text-slate-400">Offline study notes</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}
```

### 8.2 Global Sticky `OfflineSyncBanner` Component
Mounted directly beneath the navigation bar in `app/(admin)/layout.tsx`, the `OfflineSyncBanner` provides continuous visibility into connection health and background synchronization:

```tsx
// File: vision-admin/components/pwa/OfflineSyncBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineDB } from '@/lib/offline/db';

type SyncState = 'online' | 'offline' | 'syncing';

export function OfflineSyncBanner() {
  const [syncState, setSyncState] = useState<SyncState>('online');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  const checkPendingQueue = async () => {
    try {
      const db = await getOfflineDB();
      const count = await db.count('mutation_queue');
      setPendingCount(count);
    } catch {
      // Database unavailable
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setSyncState('syncing');
      checkPendingQueue().then(() => {
        // Display reconnected banner temporarily
        setShowReconnectedToast(true);
        setTimeout(() => setShowReconnectedToast(false), 3500);
        setSyncState('online');
      });
    };

    const handleOffline = () => {
      setSyncState('offline');
      checkPendingQueue();
    };

    const handleQueueChange = () => {
      checkPendingQueue();
    };

    // Initial check
    if (!navigator.onLine) {
      setSyncState('offline');
    }
    checkPendingQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('vision-sync-queue-updated', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('vision-sync-queue-updated', handleQueueChange);
    };
  }, []);

  if (syncState === 'offline') {
    return (
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-500/30 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-400" />
          <span className="font-semibold">Offline Mode</span>
          <span className="hidden sm:inline">— Operating on locally cached database.</span>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300 border border-amber-500/30">
            {pendingCount} mutation{pendingCount > 1 ? 's' : ''} queued
          </span>
        )}
      </div>
    );
  }

  if (syncState === 'syncing') {
    return (
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-blue-500/30 bg-blue-950/80 px-4 py-2 text-xs text-blue-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
          <span className="font-semibold">Syncing Offline Data...</span>
          <span className="hidden sm:inline">Flushing pending records to cloud database.</span>
        </div>
        <span className="font-mono text-xs">{pendingCount} remaining</span>
      </div>
    );
  }

  if (showReconnectedToast) {
    return (
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-950/80 px-4 py-2 text-xs text-emerald-200 backdrop-blur-md animate-in fade-in">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="font-semibold">Back Online</span>
        <span>— All offline records synchronized successfully.</span>
      </div>
    );
  }

  return null;
}
```

### 8.3 Granular Table Row Indicators & Local Save Badges
Within specific data views, rows and modals reflect local vs. synchronized status:
- **Attendance Scanner**: Students checked in while offline display an amber `<Clock className="h-3 w-3" /> Saved Locally` badge. As soon as the device reconnects and sync succeeds, the badge smoothly transitions to an emerald `<Check className="h-3 w-3" /> Synced`.
- **Offline Cash Payment Modal**: When offline, the payment button label adapts to `"Record Offline Payment"`. The printable receipt prints with watermark `"RECORDED OFFLINE — RECEIPT PENDING CLOUD CONFIRMATION"`.

---

## 9. Platform & Technology Alignment (Next.js 16 + Turbopack + Tailwind v4 + Supabase)

### 9.1 Turbopack Architecture vs. Webpack Plugin Abandonment
A critical discovery in our codebase survey is that `vision-admin` runs on **Next.js 16.2.4** with **Turbopack default compilation**.

In the legacy `vision-learn` repository, PWA support was implemented via `next-pwa: ^5.6.0`. To work around Next.js compiler errors, `vision-learn` was forced to disable Turbopack and revert to Webpack (`"build": "next build --webpack"`).

**Architectural Decision**: `vision-admin` must **never** use `next-pwa` or Webpack compiler plugins.
Instead, the architecture adopts a decoupled, standards-compliant Service Worker:
1. `public/sw.js` is maintained as a pure modern JavaScript/TypeScript worker script.
2. Build-time precache asset lists are extracted via a lightweight post-build script that reads `.next/build-manifest.json` and outputs `public/precache-manifest.json`.
3. Turbopack builds execute with lightning speed with zero plugin friction.

### 9.2 Local Bundling: Eliminating External CDN Script Dependencies
In `vision-admin/components/lms/students/StudentCertificateModal.tsx:38`, student course completion certificates are generated using `jsPDF`. The current code injects jsPDF via a dynamic `<script>` tag pointing to an external CDN:
```javascript
// EXTERNAL CDN VULNERABILITY IN CURRENT CODEBASE
s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
```
When staff are operating offline or behind an unstable regional ISP, `cdnjs.cloudflare.com` fails to resolve. Certificate generation fails completely, even though the canvas certificate was rendered locally.

**Architectural Mandate**:
1. Install `jspdf` locally via npm: `npm install jspdf`.
2. Refactor `StudentCertificateModal.tsx` to use static ES module imports: `import jsPDF from 'jspdf';`.
3. This bundles the PDF generation engine into the hashed application chunks, precaching it automatically for 100% offline certificate generation.

### 9.3 Dual-Session Authentication & Bifurcated Replay Architecture
`vision-admin` operates two fundamentally distinct authentication mechanisms:
1. **Administrative Staff & Faculty**: Authenticated via Supabase SSR cookies (`sb-*-auth-token`). On the server, requests are verified via `proxy.ts` and `requireAdmin()`. In the browser, the Supabase client carries an authenticated JWT representing the staff user's `auth.uid()`.
2. **Vision Learn Enrolled Students**: Authenticated via a custom HMAC-SHA256 signed JWT stored in the HTTP-only cookie `student_session`, validated via `jose` in `lib/student-session.ts`.

#### Why Direct Browser Replay Fails for Student Mutations
Supabase PostgreSQL tables (`attendance`, `submissions`, `test_results`) enforce strict Row-Level Security (RLS) policies requiring `TO authenticated USING (auth.uid() = user_id)` or `USING (public.is_admin())`.

Because Vision Learn students authenticate via the standalone `student_session` cookie rather than Supabase Auth:
- In the browser, the Supabase client operates under the `anon` public role (`auth.uid() IS NULL`).
- Any attempt by the client browser to write student mutations directly to Supabase PostgREST tables results in an immediate PostgreSQL RLS rejection:
  `{ code: "42501", message: "new row violates row-level security policy for table 'attendance'" }`.

#### The Bifurcated Synchronization Model
To ensure 100% RLS compliance without opening security holes in PostgreSQL, the offline sync queue implements **Bifurcated Replay**:

```
                                  +---------------------------------------+
                                  |         mutation_queue (IndexedDB)    |
                                  +-------------------+-------------------+
                                                      |
                                    Inspect item.auth_context
                                                      |
                       +------------------------------+------------------------------+
                       |                                                             |
              auth_context === 'admin'                                      auth_context === 'student'
                       |                                                             |
                       v                                                             v
        +------------------------------+                              +------------------------------+
        |   Supabase Auth Session Check|                              |  POST to /api/student/sync   |
        |   (supabase.auth.getSession) |                              |  (Credentials: 'include')    |
        +--------------+---------------+                              +--------------+---------------+
                       | Active Session                                              | HTTP-Only Cookie
                       v                                                             v
        +------------------------------+                              +------------------------------+
        | Browser Supabase PostgREST   |                              | Next.js Server Route Handler |
        | .upsert(..., { onConflict }) |                              | Validates getStudentSession()|
        +--------------+---------------+                              +--------------+---------------+
                       |                                                             | Verified Session
                       v                                                             v
        +------------------------------+                              +------------------------------+
        |  PostgreSQL Tables (with RLS)|                              | supabaseAdmin (Service Role) |
        |  auth.uid() matches admin    |                              | .upsert(..., { onConflict }) |
        +------------------------------+                              +------------------------------+
```

1. **Administrative Channel (`auth_context: 'admin'`)**:
   - Executes `supabase.auth.getSession()` prior to dispatch.
   - If session is active, dispatches directly via `supabase.from(item.table).upsert({ ...item.payload, idempotency_key: item.idempotency_key }, { onConflict: 'idempotency_key' })`.
   - Operates within standard Supabase PostgREST RLS policies.

2. **Student LMS Channel (`auth_context: 'student'`)**:
   - Transmits the queued mutation to the server endpoint `/api/student/sync` with `credentials: 'include'`.
   - The server route decodes and cryptographically verifies `student_session` using `jose` HS256 (`getStudentSession()`).
   - Asserts that the mutation's student ID matches the authenticated token (`studentSession.id === item.payload.student_id`).
   - Writes the record via `supabaseAdmin` with `{ onConflict: 'idempotency_key' }`, safely satisfying PostgreSQL constraints.

#### Multi-Tab Concurrency Control via Web Locks API
When an administrator operates multiple open tabs or windows (e.g. an active QR attendance scanner in Tab 1, and the student roster in Tab 2), reconnecting to Wi-Fi fires the `online` event across all tabs simultaneously.
- Without concurrency protection, both tabs would inspect IndexedDB at the same millisecond and issue duplicate HTTP requests, causing race conditions and network saturation.
- `flushMutationQueue()` coordinates replay using the native **Web Locks API**:
  `navigator.locks.request('vision_queue_sync', { ifAvailable: true }, async (lock) => { ... })`.
- Only one tab acquires the exclusive `vision_queue_sync` lock; secondary tabs cleanly abort replay without error.

#### Handling Token Expiry and HTTP 401 Disconnections
Supabase Auth JWTs carry a 60-minute expiration window. If staff members work offline through an entire 2-hour class batch:
1. Upon network reconnection, Supabase's auto-refresh mechanism may experience latency or require user re-authentication if the refresh token expired.
2. If `flushMutationQueue()` encounters an HTTP 401, PostgreSQL code `PGRST301`, or an error indicating `JWT expired` / `token expired`:
   - The sync engine **must not** increment `item.retryCount`.
   - The sync engine **must not** mark the transaction as `failed`.
   - The item status remains `pending`, and the loop breaks immediately.
3. Once the administrator re-authenticates or the token refresh completes, the next sync cycle smoothly flushes the queue with zero data loss.

---

## 10. Objective Verification Rubric & Checklist

### 10.1 10-Point Offline-First Verification Rubric

| # | Quality Checkpoint | Verification Procedure | Expected Technical Behavior | Pass Criteria |
|---|---|---|---|---|
| 1 | **Cold Launch Latency** | Configure reverse proxy / network simulation with 20,000ms added latency; launch `/dashboard`. | Page serves instantly from Cache Storage without waiting for network timeout. | First Contentful Paint < 200ms; 0 network hang |
| 2 | **Stream Body Ownership** | Run background revalidation in Chrome DevTools with worker inspection enabled. | Service Worker executes background fetch, compares text bodies, and updates cache. | 0 uncaught exceptions in `waitUntil`; no `Response body is already locked` |
| 3 | **Parse-Time Registration** | Throttle CPU 4x in DevTools Performance panel; record initial page load. | SW registration begins during `<head>` parsing before external CSS/images complete. | Registration active before `window.load` event |
| 4 | **Turbopack Build Clean** | Execute `npm run build` using Next.js 16 default Turbopack compiler. | Build compiles successfully without Webpack compiler fallback. | Exit code 0; `.next` build output emitted |
| 5 | **RSC Offline Routing** | Toggle DevTools network to `Offline`; click `<Link href="/students">`. | Soft navigation succeeds; normalized RSC payload renders target page without reload. | 0 "Failed to fetch" errors; smooth transition |
| 6 | **Supabase Offline Write** | Disconnect Wi-Fi; mark student attendance or log fee payment; reconnect Wi-Fi. | UI updates optimistically; write queues in IndexedDB and syncs to Supabase on reconnect. | Record present in Supabase table post-sync |
| 7 | **iOS Safe Area Notch** | Launch in standalone mode on iPhone 15/16 Pro simulator or physical device. | Header pads past Dynamic Island; bottom navigation bar pads past home indicator. | 0 visual collision with hardware boundaries |
| 8 | **iOS Callout Suppression** | Perform rapid consecutive double-taps on action buttons in attendance scanner. | Button tap handlers trigger without displaying iOS "Copy / Look Up" popover. | 0 native selection popups or magnifying glass |
| 9 | **Web Push Roundtrip** | Trigger push dispatch from `lib/push.ts` to subscribed test endpoint. | Service Worker displays system toast; tapping notification focuses active tab. | Notification displays and navigates to target URL |
| 10 | **Lighthouse PWA Score** | Run Chrome DevTools Lighthouse audit on production build. | Manifest, service worker, icons, maskable icons, and offline 200 checks all pass. | "Installable" badge granted; 100% PWA checklist pass |

### 10.2 Lighthouse PWA Audit Compliance Matrix

| Audit Item | Lighthouse Expectation | Vision PWA Implementation Strategy |
|---|---|---|
| **Web App Manifest Valid** | Manifest is present, valid JSON, and linked | Generated via `app/manifest.ts` at `/manifest.webmanifest` |
| **Start URL 200 OK** | `start_url` responds with HTTP 200 when offline | `/dashboard` is precached during Service Worker `install` event |
| **Icons Configured** | Minimum 192x192 px and 512x512 px PNG icons | Defined in `app/manifest.ts`: `icon-192x192.png` and `icon-512x512.png` |
| **Maskable Icon** | Icon with `purpose: "maskable"` | Configured at `/icons/icon-maskable-512x512.png` with 80% safe zone |
| **Theme Color Set** | `<meta name="theme-color">` or viewport themeColor | Declared in `app/layout.tsx` `viewport` export (`themeColor: '#020617'`) |
| **Viewport Meta Tag** | `width=device-width, initial-scale=1, viewport-fit=cover` | Declared in `app/layout.tsx` `viewport` export |
| **Service Worker Registered** | Origin registers a worker controlling `start_url` | Parse-time registration at `scope: '/'` in `PwaBootstrap.tsx` |
| **Offline Page 200 OK** | Responds with 200 when offline | Dedicated `/offline` route precached in `precache-vision-pwa-*` |
| **HTTPS Enabled** | Application served over secure origin | Enforced in production via Vercel / Cloudflare SSL certificate |

### 10.3 Exact Independent Verification Commands

To independently verify the codebase dependencies, type integrity, and backend push readiness:

```powershell
# 1. Verify Next.js 16, React 19, and Web-Push Dependencies
cd "c:\Users\as007\vision project\vision-admin"
node -e "const p = require('./package.json'); console.log('Next.js:', p.dependencies.next); console.log('React:', p.dependencies.react); console.log('Web-Push:', p.dependencies['web-push']);"

# 2. Run TypeScript Compilation Check (Zero Errors)
npx tsc --noEmit

# 3. Verify VAPID Key Infrastructure in lib/push.ts
node -e "const fs = require('fs'); const code = fs.readFileSync('./lib/push.ts', 'utf8'); console.log('VAPID configured:', code.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY') && code.includes('webpush.sendNotification'));"

# 4. Confirm Existence and Format of Architecture Plan Document
Test-Path "c:\Users\as007\vision project\vision-admin\docs\pwa-architecture-plan.md"
```

---
*End of Progressive Web App Architecture Specification and Implementation Plan.*
