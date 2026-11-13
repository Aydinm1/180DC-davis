export type InvestigationHint = { id: string; title: string; optional: boolean; body: string | null; openedAt?: string | null };
export type InvestigationStage = { id: string; title: string; hints: InvestigationHint[] };
export type InvestigationConfig = { overview: string; workbookUrl: string; acceptedNames: string[]; gradingGuidance: string; stages: (Omit<InvestigationStage,'hints'> & { hints: (InvestigationHint & { body: string })[] })[] };
export type Investigation = {
 workflow: 'standard'|'guided'|'cases'|'investigation'|'schedule'; configVersion: number;
 overview: string | null; workbookUrl: string | null; stages: InvestigationStage[]; config?: InvestigationConfig | null;
 run?: { version: number; name: string; reason: string; savedAt: string | null } | null;
 submission?: { id: string; status: 'submitted'|'revision_requested'|'completed'; feedback: string | null; updatedAt: string; submittedAt: string; name: string; reason: string } | null;
};
export type OpenedHint = { id: string; title: string; stage: string; body?: string; openedAt: string };
export type InvestigationReview = { name: string; reason: string; hints: OpenedHint[]; guidance: string };
export type InvestigationInsights = { hints: { id: string; title: string; stage: string; opened: number }[]; participants: { enrollmentId: string; name: string; email: string; hints: OpenedHint[] }[] };
export type InvestigationAction = 'configure'|'draft'|'reveal'|'submit';
export function nextInvestigationHint(stage: InvestigationStage) { return stage.hints.find(h=>!h.optional && !h.body); }
export function investigationInputError(action: InvestigationAction, data: unknown): string | undefined {
 if(!data || typeof data!=='object' || Array.isArray(data)) return 'Invalid investigation request.';
 const d=data as Record<string,unknown>;
 if(!Number.isSafeInteger(d.version) || Number(d.version)<0) return 'Reload before saving.';
 if(action==='configure') {
  const c=d.content as InvestigationConfig | undefined;
  if(!c || typeof c.overview!=='string' || !c.overview.trim() || c.overview.length>50000 || typeof c.gradingGuidance!=='string' || c.gradingGuidance.length>50000) return 'Complete the overview (up to 50,000 characters).';
  try { if(!['http:','https:'].includes(new URL(c.workbookUrl).protocol) || c.workbookUrl.length>2000) return 'Enter a valid student workbook URL.'; } catch { return 'Enter a valid student workbook URL.'; }
  if(!Array.isArray(c.acceptedNames) || !c.acceptedNames.length || c.acceptedNames.length>20 || c.acceptedNames.some(n=>typeof n!=='string'||!n.trim()||n.length>200)) return 'Enter the canonical suspect name and up to 19 accepted variants.';
  if(!Array.isArray(c.stages)||!c.stages.length||c.stages.length>12) return 'Provide 1–12 stages.';
  const ids=new Set<string>();let total=0;
  for(const s of c.stages) {
   if(!s || typeof s.title!=='string'||!s.title.trim()||s.title.length>200||!Array.isArray(s.hints)||!s.hints.length||s.hints.length>24) return 'Complete each stage and its hints.';
   for(const item of [s,...s.hints]) { if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)||ids.has(item.id)) return 'Stage and hint IDs must be unique.'; ids.add(item.id); }
   for(const h of s.hints) { total++;if(typeof h.title!=='string'||!h.title.trim()||h.title.length>200||typeof h.body!=='string'||!h.body.trim()||h.body.length>50000||typeof h.optional!=='boolean')return 'Complete each hint title and body (up to 50,000 characters).'; }
  }
  if(total>100 || new TextEncoder().encode(JSON.stringify(c)).length>1000000) return 'Investigation configuration is too large.';
 } else if(action==='draft'||action==='submit') {
  if(typeof d.name!=='string'||d.name.length>200||typeof d.reason!=='string'||d.reason.length>2000) return 'Use up to 200 characters for the name and 2,000 for evidence.';
  if(action==='submit'&&(!d.name.trim()||!d.reason.trim())) return 'Enter a name and supporting evidence.';
 } else if(action==='reveal') { if(typeof d.hintId!=='string') return 'Choose a hint.'; }
 else return 'Invalid investigation operation.';
}
