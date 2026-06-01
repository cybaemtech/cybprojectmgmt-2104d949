import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, Shield, Clock, AlertTriangle, CheckCircle, XCircle, Loader2, Save, Plug, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

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

/**
 * Email Settings section — rendered as the "Email" tab inside the
 * Configuration page. Admin-only (the parent page already gates access).
 */
export default function EmailSettingsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const { data: smtpConfig, isLoading: configLoading } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const { data, error } = await supabaseCustom
        .from("smtp_config")
        .select("*")
        .eq("id", 1)
        .single();
      if (error && error.code === "PGRST116") return null;
      if (error) throw error;
      return data as SmtpConfig & { id: number };
    },
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

  const saveConfig = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      if (smtpConfig) {
        const unchanged =
          smtpConfig.host === config.host &&
          smtpConfig.port === config.port &&
          smtpConfig.username === config.username &&
          smtpConfig.password === config.password &&
          smtpConfig.security === config.security &&
          smtpConfig.from_email === config.from_email &&
          smtpConfig.from_name === config.from_name;
        if (unchanged) return { unchanged: true };
      }
      const { error } = await supabaseCustom
        .from("smtp_config")
        .upsert({
          id: 1,
          ...config,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      return { unchanged: false };
    },
    onSuccess: (data: any) => {
      if (data?.unchanged) {
        toast({ title: "No Changes", description: "Configuration is already saved." });
      } else {
        toast({ title: "Configuration Saved", description: "SMTP settings have been saved successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    },
  });

  const testConnection = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      const { data, error } = await supabase.functions.invoke("test-smtp-connection", { body: config });
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

  const { data: emailLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabaseCustom
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as EmailLog[];
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Service Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Send and manage transactional emails via SMTP</p>
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
                  <Input id="smtp-host" value={smtpForm.host} onChange={(e) => setSmtpForm(p => ({ ...p, host: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input id="smtp-port" type="number" value={smtpForm.port} onChange={(e) => setSmtpForm(p => ({ ...p, port: parseInt(e.target.value) || 587 }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username / Email</Label>
                  <Input id="smtp-user" type="email" value={smtpForm.username} onChange={(e) => setSmtpForm(p => ({ ...p, username: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">SMTP Password / App Password</Label>
                  <div className="relative">
                    <Input id="smtp-pass" type={showPassword ? "text" : "password"} value={smtpForm.password} onChange={(e) => setSmtpForm(p => ({ ...p, password: e.target.value }))} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-security">Security</Label>
                  <Select value={smtpForm.security} onValueChange={(v) => setSmtpForm(p => ({ ...p, security: v }))}>
                    <SelectTrigger id="smtp-security"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (Port 587)</SelectItem>
                      <SelectItem value="SSL">SSL (Port 465)</SelectItem>
                      <SelectItem value="NONE">None (Port 25)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input id="from-email" type="email" value={smtpForm.from_email} onChange={(e) => setSmtpForm(p => ({ ...p, from_email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input id="from-name" value={smtpForm.from_name} onChange={(e) => setSmtpForm(p => ({ ...p, from_name: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => saveConfig.mutate(smtpForm)} disabled={saveConfig.isPending}>
                  {saveConfig.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Save Configuration</>)}
                </Button>
                <Button variant="outline" onClick={() => testConnection.mutate(smtpForm)} disabled={testConnection.isPending || !smtpForm.host || !smtpForm.username || !smtpForm.password}>
                  {testConnection.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</>) : (<><Plug className="h-4 w-4 mr-2" />Test Connection</>)}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                      <td className="py-2 pr-4"><Badge variant="outline" className="text-xs">{log.template_name}</Badge></td>
                      <td className="py-2 pr-4 max-w-[200px] truncate">{log.subject}</td>
                      <td className="py-2 pr-4">{statusBadge(log.status)}</td>
                      <td className="py-2 pr-4 text-center">{log.attempts}</td>
                      <td className="py-2 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
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
