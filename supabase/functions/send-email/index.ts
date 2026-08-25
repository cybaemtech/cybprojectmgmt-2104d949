import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limit config ────────────────────────────────────────
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 10;
const MAX_RETRY_ATTEMPTS = 3;

// ── Supabase client (external DB - service role) ────────────
const supabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── SMTP config (loaded from DB, fallback to env) ───────────
interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  security: string;
  from_email: string;
  from_name: string;
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const { data } = await supabase
    .from("smtp_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (data && data.username && data.password) {
    return {
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      security: data.security,
      from_email: data.from_email || data.username,
      from_name: data.from_name || "CYB Project Management",
    };
  }

  // Fallback to provided Office 365 credentials
  const SMTP_USER = Deno.env.get("SMTP_USER") || "nova@cybaemtech.com";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || "Cybaem#9339";
  return {
    host: "smtp.office365.com",
    port: 587,
    username: SMTP_USER,
    password: SMTP_PASS,
    security: "STARTTLS",
    from_email: SMTP_USER,
    from_name: "CYB Project Management",
  };
}

// ── Email templates ──────────────────────────────────────────
interface TemplateData {
  [key: string]: string | number | undefined;
}

function getTemplate(
  templateName: string,
  data: TemplateData,
  fromName: string
): { subject: string; html: string } {
  const APP_NAME = fromName;
  switch (templateName) {
    case "welcome":
      return {
        subject: `Welcome to ${APP_NAME}!`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${APP_NAME}</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Welcome, ${data.fullName || "User"}!</h2>
    <p style="color:#555;line-height:1.6;">Your account has been created successfully. You can now log in and start managing your projects.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${data.loginUrl || "#"}" style="background:#3b82f6;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;">Login to Your Account</a>
    </div>
    <p style="color:#999;font-size:12px;">If you did not create this account, please ignore this email.</p>
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    case "email-verification":
      return {
        subject: "Verify Your Email Address",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${APP_NAME}</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Verify Your Email</h2>
    <p style="color:#555;line-height:1.6;">Please use the following OTP code to verify your email address:</p>
    <div style="text-align:center;margin:30px 0;">
      <div style="background:#f0f4ff;border:2px dashed #3b82f6;border-radius:8px;padding:20px;display:inline-block;">
        <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;">${data.otp || "------"}</span>
      </div>
    </div>
    <p style="color:#555;line-height:1.6;">This code expires in <strong>${data.expiryMinutes || 15} minutes</strong>.</p>
    ${data.verificationUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${data.verificationUrl}" style="background:#3b82f6;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;">Verify Email</a></div>` : ""}
    <p style="color:#999;font-size:12px;">If you did not request this, please ignore this email.</p>
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    case "password-reset":
      return {
        subject: "Reset Your Password",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${APP_NAME}</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">Password Reset Request</h2>
    <p style="color:#555;line-height:1.6;">We received a request to reset the password for your account (${data.email || ""}).</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${data.resetUrl || "#"}" style="background:#ef4444;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
    </div>
    <p style="color:#555;line-height:1.6;">This link expires in <strong>${data.expiryMinutes || 60} minutes</strong>.</p>
    <p style="color:#999;font-size:12px;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    case "notification":
      return {
        subject: data.subject as string || "System Notification",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${APP_NAME}</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">${data.title || "Notification"}</h2>
    <p style="color:#555;line-height:1.6;">${data.message || ""}</p>
    ${data.actionUrl ? `<div style="text-align:center;margin:30px 0;"><a href="${data.actionUrl}" style="background:#3b82f6;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;">${data.actionLabel || "View Details"}</a></div>` : ""}
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    case "admin-notification":
      return {
        subject: `[Admin] ${data.subject || "System Alert"}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#dc2626;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">⚠️ Admin Alert</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">${data.title || "System Alert"}</h2>
    <p style="color:#555;line-height:1.6;">${data.message || ""}</p>
    ${data.details ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px;margin:20px 0;border-radius:4px;"><pre style="margin:0;white-space:pre-wrap;color:#555;font-size:13px;">${data.details}</pre></div>` : ""}
    <p style="color:#999;font-size:12px;">This is an automated admin notification from ${APP_NAME}.</p>
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    case "invitation":
      return {
        subject: `You're invited to join ${data.teamName || APP_NAME}`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
  <div style="background:#1a1a2e;padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:24px;">${APP_NAME}</h1>
  </div>
  <div style="padding:30px;">
    <h2 style="color:#1a1a2e;margin-top:0;">You've Been Invited!</h2>
    <p style="color:#555;line-height:1.6;">You have been invited to join <strong>${data.teamName || "our team"}</strong> on ${APP_NAME} as a <strong>${data.role || "Team Member"}</strong>.</p>
    ${data.invitedBy ? `<p style="color:#555;line-height:1.6;">Invited by: <strong>${data.invitedBy}</strong></p>` : ""}
    <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:25px 0;">
      <p style="color:#1a1a2e;margin:0 0 5px;font-weight:bold;">What you can do:</p>
      <ul style="color:#555;line-height:1.8;margin:0;padding-left:20px;">
        <li>Collaborate with your team on projects</li>
        <li>Track tasks, stories, and bugs</li>
        <li>Monitor project timelines and progress</li>
      </ul>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${data.loginUrl || "#"}" style="background:#3b82f6;color:#fff;padding:14px 35px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">Get Started</a>
    </div>
    <p style="color:#999;font-size:12px;">If you believe this invitation was sent in error, please ignore this email.</p>
  </div>
  <div style="background:#f4f4f7;padding:15px;text-align:center;">
    <p style="color:#999;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
  </div>
</div>
</body></html>`,
      };

    default:
      throw new Error(`Unknown template: ${templateName}`);
  }
}

// ── Rate limiting ────────────────────────────────────────────
async function checkRateLimit(recipientEmail: string): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("email_rate_limits")
    .select("sent_count")
    .eq("recipient_email", recipientEmail)
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1);

  if (data && data.length > 0 && data[0].sent_count >= RATE_LIMIT_MAX_PER_WINDOW) {
    return false;
  }
  return true;
}

async function incrementRateLimit(recipientEmail: string) {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("email_rate_limits")
    .select("id, sent_count")
    .eq("recipient_email", recipientEmail)
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    await supabase
      .from("email_rate_limits")
      .update({ sent_count: data[0].sent_count + 1 })
      .eq("id", data[0].id);
  } else {
    await supabase.from("email_rate_limits").insert({
      recipient_email: recipientEmail,
      sent_count: 1,
      window_start: new Date().toISOString(),
    });
  }
}

// ── Email logging ────────────────────────────────────────────
async function logEmail(
  logId: string,
  recipientEmail: string,
  subject: string,
  templateName: string,
  status: string,
  errorMessage?: string,
  attempts?: number,
  metadata?: Record<string, unknown>
) {
  await supabase.from("email_logs").upsert({
    id: logId,
    recipient_email: recipientEmail,
    subject,
    template_name: templateName,
    status,
    error_message: errorMessage || null,
    attempts: attempts || 0,
    metadata: metadata || {},
    updated_at: new Date().toISOString(),
  });
}

// ── Send with retry ─────────────────────────────────────────
async function sendWithRetry(
  to: string,
  subject: string,
  html: string,
  logId: string,
  templateName: string,
  smtpConfig: SmtpConfig
): Promise<{ success: boolean; error?: string }> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      await logEmail(logId, to, subject, templateName, "retrying", undefined, attempt);

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.security === "SSL" || smtpConfig.port === 465,
        auth: { user: smtpConfig.username, pass: smtpConfig.password },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3', // Some Office 365 environments require this for older clients
          minVersion: 'TLSv1.2'
        },
        requireTLS: smtpConfig.security === "STARTTLS" || smtpConfig.port === 587,
        debug: true, // Enable logging for debugging SMTP connection
      });

      await transporter.sendMail({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to,
        subject,
        text: "Please view this email in an HTML-compatible client.",
        html,
      });
      await logEmail(logId, to, subject, templateName, "sent", undefined, attempt);
      await incrementRateLimit(to);
      return { success: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed:`, lastError);

      if (attempt < MAX_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  await logEmail(logId, to, subject, templateName, "failed", lastError, MAX_RETRY_ATTEMPTS);
  return { success: false, error: lastError };
}

// ── Auth check (admin only) ─────────────────────────────────
async function verifyAdmin(authHeader: string | null, externalToken?: string): Promise<boolean> {
  // Prefer the explicit external token passed in the request body
  const token = externalToken || (authHeader ? authHeader.replace("Bearer ", "") : null);
  if (!token) return false;

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Allow both ADMIN and SCRUM_MASTER roles to send system emails
  // Also check for 'SCRUM MASTER' with space just in case it's stored differently
  return profile?.role === "ADMIN" || profile?.role === "SCRUM_MASTER" || profile?.role === "SCRUM MASTER";
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse body early to extract external token
    const body = await req.json();
    const { templateName, templateData = {}, customSubject, externalAuthToken } = body;
    let { recipientEmail } = body;

    if (recipientEmail) {
      recipientEmail = recipientEmail.toLowerCase().trim();
    }

    // ── Authorization logic ──────────────────────────────────────
    const isPasswordReset = templateName === "password-reset";
    let isAuthorized = false;

    if (isPasswordReset) {
      // Allow password reset requests without admin token
      // but they are strictly rate-limited by the check below
      isAuthorized = true;
    } else {
      isAuthorized = await verifyAdmin(req.headers.get("Authorization"), externalAuthToken);
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Admin access required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load SMTP config from DB
    const smtpConfig = await getSmtpConfig();

    // ── Generate password reset link if needed ──────────────────
    if (isPasswordReset) {
      const siteUrl = templateData.siteUrl || "https://projectmanagement.cybaemtech.app:8444";
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: recipientEmail,
        options: { redirectTo: `${siteUrl}/login?mode=reset` }
      });

      if (linkError) {
        return new Response(
          JSON.stringify({ error: `Failed to generate reset link: ${linkError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Overwrite or set the resetUrl for the template
      templateData.resetUrl = linkData.properties.action_link;
      templateData.email = recipientEmail;
    }

    // ── Validate input ──────────────────────────────────────────
    if (!templateName || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateName and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const allowed = await checkRateLimit(recipientEmail);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded for this recipient" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email from template
    const template = getTemplate(templateName, templateData, smtpConfig.from_name);
    const subject = customSubject || template.subject;
    const logId = crypto.randomUUID();

    // Log as pending
    await logEmail(logId, recipientEmail, subject, templateName, "pending");

    // Send with retry
    const result = await sendWithRetry(
      recipientEmail,
      subject,
      template.html,
      logId,
      templateName,
      smtpConfig
    );

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, logId, message: "Email sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, logId, error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
