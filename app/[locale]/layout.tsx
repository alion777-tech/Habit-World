import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habit World | 最強の習慣化・目標達成アプリ",
  description: "Habit Worldは、三日坊主を卒業し、理想の生活を習慣化するための目標達成支援ツールです。無料で簡単に日々の習慣を記録・管理できます。",
  verification: {
    google: "BAZtlQapgxHdCsRwYb8o2H_viq-xofcWBuISEZOlpxM", // ←これを追加！
  },
  manifest: "/manifest.json",
  icons: { icon: "/habit-world-icon-192.png", apple: "/habit-world-icon-180.png" },
  themeColor: "#4f46e5",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Habit World",
  },
};



export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ position: "relative" }}
      >
        <NextIntlClientProvider messages={messages}>

          {children}
        </NextIntlClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: process.env.NODE_ENV === "production" ? `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;
                      if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available!
                            console.log('New content is available; please refresh.');
                          }
                        });
                      }
                    });
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });

                // Do not reload on controllerchange: first installation and updates
                // can finish while users are entering onboarding or form data.

              }
            ` : `
              // Old production workers can serve HTML referencing deleted chunks.
              // Unregister this app's worker without deleting saved user data.
              if ('serviceWorker' in navigator) {
                (async function() {
                  const isAppWorker = worker => worker &&
                    new URL(worker.scriptURL).origin === location.origin &&
                    new URL(worker.scriptURL).pathname === '/sw.js';
                  const controlled = isAppWorker(navigator.serviceWorker.controller);
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  let removed = false;
                  for (const registration of registrations) {
                    if ([registration.active, registration.waiting, registration.installing].some(isAppWorker)) {
                      removed = (await registration.unregister()) || removed;
                    }
                  }
                  if (controlled && removed) location.reload();
                })().catch(error => console.error('Could not disable development service worker:', error));
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
