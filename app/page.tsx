"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const href = window.location.href;
    const hash = window.location.hash || "";

    // Legacy #/complete-invitation
    if (/#\/complete-invitation/i.test(hash)) {
      const cleanHash = hash.replace(/#\/complete-invitation/i, "");
      router.replace(`/complete-invitation${cleanHash}`);
      return;
    }

    // Intercept invite or recovery tokens if Supabase redirected to root
    const tokenMatch = href.match(/access_token=([^&#]+)/);
    const typeMatch = href.match(/[?#&]type=([^&#]+)/);
    if (tokenMatch?.[1]) {
      const type = typeMatch?.[1]?.toLowerCase();
      if (type === "invite" || type === "signup") {
        router.replace(`/complete-invitation#access_token=${tokenMatch[1]}&type=${type}`);
        return;
      }
      if (type === "recovery") {
        router.replace(`/reset-password#access_token=${tokenMatch[1]}&type=recovery`);
        return;
      }
    }

    router.replace("/dashboard");
  }, [router]);

  return null;
}

