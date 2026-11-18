import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MENTORA — AI-Powered Learning & Exam Preparation Platform",
  description: "Transform documents and study materials into interactive learning experiences, verifiable RAG tutoring, spaced-repetition flashcards, and exam preparation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0b0f17] text-gray-100 min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
