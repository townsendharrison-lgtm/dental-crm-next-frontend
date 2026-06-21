"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import GuestLetterTrackView from "@/components/letters/GuestLetterTrackView";

function GuestTrackPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  return <GuestLetterTrackView token={token} />;
}

export default function GuestLetterTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading Tracking Portal...
        </div>
      }
    >
      <GuestTrackPageContent />
    </Suspense>
  );
}
