"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { useRole } from "@/lib/hooks/useRole";
import { getNavItems } from "@/lib/navigation";

export function PlaceholderView() {
  const pathname = usePathname();
  const { role } = useRole();

  const navItems = getNavItems(role);
  // Find active nav item matching the pathname
  const activeItem = navItems.find((item) => item.href === pathname);
  const title = activeItem?.label || "Page";

  return (
    <div>
      <PageHeader
        title={title}
        description="This page is under construction."
      />
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-slate-400">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
