export type AppRole = "member" | "admin" | "viewer";
export type ProgramQuarter = "fall" | "winter" | "spring";
export type CohortState = "draft" | "active" | "archived";
export type ParticipationStatus = "enrolled" | "completed" | "withdrew";
export type AdvancementStatus = "pending" | "promoted" | "not_promoted";
export type PromotionResponse = "pending" | "joined" | "declined";
export type WeekPublicationState = "draft" | "published";
export type SubmissionStatus = "submitted" | "revision_requested" | "completed";
export type SubmissionType = "file" | "link" | "text";
export type AssignmentDisplayState =
  | SubmissionStatus
  | "overdue"
  | "due_soon"
  | "upcoming";

export type ProgramUser = {
  id: string;
  personId: string;
  email: string;
  fullName: string;
  role: AppRole;
  initials: string;
};

export type Person = {
  id: string;
  email: string;
  fullName: string;
};

export type CohortTeam = {
  id: string; cohortId: string; name: string; isTest: boolean; version: number; locked: boolean;
  enrollmentIds: readonly string[];
};
export type MemberTeam = { id: string; name: string; members: { enrollmentId: string; personId: string; name: string }[] };

export type ApprovedMember = {
  lastActiveAt?: string;
  id: string;
  personId: string;
  email: string;
  fullName: string;
  role: AppRole;
  active: boolean;
};

export type ProgramCohort = {
  id: string;
  quarter: ProgramQuarter;
  year: number;
  startsOn: string;
  endsOn: string;
  state: CohortState;
};

type PendingOrNotPromotedEnrollment = {
  advancementStatus: "pending" | "not_promoted";
  promotionResponse?: never;
};

type PromotedEnrollment = {
  advancementStatus: "promoted";
  promotionResponse: PromotionResponse;
};

export type CohortEnrollment = {
  id: string;
  cohortId: string;
  personId: string;
  participationStatus: ParticipationStatus;
  isTest?: boolean;
} & (PendingOrNotPromotedEnrollment | PromotedEnrollment);

export type Resource = {
  id: string;
  title: string;
  description?: string;
  type: "guide" | "template" | "reading" | "video" | "workshop";
  url: string;
  sortOrder: number;
};

export type FileSubmission = {
  type: "file";
  originalFilename: string;
  filePath: string;
  mimeType?: string;
};

export type LinkSubmission = {
  type: "link";
  submittedUrl: string;
};

export type TextSubmission = { type: "text"; submittedText: string };
export type SubmissionPayload = FileSubmission | LinkSubmission | TextSubmission;

export type SubmissionAttempt = {
  updatedAt?: string;
  id: string;
  assignmentId: string;
  enrollmentId?: string;
  targetId?: string;
  teamId?: string;
  participantEnrollmentIds?: readonly string[];
  submittedByName?: string;
  status: SubmissionStatus;
  submittedAt: string;
  isCurrent: boolean;
  feedback?: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  supersedesSubmissionId?: string;
  payload: SubmissionPayload;
};

export type Assignment = {
  workflow?: 'standard' | 'guided' | 'cases' | 'investigation';
  /** Member-scoped manual credit; never a fabricated submission. */
  caseProgress?: { answered: number; completedAt?: string };
  completionCredit?: { id: string; grantedAt: string };
  id: string;
  weekNumber: number;
  title: string;
  instructions: string;
  summary?: string;
  instructionsFormat?: 'plain' | 'markdown';
  document?: { id: string; name: string };
  dueAt: string;
  submissionMode?: 'individual' | 'team';
  team?: MemberTeam;
};

export function submissionBelongsTo(attempt: SubmissionAttempt, enrollmentId: string) {
  return attempt.enrollmentId === enrollmentId || !!attempt.teamId && !!attempt.participantEnrollmentIds?.includes(enrollmentId);
}

export type AssignmentCompletion = {
  id: string; assignmentId: string; enrollmentId: string;
  grantedAt: string; grantedBy: string;
};

export type WeekCatalogItem = {
  id: string;
  cohortId: string;
  weekNumber: number;
  title: string;
  publicationState: WeekPublicationState;
};

export type DraftWeek = WeekCatalogItem & {
  publicationState: "draft";
};

export type PublishedWeek = WeekCatalogItem & {
  publicationState: "published";
  description: string;
  slidesUrl?: string;
  resources: readonly Resource[];
  assignments?: readonly Assignment[];
  /** Legacy development fixtures; persistent reads use assignments. */
  assignment?: Assignment;
};

export type ProgramWeek = DraftWeek | PublishedWeek;

export function isPublishedWeek(week: ProgramWeek): week is PublishedWeek {
  return week.publicationState === "published";
}

export function assignmentsForWeek(week: { assignments?: readonly Assignment[]; assignment?: Assignment }): readonly Assignment[] {
  return week.assignments ?? (week.assignment ? [week.assignment] : []);
}
