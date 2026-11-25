import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentAdminWeek,
  filterSubmissionRows,
  getAdminQueueCounts,
  getNextAwaitingSubmission,
  getSubmissionRows,
  formatPacificDateTimeInput,
  pacificWallTimeToUtc,
  requireAdmin,
  validateAdminWeek,
  validateCohort,
  validateCohortDates,
  validateRosterMember,
} from "../src/lib/program/admin.ts";
import {
  MOCK_NOW,
  mockAdminSubmissions,
  mockApprovedMembers,
  mockCohorts,
  mockEnrollments,
  mockPeople,
  mockUsers,
  mockWeeks,
} from "../src/lib/program/mock-data.ts";

const adminWeeks = mockWeeks.map((week) => ({
  id: week.id,
  cohortId: week.cohortId,
  weekNumber: week.weekNumber,
  title: week.title,
  description: week.publicationState === "published" ? week.description : "",
  slidesUrl: week.publicationState === "published" ? week.slidesUrl : undefined,
  publicationState: week.publicationState,
  resources: week.publicationState === "published" ? week.resources : [],
  assignment: week.publicationState === "published" ? week.assignment : undefined,
}));

test("admin authorization rejects the member mock role", () => {
  assert.equal(requireAdmin(mockUsers.admin).role, "admin");
  assert.throws(() => requireAdmin(mockUsers.member), /Admin access required/);
});

test("admin queue selects the latest published assignment and prioritizes review work", () => {
  const current = getCurrentAdminWeek(adminWeeks);
  assert.equal(current?.weekNumber, 2);
  const rows = getSubmissionRows({
    state: {
      people: Object.values(mockPeople),
      approvedMembers: mockApprovedMembers,
      cohorts: Object.values(mockCohorts),
      enrollments: mockEnrollments,
      weeks: adminWeeks,
      submissions: mockAdminSubmissions,
    },
    cohortId: mockCohorts.fall2026.id,
    weekId: current.id,
    now: MOCK_NOW,
  });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.slice(0, 2).map((row) => row.state), ["submitted", "submitted"]);
  assert.ok(rows.some((row) => row.state === "revision_requested"));
  assert.ok(rows.some((row) => row.state === "completed"));
  assert.ok(rows.some((row) => row.submission === undefined));
});

test("admin validation protects cohort, roster, and publishable week contracts", () => {
  assert.match(validateCohort({ quarter: "fall", year: 2026, startsOn: "2026-09-01", endsOn: "2026-12-01" }, Object.values(mockCohorts)) ?? "", /already exists/);
  assert.match(validateCohort({ quarter: "winter", year: 2027, startsOn: "2027-03-01", endsOn: "2027-01-01" }, Object.values(mockCohorts)) ?? "", /End date/);
  assert.match(validateRosterMember({ fullName: "Test Person", email: "test@example.com" }, mockApprovedMembers) ?? "", /ucdavis/);
  assert.match(validateRosterMember({ fullName: "Aydin Merchant", email: "aydin.merchant@ucdavis.edu" }, mockApprovedMembers) ?? "", /already/);
  assert.match(validateAdminWeek({ ...adminWeeks[2], publicationState: "published", description: "" }) ?? "", /description/);
  assert.equal(validateAdminWeek(adminWeeks[1]), undefined);
});

test("cohort date edits reject invalid calendar dates and reversed ranges", () => {
  assert.equal(validateCohortDates({ startsOn: "2028-02-29", endsOn: "2028-03-01" }), undefined);
  assert.equal(validateCohortDates({ startsOn: "2026-10-20", endsOn: "2026-10-20" }), undefined);
  for (const startsOn of ["", "2026-02-29", "2026-13-01", "2026-2-01", "2026-10-20T00:00:00Z"]) {
    assert.match(validateCohortDates({ startsOn, endsOn: "2026-12-01" }), /valid start and end/);
  }
  assert.match(validateCohortDates({ startsOn: "2026-12-01", endsOn: "2026-11-30" }), /End date/);
});

test("admin queue filters are mutually exclusive and select the next review", () => {
  const week = getCurrentAdminWeek(adminWeeks);
  const rows = getSubmissionRows({ state: { people: Object.values(mockPeople), approvedMembers: mockApprovedMembers, cohorts: Object.values(mockCohorts), enrollments: mockEnrollments, weeks: adminWeeks, submissions: mockAdminSubmissions }, cohortId: mockCohorts.fall2026.id, weekId: week.id, now: MOCK_NOW });
  const counts = getAdminQueueCounts(rows);
  assert.equal(Object.values(counts).slice(0, 4).reduce((sum, count) => sum + count, 0), counts.all);
  assert.equal(filterSubmissionRows(rows, "awaiting_review").length, counts.awaiting_review);
  assert.ok(filterSubmissionRows(rows, "all", "aydin").every((row) => row.person.fullName.includes("Aydin")));
  const current = filterSubmissionRows(rows, "awaiting_review")[0].submission;
  assert.notEqual(getNextAwaitingSubmission(rows, current.id)?.id, current.id);
});

test("Pacific wall-clock deadlines reject gaps and disambiguate repeated times", () => {
  assert.match(pacificWallTimeToUtc("2026-03-08T02:30").error ?? "", /does not exist/);
  assert.match(pacificWallTimeToUtc("2026-11-01T01:30").error ?? "", /PDT or PST/);
  const daylight = pacificWallTimeToUtc("2026-11-01T01:30", "PDT").value;
  const standard = pacificWallTimeToUtc("2026-11-01T01:30", "PST").value;
  assert.notEqual(daylight, standard);
  assert.equal(formatPacificDateTimeInput(daylight), "2026-11-01T01:30");
});

test("admin queues isolate two assignments in one week and reject unknown selections", () => {
  const first = adminWeeks[1].assignment;
  const second = { ...first, id: "second-assignment", title: "Independent exercise" };
  const week = { ...adminWeeks[1], assignments: [first, second] };
  const enrollment = mockEnrollments.find((item) => item.cohortId === week.cohortId && item.participationStatus === "enrolled");
  const submission = { ...mockAdminSubmissions[0], id: "second-submission", assignmentId: second.id, enrollmentId: enrollment.id, isCurrent: true };
  const state = { people: Object.values(mockPeople), approvedMembers: mockApprovedMembers, cohorts: Object.values(mockCohorts), enrollments: mockEnrollments, weeks: [week], submissions: [...mockAdminSubmissions, submission] };
  const select = (assignmentId) => getSubmissionRows({ state, cohortId: week.cohortId, weekId: week.id, assignmentId, now: MOCK_NOW });
  assert.ok(select(first.id).every((row) => row.assignment.id === first.id && row.submission?.id !== submission.id));
  assert.equal(select(second.id).find((row) => row.enrollment.id === enrollment.id).submission.id, submission.id);
  assert.deepEqual(select("outside-this-week"), []);
  assert.equal(getCurrentAdminWeek([{ ...week, assignment: undefined }]).id, week.id);
  assert.match(validateAdminWeek({ ...week, assignments: [first, { ...second, instructions: "" }] }), /every assignment/);
  assert.match(validateAdminWeek({ ...week, assignments: [first, first] }), /unique/);
  assert.equal(validateAdminWeek({ ...week, assignment: first, assignments: [] }), undefined);
});

test('Slide Swap readiness matches each group member without counting preparation as submission',()=>{
 const state={people:[{id:'p1',fullName:'One'},{id:'p2',fullName:'Two'},{id:'p3',fullName:'Test'}],approvedMembers:[],cohorts:[],enrollments:[{id:'e1',personId:'p1',cohortId:'c',participationStatus:'enrolled'},{id:'e2',personId:'p2',cohortId:'c',participationStatus:'enrolled'},{id:'e3',personId:'p3',cohortId:'c',participationStatus:'enrolled',isTest:true}],weeks:[{id:'w',cohortId:'c',weekNumber:5,publicationState:'published',assignments:[{id:'a',title:'Swap',workflow:'slide_swap',submissionMode:'individual',dueAt:'2099-01-01'}]}],submissions:[],swapGroups:[{id:'g',assignmentId:'a',name:'Pair',isTest:false,enrollmentIds:['e1','e2']},{id:'t',assignmentId:'a',name:'Test pair',isTest:true,enrollmentIds:['e3']}],swapProgress:[{assignmentId:'a',groupId:'g',enrollmentId:'e1',ready:true},{assignmentId:'a',groupId:'g',enrollmentId:'e2',ready:false},{assignmentId:'other',groupId:'g',enrollmentId:'e2',ready:true},{assignmentId:'a',groupId:'t',enrollmentId:'e3',ready:true}]};
 const [row]=getSubmissionRows({state,cohortId:'c',weekId:'w',now:new Date('2026-11-25')});
 assert.deepEqual(row.slideReadiness,[{enrollmentId:'e1',name:'One',ready:true},{enrollmentId:'e2',name:'Two',ready:false}]);
 assert.equal(row.submission,undefined);assert.notEqual(row.state,'completed');assert.notEqual(row.state,'submitted');
 const testRows=getSubmissionRows({state,cohortId:'c',weekId:'w',now:new Date('2026-11-25'),audience:'test'});assert.equal(testRows.length,1);assert.equal(testRows[0].slideReadiness[0].name,'Test');
});
