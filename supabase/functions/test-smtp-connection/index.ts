import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { host, port, username, password, security } = await req.json();

    if (!host || !port || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "All SMTP fields are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const portNum = Number(port);
    // For SSL (port 465): connect with TLS immediately
    // For TLS/STARTTLS (port 587): connect plain, then upgrade via STARTTLS
    const useImplicitTls = security === "SSL" || portNum === 465;

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: portNum,
        tls: useImplicitTls,
        auth: { username, password },
      },
    });

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
    console.error("SMTP test error:", message);
    return new Response(
      JSON.stringify({ success: false, error: `Connection failed: ${message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
