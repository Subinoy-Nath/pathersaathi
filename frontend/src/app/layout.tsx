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
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
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
      </body>
    </html>
  );
}
