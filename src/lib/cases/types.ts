export type CaseAnswer = { method: string; framework: string; priority: string; reviewedAt?: string | null };
export type ExerciseCase = { number: number; title: string; scenario: string; reference?: string | null; answer?: CaseAnswer | null };
export type CaseExercise = { workflow: 'standard' | 'guided' | 'cases' | 'investigation' | 'schedule'; configVersion: number; overview?: string | null; closing?: string | null; cases: ExerciseCase[]; run?: { version: number; completedAt?: string | null } | null };
export type CaseContent = { overview: string; closing: string; cases: { number: number; title: string; scenario: string; reference: string }[] };
export type CaseAction = 'configure' | 'save' | 'next' | 'finish';
export function caseInputError(action: unknown, input: unknown): string | undefined {
 if (!['configure','save','next','finish'].includes(String(action)) || !input || typeof input !== 'object' || Array.isArray(input)) return 'Invalid exercise request.';
 const d=input as Record<string,unknown>;
 if (!Number.isSafeInteger(d.version) || Number(d.version)<0) return 'Reload this exercise before saving.';
 const text=(s:unknown,max:number)=>typeof s==='string' && s.trim().length>0 && Array.from(s).length<=max;
 if(action==='configure') {
  const c=d.content as CaseContent | undefined;
  if(!c || !text(c.overview,50000)) return 'Complete the exercise overview.';
  if(!text(c.closing,50000) || !Array.isArray(c.cases) || c.cases.length!==8 || !c.cases.every((v,i)=>v && v.number===i+1 && ['title','scenario','reference'].every(k=>text(v[k as keyof typeof v],50000)))) return 'Provide all eight cases and reference approaches (up to 50,000 characters per section).';
 } else {
  if(!Number.isInteger(d.caseNumber) || Number(d.caseNumber)<1 || Number(d.caseNumber)>8) return 'Choose a case from 1–8.';
  if(action==='save' && (!['mathematical','process','decision'].includes(String(d.method)) || !text(d.framework,10000) || !text(d.priority,10000))) return 'Choose a method and complete both responses (up to 10,000 characters each).';
 }
}
