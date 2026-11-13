import type { Assignment, SubmissionStatus } from '@/lib/program/types';
export type ScheduleRow = {id:string;name:string;weeks:number[]};
export type ScheduleBlock = {id:string;start:number;end:number};
export type DayScheduleRow = {category?:'client_call';id:string;name:string;blocks:ScheduleBlock[];consultants:number[];hours:number|null};
export type ScheduleTask = ScheduleRow|DayScheduleRow;
export type ScheduleFormat = 1|2;
export type ScheduleConfig = {overview:string;scenario:string;disruption:string;formatVersion?:ScheduleFormat;starter:ScheduleTask[]};
export type ScheduleSnapshot = {formatVersion?:ScheduleFormat;original:ScheduleTask[];revised:ScheduleTask[];explanation:string};
export type ScheduleAttempt = ScheduleSnapshot & {id:string;status:SubmissionStatus;feedback?:string|null;updatedAt:string;submittedAt:string;isCurrent:boolean};
export type ScheduleActivity = {workflow:NonNullable<Assignment['workflow']>;configVersion:number;formatVersion?:ScheduleFormat;published?:boolean;locked?:boolean|null;overview?:string|null;scenario?:string|null;disruption?:string|null;starter?:ScheduleTask[]|null;config?:ScheduleConfig|null;
 run?:{version:number;working:ScheduleTask[];original?:ScheduleTask[]|null;revised?:ScheduleTask[]|null;explanation:string;savedAt?:string|null;revealedAt?:string|null}|null;attempts:ScheduleAttempt[]};
export type ScheduleAction = 'configure'|'draft'|'reveal'|'submit';
export function scheduleRowsError(value:unknown,complete=false,formatVersion:ScheduleFormat=1,requireStaff=complete):string|undefined {
 if(!Array.isArray(value)||value.length>30||complete&&!value.length)return 'Use 1–30 tasks before proceeding.';
 const ids=new Set<string>();
 for(const row of value){
  if(!row||typeof row.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)||ids.has(row.id.toLowerCase()))return 'Task IDs must be unique.';
  ids.add(row.id.toLowerCase());
  if(typeof row.name!=='string'||Array.from(row.name).length>200||complete&&!row.name.trim())return 'Name every task using up to 200 characters.';
  if(formatVersion===2){const error=dayRowError(row,complete,requireStaff);if(error)return error;continue;}
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
  if(c.formatVersion!==undefined&&c.formatVersion!==1&&c.formatVersion!==2)return 'Invalid schedule format.';
  return scheduleRowsError(c.starter,true,c.formatVersion??1,false);
 }
 if(!Number.isSafeInteger(d.configVersion)||Number(d.configVersion)<1)return 'Reload the activity instructions before saving.';
 if(typeof d.explanation!=='string'||Array.from(d.explanation).length>2000||action==='submit'&&!d.explanation.trim())return 'Explain your changes using up to 2,000 characters.';
 if(d.formatVersion!==undefined&&d.formatVersion!==1&&d.formatVersion!==2)return 'Invalid schedule format.';
 return scheduleRowsError(d.rows,action!=='draft',(d.formatVersion as ScheduleFormat|undefined)??1);
}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function dayRowError(row:DayScheduleRow,complete:boolean,requireStaff:boolean):string|undefined {
 if(Object.keys(row).some(k=>!['id','name','blocks','consultants','hours','category'].includes(k)))return 'Invalid task fields.';
 if(row.category!==undefined&&row.category!=='client_call')return 'Invalid task category.';
 if(!Array.isArray(row.blocks)||row.blocks.length>35||complete&&!row.blocks.length)return 'Schedule each task within the ten project weeks.';
 const ids=new Set<string>();let previousEnd=-1;
 for(const block of row.blocks){
  if(!block||typeof block.id!=='string'||!uuid.test(block.id)||ids.has(block.id.toLowerCase())||Object.keys(block).some(k=>!['id','start','end'].includes(k))||!Number.isInteger(block.start)||!Number.isInteger(block.end)||block.start<1||block.end>70||block.end<block.start||block.start<=previousEnd+1)return 'Use distinct, ordered scheduled blocks within days 1–70.';
  ids.add(block.id.toLowerCase());previousEnd=block.end;
 }
 if(!Array.isArray(row.consultants)||row.consultants.length>5||new Set(row.consultants).size!==row.consultants.length||row.consultants.some(c=>!Number.isInteger(c)||c<1||c>5)||requireStaff&&!row.consultants.length)return 'Assign at least one Consultant 1–5 to every task.';
 if(row.hours!==null&&(typeof row.hours!=='number'||!Number.isFinite(row.hours)||row.hours<=0||row.hours>Number.MAX_SAFE_INTEGER/100||Number(row.hours.toFixed(2))!==row.hours)||requireStaff&&row.hours===null)return 'Enter positive estimated hours with up to two decimal places for every task.';
}
