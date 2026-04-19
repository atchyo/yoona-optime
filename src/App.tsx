import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { AppShell } from "./components/AppShell";
import type { Route } from "./components/AppShell";
import {
  careProfiles as seedCareProfiles,
  familyMembers as seedFamilyMembers,
  medicationSchedules,
  medications as seedMedications,
} from "./data/demoData";
import { DashboardPage } from "./pages/DashboardPage";
import { FamilyAdminPage } from "./pages/FamilyAdminPage";
import { LoginPage } from "./pages/LoginPage";
import { MedicationScanPage } from "./pages/MedicationScanPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { RemindersPage } from "./pages/RemindersPage";
import { RuleChatPage } from "./pages/RuleChatPage";
import { ServiceAdminPage } from "./pages/ServiceAdminPage";
import { signOutSupabase, supabase } from "./services/supabaseClient";
import {
  clearUser,
  loadCareProfiles,
  loadCurrentProfileId,
  loadFamilyMembers,
  loadMedications,
  loadScans,
  loadTemporaryMedications,
  loadTheme,
  loadUser,
  saveCareProfiles,
  saveCurrentProfileId,
  saveFamilyMembers,
  saveMedications,
  saveScans,
  saveTemporaryMedications,
  saveTheme,
  saveUser,
} from "./storage";
import type {
  CareProfile,
  DemoUser,
  FamilyMember,
  Medication,
  MedicationLog,
  OcrScan,
  TemporaryMedication,
  ThemeMode,
} from "./types";

const basePath = "/yoona-app";

export function App(): ReactElement {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [user, setUser] = useState<DemoUser | null>(() => loadUser());
  const [route, setRoute] = useState<Route>(() => getInitialRoute());
  const [careProfileList, setCareProfileList] = useState<CareProfile[]>(() =>
    migrateDemoCareProfiles(loadCareProfiles(seedCareProfiles)),
  );
  const [currentProfileId, setCurrentProfileId] = useState(() =>
    loadCurrentProfileId(seedCareProfiles[0].id),
  );
  const [medications, setMedications] = useState<Medication[]>(() =>
    loadMedications(seedMedications),
  );
  const [temporaryMedications, setTemporaryMedications] = useState<TemporaryMedication[]>(() =>
    loadTemporaryMedications([]),
  );
  const [scans, setScans] = useState<OcrScan[]>(() => loadScans([]));
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() =>
    migrateDemoFamilyMembers(loadFamilyMembers(seedFamilyMembers)),
  );
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  const currentProfile = useMemo(
    () =>
      careProfileList.find((profile) => profile.id === currentProfileId) ||
      careProfileList[0] ||
      seedCareProfiles[0],
    [careProfileList, currentProfileId],
  );
  const displayCareProfiles = useMemo(
    () => careProfileList.map((profile) => displayProfileForUser(profile, user, familyMembers)),
    [careProfileList, familyMembers, user],
  );
  const registrationCareProfiles = useMemo(
    () => profilesAvailableForMedicationRegistration(careProfileList, user).map((profile) =>
      displayProfileForUser(profile, user, familyMembers),
    ),
    [careProfileList, familyMembers, user],
  );
  const displayCurrentProfile = useMemo(
    () => displayProfileForUser(currentProfile, user, familyMembers),
    [currentProfile, familyMembers, user],
  );
  const loggedInUserProfile = useMemo(() => {
    const selfProfile =
      careProfileList.find((profile) => profile.ownerUserId === user?.id) ||
      careProfileList.find((profile) => profile.type === "self") ||
      currentProfile;
    return displayProfileForUser(selfProfile, user, familyMembers);
  }, [careProfileList, currentProfile, familyMembers, user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    saveCareProfiles(careProfileList);
  }, [careProfileList]);

  useEffect(() => {
    saveTemporaryMedications(temporaryMedications);
  }, [temporaryMedications]);

  useEffect(() => {
    saveScans(scans);
  }, [scans]);

  useEffect(() => {
    saveFamilyMembers(familyMembers);
  }, [familyMembers]);

  useEffect(() => {
    const onPopState = (): void => setRoute(getRouteFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    async function syncSupabaseSession(): Promise<void> {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      const nextUser = mapSupabaseUser(data.session.user);
      saveUser(nextUser);
      setUser(nextUser);
      if (user?.id !== nextUser.id) selectDefaultProfileForUser(nextUser);
    }

    void syncSupabaseSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;
      const nextUser = mapSupabaseUser(session.user);
      saveUser(nextUser);
      setUser(nextUser);
      if (user?.id !== nextUser.id) selectDefaultProfileForUser(nextUser);
      if (route === "/login") {
        pushRoute("/");
        setRoute("/");
      }
    });

    return () => data.subscription.unsubscribe();
  }, [route]);

  useEffect(() => {
    if (!user && route !== "/login") {
      setRoute("/login");
      replaceRoute("/login");
    }

    if (user?.role !== "admin" && route === "/service-admin") {
      setRoute("/");
      replaceRoute("/");
    }

    if (user && user.familyRole === "member" && route === "/family") {
      setRoute("/");
      replaceRoute("/");
    }
  }, [route, user]);

  function navigate(nextRoute: Route): void {
    if (!user && nextRoute !== "/login") {
      pushRoute("/login");
      setRoute("/login");
      return;
    }

    if (nextRoute === "/service-admin" && user?.role !== "admin") {
      pushRoute("/");
      setRoute("/");
      return;
    }

    if (nextRoute === "/family" && user?.familyRole === "member") {
      pushRoute("/");
      setRoute("/");
      return;
    }

    pushRoute(nextRoute);
    setRoute(nextRoute);
  }

  function handleDemoLogin(nextUser: DemoUser): void {
    saveUser(nextUser);
    setUser(nextUser);
    selectDefaultProfileForUser(nextUser);
    pushRoute("/");
    setRoute("/");
  }

  async function handleLogout(): Promise<void> {
    await signOutSupabase();
    clearUser();
    setUser(null);
    navigate("/login");
  }

  function handleProfileChange(profileId: string): void {
    saveCurrentProfileId(profileId);
    setCurrentProfileId(profileId);
  }

  function selectDefaultProfileForUser(nextUser: DemoUser): void {
    const nextProfileId = defaultProfileIdForUser(careProfileList, nextUser, "");
    saveCurrentProfileId(nextProfileId);
    setCurrentProfileId(nextProfileId);
  }

  function handleConfirmMedication(medication: Medication, scan: OcrScan): void {
    setMedications((current) => [medication, ...current]);
    setScans((current) => [scan, ...current]);
    handleProfileChange(medication.careProfileId);
  }

  function handleCreateTemporaryMedication(
    medication: TemporaryMedication,
    scan: OcrScan,
  ): void {
    setTemporaryMedications((current) => [medication, ...current]);
    setScans((current) => [scan, ...current]);
    handleProfileChange(medication.careProfileId);
  }

  function handleMarkTaken(scheduleId: string): void {
    const schedule = medicationSchedules.find((item) => item.id === scheduleId);
    if (!schedule) return;

    setLogs((current) => [
      {
        id: crypto.randomUUID(),
        medicationId: schedule.medicationId,
        scheduleId: schedule.id,
        takenAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  function handleUpdateFamilyMember(memberId: string, patch: Partial<FamilyMember>): void {
    setFamilyMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    );
  }

  function handleAddCareProfile(profile: CareProfile): void {
    setCareProfileList((current) => [profile, ...current]);
    handleProfileChange(profile.id);
  }

  function handleUpdateCareProfile(profileId: string, patch: Partial<CareProfile>): void {
    setCareProfileList((current) =>
      current.map((profile) => (profile.id === profileId ? { ...profile, ...patch } : profile)),
    );
  }

  function handleDeleteCareProfile(profileId: string): void {
    const targetProfile = careProfileList.find((profile) => profile.id === profileId);
    if (!targetProfile || targetProfile.type !== "pet") return;

    setCareProfileList((current) => current.filter((profile) => profile.id !== profileId));
    setMedications((current) => current.filter((medication) => medication.careProfileId !== profileId));
    setTemporaryMedications((current) =>
      current.filter((medication) => medication.careProfileId !== profileId),
    );
    setScans((current) => current.filter((scan) => scan.careProfileId !== profileId));

    if (currentProfileId === profileId) {
      const nextProfileId = defaultProfileIdForUser(careProfileList, user, profileId);
      handleProfileChange(nextProfileId);
    }
  }

  if (!user || route === "/login") {
    return (
      <LoginPage
        onDemoLogin={handleDemoLogin}
        onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        theme={theme}
      />
    );
  }

  return (
    <AppShell
      currentProfile={displayCurrentProfile}
      onLogout={() => void handleLogout()}
      onNavigate={navigate}
      onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
      route={route}
      theme={theme}
      user={user}
    >
      {route === "/" && (
        <DashboardPage
          currentProfile={loggedInUserProfile}
          medications={medications}
          onNavigateScan={() => navigate("/scan")}
          scans={scans}
          schedules={medicationSchedules}
        />
      )}
      {route === "/scan" && (
        <MedicationScanPage
          careProfiles={registrationCareProfiles}
          currentProfile={displayCurrentProfile}
          onConfirmMedication={handleConfirmMedication}
          onCreateTemporaryMedication={handleCreateTemporaryMedication}
        />
      )}
      {route === "/profiles" && (
        <ProfilesPage
          careProfiles={displayCareProfiles}
          currentProfileId={currentProfile.id}
          familyMembers={familyMembers}
          medications={medications}
          onProfileChange={handleProfileChange}
          schedules={medicationSchedules}
          temporaryMedications={temporaryMedications}
        />
      )}
      {route === "/reminders" && (
        <RemindersPage
          currentProfile={loggedInUserProfile}
          medications={medications}
          onMarkTaken={handleMarkTaken}
          schedules={medicationSchedules}
        />
      )}
      {route === "/chat" && (
        <RuleChatPage currentProfile={loggedInUserProfile} medications={medications} />
      )}
      {route === "/family" && (
        <FamilyAdminPage
          careProfiles={careProfileList}
          familyMembers={familyMembers}
          medications={medications}
          onAddCareProfile={handleAddCareProfile}
          onDeleteCareProfile={handleDeleteCareProfile}
          onUpdateCareProfile={handleUpdateCareProfile}
          onUpdateMember={handleUpdateFamilyMember}
          scans={scans}
          temporaryMedications={temporaryMedications}
          user={user}
        />
      )}
      {route === "/service-admin" && user.role === "admin" && <ServiceAdminPage />}
      {logs.length > 0 && (
        <p className="sr-only">최근 복용 완료 기록 {logs.length}건</p>
      )}
    </AppShell>
  );
}

function getInitialRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  const redirectedRoute = params.get("route");
  if (redirectedRoute) {
    const route = normalizeRoute(redirectedRoute);
    replaceRoute(route);
    return route;
  }

  return getRouteFromLocation();
}

function getRouteFromLocation(): Route {
  const path = window.location.pathname.replace(basePath, "") || "/";
  return normalizeRoute(path);
}

function normalizeRoute(path: string): Route {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (
    [
      "/",
      "/scan",
      "/profiles",
      "/reminders",
      "/chat",
      "/family",
      "/service-admin",
      "/login",
    ].includes(normalized)
  ) {
    return normalized as Route;
  }
  return "/";
}

function pushRoute(route: Route): void {
  window.history.pushState({}, "", `${basePath}${route === "/" ? "/" : route}`);
}

function replaceRoute(route: Route): void {
  window.history.replaceState({}, "", `${basePath}${route === "/" ? "/" : route}`);
}

function displayProfileForUser(
  profile: CareProfile,
  user: DemoUser | null,
  familyMembers: FamilyMember[],
): CareProfile {
  if (profile.name === "나") {
    const ownerName = familyMembers.find((member) => member.userId === profile.ownerUserId)?.displayName;
    if (ownerName) return { ...profile, name: ownerName };
    if (user?.name && (!profile.ownerUserId || profile.ownerUserId === user.id)) {
      return { ...profile, name: user.name };
    }
  }

  return profile;
}

function profilesAvailableForMedicationRegistration(
  profiles: CareProfile[],
  user: DemoUser | null,
): CareProfile[] {
  if (!user) return [];
  if (user.familyRole === "owner" || user.familyRole === "manager" || user.role === "admin") {
    return profiles;
  }

  const ownProfiles = profiles.filter((profile) => profile.ownerUserId === user.id);
  return ownProfiles.length ? ownProfiles : profiles.filter((profile) => profile.name === "나");
}

function defaultProfileIdForUser(
  profiles: CareProfile[],
  user: DemoUser | null,
  excludedProfileId: string,
): string {
  const nextProfiles = profiles.filter((profile) => profile.id !== excludedProfileId);
  return (
    nextProfiles.find((profile) => profile.ownerUserId === user?.id)?.id ||
    nextProfiles.find((profile) => profile.type === "self")?.id ||
    nextProfiles[0]?.id ||
    seedCareProfiles[0].id
  );
}

function mapSupabaseUser(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): DemoUser {
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "가족 구성원",
    role: "user",
    familyRole: "owner",
    email: user.email || "",
  };
}

function migrateDemoFamilyMembers(members: FamilyMember[]): FamilyMember[] {
  return members.map((member) => {
    if (member.userId === "user-owner" && member.displayName === "가족 대표") {
      return {
        ...member,
        displayName: "김정웅",
        email: member.email === "owner@optime.family" ? "jungwoong@optime.family" : member.email,
      };
    }

    if (member.userId === "user-member" && member.displayName === "어머니") {
      return {
        ...member,
        displayName: "공윤아",
        email: member.email === "member@optime.family" ? "yoona@optime.family" : member.email,
      };
    }

    return member;
  });
}

function migrateDemoCareProfiles(profiles: CareProfile[]): CareProfile[] {
  return profiles.map((profile) => {
    if (profile.id === "profile-self") {
      return { ...profile, ownerUserId: "user-owner", name: profile.name || "나" };
    }

    if (profile.id === "profile-mother") {
      return {
        ...profile,
        ownerUserId: "user-member",
        name: profile.name === "어머니" ? "공윤아" : profile.name,
        type: "self",
      };
    }

    return profile;
  });
}
