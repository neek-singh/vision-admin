import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { PwaBootstrap } from "@/components/pwa/PwaBootstrap";
import { UpdateNotificationToast } from "@/components/pwa/UpdateNotificationToast";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import { OfflineSyncBanner } from "@/components/pwa/OfflineSyncBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://admin.visionitinstitute.com"),
  title: "Vision IT Computer Institute",
  description: "Administrative dashboard for Vision IT Computer Institute.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vision IT",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "any" },
    ],
    shortcut: "/icons/icon-192x192.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-[100dvh] min-h-[100dvh] antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||(window.navigator.standalone===true);if(s){document.documentElement.classList.add('pwa-standalone');}}catch(e){}})();`,
          }}
        />
        <style>{`
          :root {
            --safe-top: max(env(safe-area-inset-top, 0px), 0px);
            --safe-bottom: max(env(safe-area-inset-bottom, 0px), 0px);
            --safe-left: max(env(safe-area-inset-left, 0px), 0px);
            --safe-right: max(env(safe-area-inset-right, 0px), 0px);
          }
          .safe-area-top {
            padding-top: max(env(safe-area-inset-top, 0px), 0px);
          }
          .safe-area-bottom {
            padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);
          }
          .safe-area-left {
            padding-left: max(env(safe-area-inset-left, 0px), 0px);
          }
          .safe-area-right {
            padding-right: max(env(safe-area-inset-right, 0px), 0px);
          }
          .safe-area-notch {
            padding-top: max(env(safe-area-inset-top, 0px), 0px);
            padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);
            padding-left: max(env(safe-area-inset-left, 0px), 0px);
            padding-right: max(env(safe-area-inset-right, 0px), 0px);
          }
          .shell-100dvh {
            height: 100dvh;
            min-height: 100dvh;
          }
          .app-shell-container {
            display: flex;
            flex-direction: column;
            min-height: 100dvh;
            width: 100%;
          }
        `}</style>
      </head>
      <body className="min-h-[100dvh] flex flex-col safe-area-notch">
        <PwaBootstrap />
        <OfflineSyncBanner />
        {children}
        <UpdateNotificationToast />
        <InstallPromptBanner />
      </body>
    </html>
  );
}
