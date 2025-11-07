import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider } from "@/contexts/branding-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "LMS - Learning Management System",
  description: "Learning Management System for Staff Training",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <BrandingProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </AuthProvider>
          </ThemeProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
