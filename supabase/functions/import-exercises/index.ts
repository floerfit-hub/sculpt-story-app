import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function determineSubGroup(
  muscleGroup: string,
  equipment: string,
  exerciseType: string,
  name: string
): string {
  const lName = name.toLowerCase();
  const lEquip = equipment.toLowerCase();
  const lType = exerciseType.toLowerCase();

  if (muscleGroup === "Ноги" || muscleGroup === "Legs & Glutes") {
    if (
      lName.includes("сідниц") ||
      lName.includes("glute") ||
      lName.includes("hip thrust") ||
      lName.includes("kickback")
    )
      return "Сідниці";
    if (
      lName.includes("квадрицепс") ||
      lName.includes("присід") ||
      lName.includes("squat") ||
      lName.includes("розгинання") ||
      lName.includes("extension") ||
      lName.includes("leg press") ||
      lName.includes("жим ногами") ||
      lName.includes("випади") ||
      lName.includes("lunge")
    )
      return "Квадрицепс";
    if (
      lName.includes("задн") ||
      lName.includes("hamstring") ||
      lName.includes("curl") ||
      lName.includes("згинання") ||
      lName.includes("deadlift") ||
      lName.includes("тяга")
    )
      return "Задня поверхня";
    if (
      lEquip.includes("тренажер") ||
      lEquip.includes("machine") ||
      lEquip.includes("кабель") ||
      lEquip.includes("cable")
    )
      return "Тренажери";
    return "Вільна вага";
  }

  // For all other muscle groups
  if (lType.includes("ізоляц") || lType.includes("isolation"))
    return "Ізоляція";
  if (lType.includes("базов") || lType.includes("compound"))
    return "Базові";
  if (
    lEquip.includes("тренажер") ||
    lEquip.includes("machine") ||
    lEquip.includes("кабель") ||
    lEquip.includes("cable") ||
    lEquip.includes("блок")
  )
    return "Тренажери";
  return "Вільна вага";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user is admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { exercises } = await req.json();
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return new Response(
        JSON.stringify({ error: "exercises array required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch all existing exercises for duplicate checking
    const { data: existing } = await supabaseAdmin
      .from("exercises")
      .select("id, name, normalized_name, muscle_group, aliases, version");

    const existingMap = new Map<string, any>();
    for (const e of existing || []) {
      const key = `${e.normalized_name}||${e.muscle_group}`;
      existingMap.set(key, e);
    }

    const results = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (const line of exercises) {
      try {
        const parts = line.split("|").map((s: string) => s.trim());
        if (parts.length < 5) {
          results.errors.push(`Invalid format: ${line}`);
          results.skipped++;
          continue;
        }

        const [name, muscleGroup, equipment, difficulty, exerciseType] = parts;
        const normalizedName = normalize(name);
        const subGroup = determineSubGroup(muscleGroup, equipment, exerciseType, name);
        const key = `${normalizedName}||${muscleGroup}`;

        const match = existingMap.get(key);

        if (match) {
          // Update existing
          const aliases = match.aliases || [];
          if (match.name !== name && !aliases.includes(match.name)) {
            aliases.push(match.name);
          }
          await supabaseAdmin
            .from("exercises")
            .update({
              name,
              aliases,
              version: (match.version || 1) + 1,
              equipment,
              difficulty,
              exercise_type: exerciseType,
              sub_group: subGroup,
              normalized_name: normalizedName,
            })
            .eq("id", match.id);
          results.updated++;
        } else {
          // Insert new
          const { error: insertError } = await supabaseAdmin
            .from("exercises")
            .insert({
              name,
              muscle_group: muscleGroup,
              normalized_name: normalizedName,
              equipment,
              difficulty,
              exercise_type: exerciseType,
              sub_group: subGroup,
            });
          if (insertError) {
            results.errors.push(`Insert failed for "${name}": ${insertError.message}`);
            results.skipped++;
          } else {
            results.inserted++;
            existingMap.set(key, {
              name,
              normalized_name: normalizedName,
              muscle_group: muscleGroup,
              aliases: [],
              version: 1,
            });
          }
        }
      } catch (err) {
        results.errors.push(`Error processing: ${line} — ${err}`);
        results.skipped++;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
