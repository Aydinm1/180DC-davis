"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminWeek, AdminWorkspaceState } from "@/lib/program/admin";
import { saveAdmin } from "@/lib/supabase/actions";

import type { ApprovedMember, CohortEnrollment, ProgramCohort, ProgramUser, SubmissionStatus } from "@/lib/program/types";
import { AdminShell } from "./admin-shell";

type AdminWorkspaceContextValue = AdminWorkspaceState & {
  selectedCohortId: string;
  setSelectedCohortId: (id: string) => void;
  setUnsavedChanges: (dirty: boolean) => void;
  navigate: (href: string) => void;
  updateSubmission: (id: string, status: SubmissionStatus, feedback: string | undefined, expectedUpdatedAt: string | undefined) => Promise<{ error?: string; updatedAt?: string }>;
  updateWeek: (week: AdminWeek) => Promise<string | undefined>;
  updateEnrollment: (enrollment: CohortEnrollment) => Promise<string | undefined>;
  setTestParticipation: (id: string, isTest: boolean) => Promise<string | undefined>;
  addEnrollment: (personId: string) => Promise<string | undefined>;
  updateApprovedMember: (member: ApprovedMember) => Promise<string | undefined>;
  addApprovedMember: (input: { fullName: string; email: string; role: ProgramUser["role"] }) => Promise<string | undefined>;
  createCohort: (cohort: ProgramCohort) => Promise<string | undefined>;
  updateCohortDates: (dates: { startsOn: string; endsOn: string }) => Promise<string | undefined>;
  archiveSelectedCohort: () => Promise<string | undefined>;
  setSelectedCohortState: (state: ProgramCohort["state"]) => Promise<string | undefined>;
};

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);


export function useOptionalAdminWorkspace() { return useContext(AdminWorkspaceContext); }

export function useAdminWorkspace() {
  const value = useOptionalAdminWorkspace();
  if (!value) throw new Error("Admin workspace is unavailable.");
  return value;
}

export function AdminWorkspace({ children, user, initialState }: { children: ReactNode; user: ProgramUser; initialState: AdminWorkspaceState }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedCohortId, setStoredCohortId] = useState(initialState.cohorts.find(c => c.state === "active")?.id ?? initialState.cohorts[0]?.id ?? "");
  const [hasUnsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { people, approvedMembers, cohorts, enrollments, weeks, submissions } = initialState;
  const hasMyProgram = enrollments.some(enrollment => enrollment.personId === user.personId
    && enrollment.participationStatus === 'enrolled'
    && cohorts.some(cohort => cohort.id === enrollment.cohortId && cohort.state === 'active'));
  const requestedCohortId = searchParams.get("cohort");
  const selectedCohortId = cohorts.some((cohort) => cohort.id === requestedCohortId) ? requestedCohortId! : storedCohortId;

  const confirmNavigation = useCallback(() => {
    return !hasUnsavedChanges || window.confirm("Discard your unsaved changes?");
  }, [hasUnsavedChanges]);

  const navigate = useCallback((href: string) => {
    if (confirmNavigation()) router.push(href);
  }, [confirmNavigation, router]);

  const changeCohort = useCallback((id: string) => {
    if (!confirmNavigation()) return;
    setUnsavedChanges(false);
    setStoredCohortId(id);
    const destination = pathname.startsWith("/admin/weeks/") ? "/admin/weeks" : pathname.startsWith("/admin/submissions/") || pathname.startsWith('/admin/cases/') ? "/admin" : pathname;
    router.push(`${destination}?cohort=${encodeURIComponent(id)}`);
  }, [confirmNavigation, pathname, router]);

  async function persist(action: string, data: Record<string, unknown>) {
    setSaving(true);
    try {
      const result = await saveAdmin(action, data);
      if (result.error) return result.error;
      router.refresh();
      return undefined;
    } catch { return "Could not save. Please try again; your changes have been kept."; }
    finally { setSaving(false); }
  }
  const value: AdminWorkspaceContextValue = {
    selectedCohortId, setSelectedCohortId: changeCohort, setUnsavedChanges, navigate,
    people, approvedMembers, cohorts, enrollments, weeks, submissions, teams:initialState.teams,swapGroups:initialState.swapGroups,
    completionCredits:initialState.completionCredits,
    caseProgress:initialState.caseProgress,
    async updateSubmission(id, status, feedback, expectedUpdatedAt) {
      try { return await saveAdmin('review', { id,status,feedback,expectedUpdatedAt }); }
      catch { return { error:'Could not save the review. Your changes have been kept.' }; }
    },
    updateWeek: week => persist('week', week),
    updateEnrollment: enrollment => persist('enrollment', enrollment),
    setTestParticipation: (id,isTest) => persist('enrollment_test',{id,isTest}),
    addEnrollment: personId => persist('enroll', { personId,cohortId:selectedCohortId }),
    updateApprovedMember: member => persist('roster', member),
    addApprovedMember: input => persist('roster', input),
    async createCohort(cohort) {
      setSaving(true);
      try {
        const data = { quarter:cohort.quarter,year:cohort.year,startsOn:cohort.startsOn,endsOn:cohort.endsOn,state:cohort.state };
        const result = await saveAdmin('cohort_create', data);
        if (result.error) return result.error;
        setStoredCohortId(result.id!);
        router.push('/admin/members?cohort=' + result.id);
      } catch { return "Could not create cohort. Please try again."; }
      finally { setSaving(false); }
    },
    updateCohortDates: dates => persist('cohort_dates', { id:selectedCohortId,...dates }),
    archiveSelectedCohort: () => persist('cohort_state', { id:selectedCohortId,state:'archived' }),
    setSelectedCohortState: state => persist('cohort_state', { id:selectedCohortId,state }),
  };

  return <AdminWorkspaceContext.Provider value={value}><AdminShell user={user} cohorts={cohorts} selectedCohortId={selectedCohortId} onCohortChange={changeCohort} hasMyProgram={hasMyProgram} confirmNavigation={confirmNavigation}>
    {saving ? <p role="status" className="px-6 py-2 text-sm text-ink-soft">Saving changes…</p> : null}
    <fieldset disabled={saving} className="min-w-0">{children}</fieldset>
  </AdminShell></AdminWorkspaceContext.Provider>;
}
