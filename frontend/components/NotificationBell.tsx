"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";

interface Notif {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface UsageStat {
  service: string;
  label: string;
  count: number;
  limit: number;
  pct: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d`;
  if (hrs > 0) return `${hrs}h`;
  if (mins > 0) return `${mins}m`;
  return "just now";
}

function UsageBar({ stat }: { stat: UsageStat }) {
  const warn = stat.pct >= 90;
  const color = warn ? "var(--amber)" : "var(--accent)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>{stat.label}</span>
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: warn ? "var(--amber-text)" : "var(--text-muted)" }}>
          {stat.count.toLocaleString()} / {stat.limit.toLocaleString()}
        </span>
      </div>
      <div style={{ height: "4px", borderRadius: "9999px", background: "var(--surface-4)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          borderRadius: "9999px",
          width: `${Math.min(stat.pct, 100)}%`,
          background: color,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [usage, setUsage] = useState<UsageStat[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { store } = await import("@/lib/store");
      const project = store.getProject();
      const data = await api.notifications.list(project?.id ?? undefined);
      setNotifs(data.notifications);
      setUnread(data.unread_count);
      setUsage(data.usage);
    } catch { /* backend may be offline */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    await api.notifications.markAllRead();
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  async function dismiss(id: number) {
    await api.notifications.delete(id);
    setNotifs((n) => n.filter((x) => x.id !== id));
    setUnread((c) => Math.max(0, c - (notifs.find((x) => x.id === id)?.read ? 0 : 1)));
  }

  const hasWarnings = usage.some((u) => u.pct >= 90);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        style={{
          position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "36px", height: "36px",
          borderRadius: "8px",
          border: open ? "1px solid var(--border-2)" : "1px solid transparent",
          background: open ? "rgba(255,255,255,0.07)" : "transparent",
          color: unread > 0 || hasWarnings ? "var(--text)" : "var(--text-muted)",
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <Bell size={16} strokeWidth={1.75} />
        {(unread > 0 || hasWarnings) && (
          <span style={{
            position: "absolute", top: "6px", right: "6px",
            width: "7px", height: "7px",
            borderRadius: "9999px",
            background: hasWarnings ? "var(--amber)" : "var(--accent)",
            border: "1.5px solid var(--bg)",
          }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "360px",
          borderRadius: "12px",
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          zIndex: 100,
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", color: "var(--accent)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "4px 8px", borderRadius: "6px",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-dim)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <CheckCheck size={12} />
                Mark all as read
              </button>
            )}
          </div>

          {/* API Usage section */}
          {usage.length > 0 && (
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: "12px" }}>
                API Usage — {new Date().toLocaleString("default", { month: "long" })}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {usage.map((u) => <UsageBar key={u.service} stat={u} />)}
              </div>
            </div>
          )}

          {/* Notification list */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <p style={{ padding: "24px 16px", fontSize: "13px", textAlign: "center", color: "var(--text-muted)" }}>
                No notifications
              </p>
            ) : (
              notifs.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex", gap: "10px", padding: "12px 16px",
                    borderBottom: idx < notifs.length - 1 ? "1px solid var(--border)" : "none",
                    background: n.read ? "transparent" : "rgba(255,184,0,0.04)",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Unread dot */}
                  <div style={{ paddingTop: "5px", flexShrink: 0 }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "9999px",
                      background: n.read ? "transparent" : "var(--accent)",
                      marginTop: "1px",
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: n.read ? 400 : 500, color: "var(--text)", marginBottom: "3px", lineHeight: 1.4 }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-subtle)", marginTop: "5px", fontFamily: "monospace" }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    style={{ flexShrink: 0, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", padding: "2px", borderRadius: "4px", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-subtle)"; }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
