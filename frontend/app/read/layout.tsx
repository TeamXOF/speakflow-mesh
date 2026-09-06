import KidAuthGate from "@/components/auth/KidAuthGate";

/** Kid-facing Story Mode: fullscreen (no sidebar/topbar), any logged-in user. */
export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return <KidAuthGate>{children}</KidAuthGate>;
}
