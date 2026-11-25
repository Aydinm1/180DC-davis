import type {
  Assignment,
  AssignmentDisplayState,
  ProgramWeek,
  PublishedWeek,
  SubmissionAttempt,
} from "./types.ts";
import { assignmentsForWeek, isPublishedWeek } from "./types.ts";

export const DUE_SOON_WINDOW_MS = 72 * 60 * 60 * 1000;
export const PROGRAM_TIME_ZONE = "America/Los_Angeles";

const quarterOrder = { winter: 0, spring: 1, fall: 2 } as const;

export function formatCohortLabel(cohort: {
  quarter: "fall" | "winter" | "spring";
  year: number;
}) {
  return `${cohort.quarter[0].toUpperCase()}${cohort.quarter.slice(1)} ${cohort.year}`;
}

export function compareCohorts(
  left: { quarter: "fall" | "winter" | "spring"; year: number },
  right: { quarter: "fall" | "winter" | "spring"; year: number },
) {
  return left.year - right.year || quarterOrder[left.quarter] - quarterOrder[right.quarter];
}

export function deriveAssignmentState(
  assignment: Pick<Assignment, "dueAt"|"completionCredit"|"caseProgress">,
  submission: Pick<SubmissionAttempt,"status"> | undefined,
  now: Date,
): AssignmentDisplayState {
  if ((assignment.completionCredit || assignment.caseProgress?.completedAt)) return "completed";
  if (submission?.status === "revision_requested") return "revision_requested";
  if (submission?.status === "completed") return "completed";
  if (submission?.status === "submitted") return "submitted";

  const timeRemaining = new Date(assignment.dueAt).getTime() - now.getTime();
  if (timeRemaining < 0) return "overdue";
  if (timeRemaining <= DUE_SOON_WINDOW_MS) return "due_soon";
  return "upcoming";
}

export function isModuleComplete(submission: SubmissionAttempt | undefined) {
  return submission?.status === "completed";
}

export function countCompletedModules(submissions: readonly SubmissionAttempt[], weeks: readonly ProgramWeek[]) {
  const current = new Map(submissions.filter((item) => item.isCurrent).map((item) => [item.assignmentId, item]));
  return weeks.filter((week) => isPublishedWeek(week) && assignmentsForWeek(week).length > 0 && assignmentsForWeek(week).every((item) => (item.completionCredit || item.caseProgress?.completedAt) || isModuleComplete(current.get(item.id)))).length;
}

export function findCurrentActionableWeek(
  weeks: readonly ProgramWeek[],
  submissionsByAssignment: ReadonlyMap<string, SubmissionAttempt>,
): PublishedWeek | undefined {
  return weeks.toSorted((a, b) => a.weekNumber - b.weekNumber).find((week): week is PublishedWeek => {
    if (!isPublishedWeek(week)) return false;
    const assignments = assignmentsForWeek(week);
    return !assignments.length || assignments.some((item) => !(item.completionCredit || item.caseProgress?.completedAt) && !isModuleComplete(submissionsByAssignment.get(item.id)));
  });
}

export function findNearestActionableAssignment(
  weeks: readonly ProgramWeek[],
  submissionsByAssignment: ReadonlyMap<string, SubmissionAttempt>,
): Assignment | undefined {
  let nearest: Assignment | undefined;

  for (const week of weeks) {
    if (!isPublishedWeek(week)) continue;
    for (const assignment of assignmentsForWeek(week)) {
    const submission = submissionsByAssignment.get(assignment.id);
    if ((assignment.completionCredit || assignment.caseProgress?.completedAt) || submission?.status === "completed" || submission?.status === "submitted") continue;
    if (!nearest || assignment.dueAt < nearest.dueAt) nearest = assignment;
    }
  }

  return nearest;
}

export function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatSubmissionTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PROGRAM_TIME_ZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
