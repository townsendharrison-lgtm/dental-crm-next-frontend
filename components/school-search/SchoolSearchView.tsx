"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button, EmptyState, FullPageSpinner } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { SCHOOL_SEARCH_CSS } from "./schoolSearchStyles";
import { SCHOOL_SEARCH_MARKUP } from "./schoolSearchMarkup";
import { mountSchoolSearch, type SchoolSearchData } from "./schoolSearchEngine";

const DATA_FILES = {
  schools: "/school-search/schools.json",
  columns: "/school-search/columns.json",
  geo: "/school-search/map.json",
} as const;

async function loadData(): Promise<SchoolSearchData> {
  const [schools, columns, geo] = await Promise.all(
    Object.values(DATA_FILES).map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
      return res.json();
    }),
  );
  return { schools, columns, geo };
}

const FONT_HREF = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";

/** Fonts can't be declared inside a shadow root, so load the feature's typeface on the document. */
function ensureFont() {
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

/** Closest scrollable ancestor (the AppShell `<main>`), used to jump back to the top on view change. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * School Search — browse, filter, map, compare and track dental schools from the
 * School Info sheet. The feature renders inside a shadow root so its styles stay
 * isolated from the dashboard's Tailwind layer.
 */
export default function SchoolSearchView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    setStatus("loading");
    ensureFont();

    loadData()
      .then((data) => {
        if (cancelled) return;
        const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
        root.innerHTML = `<style>${SCHOOL_SEARCH_CSS}</style>${SCHOOL_SEARCH_MARKUP}`;
        cleanup = mountSchoolSearch(root, data, {
          scrollToTop: () => {
            const scroller = scrollParent(host);
            if (scroller) scroller.scrollTo({ top: 0 });
          },
        });
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("School Search failed to start", err);
        setError(err instanceof Error ? err.message : "Could not load school data.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      cleanup?.();
      if (host.shadowRoot) host.shadowRoot.innerHTML = "";
    };
  }, [attempt]);

  return (
    <div className="pt-2">
      <PageHeader title="School Search" description="Browse, compare and track dental schools." />
      {status === "loading" && <FullPageSpinner label="Loading schools…" />}
      {status === "error" && (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" />}
          title="School data didn't load"
          description={error ?? undefined}
          action={
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          }
        />
      )}
      <div ref={hostRef} hidden={status !== "ready"} />
    </div>
  );
}
