import nodemailer from "npm:nodemailer@6.9.16";

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
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: security === "SSL" || portNum === 465,
      auth: { user: username, pass: password },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `Test <${username}>`,
      to: username,
      subject: "SMTP Connection Test",
      text: "This is a test email to verify SMTP connectivity.",
      html: `<p>✅ SMTP connection test successful from CYB Project Management.</p><p>Sent at: ${new Date().toISOString()}</p>`,
    });

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
