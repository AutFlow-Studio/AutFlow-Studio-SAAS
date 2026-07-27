import React, { createContext, useContext, useEffect, useState } from "react";

export interface AgencyProfile {
  agencyName: string;
  agencyEmail: string;
  website: string;
  businessType: string | null;
}

type AgencyProfileProviderState = {
  profile: AgencyProfile;
  setProfile: (profile: Partial<AgencyProfile>) => Promise<void>;
};

export const DEFAULT_AGENCY_PROFILE: AgencyProfile = {
  agencyName: "AutFlow Studio",
  agencyEmail: "hello@autflowstudio.com",
  website: "https://autflowstudio.com",
  businessType: null,
};

const AgencyProfileProviderContext = createContext<
  AgencyProfileProviderState | undefined
>(undefined);

function mapApiToProfile(data: Record<string, unknown>): AgencyProfile {
  return {
    agencyName: String(data.agencyName ?? "AutFlow Studio"),
    agencyEmail: String(data.agencyEmail ?? "hello@autflowstudio.com"),
    website: String(data.website ?? ""),
    businessType: data.businessType ? String(data.businessType) : null,
  };
}

export function AgencyProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfileState] = useState<AgencyProfile>(DEFAULT_AGENCY_PROFILE);

  useEffect(() => {
    fetch("/api/settings/agency", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          try {
            const raw = window.localStorage.getItem("autflow-studio-agency-profile");
            if (raw) setProfileState((p) => ({ ...p, ...JSON.parse(raw) }));
          } catch { /* ignore */ }
          return;
        }

        const fromApi = mapApiToProfile(data);

        // One-time localStorage migration
        const isDefault =
          fromApi.agencyName === DEFAULT_AGENCY_PROFILE.agencyName &&
          fromApi.agencyEmail === DEFAULT_AGENCY_PROFILE.agencyEmail;

        if (isDefault) {
          try {
            const raw = window.localStorage.getItem("autflow-studio-agency-profile");
            if (raw) {
              const local = JSON.parse(raw) as Partial<AgencyProfile>;
              if (local.agencyName || local.agencyEmail || local.website) {
                const merged = { ...DEFAULT_AGENCY_PROFILE, ...local };
                fetch("/api/settings/agency", {
                  method: "PUT",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(merged),
                }).catch(() => {});
                window.localStorage.removeItem("autflow-studio-agency-profile");
                setProfileState(merged);
                return;
              }
            }
          } catch { /* ignore */ }
        }

        setProfileState(fromApi);
      })
      .catch(() => {
        try {
          const raw = window.localStorage.getItem("autflow-studio-agency-profile");
          if (raw) setProfileState((p) => ({ ...p, ...JSON.parse(raw) }));
        } catch { /* ignore */ }
      });
  }, []);

  const setProfile = async (next: Partial<AgencyProfile>): Promise<void> => {
    const merged = { ...profile, ...next };
    const res = await fetch("/api/settings/agency", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
    if (res.ok) {
      const data = await res.json();
      setProfileState(mapApiToProfile(data));
    } else {
      setProfileState(merged);
    }
  };

  return (
    <AgencyProfileProviderContext.Provider value={{ profile, setProfile }}>
      {children}
    </AgencyProfileProviderContext.Provider>
  );
}

export const useAgencyProfile = () => {
  const context = useContext(AgencyProfileProviderContext);
  if (context === undefined)
    throw new Error("useAgencyProfile must be used within an AgencyProfileProvider");
  return context;
};
