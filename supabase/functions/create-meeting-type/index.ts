import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      },
    })

    const auth = await supabase.auth.getUser()
    const user = auth.data.user
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const { name, color, description } = await req.json()
    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("meeting_types")
      .insert({
        name: name.trim(),
        color: color || "#3b82f6",
        description: description?.toString().trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) {
      console.error("create-meeting-type insert error:", error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (err) {
    console.error("create-meeting-type unexpected error:", err)
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
