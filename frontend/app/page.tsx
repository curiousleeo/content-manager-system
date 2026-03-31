import { auth } from "@/auth";
import DashboardPage from "./DashboardPage";

export default async function Page() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  return <DashboardPage firstName={firstName} />;
}
