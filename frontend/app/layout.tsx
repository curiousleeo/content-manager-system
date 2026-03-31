import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { auth, signOut } from "@/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CMS — Content Manager",
  description: "Research, generate and schedule content",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const rawName = session?.user?.name ?? session?.user?.email ?? "";
  const user = rawName
    ? {
        name: rawName.includes("@") ? rawName.split("@")[0] : rawName,
        initials: rawName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      }
    : null;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body
        className="h-full flex flex-col antialiased"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="flex h-full overflow-hidden">
          <Sidebar user={user} signOutAction={handleSignOut} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
