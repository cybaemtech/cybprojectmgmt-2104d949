import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, config } = await req.json();

    if (action === "get") {
      const { data, error } = await supabase
        .from("smtp_config")
        .select("*")
        .eq("id", 1)
        .single();

      if (error && error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ success: true, data: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save") {
      if (!config || !config.host || !config.username) {
        return new Response(
          JSON.stringify({ success: false, error: "Host and username are required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current config to detect no-change
      const { data: existing } = await supabase
        .from("smtp_config")
        .select("*")
        .eq("id", 1)
        .single();

      if (existing) {
        const unchanged =
          existing.host === config.host &&
          existing.port === config.port &&
          existing.username === config.username &&
          existing.password === config.password &&
          existing.security === config.security &&
          existing.from_email === config.from_email &&
          existing.from_name === config.from_name;

        if (unchanged) {
          return new Response(
            JSON.stringify({ success: true, unchanged: true, message: "Configuration is already saved. No changes detected." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error } = await supabase
        .from("smtp_config")
        .upsert({
          id: 1,
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          security: config.security,
          from_email: config.from_email,
          from_name: config.from_name,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, unchanged: false, message: "SMTP configuration saved successfully." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'get' or 'save'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
