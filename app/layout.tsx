import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PreferencesProvider } from "@/components/settings/PreferencesProvider";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rufo",
  description: "Rufo image generation workflow canvas built with Next.js, React Flow, and Supabase."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <PreferencesProvider>
          <AuthProvider>{children}</AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
