import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: "220px",
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
