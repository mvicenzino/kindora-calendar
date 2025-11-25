import { useQuery } from "@tanstack/react-query";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";

interface RoleResponse {
  role: string;
}

export function useUserRole() {
  const { isAuthenticated } = useAuth();
  const { activeFamilyId } = useActiveFamily();

  const { data, isLoading } = useQuery<RoleResponse>({
    queryKey: [`/api/family/${activeFamilyId}/role`],
    enabled: isAuthenticated && !!activeFamilyId,
  });

  return {
    role: data?.role,
    isOwner: data?.role === 'owner',
    isMember: data?.role === 'member',
    isCaregiver: data?.role === 'caregiver',
    isLoading
  };
}
