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
import { useLocation } from "wouter";

export default function FamilySelector() {
  const { activeFamilyId, setActiveFamilyId, activeFamily, setActiveFamily } = useActiveFamily();
  const [, setLocation] = useLocation();
  
  const { data: families, isLoading } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  // Helper to check if a family is a care/eldercare family
  const isCareFamily = (family: Family) => {
    const name = family.name.toLowerCase();
    return name.includes('care') || name.includes('elder') || name.includes("mom's") || name.includes("dad's");
  };

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
      
      // Navigate to appropriate default view based on family type
      if (isCareFamily(family)) {
        // Care families default to the caregiver dashboard
        setLocation('/care');
      } else {
        // Standard families default to the calendar view
        setLocation('/');
      }
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
        className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[280px] bg-white/10 border-white/30 text-white hover-elevate text-sm min-h-[36px]"
        data-testid="select-family"
      >
        <SelectValue>
          <span className="truncate">{activeFamily?.name || "Select Calendar"}</span>
        </SelectValue>
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
