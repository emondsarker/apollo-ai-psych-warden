import { Sidebar } from "@/components/Sidebar";
import { loadAllCases } from "@/lib/content";
import { listSignoffs } from "@/lib/signoffs";
import { getCurrentUser } from "@/lib/currentUser";

// The main layout owns the persistent app-shell + sidebar. Because Next's
// App Router preserves layouts across navigations within the same segment,
// the Apollo avatar inside Sidebar stays mounted as the user moves between
// non-dashboard pages — no more model reloads on nav clicks.
export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [cases, signoffs, currentUser] = await Promise.all([
    loadAllCases(),
    listSignoffs(),
    getCurrentUser(),
  ]);
  const inReview = signoffs.filter((s) => s.status === "awaiting").length;
  const inboxCount = signoffs.filter(
    (s) => s.status === "awaiting" && s.assignedTo === currentUser.id,
  ).length;
  const counts = { cases: cases.length, review: inReview, inbox: inboxCount };

  return (
    <div className="app-shell">
      <Sidebar counts={counts} currentUser={currentUser} />
      <div className="app-shell-main">{children}</div>
    </div>
  );
}
