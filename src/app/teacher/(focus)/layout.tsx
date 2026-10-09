/** Distraction-free surface for the projector / interactive board: no app navigation. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
