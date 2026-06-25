import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/app/components/shell/app-shell";
import { ThemeProvider } from "@/app/components/shell/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getWorkspaceShellProps } from "@/lib/workspace/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workflows",
  description: "Design, run, and refine agent workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { organizations, defaultOrgId } = getWorkspaceShellProps();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="app-shell h-full overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>
            <AppShell
              organizations={organizations}
              defaultOrgId={defaultOrgId}
            >
              {children}
            </AppShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
