import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavbarServer from "@/components/NavbarServer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: "Pather Saathi",
  description: "Fleet booking platform for Barak Valley",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
        <style>{`
          .material-symbols-outlined {
            font-feature-settings: "liga" 1;
            -webkit-font-feature-settings: "liga" 1;
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <NavbarServer />
        <div className="flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
