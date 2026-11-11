export type AttendanceExportParticipant = { enrollmentId: string; name: string; email: string; items: string[] };
export type AttendanceExportSnapshot = { weekNumber: number; participants: AttendanceExportParticipant[] };
export type AttendanceSyncResult = {
  checked: number; alreadyChecked: number;
  issues: { name: string; reason: string }[];
  error?: string;
};
