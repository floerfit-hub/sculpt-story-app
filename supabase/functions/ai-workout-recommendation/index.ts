import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recoveryStatus, language, focusMuscle } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const targetLanguage = language === "en" ? "English" : "Ukrainian";
    const focusContext = focusMuscle
      ? `The user clicked this muscle segment: ${focusMuscle}. Evaluate if this specific muscle should be trained today based on its recovery %, synergist load, and CNS state. Then suggest the optimal workout split.`
      : "Recommend the best workout split for today based on all 17 muscle segment recovery percentages.";

    const systemPrompt = `You are an expert sports science AI coach. You analyze 17 individual muscle segments (Chest, Upper back, Lats, Lower back, Anterior delt, Lateral delt, Posterior delt, Biceps, Triceps, Quadriceps, Glutes, Hamstrings, Calves, Core) with synergist load tracking.

Rules:
- Never recommend training a muscle below 40% recovery
- If synergist recovery < 60%, warn before adding indirect load
- Consider muscle size categories: Large (48-72h), Medium (36-56h), Small (24-48h)
- Account for direct sets AND synergist sets when assessing fatigue

Respond in ${targetLanguage}. Keep to 3-4 practical sentences. Mention specific muscles to train and to avoid. Include recommended intensity %. ${focusContext}`;

    const userMessage = `Current recovery status (17 segments, 100 = fully recovered, 0 = just trained):\n${JSON.stringify(recoveryStatus, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error", status: response.status }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-workout-recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
