import { getAdminAnalytics } from "@/lib/admin-analytics";
import { AdminDashboard } from "@/components/admin-dashboard";

export async function AdminAnalyticsContent() {
  try {
    const data = await getAdminAnalytics();
    return <AdminDashboard data={data} />;
  } catch (error) {
    console.error("Failed to load admin analytics.", error);
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Unable to load city analytics. Please refresh the page to try again.</p>;
  }
}
