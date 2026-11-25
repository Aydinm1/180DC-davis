import type {
  ApprovedMember,
  Assignment,
  CohortEnrollment,
  Person,
  ProgramCohort,
  ProgramUser,
  Resource,
  SubmissionAttempt,
  WeekPublicationState,
  CohortTeam,
  AssignmentCompletion,
} from "./types.ts";
import { deriveAssignmentState } from "./state.ts";
import { assignmentsForWeek } from "./types.ts";

export type AdminWeek = {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  description: string;
  slidesUrl?: string;
  publicationState: WeekPublicationState;
  resources: readonly Resource[];
  assignments?: readonly Assignment[];
  assignment?: Assignment;
};

export type AdminWorkspaceState = {
  people: readonly Person[];
  approvedMembers: readonly ApprovedMember[];
  cohorts: readonly ProgramCohort[];
  enrollments: readonly CohortEnrollment[];
  weeks: readonly AdminWeek[];
  submissions: readonly SubmissionAttempt[];
  teams?: readonly CohortTeam[];
  swapGroups?: readonly {id:string;assignmentId:string;name:string;isTest:boolean;enrollmentIds:readonly string[]}[];
  swapProgress?: readonly {assignmentId:string;groupId:string;enrollmentId:string;ready:boolean}[];
  caseProgress?: readonly { assignmentId: string; enrollmentId: string; answered: number; completedAt?: string }[];
  completionCredits?: readonly AssignmentCompletion[];
};

/** Queue projections contain no assignment bodies or submission content. */
export type QueueAssignment = Pick<Assignment, 'id'|'weekNumber'|'title'|'workflow'|'submissionMode'|'dueAt'>;
export type QueueWeek = Pick<AdminWeek, 'id'|'cohortId'|'weekNumber'|'title'|'publicationState'> & {
  assignments?: readonly QueueAssignment[]; assignment?: QueueAssignment;
};
export type QueueSubmission = Pick<SubmissionAttempt, 'id'|'assignmentId'|'enrollmentId'|'teamId'|'swapGroupId'|'status'|'submittedAt'|'updatedAt'|'isCurrent'>;
export type AdminQueueState = Omit<AdminWorkspaceState, 'weeks'|'submissions'|'enrollments'> & {
  enrollments: readonly Pick<CohortEnrollment,'id'|'cohortId'|'personId'|'participationStatus'|'isTest'>[];
  weeks: readonly QueueWeek[]; submissions: readonly QueueSubmission[];
};

export type AdminQueueFilter = "awaiting_review" | "revision_requested" | "missing" | "complete" | "all";
export type AdminSubmissionRow = ReturnType<typeof getSubmissionRows>[number];

export function requireAdmin(user: ProgramUser) {
  if (user.role !== "admin") throw new Error("Admin access required.");
  return user;
}

export function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCohort(input: Pick<ProgramCohort, "quarter" | "year" | "startsOn" | "endsOn">, cohorts: readonly ProgramCohort[]) {
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) return "Enter a valid cohort year.";
  const dateError = validateCohortDates(input);
  if (dateError) return dateError;
  if (cohorts.some((cohort) => cohort.quarter === input.quarter && cohort.year === input.year)) return "That cohort already exists.";
}

export function validateCohortDates(input: { startsOn: string; endsOn: string }) {
  const validDate = (value: string) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(input.startsOn) || !validDate(input.endsOn)) return "Enter valid start and end dates.";
  if (input.endsOn < input.startsOn) return "End date must be on or after the start date.";
}

export function validateRosterMember(input: Pick<ApprovedMember, "email" | "fullName">, members: readonly ApprovedMember[], excludeId?: string) {
  const email = input.email.trim().toLowerCase();
  if (!input.fullName.trim()) return "Enter the member’s full name.";
  if (!email.endsWith("@ucdavis.edu") || !email.includes("@")) return "Use a valid @ucdavis.edu email address.";
  if (members.some((member) => member.id !== excludeId && member.email.toLowerCase() === email)) return "That email is already on the approved roster.";
}

export function validateAdminWeek(week: AdminWeek, options: { forPublish?: boolean } = {}) {
  const forPublish = options.forPublish ?? week.publicationState === "published";
  if (forPublish && !week.title.trim()) return "Enter a week title before publishing.";
  if (forPublish && !week.description.trim()) return "Add a description before publishing.";
  if (week.slidesUrl && !isWebUrl(week.slidesUrl)) return "Enter a valid presentation URL.";
  const assignments = assignmentsForWeek(week);
  if (new Set(assignments.map((assignment) => assignment.id)).size !== assignments.length) return "Each assignment must have a unique identifier.";
  for (const assignment of assignments) {
    if (assignment.submissionMode && !['individual','team'].includes(assignment.submissionMode)) return 'Choose Individual or Team submission.';
    if (assignment.summary && Array.from(assignment.summary).length > 300) return "Keep each assignment summary to 300 characters or fewer.";
    if (Array.from(assignment.instructions).length > 50000) return "Keep assignment instructions to 50,000 characters or fewer.";
    if (assignment.instructionsFormat && !['plain','markdown'].includes(assignment.instructionsFormat)) return "Choose a valid instruction format.";
    if (forPublish && (!assignment.title.trim() || ((!assignment.workflow || assignment.workflow === "standard") && !assignment.instructions.trim()))) return "Complete every assignment title and instructions before publishing.";
    if (assignment.dueAt && Number.isNaN(new Date(assignment.dueAt).getTime())) return "Enter a valid assignment deadline.";
    if (forPublish && !assignment.dueAt) return "Enter every assignment deadline before publishing.";
  }
  if (week.resources.some((resource) => !resource.title.trim() || !isWebUrl(resource.url))) return "Every resource needs a title and valid URL.";
}

export function filterSubmissionRows(rows: readonly AdminSubmissionRow[], filter: AdminQueueFilter, search = "") {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesSearch = !query || `${row.team?.name??''} ${row.person?.fullName ?? ""} ${row.person?.email ?? ""} ${row.members.map(m=>m.fullName+' '+m.email).join(' ')}`.toLowerCase().includes(query);
    if (!matchesSearch || filter === "all") return matchesSearch;
    if (filter === "awaiting_review") return row.state === "submitted";
    if (filter === "revision_requested") return row.state === "revision_requested";
    if (filter === "complete") return row.state === "completed";
    return !row.submission && !row.completionCredit;
  });
}

export function getAdminQueueCounts(rows: readonly AdminSubmissionRow[]) {
  return {
    awaiting_review: rows.filter((row) => row.state === "submitted").length,
    revision_requested: rows.filter((row) => row.state === "revision_requested").length,
    missing: rows.filter((row) => !row.submission && !row.completionCredit).length,
    complete: rows.filter((row) => row.state === "completed").length,
    all: rows.length,
  };
}

export function getNextAwaitingSubmission(rows: readonly AdminSubmissionRow[], currentSubmissionId: string) {
  return rows.find((row) => row.state === "submitted" && row.submission?.id !== currentSubmissionId)?.submission;
}

const PACIFIC_ZONE = "America/Los_Angeles";

function pacificParts(date: Date, includeZone = false) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PACIFIC_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23",
    ...(includeZone ? { timeZoneName: "short" as const } : {}),
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatPacificDateTimeInput(iso: string) {
  const parts = pacificParts(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function pacificWallTimeToUtc(value: string, zone?: "PDT" | "PST") {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { error: "Enter a valid Pacific deadline." } as const;
  const [, year, month, day, hour, minute] = match;
  const target = `${year}-${month}-${day}T${hour}:${minute}`;
  const anchor = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const candidates: { iso: string; zone: "PDT" | "PST" }[] = [];
  for (let offset = -12 * 60; offset <= 12 * 60; offset += 30) {
    const date = new Date(anchor + offset * 60_000);
    const parts = pacificParts(date, true);
    if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}` === target) {
      candidates.push({ iso: date.toISOString(), zone: parts.timeZoneName === "PST" ? "PST" : "PDT" });
    }
  }
  if (!candidates.length) return { error: "That time does not exist in Pacific time because of daylight saving time." } as const;
  if (candidates.length > 1 && !zone) return { error: "Choose PDT or PST for this repeated Pacific time." } as const;
  const selected = candidates.find((candidate) => candidate.zone === zone) ?? candidates[0];
  return { value: selected.iso, zone: selected.zone } as const;
}

export function getCurrentAdminWeek<T extends QueueWeek>(weeks: readonly T[]) {
  return weeks
    .filter((week) => week.publicationState === "published" && assignmentsForWeek(week).length)
    .toSorted((left, right) => right.weekNumber - left.weekNumber)[0];
}

export function getSubmissionRows({ state, cohortId, weekId, assignmentId, now, audience = 'official' }: { state: AdminQueueState; cohortId: string; weekId: string; assignmentId?: string; now: Date; audience?: 'official' | 'test' }) {
  const week = state.weeks.find((item) => item.id === weekId && item.cohortId === cohortId);
  const enrollments = state.enrollments.filter((item) => item.cohortId === cohortId && item.participationStatus === "enrolled" && !!item.isTest === (audience === 'test'));
  if (!week) return [];
  const assignments = assignmentsForWeek(week);
  const assignment = assignmentId ? assignments.find((item) => item.id === assignmentId) : assignments[0];
  if (!assignment) return [];
  const owners = assignment.workflow==='slide_swap'
    ? (state.swapGroups??[]).filter(g=>g.assignmentId===assignment.id&&g.isTest===(audience==='test')).flatMap(swapGroup=>{const members=enrollments.filter(e=>swapGroup.enrollmentIds.includes(e.id));return members.length?[{enrollment:members[0],team:undefined,swapGroup,memberEnrollmentIds:members.map(e=>e.id)}]:[];})
    : assignment.submissionMode==='team'
    ? (state.teams??[]).filter(t=>t.cohortId===cohortId&&t.isTest===(audience==='test')).flatMap(team=>{
      const members=enrollments.filter(e=>team.enrollmentIds.includes(e.id));
      return members.length?[{enrollment:members[0],team,swapGroup:undefined,memberEnrollmentIds:members.map(e=>e.id)}]:[];
    })
    : enrollments.map(enrollment=>({enrollment,team:undefined,swapGroup:undefined,memberEnrollmentIds:[enrollment.id]}));
  return owners.map(({enrollment,team,swapGroup,memberEnrollmentIds}) => {
    const person = state.people.find((item) => item.id === enrollment.personId);
    const submission = state.submissions.find((item) => item.assignmentId === assignment.id && (swapGroup?item.swapGroupId===swapGroup.id:team?item.teamId===team.id:item.enrollmentId === enrollment.id) && item.isCurrent);
    const completionCredit = !team&&!swapGroup ? state.completionCredits?.find(credit => credit.assignmentId === assignment.id && credit.enrollmentId === enrollment.id) : undefined;
    return {
      team,swapGroup,ownerKey:swapGroup?.id??team?.id??enrollment.id,memberEnrollmentIds,
      members:memberEnrollmentIds.flatMap(id=>{const e=enrollments.find(e=>e.id===id);const p=state.people.find(p=>p.id===e?.personId);return p?[p]:[];}),
      slideReadiness:swapGroup?memberEnrollmentIds.flatMap(id=>{const e=enrollments.find(e=>e.id===id);const p=state.people.find(p=>p.id===e?.personId);const progress=state.swapProgress?.find(s=>s.assignmentId===assignment.id&&s.groupId===swapGroup.id&&s.enrollmentId===id);return p?[{enrollmentId:id,name:p.fullName,ready:progress?.ready??false}]:[];}):undefined,
      enrollment,
      assignment,
      person,
      submission,
      completionCredit,
      state: deriveAssignmentState({ ...assignment, completionCredit, caseProgress: state.caseProgress?.find(p=>p.assignmentId===assignment.id&&p.enrollmentId===enrollment.id) }, submission, now),
    };
  }).toSorted((left, right) => {
    const priority = { submitted: 0, revision_requested: 1, overdue: 2, due_soon: 3, upcoming: 4, completed: 5 } as const;
    return priority[left.state] - priority[right.state] || (left.person?.fullName ?? "").localeCompare(right.person?.fullName ?? "");
  });
}
