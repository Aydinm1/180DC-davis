import type {DayScheduleRow} from './types.ts';

export type ConsultantAllocation={consultant:number;hours:number;tasks:{id:string;name:string;hours:number}[]};
export type ScheduleAllocation={weeks:ConsultantAllocation[][];incomplete:string[]};
/** Total effort is shared equally across assigned roles and distinct scheduled days. */
export function scheduleAllocation(rows:DayScheduleRow[]):ScheduleAllocation{
 const weeks=Array.from({length:10},()=>Array.from({length:5},(_,i)=>({consultant:i+1,hours:0,tasks:[]} as ConsultantAllocation)));
 const incomplete:string[]=[];
 for(const row of rows){
  const consultants=[...new Set(row.consultants)].filter(c=>Number.isInteger(c)&&c>=1&&c<=5);
  const days=new Set<number>();
  for(const b of row.blocks)for(let d=Math.max(1,b.start);d<=Math.min(70,b.end);d++)if(Number.isInteger(d))days.add(d);
  if(!days.size||!consultants.length||row.hours===null||!Number.isFinite(row.hours)||row.hours<=0){incomplete.push(row.id);continue;}
  const perDay=row.hours/consultants.length/days.size;
  for(let w=0;w<10;w++){
   const count=[...days].filter(d=>Math.ceil(d/7)===w+1).length;
   if(!count)continue;
   const hours=count*perDay;
   for(const c of consultants){const entry=weeks[w][c-1];entry.hours+=hours;entry.tasks.push({id:row.id,name:row.name,hours});}
  }
 }
 return {weeks,incomplete};
}
