import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarServer from "@/components/NavbarServer";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  metadataBase: new URL("https://pathersaathi.in"),
  title: {
    default: "Pather Saathi | Bus & Charter Booking in Barak Valley",
    template: "%s | Pather Saathi",
  },
  description: "The premier ultra-local fleet booking platform for Barak Valley. Book bus tickets, charter vehicles, and manage routes across Sribhumi, Silchar, and Hailakandi securely.",
  keywords: ["bus booking Silchar", "Sribhumi bus", "Hailakandi transport", "Barak Valley fleet", "ultra-local transit", "Pather Saathi", "charter booking Sribhumi"],
  openGraph: {
    title: "Pather Saathi | Bus & Charter Booking in Barak Valley",
    description: "The premier fleet booking platform for Barak Valley, Assam. Book bus tickets and charter entire vehicles securely.",
    url: "https://pathersaathi.in",
    siteName: "Pather Saathi",
    images: [
      {
        url: "/images/logo.jpeg",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pather Saathi",
    description: "Book bus tickets and charter entire vehicles securely in Barak Valley.",
    images: ["/images/logo.jpeg"],
  },
};

import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <style>{`
          .material-symbols-outlined {
            font-feature-settings: "liga" 1;
            -webkit-font-feature-settings: "liga" 1;
          }
        `}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Pather Saathi",
              "url": "https://pathersaathi.in",
              "publisher": {
                "@type": "Organization",
                "name": "Pather Saathi",
                "url": "https://pathersaathi.in",
                "logo": "https://pathersaathi.in/images/logo.jpeg",
                "areaServed": ["Barak Valley", "Silchar", "Sribhumi", "Hailakandi"],
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+91-6002089037",
                  "contactType": "customer support",
                  "email": "support@pathersaathi.in",
                  "areaServed": "IN",
                  "availableLanguage": ["English", "Bengali", "Assamese"]
                }
              }
            })
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-50">
        <NavbarServer />
        <div className="flex-1">
          {children}
        </div>
        <Analytics />
        <Toaster 
          position="bottom-right" 
          richColors 
          theme="light" 
          toastOptions={{
            classNames: {
              toast: 'glass-card luminous-shadow border border-white/50 rounded-2xl p-4 font-sans backdrop-blur-xl bg-white/80',
              title: 'font-bold text-[#00342b] text-sm',
              description: 'text-[#3f4945] text-xs font-medium',
              success: 'border-l-4 border-l-green-500',
              error: 'border-l-4 border-l-red-500',
              warning: 'border-l-4 border-l-yellow-500',
              info: 'border-l-4 border-l-[#00affe]',
            }
          }}
        />
      </body>
    </html>
  );
}
