import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader || "" } } },
  );

  const body = await req.json();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

  const insertPayload = {
    workspace_id: body.workspaceId,
    care_profile_id: body.careProfileId,
    status: "confirmed",
    product_name: body.productName,
    source: body.source,
    ingredients: body.ingredients || [],
    dosage: body.dosage,
    instructions: body.instructions,
    warnings: body.warnings || [],
    interactions: body.interactions || [],
    started_at: body.startedAt,
    review_at: body.reviewAt,
    created_by: userData.user.id,
  };

  const { data, error } = await supabase.from("medications").insert(insertPayload).select().single();
  if (error) return jsonResponse({ error: error.message }, 400);
  return jsonResponse({ medication: data });
});
