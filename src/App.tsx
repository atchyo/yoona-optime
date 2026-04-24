import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { AppShell } from "./components/AppShell";
import type { Route } from "./components/AppShell";
import {
  careProfiles as seedCareProfiles,
  familyMembers as seedFamilyMembers,
  medicationSchedules,
  medications as seedMedications,
  workspace as seedWorkspace,
} from "./data/demoData";
import { DashboardPage } from "./pages/DashboardPage";
import { FamilyAdminPage } from "./pages/FamilyAdminPage";
import { LoginPage } from "./pages/LoginPage";
import { MedicationScanPage } from "./pages/MedicationScanPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { RemindersPage } from "./pages/RemindersPage";
import { RuleChatPage } from "./pages/RuleChatPage";
import { ServiceAdminPage } from "./pages/ServiceAdminPage";
import { appConfig } from "./config";
import { syncDrugCatalog as syncRemoteDrugCatalog } from "./services/drugSearch";
import {
  createRemoteCareProfile,
  createRemoteFamilyMember,
  deleteRemoteCareProfile,
  deleteRemoteFamilyMember,
  deleteRemoteMedication,
  loadRemoteAppData,
  saveConfirmedMedication,
  saveTemporaryMedication,
  updateRemoteCareProfile,
  updateRemoteFamilyMember,
} from "./services/supabaseData";
import type { RemoteAppData } from "./services/supabaseData";
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
  FamilyWorkspace,
  Medication,
  MedicationLog,
  OcrScan,
  TemporaryMedication,
  ThemeMode,
} from "./types";

const basePath = appConfig.basePath;

export function App(): ReactElement {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [user, setUser] = useState<DemoUser | null>(() => loadUser());
  const [authResolved, setAuthResolved] = useState<boolean>(() => !supabase);
  const [dataResolved, setDataResolved] = useState<boolean>(() => !supabase);
  const [route, setRoute] = useState<Route>(() => getInitialRoute());
  const [familyWorkspace, setFamilyWorkspace] = useState<FamilyWorkspace>(seedWorkspace);
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
    migrateDemoFamilyMembers(loadFamilyMembers(seedFamilyMembers), migrateDemoCareProfiles(loadCareProfiles(seedCareProfiles))),
  );
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  const currentProfile = useMemo(
    () =>
      careProfileList.find((profile) => profile.id === currentProfileId) ||
      careProfileList[0] ||
      seedCareProfiles[0],
    [careProfileList, currentProfileId],
  );
  const accessibleCareProfiles = useMemo(
    () => profilesAvailableForViewing(careProfileList, user, familyMembers),
    [careProfileList, familyMembers, user],
  );
  const displayCareProfiles = useMemo(
    () => accessibleCareProfiles.map((profile) => displayProfileForUser(profile, user, familyMembers)),
    [accessibleCareProfiles, familyMembers, user],
  );
  const registrationCareProfiles = useMemo(
    () => profilesAvailableForMedicationRegistration(careProfileList, user, familyMembers).map((profile) =>
      displayProfileForUser(profile, user, familyMembers),
    ),
    [careProfileList, familyMembers, user],
  );
  const displayCurrentProfile = useMemo(
    () => displayProfileForUser(currentProfile, user, familyMembers),
    [currentProfile, familyMembers, user],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    if (!supabase) saveCareProfiles(careProfileList);
  }, [careProfileList]);

  useEffect(() => {
    if (!supabase) saveTemporaryMedications(temporaryMedications);
  }, [temporaryMedications]);

  useEffect(() => {
    if (!supabase) saveScans(scans);
  }, [scans]);

  useEffect(() => {
    if (!supabase) saveFamilyMembers(familyMembers);
  }, [familyMembers]);

  useEffect(() => {
    const onPopState = (): void => setRoute(getRouteFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthResolved(true);
      return;
    }

    function applyAuthenticatedUser(nextUser: DemoUser): void {
      saveUser(nextUser);
      setUser((current) => {
        if (current?.id !== nextUser.id) {
          selectDefaultProfileForUser(nextUser);
        }
        return nextUser;
      });

      if (getRouteFromLocation() === "/login") {
        replaceRoute("/");
        setRoute("/");
      }
    }

    async function syncSupabaseSession(): Promise<void> {
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        applyAuthenticatedUser(mapSupabaseUser(data.session.user));
      }
      setAuthResolved(true);
    }

    void syncSupabaseSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applyAuthenticatedUser(mapSupabaseUser(session.user));
      } else {
        setDataResolved(true);
      }
      setAuthResolved(true);
    });

    return () => data.subscription.unsubscribe();
  }, [careProfileList]);

  useEffect(() => {
    if (!authResolved) return;

    if (!user && route !== "/login") {
      setRoute("/login");
      replaceRoute("/login");
    }

    if (user && route === "/login") {
      setRoute("/");
      replaceRoute("/");
    }

    if (user?.role !== "admin" && route === "/service-admin") {
      setRoute("/");
      replaceRoute("/");
    }

    if (user && user.familyRole === "member" && route === "/family") {
      setRoute("/");
      replaceRoute("/");
    }
  }, [authResolved, route, user]);

  useEffect(() => {
    if (!authResolved) return;

    if (!supabase) {
      setDataResolved(true);
      return;
    }

    if (!user) {
      setDataResolved(true);
      return;
    }

    const authenticatedUser = user;
    let isCancelled = false;

    async function syncRemoteWorkspace(): Promise<void> {
      setDataResolved(false);

      try {
        const remoteData = await loadRemoteAppData(authenticatedUser);
        if (isCancelled) return;

        applyRemoteData(remoteData);
      } catch (error) {
        console.error(error);
      } finally {
        if (!isCancelled) {
          setDataResolved(true);
        }
      }
    }

    void syncRemoteWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [authResolved, user?.id]);

  function applyRemoteData(remoteData: RemoteAppData): void {
    setFamilyWorkspace(remoteData.workspace);
    setFamilyMembers(remoteData.familyMembers);
    setCareProfileList(remoteData.careProfiles);
    setMedications(remoteData.medications);
    setTemporaryMedications(remoteData.temporaryMedications);
    setScans(remoteData.scans);
    setUser(remoteData.resolvedUser);

    const persistedProfileId = loadCurrentProfileId("");
    const availableProfiles = profilesAvailableForViewing(
      remoteData.careProfiles,
      remoteData.resolvedUser,
      remoteData.familyMembers,
    );
    const nextProfileId = availableProfiles.some((profile) => profile.id === persistedProfileId)
      ? persistedProfileId
      : defaultProfileIdForUser(availableProfiles, remoteData.resolvedUser, "");
    if (nextProfileId) {
      saveCurrentProfileId(nextProfileId);
      setCurrentProfileId(nextProfileId);
    }
  }

  async function refreshRemoteWorkspace(baseUser: DemoUser | null): Promise<void> {
    if (!supabase || !baseUser) return;
    const remoteData = await loadRemoteAppData(baseUser);
    applyRemoteData(remoteData);
  }

  useEffect(() => {
    if (!user || !accessibleCareProfiles.length) return;
    if (accessibleCareProfiles.some((profile) => profile.id === currentProfileId)) return;

    const nextProfileId = defaultProfileIdForUser(accessibleCareProfiles, user, "");
    saveCurrentProfileId(nextProfileId);
    setCurrentProfileId(nextProfileId);
  }, [accessibleCareProfiles, currentProfileId, user]);

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
    const nextProfileId = defaultProfileIdForUser(
      profilesAvailableForViewing(careProfileList, nextUser, familyMembers),
      nextUser,
      "",
    );
    saveCurrentProfileId(nextProfileId);
    setCurrentProfileId(nextProfileId);
  }

  async function handleConfirmMedication(medication: Medication, scan: OcrScan): Promise<void> {
    if (supabase) {
      const saved = await saveConfirmedMedication(medication, scan);
      setMedications((current) => [saved.medication, ...current.filter((item) => item.id !== saved.medication.id)]);
      setScans((current) => [saved.scan, ...current.filter((item) => item.id !== saved.scan.id)]);
      handleProfileChange(saved.medication.careProfileId);
      return;
    }

    setMedications((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.careProfileId === medication.careProfileId &&
          item.productName === medication.productName &&
          item.source === medication.source,
      );

      if (existingIndex === -1) {
        return [medication, ...current];
      }

      const next = [...current];
      next[existingIndex] = { ...next[existingIndex], ...medication, id: next[existingIndex].id };
      return next;
    });
    setScans((current) => [scan, ...current]);
    handleProfileChange(medication.careProfileId);
  }

  async function handleCreateTemporaryMedication(
    medication: TemporaryMedication,
    scan: OcrScan,
  ): Promise<void> {
    if (supabase) {
      const saved = await saveTemporaryMedication(medication, scan);
      setTemporaryMedications((current) => [
        saved.medication,
        ...current.filter((item) => item.id !== saved.medication.id),
      ]);
      setScans((current) => [saved.scan, ...current.filter((item) => item.id !== saved.scan.id)]);
      handleProfileChange(saved.medication.careProfileId);
      return;
    }

    setTemporaryMedications((current) => {
      const existingIndex = current.findIndex(
        (item) =>
          item.careProfileId === medication.careProfileId &&
          item.rawName === medication.rawName,
      );

      if (existingIndex === -1) {
        return [medication, ...current];
      }

      const next = [...current];
      next[existingIndex] = { ...next[existingIndex], ...medication, id: next[existingIndex].id };
      return next;
    });
    setScans((current) => [scan, ...current]);
    handleProfileChange(medication.careProfileId);
  }

  async function handleDeleteMedication(medicationId: string): Promise<void> {
    if (supabase) {
      await deleteRemoteMedication(medicationId);
    }

    setMedications((current) => current.filter((medication) => medication.id !== medicationId));
  }

  async function handleSyncDrugCatalog(): Promise<{
    source: string;
    fetchedCount: number;
    upsertedCount: number;
  }[]> {
    return syncRemoteDrugCatalog();
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

  async function handleUpdateFamilyMember(memberId: string, patch: Partial<FamilyMember>): Promise<void> {
    if (supabase) {
      const savedMember = await updateRemoteFamilyMember(memberId, patch);
      setFamilyMembers((current) =>
        current.map((member) => (member.id === memberId ? savedMember : member)),
      );
      await refreshRemoteWorkspace(user);
      return;
    }

    setFamilyMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    );
  }

  async function handleAddFamilyMember(
    member: Pick<FamilyMember, "displayName" | "email" | "role">,
  ): Promise<void> {
    if (supabase) {
      const savedMember = await createRemoteFamilyMember({
        workspaceId: familyWorkspace.id,
        displayName: member.displayName,
        email: member.email,
        role: member.role,
      });
      setFamilyMembers((current) => [
        ...current.filter((item) => item.id !== savedMember.id),
        savedMember,
      ]);
      await refreshRemoteWorkspace(user);
      return;
    }

    const profileId = `profile-member-${crypto.randomUUID()}`;
    const nextMember: FamilyMember = {
      id: `member-${crypto.randomUUID()}`,
      workspaceId: familyWorkspace.id,
      userId: "",
      role: member.role,
      displayName: member.displayName,
      email: member.email,
      accessibleProfileIds: [profileId],
      careProfileId: profileId,
    };
    const nextProfile: CareProfile = {
      id: profileId,
      workspaceId: familyWorkspace.id,
      name: member.displayName,
      type: "self",
      ageGroup: "40",
      notes: "가족 구성원 본인의 복용 기록입니다.",
    };

    setFamilyMembers((current) => [...current, nextMember]);
    setCareProfileList((current) => [...current, nextProfile]);
  }

  async function handleDeleteFamilyMember(memberId: string): Promise<void> {
    const targetMember = familyMembers.find((member) => member.id === memberId);
    if (!targetMember || targetMember.role === "owner") return;

    if (supabase) {
      await deleteRemoteFamilyMember(memberId);
      await refreshRemoteWorkspace(user);
      return;
    }

    setFamilyMembers((current) => current.filter((member) => member.id !== memberId));

    if (targetMember.careProfileId) {
      setCareProfileList((current) => current.filter((profile) => profile.id !== targetMember.careProfileId));
      setMedications((current) =>
        current.filter((medication) => medication.careProfileId !== targetMember.careProfileId),
      );
      setTemporaryMedications((current) =>
        current.filter((medication) => medication.careProfileId !== targetMember.careProfileId),
      );
      setScans((current) => current.filter((scan) => scan.careProfileId !== targetMember.careProfileId));

      if (currentProfileId === targetMember.careProfileId) {
        const nextProfileId = defaultProfileIdForUser(careProfileList, user, targetMember.careProfileId);
        handleProfileChange(nextProfileId);
      }
    }
  }

  async function handleAddCareProfile(profile: CareProfile): Promise<void> {
    if (supabase) {
      const savedProfile = await createRemoteCareProfile(profile);
      setCareProfileList((current) => [savedProfile, ...current]);
      handleProfileChange(savedProfile.id);
      return;
    }

    setCareProfileList((current) => [profile, ...current]);
    handleProfileChange(profile.id);
  }

  async function handleUpdateCareProfile(profileId: string, patch: Partial<CareProfile>): Promise<void> {
    if (supabase) {
      const savedProfile = await updateRemoteCareProfile(profileId, patch);
      setCareProfileList((current) =>
        current.map((profile) => (profile.id === profileId ? savedProfile : profile)),
      );
      return;
    }

    setCareProfileList((current) =>
      current.map((profile) => (profile.id === profileId ? { ...profile, ...patch } : profile)),
    );
  }

  async function handleDeleteCareProfile(profileId: string): Promise<void> {
    const targetProfile = careProfileList.find((profile) => profile.id === profileId);
    if (!targetProfile || targetProfile.type !== "pet") return;

    if (supabase) {
      await deleteRemoteCareProfile(profileId);
    }

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

  if (!authResolved) {
    return (
      <main className="auth-boot" aria-live="polite" aria-busy="true">
        <div className="auth-boot-indicator" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="sr-only">로그인 세션을 확인하고 있습니다.</p>
      </main>
    );
  }

  if (user && !dataResolved) {
    return (
      <main className="auth-boot" aria-live="polite" aria-busy="true">
        <div className="auth-boot-indicator" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="sr-only">가족 약 데이터를 동기화하고 있습니다.</p>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
        theme={theme}
      />
    );
  }

  return (
    <AppShell
      availableProfiles={displayCareProfiles}
      currentProfile={displayCurrentProfile}
      familyMembers={familyMembers}
      onLogout={() => void handleLogout()}
      onNavigate={navigate}
      onProfileChange={handleProfileChange}
      onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
      route={route}
      theme={theme}
      user={user}
    >
      {route === "/" && (
        <DashboardPage
          currentProfile={displayCurrentProfile}
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
          onDeleteMedication={handleDeleteMedication}
          schedules={medicationSchedules}
          temporaryMedications={temporaryMedications}
        />
      )}
      {route === "/reminders" && (
        <RemindersPage
          currentProfile={displayCurrentProfile}
          medications={medications}
          onMarkTaken={handleMarkTaken}
          schedules={medicationSchedules}
        />
      )}
      {route === "/chat" && (
        <RuleChatPage currentProfile={displayCurrentProfile} medications={medications} />
      )}
      {route === "/family" && (
        <FamilyAdminPage
          careProfiles={careProfileList}
          familyMembers={familyMembers}
          medications={medications}
          onAddMember={handleAddFamilyMember}
          onAddCareProfile={handleAddCareProfile}
          onDeleteCareProfile={handleDeleteCareProfile}
          onDeleteMember={handleDeleteFamilyMember}
          onUpdateCareProfile={handleUpdateCareProfile}
          onUpdateMember={handleUpdateFamilyMember}
          scans={scans}
          temporaryMedications={temporaryMedications}
          user={user}
          workspace={familyWorkspace}
          onSyncDrugCatalog={handleSyncDrugCatalog}
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
  const path =
    basePath && window.location.pathname.startsWith(basePath)
      ? window.location.pathname.slice(basePath.length) || "/"
      : window.location.pathname || "/";
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
  window.history.pushState({}, "", `${basePath || ""}${route === "/" ? "/" : route}`);
}

function replaceRoute(route: Route): void {
  window.history.replaceState({}, "", `${basePath || ""}${route === "/" ? "/" : route}`);
}

function displayProfileForUser(
  profile: CareProfile,
  user: DemoUser | null,
  familyMembers: FamilyMember[],
): CareProfile {
  if (profile.name === "나") {
    const ownerName = familyMembers.find(
      (member) => member.userId === profile.ownerUserId || member.careProfileId === profile.id,
    )?.displayName;
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
  familyMembers: FamilyMember[],
): CareProfile[] {
  if (!user) return [];
  if (user.familyRole === "owner" || user.familyRole === "manager" || user.role === "admin") {
    return profiles;
  }

  const member = familyMembers.find((item) => item.userId === user.id);
  const ownProfiles = profiles.filter(
    (profile) => profile.ownerUserId === user.id || profile.id === member?.careProfileId,
  );
  return ownProfiles.length ? ownProfiles : profiles.filter((profile) => profile.name === "나");
}

function profilesAvailableForViewing(
  profiles: CareProfile[],
  user: DemoUser | null,
  familyMembers: FamilyMember[],
): CareProfile[] {
  if (!user) return [];
  if (user.role === "admin" || user.familyRole === "owner" || user.familyRole === "manager") {
    return profiles;
  }

  const member = familyMembers.find((item) => item.userId === user.id);
  const ownProfileIds = profiles
    .filter((profile) => profile.ownerUserId === user.id || profile.id === member?.careProfileId)
    .map((profile) => profile.id);
  const allowedProfileIds = new Set([...(member?.accessibleProfileIds || []), ...ownProfileIds]);

  return profiles.filter((profile) => allowedProfileIds.has(profile.id));
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

function migrateDemoFamilyMembers(members: FamilyMember[], profiles: CareProfile[]): FamilyMember[] {
  return members.map((member) => {
    const ownProfileIds = profiles
      .filter((profile) => profile.ownerUserId === member.userId)
      .map((profile) => profile.id);
    const accessibleProfileIds =
      member.role === "owner" || member.role === "manager"
        ? profiles.map((profile) => profile.id)
        : Array.from(new Set([...(member.accessibleProfileIds || []), ...ownProfileIds]));

    if (member.userId === "user-owner" && member.displayName === "가족 대표") {
      return {
        ...member,
        displayName: "김정웅",
        email: member.email === "owner@optime.family" ? "jungwoong@optime.family" : member.email,
        accessibleProfileIds,
      };
    }

    if (member.userId === "user-member" && member.displayName === "어머니") {
      return {
        ...member,
        displayName: "공윤아",
        email: member.email === "member@optime.family" ? "yoona@optime.family" : member.email,
        accessibleProfileIds,
      };
    }

    return { ...member, accessibleProfileIds };
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
