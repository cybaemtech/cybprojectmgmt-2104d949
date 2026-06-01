import { useQuery } from "@tanstack/react-query";
import { supabaseCustom } from "@/lib/supabase-custom";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PERMISSIONS,
  rowsToMap,
  type FeatureKey,
  type PageKey,
  type PermissionMap,
  type RolePermissionRow,
} from "@/lib/permissions";
import type { UserRole } from "@/types/schema";

export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async (): Promise<PermissionMap> => {
      const { data, error } = await supabaseCustom
        .from("role_permissions")
        .select("role, allowed_pages, allowed_features, updated_at");
      if (error) {
        // Table missing or RLS blocked → fall back to defaults
        return DEFAULT_PERMISSIONS;
      }
      return rowsToMap(data as RolePermissionRow[]);
    },
    staleTime: 60_000,
  });
}

export function usePermissions() {
  const { user } = useAuth();
  const { data: perms } = useRolePermissions();
  const role = (user?.role ?? "USER") as UserRole;
  const map = perms ?? DEFAULT_PERMISSIONS;
  const entry = map[role] ?? DEFAULT_PERMISSIONS.USER;

  return {
    role,
    isAdmin: role === "ADMIN",
    canViewPage: (key: PageKey) => role === "ADMIN" || entry.pages.has(key),
    hasFeature: (key: FeatureKey) => role === "ADMIN" || entry.features.has(key),
  };
}
