import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { auth, signOut } from "@/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full`}>
      <body
        className="h-full antialiased"
        style={{ background: "var(--bg-base)", color: "var(--t1)" }}
      >
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar user={user} signOutAction={handleSignOut} />
          <div style={{ marginLeft: "220px", display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
            <Header />
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
