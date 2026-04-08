// LoginCard is no longer used — auth is handled directly in page.tsx
// Kept as an empty export to avoid breaking any potential imports during transition.
export default function LoginCard(_props: { signInAction: () => Promise<void> }) {
  return null;
}
