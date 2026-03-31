import { signIn } from "@/auth";
import DotBackground from "@/components/DotBackground";
import LoginCard from "./LoginCard";

export default function LoginPage() {
  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <DotBackground />

      {/* Radial vignette — softens the edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
          zIndex: 1,
        }}
      />

      {/* Blue accent glow at top */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(59,130,246,0.08), transparent 60%)",
          zIndex: 1,
        }}
      />

      <LoginCard signInAction={handleSignIn} />
    </div>
  );
}
