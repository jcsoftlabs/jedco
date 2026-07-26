import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import SupportDashboard from "./SupportDashboard";
import GestionAgents from "./GestionAgents";

export default async function SupportPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPPORT"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold text-jedco-dark">Support client</h2>
      {user.role === "ADMIN" && <GestionAgents />}
      <SupportDashboard />
    </div>
  );
}
