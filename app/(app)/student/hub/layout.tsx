"use client";

import { usePathname } from "next/navigation";
import HubDataProvider from "@/components/student/hub/HubDataProvider";
import HubTabShell, { type HubTabId } from "@/components/student/hub/HubTabShell";

const TAB_IDS: HubTabId[] = [
  "tracker",
  "analytics",
  "schools",
  "improvement",
  "timeline",
];

function resolveActiveTab(pathname: string): HubTabId {
  const segment = pathname.split("/").filter(Boolean).pop() || "tracker";
  return TAB_IDS.includes(segment as HubTabId) ? (segment as HubTabId) : "tracker";
}

export default function StudentHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);

  return (
    <HubDataProvider>
      <div className="text-slate-300">
        <HubTabShell activeTab={activeTab}>{children}</HubTabShell>
      </div>
    </HubDataProvider>
  );
}
