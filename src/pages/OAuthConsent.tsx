import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthClient = { name?: string; redirect_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const oauth = (supabase.auth as any).oauth as {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};

export default function OAuthConsent() {
  const params = new URLSearchParams(window.location.search);
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/#/auth?next=${encodeURIComponent(next)}`;
        return;
      }
      const { data, error: e } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (e) {
        setError(e.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: e } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "0 auto" }}>
        <h1>Could not load this authorization request</h1>
        <p>{error}</p>
      </main>
    );
  }
  if (!details) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>Loading…</main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Connect {clientName} to Floer FitTrack</h1>
      <p style={{ color: "#475569", marginBottom: 8 }}>
        {clientName} will be able to call this app's enabled tools while you are signed in.
      </p>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        This does not bypass this app's permissions or backend policies.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          disabled={busy}
          onClick={() => decide(true)}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "white",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Cancel connection
        </button>
      </div>
    </main>
  );
}