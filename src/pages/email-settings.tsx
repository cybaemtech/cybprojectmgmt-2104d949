import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, RefreshCw, Shield, Clock, AlertTriangle, CheckCircle, XCircle, Loader2, Save, Plug, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { value: "welcome", label: "Welcome Email", description: "Sent when a new user registers" },
  { value: "email-verification", label: "Email Verification", description: "OTP/link verification" },
  { value: "password-reset", label: "Password Reset", description: "Password recovery email" },
  { value: "notification", label: "Notification", description: "System alerts and updates" },
  { value: "admin-notification", label: "Admin Notification", description: "Admin-level alerts" },
  { value: "invitation", label: "Team Invitation", description: "Sent when inviting users to a team" },
];

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_name: string;
  status: string;
  error_message: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  security: string;
  from_email: string;
  from_name: string;
}

export default function EmailSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState("welcome");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: "smtp.gmail.com",
    port: 587,
    username: "",
    password: "",
    security: "TLS",
    from_email: "noreply@yourdomain.com",
    from_name: "CYB Project Management",
  });

  // Check admin
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabaseCustom
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = profile?.role === "ADMIN";

  // Fetch SMTP config
  const { data: smtpConfig, isLoading: configLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("smtp_config" as any)
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as any as SmtpConfig & { id: number };
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (smtpConfig) {
      setSmtpForm({
        host: smtpConfig.host || "smtp.gmail.com",
        port: smtpConfig.port || 587,
        username: smtpConfig.username || "",
        password: smtpConfig.password || "",
        security: smtpConfig.security || "TLS",
        from_email: smtpConfig.from_email || "",
        from_name: smtpConfig.from_name || "",
      });
    }
  }, [smtpConfig]);

  const isConfigured = !!(smtpForm.username && smtpForm.password && smtpForm.host);

  // Save SMTP config
  const saveConfig = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      const { error } = await supabase
        .from("smtp_config" as any)
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
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "SMTP settings have been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    },
  });

  // Test connection
  const testConnection = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      const { data, error } = await supabase.functions.invoke("test-smtp-connection", {
        body: config,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Connection Successful", description: data.message || "SMTP server is reachable and a test email was sent." });
      } else {
        toast({ variant: "destructive", title: "Connection Failed", description: data.error || "Could not connect to SMTP server." });
      }
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Connection Test Failed", description: error.message });
    },
  });

  // Fetch email logs
  const { data: emailLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EmailLog[];
    },
    enabled: isAdmin,
  });

  // Send email mutation
  const sendEmail = useMutation({
    mutationFn: async (payload: { templateName: string; recipientEmail: string; templateData: Record<string, string> }) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Email sent", description: data.message || "Email dispatched successfully." });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      setRecipientEmail("");
      setTemplateData({});
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to send", description: error.message || "Email sending failed." });
    },
  });

  const handleSend = () => {
    if (!recipientEmail) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a recipient email." });
      return;
    }
    sendEmail.mutate({ templateName: selectedTemplate, recipientEmail, templateData });
  };

  const getTemplateFields = (template: string) => {
    switch (template) {
      case "welcome":
        return [
          { key: "fullName", label: "Full Name", placeholder: "John Doe" },
          { key: "loginUrl", label: "Login URL", placeholder: "https://yourapp.com/login" },
        ];
      case "email-verification":
        return [
          { key: "otp", label: "OTP Code", placeholder: "123456" },
          { key: "expiryMinutes", label: "Expiry (minutes)", placeholder: "15" },
          { key: "verificationUrl", label: "Verification URL (optional)", placeholder: "https://..." },
        ];
      case "password-reset":
        return [
          { key: "email", label: "User Email", placeholder: "user@example.com" },
          { key: "resetUrl", label: "Reset URL", placeholder: "https://yourapp.com/reset?token=..." },
          { key: "expiryMinutes", label: "Expiry (minutes)", placeholder: "60" },
        ];
      case "notification":
        return [
          { key: "title", label: "Title", placeholder: "Important Update" },
          { key: "message", label: "Message", placeholder: "Your task has been completed..." },
          { key: "actionUrl", label: "Action URL (optional)", placeholder: "https://..." },
          { key: "actionLabel", label: "Button Label (optional)", placeholder: "View Details" },
        ];
      case "admin-notification":
        return [
          { key: "title", label: "Alert Title", placeholder: "System Alert" },
          { key: "message", label: "Message", placeholder: "A critical event occurred..." },
          { key: "details", label: "Technical Details (optional)", placeholder: "Error stack trace..." },
        ];
      case "invitation":
        return [
          { key: "teamName", label: "Team Name", placeholder: "Engineering Team" },
          { key: "role", label: "Role", placeholder: "Team Member" },
          { key: "invitedBy", label: "Invited By (optional)", placeholder: "Admin Name" },
          { key: "loginUrl", label: "Login URL", placeholder: "https://yourapp.com/login" },
        ];
      default:
        return [];
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "retrying":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><RefreshCw className="h-3 w-3 mr-1" />Retrying</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">Email settings are only available to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Service Configuration
          </h1>
          <p className="text-muted-foreground mt-1">Send and manage transactional emails via SMTP</p>
        </div>
        <Badge variant="outline" className={cn(
          isConfigured ? "text-emerald-600 border-emerald-300" : "text-amber-600 border-amber-300"
        )}>
          {isConfigured ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> SMTP Connected</>
          ) : (
            <><AlertTriangle className="h-3 w-3 mr-1" /> Not Configured</>
          )}
        </Badge>
      </div>

      {/* SMTP Configuration - Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            SMTP Configuration
          </CardTitle>
          <CardDescription>Configure your SMTP server settings for sending emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.gmail.com"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username / Email</Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    placeholder="your-email@gmail.com"
                    value={smtpForm.username}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">SMTP Password / App Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp-pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••••••"
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-security">Security</Label>
                  <Select
                    value={smtpForm.security}
                    onValueChange={(v) => setSmtpForm(prev => ({ ...prev, security: v }))}
                  >
                    <SelectTrigger id="smtp-security">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (Port 587)</SelectItem>
                      <SelectItem value="SSL">SSL (Port 465)</SelectItem>
                      <SelectItem value="NONE">None (Port 25)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    placeholder="noreply@yourdomain.com"
                    value={smtpForm.from_email}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, from_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    placeholder="CYB Project Management"
                    value={smtpForm.from_name}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, from_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => saveConfig.mutate(smtpForm)}
                  disabled={saveConfig.isPending}
                >
                  {saveConfig.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save Configuration</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testConnection.mutate(smtpForm)}
                  disabled={testConnection.isPending || !smtpForm.host || !smtpForm.username || !smtpForm.password}
                >
                  {testConnection.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                  ) : (
                    <><Plug className="h-4 w-4 mr-2" />Test Connection</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              Send Email
            </CardTitle>
            <CardDescription>Select a template and send</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setTemplateData({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>

            {getTemplateFields(selectedTemplate).map((field) => (
              <div key={field.key}>
                <Label>{field.label}</Label>
                {field.key === "message" || field.key === "details" ? (
                  <Textarea
                    placeholder={field.placeholder}
                    value={templateData[field.key] || ""}
                    onChange={(e) => setTemplateData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={templateData[field.key] || ""}
                    onChange={(e) => setTemplateData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <Button onClick={handleSend} disabled={sendEmail.isPending || !isConfigured} className="w-full">
              {sendEmail.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Send Email</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Service Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[
                { icon: <Shield className="h-4 w-4 text-emerald-500" />, text: "Backend-only sending — SMTP credentials never exposed to frontend" },
                { icon: <RefreshCw className="h-4 w-4 text-blue-500" />, text: "Auto-retry with exponential backoff (up to 3 attempts)" },
                { icon: <Clock className="h-4 w-4 text-amber-500" />, text: "Rate limiting: max 10 emails/hour per recipient" },
                { icon: <Mail className="h-4 w-4 text-purple-500" />, text: "6 HTML email templates (welcome, verify, reset, notification, admin, invitation)" },
                { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, text: "Full delivery logging with status tracking" },
                { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, text: "Admin-only access — configurable at admin level only" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  {item.icon}
                  <span className="text-muted-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Email Delivery Logs</CardTitle>
            <CardDescription>Recent email activity (last 50)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No emails sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Recipient</th>
                    <th className="pb-2 pr-4">Template</th>
                    <th className="pb-2 pr-4">Subject</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Attempts</th>
                    <th className="pb-2">Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-mono text-xs">{log.recipient_email}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">{log.template_name}</Badge>
                      </td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{log.subject}</td>
                      <td className="py-2 pr-4">{statusBadge(log.status)}</td>
                      <td className="py-2 pr-4 text-center">{log.attempts}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
