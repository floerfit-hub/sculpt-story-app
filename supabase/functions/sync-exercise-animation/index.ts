import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { exercise_id, search_name } = await req.json();
    if (!exercise_id || !search_name) {
      return new Response(JSON.stringify({ error: "exercise_id and search_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("EXERCISE_DB_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "EXERCISE_DB_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Search ExerciseDB
    const searchUrl = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(search_name.toLowerCase())}?limit=5`;
    const apiRes = await fetch(searchUrl, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return new Response(JSON.stringify({ error: `ExerciseDB error: ${apiRes.status}`, details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exercises = await apiRes.json();
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return new Response(JSON.stringify({ error: "No exercises found", search_name }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = exercises[0];
    const gifUrl = match.gifUrl;
    if (!gifUrl) {
      return new Response(JSON.stringify({ error: "No GIF URL in result" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download GIF
    const gifRes = await fetch(gifUrl);
    if (!gifRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to download GIF" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gifBuffer = await gifRes.arrayBuffer();
    const filePath = `${exercise_id}.gif`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("exercise-animations")
      .upload(filePath, gifBuffer, {
        contentType: "image/gif",
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("exercise-animations")
      .getPublicUrl(filePath);

    const animationUrl = urlData.publicUrl;

    // Update exercise record
    const { error: updateError } = await supabase
      .from("exercises")
      .update({
        animation_url: animationUrl,
        name_en: search_name,
      })
      .eq("id", exercise_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "DB update failed", details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      animation_url: animationUrl,
      matched_name: match.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
