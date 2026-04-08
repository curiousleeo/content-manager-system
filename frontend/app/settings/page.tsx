"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <div style={{ padding: "40px 48px" }}>
      <p style={{ fontSize: "13px", color: "var(--t3)" }}>Redirecting to Projects…</p>
    </div>
  );
}
