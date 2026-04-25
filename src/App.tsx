import { lazy, Suspense, useEffect, useMemo, useState } from "react";
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
import { LoginPage } from "./pages/LoginPage";
import { appConfig } from "./config";
import {
  acceptRemoteFamilyInvitation,
  createRemoteMedicationLog,
  createRemoteCareProfile,
  createRemoteFamilyInvitation,
  deleteRemoteCareProfile,
  deleteRemoteFamilyMember,
  deleteRemoteMedication,
  deleteRemoteMedicationSchedule,
  declineRemoteFamilyInvitation,
  loadRemoteAppData,
  revokeRemoteFamilyInvitation,
  saveConfirmedMedication,
  saveRemoteMedicationSchedule,
  saveTemporaryMedication,
  updateRemoteCareProfile,
  updateRemoteFamilyMember,
} from "./services/supabaseData";
import type { RemoteAppData } from "./services/supabaseData";
import { signOutSupabase, supabase } from "./services/supabaseClient";
import {
  clearUser,
  loadCareProfiles,
  loadActiveWorkspaceId,
  loadCurrentProfileId,
  loadFamilyMembers,
  loadMedicationLogs,
  loadMedicationSchedules,
  loadMedications,
  loadScans,
  loadTemporaryMedications,
  loadTheme,
  loadUser,
  saveCareProfiles,
  saveActiveWorkspaceId,
  saveCurrentProfileId,
  saveFamilyMembers,
  saveMedicationLogs,
  saveMedicationSchedules,
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
  FamilyInvitation,
  FamilyWorkspace,
  Medication,
  MedicationLog,
  MedicationSchedule,
  OcrScan,
  TemporaryMedication,
  ThemeMode,
} from "./types";

const basePath = appConfig.basePath;
const FamilyAdminPage = lazy(() => import("./pages/FamilyAdminPage").then((module) => ({ default: module.FamilyAdminPage })));
const MedicationHistoryPage = lazy(() => import("./pages/MedicationHistoryPage").then((module) => ({ default: module.MedicationHistoryPage })));
const MedicationScanPage = lazy(() => import("./pages/MedicationScanPage").then((module) => ({ default: module.MedicationScanPage })));
const PetAdminPage = lazy(() => import("./pages/PetAdminPage").then((module) => ({ default: module.PetAdminPage })));
const ProfilesPage = lazy(() => import("./pages/ProfilesPage").then((module) => ({ default: module.ProfilesPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const RemindersPage = lazy(() => import("./pages/RemindersPage").then((module) => ({ default: module.RemindersPage })));
const RuleChatPage = lazy(() => import("./pages/RuleChatPage").then((module) => ({ default: module.RuleChatPage })));
const SafetyCheckPage = lazy(() => import("./pages/SafetyCheckPage").then((module) => ({ default: module.SafetyCheckPage })));
const ServiceAdminPage = lazy(() => import("./pages/ServiceAdminPage").then((module) => ({ default: module.ServiceAdminPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

export function App(): ReactElement {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [user, setUser] = useState<DemoUser | null>(() => (supabase ? null : loadUser()));
  const [authResolved, setAuthResolved] = useState<boolean>(() => !supabase);
  const [dataResolved, setDataResolved] = useState<boolean>(() => !supabase);
  const [route, setRoute] = useState<Route>(() => getInitialRoute());
  const [familyWorkspace, setFamilyWorkspace] = useState<FamilyWorkspace>(seedWorkspace);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<FamilyWorkspace[]>([seedWorkspace]);
  const [careProfileList, setCareProfileList] = useState<CareProfile[]>(() =>
    supabase ? [] : migrateDemoCareProfiles(loadCareProfiles(seedCareProfiles)),
  );
  const [currentProfileId, setCurrentProfileId] = useState(() =>
    loadCurrentProfileId(seedCareProfiles[0].id),
  );
  const [medications, setMedications] = useState<Medication[]>(() =>
    supabase ? [] : loadMedications(seedMedications),
  );
  const [schedules, setSchedules] = useState<MedicationSchedule[]>(() =>
    supabase ? [] : loadMedicationSchedules(medicationSchedules),
  );
  const [temporaryMedications, setTemporaryMedications] = useState<TemporaryMedication[]>(() =>
    supabase ? [] : loadTemporaryMedications([]),
  );
  const [scans, setScans] = useState<OcrScan[]>(() => (supabase ? [] : loadScans([])));
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() =>
    supabase
      ? []
      : migrateDemoFamilyMembers(
          loadFamilyMembers(seedFamilyMembers),
          migrateDemoCareProfiles(loadCareProfiles(seedCareProfiles)),
        ),
  );
  const [familyInvitations, setFamilyInvitations] = useState<FamilyInvitation[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>(() =>
    supabase ? [] : loadMedicationLogs([]),
  );

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
  const effectiveSchedules = useMemo(
    () => mergeDerivedMedicationSchedules(medications, schedules),
    [medications, schedules],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    if (!supabase) saveMedicationSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    if (!supabase) saveMedicationLogs(logs);
  }, [logs]);

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

    if (user && user.familyRole === "member" && (route === "/family" || route === "/pets")) {
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
        const remoteData = await loadRemoteAppData(authenticatedUser, loadActiveWorkspaceId());
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
    saveActiveWorkspaceId(remoteData.workspace.id);
    setAvailableWorkspaces(remoteData.workspaces.length ? remoteData.workspaces : [remoteData.workspace]);
    setFamilyMembers(remoteData.familyMembers);
    setFamilyInvitations(remoteData.familyInvitations);
    setCareProfileList(remoteData.careProfiles);
    setMedications(remoteData.medications);
    setLogs(remoteData.medicationLogs);
    setSchedules(remoteData.medicationSchedules);
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
    const remoteData = await loadRemoteAppData(baseUser, loadActiveWorkspaceId());
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

    if ((nextRoute === "/family" || nextRoute === "/pets") && user?.familyRole === "member") {
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

  async function handleWorkspaceChange(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId === familyWorkspace.id) return;

    saveActiveWorkspaceId(workspaceId);
    setDataResolved(false);
    try {
      await refreshRemoteWorkspace(user);
    } finally {
      setDataResolved(true);
    }
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
    setSchedules((current) => current.filter((schedule) => schedule.medicationId !== medicationId));
    setLogs((current) => current.filter((log) => log.medicationId !== medicationId));
  }

  async function handleMarkTaken(schedule: MedicationSchedule): Promise<void> {
    if (supabase) {
      const savedLog = await createRemoteMedicationLog({
        medicationId: schedule.medicationId,
        scheduleId: schedule.id,
      });
      setLogs((current) => [savedLog, ...current]);
      return;
    }

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

  async function handleSaveMedicationSchedule(schedule: MedicationSchedule): Promise<void> {
    const savedSchedule = supabase
      ? await saveRemoteMedicationSchedule(schedule)
      : { ...schedule, id: schedule.id || crypto.randomUUID() };

    setSchedules((current) => [
      savedSchedule,
      ...current.filter((item) => item.id !== schedule.id && item.medicationId !== savedSchedule.medicationId),
    ]);
  }

  async function handleDeleteMedicationSchedule(scheduleId: string): Promise<void> {
    if (supabase) {
      await deleteRemoteMedicationSchedule(scheduleId);
    }

    setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
  }

  async function handleUpdateFamilyMember(memberId: string, patch: Partial<FamilyMember>): Promise<void> {
    if (supabase) {
      if (!isUuid(memberId)) {
        await refreshRemoteWorkspace(user);
        throw new Error("가족 데이터를 최신 상태로 다시 불러왔습니다. 다시 저장해 주세요.");
      }

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
      const invitation = await createRemoteFamilyInvitation({
        workspaceId: familyWorkspace.id,
        displayName: member.displayName,
        email: member.email,
        role: member.role,
      });
      setFamilyInvitations((current) => [
        invitation,
        ...current.filter((item) => item.id !== invitation.id),
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
      if (!isUuid(memberId)) {
        await refreshRemoteWorkspace(user);
        throw new Error("가족 데이터를 최신 상태로 다시 불러왔습니다. 다시 삭제해 주세요.");
      }

      await deleteRemoteFamilyMember(memberId);
      await refreshRemoteWorkspace(user);
      return;
    }

    setFamilyMembers((current) => current.filter((member) => member.id !== memberId));

    if (targetMember.careProfileId) {
      const removedMedicationIds = medications
        .filter((medication) => medication.careProfileId === targetMember.careProfileId)
        .map((medication) => medication.id);
      setCareProfileList((current) => current.filter((profile) => profile.id !== targetMember.careProfileId));
      setMedications((current) =>
        current.filter((medication) => medication.careProfileId !== targetMember.careProfileId),
      );
      setSchedules((current) =>
        current.filter((schedule) => !removedMedicationIds.includes(schedule.medicationId)),
      );
      setLogs((current) =>
        current.filter((log) => !removedMedicationIds.includes(log.medicationId)),
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

  async function handleAcceptInvitation(invitationId: string, importPersonalRecords: boolean): Promise<void> {
    if (!supabase) return;

    const workspaceId = await acceptRemoteFamilyInvitation(invitationId, importPersonalRecords);
    saveActiveWorkspaceId(workspaceId);
    await refreshRemoteWorkspace(user);
  }

  async function handleDeclineInvitation(invitationId: string): Promise<void> {
    if (!supabase) {
      setFamilyInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      return;
    }

    await declineRemoteFamilyInvitation(invitationId);
    await refreshRemoteWorkspace(user);
  }

  async function handleRevokeInvitation(invitationId: string): Promise<void> {
    if (!supabase) {
      setFamilyInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      return;
    }

    await revokeRemoteFamilyInvitation(invitationId);
    await refreshRemoteWorkspace(user);
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

    const removedMedicationIds = medications
      .filter((medication) => medication.careProfileId === profileId)
      .map((medication) => medication.id);
    setCareProfileList((current) => current.filter((profile) => profile.id !== profileId));
    setMedications((current) => current.filter((medication) => medication.careProfileId !== profileId));
    setSchedules((current) =>
      current.filter((schedule) => !removedMedicationIds.includes(schedule.medicationId)),
    );
    setLogs((current) =>
      current.filter((log) => !removedMedicationIds.includes(log.medicationId)),
    );
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
      availableWorkspaces={availableWorkspaces}
      availableProfiles={displayCareProfiles}
      currentProfile={displayCurrentProfile}
      familyMembers={familyMembers}
      onLogout={() => void handleLogout()}
      onNavigate={navigate}
      onProfileChange={handleProfileChange}
      onWorkspaceChange={(workspaceId) => void handleWorkspaceChange(workspaceId)}
      onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
      route={route}
      theme={theme}
      user={user}
      workspace={familyWorkspace}
    >
      <InvitationInbox
        invitations={familyInvitations}
        user={user}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
      />
      <Suspense fallback={<div className="card page-loading">화면을 준비하고 있습니다.</div>}>
        {route === "/" && (
          <DashboardPage
            careProfiles={displayCareProfiles}
            currentProfile={displayCurrentProfile}
            familyMembers={familyMembers}
            logs={logs}
            medications={medications}
            onNavigateChat={() => navigate("/chat")}
            onNavigateHistory={() => navigate("/history")}
            onNavigateInteractions={() => navigate("/interactions")}
            onNavigateProfiles={() => navigate("/profiles")}
            onNavigateReports={() => navigate("/reports")}
            onNavigateReminders={() => navigate("/reminders")}
            onNavigateScan={() => navigate("/scan")}
            onMarkTaken={handleMarkTaken}
            scans={scans}
            schedules={effectiveSchedules}
          />
        )}
        {route === "/scan" && (
          <MedicationScanPage
            careProfiles={registrationCareProfiles}
            currentProfile={displayCurrentProfile}
            medications={medications}
            onDeleteMedication={handleDeleteMedication}
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
            schedules={effectiveSchedules}
            temporaryMedications={temporaryMedications}
          />
        )}
        {route === "/history" && (
          <MedicationHistoryPage
            careProfiles={displayCareProfiles}
            currentProfile={displayCurrentProfile}
            logs={logs}
            medications={medications}
            onMarkTaken={handleMarkTaken}
            schedules={effectiveSchedules}
          />
        )}
        {route === "/interactions" && (
          <SafetyCheckPage
            careProfiles={displayCareProfiles}
            currentProfile={displayCurrentProfile}
            medications={medications}
          />
        )}
        {route === "/reminders" && (
          <RemindersPage
            currentProfile={displayCurrentProfile}
            logs={logs}
            medications={medications}
            onDeleteSchedule={handleDeleteMedicationSchedule}
            onMarkTaken={handleMarkTaken}
            onSaveSchedule={handleSaveMedicationSchedule}
            schedules={schedules}
          />
        )}
        {route === "/chat" && (
          <RuleChatPage currentProfile={displayCurrentProfile} medications={medications} />
        )}
        {route === "/reports" && (
          <ReportsPage
            careProfiles={displayCareProfiles}
            currentProfileId={currentProfile.id}
            familyMembers={familyMembers}
            medications={medications}
            schedules={effectiveSchedules}
            temporaryMedications={temporaryMedications}
          />
        )}
        {route === "/family" && (
          <FamilyAdminPage
            careProfiles={careProfileList}
            familyInvitations={familyInvitations}
            familyMembers={familyMembers}
            medications={medications}
            onAddMember={handleAddFamilyMember}
            onAddCareProfile={handleAddCareProfile}
            onDeleteCareProfile={handleDeleteCareProfile}
            onDeleteMember={handleDeleteFamilyMember}
            onRevokeInvitation={handleRevokeInvitation}
            onUpdateCareProfile={handleUpdateCareProfile}
            onUpdateMember={handleUpdateFamilyMember}
            scans={scans}
            temporaryMedications={temporaryMedications}
            user={user}
            workspace={familyWorkspace}
          />
        )}
        {route === "/pets" && (
          <PetAdminPage
            careProfiles={careProfileList}
            medications={medications}
            onAddCareProfile={handleAddCareProfile}
            onDeleteCareProfile={handleDeleteCareProfile}
            onUpdateCareProfile={handleUpdateCareProfile}
            workspace={familyWorkspace}
          />
        )}
        {route === "/settings" && (
          <SettingsPage
            availableWorkspaceCount={availableWorkspaces.length}
            onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
            theme={theme}
            user={user}
            workspace={familyWorkspace}
          />
        )}
        {route === "/service-admin" && user.role === "admin" && <ServiceAdminPage />}
        {logs.length > 0 && (
          <p className="sr-only">최근 복용 완료 기록 {logs.length}건</p>
        )}
      </Suspense>
    </AppShell>
  );
}

function InvitationInbox({
  invitations,
  onAccept,
  onDecline,
  user,
}: {
  invitations: FamilyInvitation[];
  onAccept: (invitationId: string, importPersonalRecords: boolean) => Promise<void>;
  onDecline: (invitationId: string) => Promise<void>;
  user: DemoUser;
}): ReactElement | null {
  const [pendingActionId, setPendingActionId] = useState("");
  const incomingInvitations = invitations.filter(
    (invitation) =>
      invitation.status === "pending" &&
      invitation.email.toLocaleLowerCase("ko-KR") === user.email.toLocaleLowerCase("ko-KR"),
  );

  if (!incomingInvitations.length) return null;

  async function runInvitationAction(invitationId: string, action: () => Promise<void>): Promise<void> {
    if (pendingActionId) return;
    setPendingActionId(invitationId);
    try {
      await action();
    } finally {
      setPendingActionId("");
    }
  }

  return (
    <section className="invitation-inbox" aria-label="가족공간 초대">
      {incomingInvitations.map((invitation) => (
        <article className="invitation-card" key={invitation.id}>
          <div>
            <p className="eyebrow">가족공간 초대</p>
            <strong>{invitation.workspaceName || "가족공간"} 초대가 도착했습니다.</strong>
            <p>
              수락하면 상단 공간 전환에서 가족공간을 선택할 수 있습니다. 개인공간의 기존 복용 기록은 그대로 남고,
              원할 때만 가족공간 프로필로 복사합니다.
            </p>
            <span className="invitation-profile-note">
              초대 프로필: {invitation.displayName} · {roleCopy(invitation.role)}
            </span>
          </div>
          <div className="invitation-actions">
            <button
              className="ghost-button"
              disabled={pendingActionId === invitation.id}
              onClick={() => void runInvitationAction(invitation.id, () => onDecline(invitation.id))}
              type="button"
            >
              {pendingActionId === invitation.id ? "처리 중" : "거절"}
            </button>
            <button
              className="ghost-button"
              disabled={pendingActionId === invitation.id}
              onClick={() => void runInvitationAction(invitation.id, () => onAccept(invitation.id, false))}
              type="button"
            >
              기록 없이 참여
            </button>
            <button
              className="primary-button"
              disabled={pendingActionId === invitation.id}
              onClick={() => void runInvitationAction(invitation.id, () => onAccept(invitation.id, true))}
              type="button"
            >
              내 기록 복사하고 참여
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function roleCopy(role: FamilyInvitation["role"]): string {
  if (role === "manager") return "가족관리자";
  return "가족구성원";
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
      "/history",
      "/reminders",
      "/interactions",
      "/chat",
      "/reports",
      "/family",
      "/pets",
      "/settings",
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
  const linkedMember = familyMembers.find(
    (member) => member.userId === profile.ownerUserId || member.careProfileId === profile.id,
  );

  if (linkedMember?.displayName && profile.type !== "pet") {
    return { ...profile, name: linkedMember.displayName };
  }

  if (user?.name && profile.type !== "pet" && (!profile.ownerUserId || profile.ownerUserId === user.id)) {
    return { ...profile, name: user.name };
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
  return ownProfiles.length ? ownProfiles : [];
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

function mergeDerivedMedicationSchedules(
  medications: Medication[],
  schedules: MedicationSchedule[],
): MedicationSchedule[] {
  const scheduledMedicationIds = new Set(schedules.map((schedule) => schedule.medicationId));
  const derivedSchedules = medications
    .filter((medication) => !scheduledMedicationIds.has(medication.id))
    .map((medication) => buildDerivedMedicationSchedule(medication));

  return [...schedules, ...derivedSchedules];
}

function buildDerivedMedicationSchedule(medication: Medication): MedicationSchedule {
  return {
    id: `derived-${medication.id}`,
    medicationId: medication.id,
    type: "daily",
    label: medication.instructions || "복용 주기 미설정",
    timeOfDay: "08:00",
    nextDueAt: nextDueAtForTime("08:00"),
    reviewAt: medication.reviewAt,
  };
}

function nextDueAtForTime(timeOfDay: string): string {
  const [rawHours, rawMinutes] = timeOfDay.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const next = new Date();
  next.setHours(Number.isFinite(hours) ? hours : 8, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (next.getTime() < Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
      return { ...profile, ownerUserId: "user-owner", name: profile.name === "나" ? "김정웅" : profile.name || "김정웅" };
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
