import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "ADMIN";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const isAdmin = await verifyAdmin(req.headers.get("Authorization"));
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized. Admin access required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { host, port, username, password, security } = await req.json();

    if (!host || !port || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "All SMTP fields are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: Number(port),
        tls: security === "SSL",
        auth: { username, password },
      },
    });

    // Try connecting and sending a NOOP to verify
    await client.send({
      from: `Test <${username}>`,
      to: username,
      subject: "SMTP Connection Test",
      content: "This is a test email to verify SMTP connectivity.",
      html: `<p>✅ SMTP connection test successful from CYB Project Management.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "SMTP connection successful! Test email sent." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: `Connection failed: ${message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
