import { auth, signOut } from "@/auth";
import ProjectSwitcher from "./ProjectSwitcher";

export default async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
      <ProjectSwitcher />
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-500">{session.user.email}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
