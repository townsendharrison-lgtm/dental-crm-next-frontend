"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Placeholder"
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
