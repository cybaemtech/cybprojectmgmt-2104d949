import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Shield, Mail, ShieldAlert } from "lucide-react";
import AccessManagementSection from "@/components/configuration/access-management-section";
import EmailSettingsSection from "@/components/configuration/email-settings-section";

export default function ConfigurationPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabaseCustom.from("profiles").select("role").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = profile?.role === "ADMIN" || user?.role === "ADMIN";

  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "email" ? "email" : "access";
  }, [location.search]);

  const [tab, setTab] = useState<string>(initialTab);

  const handleTabChange = (v: string) => {
    setTab(v);
    const params = new URLSearchParams(location.search);
    params.set("tab", v);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground">Configuration is only available to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Configuration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage application-wide access controls and integrations.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="access" className="gap-2">
            <Shield className="h-4 w-4" /> Access Level Management
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" /> Email Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-6">
          <AccessManagementSection />
        </TabsContent>
        <TabsContent value="email" className="mt-6">
          <EmailSettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
