import type {DayScheduleRow,ScheduleBlock,ScheduleRow} from './types.ts';

export const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const;
export function dayLabel(day:number){return `Week ${Math.ceil(day/7)} ${weekdays[(day-1)%7]}`;}
export function mergeBlocks(blocks:ScheduleBlock[]):ScheduleBlock[]{
 const merged:ScheduleBlock[]=[];
 for(const block of blocks.toSorted((a,b)=>a.start-b.start)){
  const last=merged.at(-1);
  if(last&&block.start<=last.end+1)last.end=Math.max(last.end,block.end);
  else merged.push({...block});
 }
 return merged;
}
export function changeBlock(block:ScheduleBlock,kind:'move'|'start'|'end',delta:number):ScheduleBlock{
 if(kind==='move'){const shift=Math.max(1-block.start,Math.min(70-block.end,delta));return {...block,start:block.start+shift,end:block.end+shift};}
 return kind==='start'?{...block,start:Math.max(1,Math.min(block.end,block.start+delta))}:{...block,end:Math.min(70,Math.max(block.start,block.end+delta))};
}
export function upgradeRows(rows:ScheduleRow[],newId:()=>string):DayScheduleRow[]{
 return rows.map(row=>({id:row.id,name:row.name,consultants:[],hours:null,blocks:mergeBlocks(row.weeks.map(week=>({id:newId(),start:(week-1)*7+1,end:week*7})))}));
}
