import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Shield, Users as UsersIcon, Search, Lock } from "lucide-react";
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

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean | null;
}

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

  // Load saved permissions
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

  // Users list for role assignment
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["all-profiles-for-access"],
    queryFn: async () => {
      const { data, error } = await supabaseCustom
        .from("profiles")
        .select("id, email, full_name, role, is_active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data || []) as ProfileRow[];
    },
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabaseCustom.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role updated" });
      qc.invalidateQueries({ queryKey: ["all-profiles-for-access"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Update failed", description: e.message }),
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
            Decide which sidebar pages each role can access. Admins always have full access.
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

      {/* User role assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-emerald-500" />
            User Role Assignment
          </CardTitle>
          <CardDescription>Promote or demote any user. Their effective permissions follow their role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium">{u.full_name || "—"}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                      <td className="py-2 pr-4">
                        {u.is_active ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateRole.mutate({ id: u.id, role: v as UserRole })}
                        >
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
