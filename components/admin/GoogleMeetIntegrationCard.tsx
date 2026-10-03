"use client";

import { useEffect, useState } from "react";
import { Video, CheckCircle2, XCircle, RefreshCw, LogIn, Unplug } from "lucide-react";
import { toast } from "sonner";
import { useGoogleMeetDisconnect, useGoogleMeetStatus } from "@/lib/hooks/useMeetings";
import { meetingsApi } from "@/lib/api/meetings";
import { Button } from "@/components/ui/Button";

function authModeLabel(mode: string | null | undefined) {
  switch (mode) {
    case "oauth_connected":
      return "Connected from this page";
    case "oauth_env":
      return "Refresh token in server env";
    case "service_account":
      return "Service account (domain-wide delegation)";
    default:
      return "Not connected";
  }
}

/** Admin health view + "Connect Google account" for the DSG Meet automation. */
export default function GoogleMeetIntegrationCard() {
  const { data, isLoading, isFetching, refetch, error } = useGoogleMeetStatus();
  const disconnect = useGoogleMeetDisconnect();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success(`Google account connected: ${params.get("account") || ""}`);
    } else {
      toast.error(params.get("message") || "Google connection failed");
    }
    ["google", "account", "message"].forEach((k) => params.delete(k));
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    void refetch();
  }, [refetch]);

  const startConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await meetingsApi.googleMeetConnectUrl(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.assign(url);
    } catch (e) {
      setConnecting(false);
      toast.error(e instanceof Error ? e.message : "Could not start Google sign-in");
    }
  };

  const ok = !!data?.enabled && !!data?.connected;
  const rows: Array<[string, string]> = data
    ? [
        ["Meeting owner", data.ownerEmail],
        ["Connection", authModeLabel(data.authMode)],
        [
          "Google check",
          data.connected
            ? `OK (calendar time zone ${data.calendarTimeZone || "n/a"})`
            : data.error || "Not connected",
        ],
        ["Automation switch", data.featureFlag ? "On" : "Off (set GOOGLE_MEET_ENABLED=true on the server)"],
        ["Auto-record", data.autoRecord ? "On" : "Off (transcript + Gemini notes only)"],
      ]
    : [];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15 text-emerald-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Google Meet automation</h3>
            <p className="text-xs text-slate-500">
              The DSG Google account owns every meeting; transcripts + Gemini notes sync back to the CRM
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data?.canConnect && data.authMode !== "service_account" && data.authMode !== "oauth_env" && (
            <Button
              size="sm"
              isLoading={connecting}
              leftIcon={<LogIn className="w-3.5 h-3.5" />}
              onClick={() => void startConnect()}
            >
              {data.connectedAccount ? "Reconnect Google" : "Connect Google account"}
            </Button>
          )}
          {data?.authMode === "oauth_connected" && (
            <Button
              size="sm"
              variant="secondary"
              isLoading={disconnect.isPending}
              leftIcon={<Unplug className="w-3.5 h-3.5" />}
              onClick={() => {
                if (!window.confirm("Disconnect Google? New meetings will stop getting Meet links.")) return;
                disconnect.mutate(undefined, {
                  onSuccess: () => toast.success("Google account disconnected"),
                  onError: () => toast.error("Could not disconnect"),
                });
              }}
            >
              Disconnect
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
            onClick={() => void refetch()}
          >
            Test
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500">Checking Google connection…</p>
      ) : error ? (
        <p className="text-xs text-rose-300">Could not load status.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            {ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            <span className={ok ? "text-emerald-300" : "text-rose-300"}>
              {ok ? "Ready — new meetings get a Google Meet link automatically" : "Not active"}
            </span>
          </div>
          {data && !data.canConnect && !data.authMode && (
            <p className="text-xs text-amber-300/90">
              The server is missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET, so the Connect
              button is hidden. Ask your developer to add them.
            </p>
          )}
          {data?.canConnect && !data.authMode && (
            <p className="text-xs text-slate-400">
              Click <span className="text-white font-medium">Connect Google account</span> and sign in as{" "}
              <span className="text-white font-medium">{data.ownerEmail}</span>. Tick every permission box.
            </p>
          )}
          <dl className="grid gap-2 text-xs sm:grid-cols-[10rem_1fr]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-slate-200 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
