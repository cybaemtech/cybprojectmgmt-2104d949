import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Shield, Lock } from "lucide-react";
import {
  PAGES,
  FEATURES,
  ROLES,
  DEFAULT_PERMISSIONS,
  rowsToMap,
  type PageKey,
  type FeatureKey,
  type RolePermissionRow,
} from "@/lib/permissions";
import type { UserRole } from "@/types/schema";

type DraftMap = Record<UserRole, { pages: Set<PageKey>; features: Set<FeatureKey> }>;

function cloneMap(src: DraftMap): DraftMap {
  return {
    ADMIN: { pages: new Set(src.ADMIN.pages), features: new Set(src.ADMIN.features) },
    SCRUM_MASTER: { pages: new Set(src.SCRUM_MASTER.pages), features: new Set(src.SCRUM_MASTER.features) },
    USER: { pages: new Set(src.USER.pages), features: new Set(src.USER.features) },
  };
}

export default function AccessManagementSection() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: serverMap, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabaseCustom
        .from("role_permissions")
        .select("role, allowed_pages, allowed_features, updated_at");
      if (error) return DEFAULT_PERMISSIONS;
      return rowsToMap(data as RolePermissionRow[]);
    },
  });

  const [draft, setDraft] = useState<DraftMap>(() => cloneMap(DEFAULT_PERMISSIONS));
  useEffect(() => {
    if (serverMap) setDraft(cloneMap(serverMap));
  }, [serverMap]);

  const togglePage = (role: UserRole, key: PageKey) => {
    if (role === "ADMIN") return;
    setDraft((prev) => {
      const next = cloneMap(prev);
      if (next[role].pages.has(key)) next[role].pages.delete(key);
      else next[role].pages.add(key);
      return next;
    });
  };
  const toggleFeature = (role: UserRole, key: FeatureKey) => {
    if (role === "ADMIN") return;
    setDraft((prev) => {
      const next = cloneMap(prev);
      if (next[role].features.has(key)) next[role].features.delete(key);
      else next[role].features.add(key);
      return next;
    });
  };

  const savePerms = useMutation({
    mutationFn: async () => {
      const rows = (Object.keys(draft) as UserRole[]).map((role) => ({
        role,
        allowed_pages: Array.from(draft[role].pages),
        allowed_features: Array.from(draft[role].features),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabaseCustom.from("role_permissions").upsert(rows, { onConflict: "role" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Access updated", description: "Role permissions have been saved." });
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Save failed", description: e.message }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            Page Visibility by Role
          </CardTitle>
          <CardDescription>
            Decide which sidebar pages each role can access. Admins always have full access. User role assignment is managed from <strong>Manage Team</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Page</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="py-2 px-3 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.label}
                        {r.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PAGES.map((p) => (
                  <tr key={p.key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="py-2 px-3 text-center">
                        <Checkbox
                          checked={r.locked ? true : draft[r.key].pages.has(p.key)}
                          disabled={r.locked}
                          onCheckedChange={() => togglePage(r.key, p.key)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Feature Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-500" />
            Feature Permissions by Role
          </CardTitle>
          <CardDescription>
            Fine-grained actions each role can perform. Components will respect these flags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="py-2 px-3 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.label}
                        {r.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.key} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.description}</div>
                    </td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="py-2 px-3 text-center">
                        <Checkbox
                          checked={r.locked ? true : draft[r.key].features.has(f.key)}
                          disabled={r.locked}
                          onCheckedChange={() => toggleFeature(r.key, f.key)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => savePerms.mutate()} disabled={savePerms.isPending}>
              {savePerms.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Save Access Settings</>)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
