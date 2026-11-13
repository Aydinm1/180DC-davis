import type { Assignment, SubmissionStatus } from '@/lib/program/types';
export type ScheduleRow = {id:string;name:string;weeks:number[]};
export type ScheduleConfig = {overview:string;scenario:string;disruption:string;starter:ScheduleRow[]};
export type ScheduleSnapshot = {original:ScheduleRow[];revised:ScheduleRow[];explanation:string};
export type ScheduleAttempt = ScheduleSnapshot & {id:string;status:SubmissionStatus;feedback?:string|null;updatedAt:string;submittedAt:string;isCurrent:boolean};
export type ScheduleActivity = {workflow:NonNullable<Assignment['workflow']>;configVersion:number;locked?:boolean|null;overview?:string|null;scenario?:string|null;disruption?:string|null;starter?:ScheduleRow[]|null;config?:ScheduleConfig|null;
 run?:{version:number;working:ScheduleRow[];original?:ScheduleRow[]|null;revised?:ScheduleRow[]|null;explanation:string;savedAt?:string|null;revealedAt?:string|null}|null;attempts:ScheduleAttempt[]};
export type ScheduleAction = 'configure'|'draft'|'reveal'|'submit';
export function scheduleRowsError(value:unknown,complete=false):string|undefined {
 if(!Array.isArray(value)||value.length>30||complete&&!value.length)return 'Use 1–30 tasks before proceeding.';
 const ids=new Set<string>();
 for(const row of value){
  if(!row||typeof row.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)||ids.has(row.id.toLowerCase()))return 'Task IDs must be unique.';
  ids.add(row.id.toLowerCase());
  if(typeof row.name!=='string'||Array.from(row.name).length>200||complete&&!row.name.trim())return 'Name every task using up to 200 characters.';
  if(!Array.isArray(row.weeks)||row.weeks.length>10||complete&&!row.weeks.length||new Set(row.weeks).size!==row.weeks.length||row.weeks.some((w:unknown)=>!Number.isInteger(w)||Number(w)<1||Number(w)>10))return 'Schedule every task within weeks 1–10 before proceeding.';
 }
}
export function scheduleInputError(action:unknown,value:unknown):string|undefined {
 if(!['configure','draft','reveal','submit'].includes(String(action))||!value||typeof value!=='object'||Array.isArray(value))return 'Invalid schedule operation.';
 const d=value as Record<string,unknown>;
 if(!Number.isSafeInteger(d.version)||Number(d.version)<0)return 'Reload before saving.';
 if(action==='configure'){
  const c=d.content as ScheduleConfig|undefined;
  if(!c||['overview','scenario','disruption'].some(k=>typeof c[k as keyof ScheduleConfig]!=='string'||!String(c[k as keyof ScheduleConfig]).trim()||Array.from(String(c[k as keyof ScheduleConfig])).length>50000))return 'Complete all instructions (up to 50,000 characters per section).';
  return scheduleRowsError(c.starter,true);
 }
 if(!Number.isSafeInteger(d.configVersion)||Number(d.configVersion)<1)return 'Reload the activity instructions before saving.';
 if(typeof d.explanation!=='string'||Array.from(d.explanation).length>2000||action==='submit'&&!d.explanation.trim())return 'Explain your changes using up to 2,000 characters.';
 return scheduleRowsError(d.rows,action!=='draft');
}
