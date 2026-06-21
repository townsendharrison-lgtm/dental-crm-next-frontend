"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import LetterUploadView from "@/components/letters/LetterUploadView";

function UploadPageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";

  return <LetterUploadView initialCode={code} />;
}

export default function LetterUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading Letter Portal...
        </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  );
}
