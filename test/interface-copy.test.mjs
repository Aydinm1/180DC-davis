import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('review, attendance and direction inbox omit bookkeeping commentary',()=>{
 const files=['components/admin/admin-overview.tsx','components/admin/project-direction-requests.tsx','components/attendance/admin-attendance.tsx'];
 const text=files.map(source).join('\n');
 for(const removed of ['Counts describe assignment submissions, not unique people.','This does not mean the week is complete.','Preparation approvals are separate from graded submissions.','Official teams only.','Test check-ins are retained but never included in official present counts.','Self-check-in closed. Recorded attendance is retained.'])assert.ok(!text.includes(removed),removed);
 assert.match(text,/No submissions awaiting review/);
 assert.match(text,/Official participants/);assert.match(text,/Test participants only/);
});
test('copy cleanup preserves submission and data-loss safeguards',()=>{
 const editor=source('components/program/submission-editor.tsx');
 assert.match(editor,/Drafts are not saved after a reload/);
 assert.match(editor,/review team has permission to open your link/);
 assert.match(editor,/Preview only — nothing will be submitted/);
 assert.match(source('components/admin/admin-week-editor.tsx'),/Return this week to draft\? Members will lose access/);
 assert.match(source('components/program/case-exercise.tsx'),/This locks all eight responses/);
 assert.match(source('components/program/guided-project.tsx'),/Shared with your team\. Editable until final submission/);
});
test('title-only empty states omit unused description spacing',()=>{
 const text=source('components/ui/state-message.tsx');
 assert.match(text,/children\?: ReactNode/);assert.match(text,/children != null \?/);
});
