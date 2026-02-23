import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_PERMISSIONS, type FamilyRole } from "@shared/schema";

type Permissions = typeof ROLE_PERMISSIONS[FamilyRole];

interface RoleResponse {
  role: string;
  permissions: Permissions | null;
}

export function useUserRole() {
  const { isAuthenticated } = useAuth();
  const { activeFamilyId } = useActiveFamily();

  const { data, isLoading, isFetching } = useQuery<RoleResponse>({
    queryKey: ['/api/family', activeFamilyId, 'role'],
    enabled: isAuthenticated && !!activeFamilyId,
  });

  const permissions = data?.permissions ?? null;

  return {
    role: data?.role as FamilyRole | undefined,
    isOwner: data?.role === 'owner',
    isMember: data?.role === 'member',
    isCaregiver: data?.role === 'caregiver',
    isLoading: isLoading || isFetching,
    activeFamilyId,
    permissions,
    can: (permission: keyof Permissions) => permissions?.[permission] ?? false,
  };
}
