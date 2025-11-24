import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery } from "@tanstack/react-query";
import type { Family } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";

export default function FamilySelector() {
  const { activeFamilyId, setActiveFamilyId, activeFamily, setActiveFamily } = useActiveFamily();
  
  const { data: families, isLoading } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  useEffect(() => {
    if (families && families.length > 0) {
      // If no active family is selected, or selected family is not in the list, default to first one
      if (!activeFamilyId || !families.find(f => f.id === activeFamilyId)) {
        const defaultFamily = families[0];
        setActiveFamilyId(defaultFamily.id);
        setActiveFamily(defaultFamily);
      } else {
        // Update the active family object based on the ID
        const family = families.find(f => f.id === activeFamilyId);
        if (family) {
          setActiveFamily(family);
        }
      }
    }
  }, [families, activeFamilyId, setActiveFamilyId, setActiveFamily]);

  const handleFamilyChange = (familyId: string) => {
    const family = families?.find(f => f.id === familyId);
    if (family) {
      setActiveFamilyId(familyId);
      setActiveFamily(family);
    }
  };

  if (isLoading || !families || families.length === 0) {
    return null;
  }

  // Don't show selector if user only belongs to one family
  if (families.length === 1) {
    return null;
  }

  return (
    <Select value={activeFamilyId || undefined} onValueChange={handleFamilyChange}>
      <SelectTrigger 
        className="w-[200px] bg-white/10 border-white/30 text-white hover-elevate"
        data-testid="select-family"
      >
        <SelectValue placeholder="Select family" />
      </SelectTrigger>
      <SelectContent>
        {families.map((family) => (
          <SelectItem key={family.id} value={family.id} data-testid={`option-family-${family.id}`}>
            {family.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
