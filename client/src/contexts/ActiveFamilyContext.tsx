import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Family } from '@shared/schema';

interface ActiveFamilyContextType {
  activeFamilyId: string | null;
  setActiveFamilyId: (familyId: string) => void;
  activeFamily: Family | null;
  setActiveFamily: (family: Family | null) => void;
  isLoadingFamily: boolean;
}

const ActiveFamilyContext = createContext<ActiveFamilyContextType | undefined>(undefined);

const ACTIVE_FAMILY_KEY = 'kindora-active-family-id';

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [activeFamily, setActiveFamily] = useState<Family | null>(null);

  // Fetch all families for the user
  const { data: families, isLoading: isLoadingFamilies } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  // Hydrate activeFamilyId from localStorage and set default family
  useEffect(() => {
    if (families && families.length > 0) {
      let familyIdToSet: string | null = null;

      // Try to read from localStorage first (client-side only)
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(ACTIVE_FAMILY_KEY);
        // Verify the stored family still exists in the user's families
        if (stored && families.find(f => f.id === stored)) {
          familyIdToSet = stored;
        }
      }

      // If no valid stored family, default to the first one
      if (!familyIdToSet) {
        familyIdToSet = families[0].id;
      }

      // Set the active family
      setActiveFamilyIdState(familyIdToSet);
      const family = families.find(f => f.id === familyIdToSet);
      if (family) {
        setActiveFamily(family);
      }

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_FAMILY_KEY, familyIdToSet);
      }
    }
  }, [families]);

  const setActiveFamilyId = (familyId: string) => {
    setActiveFamilyIdState(familyId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_FAMILY_KEY, familyId);
    }
  };

  return (
    <ActiveFamilyContext.Provider value={{ 
      activeFamilyId, 
      setActiveFamilyId, 
      activeFamily, 
      setActiveFamily,
      isLoadingFamily: isLoadingFamilies 
    }}>
      {children}
    </ActiveFamilyContext.Provider>
  );
}

export function useActiveFamily() {
  const context = useContext(ActiveFamilyContext);
  if (context === undefined) {
    throw new Error('useActiveFamily must be used within an ActiveFamilyProvider');
  }
  return context;
}
