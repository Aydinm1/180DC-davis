export type Research = { risk1: string; risk2: string; question: string };
export type Proposal = { risk: string; direction: string; question: string; evidence: string };
export type GuidedConfig = { overview: string; direction_intro: string; final_brief: string; version: number };
export type Recommendation = { company: string; title: string; guidance: string; version: number };
export type GuidedState = { research: Research; original_research?: Research; version: number; direction: 'recommended' | 'alternative' | null; frozen: boolean; researched_at: string };
export type DirectionRequest = { id: string; proposal: Proposal; status: 'pending' | 'approved' | 'changes_requested' | 'superseded'; decision?: 'approved' | 'changes_requested'; decision_note: string; requested_at: string; decided_at?: string };
export type GuidedTeam = { id: string; name: string; isTest: boolean; members: number; recommendation: Recommendation | null; state: GuidedState | null; requests: DirectionRequest[] };
export type GuidedProject = { workflow: 'standard' | 'guided' | 'cases' | 'investigation'; config: GuidedConfig | null; teamId?: string; state?: GuidedState | null; recommendation?: Recommendation | null; requests?: DirectionRequest[]; teams?: GuidedTeam[] };
export type GuidedAction = 'config' | 'recommendation' | 'research' | 'recommended' | 'alternative' | 'decide';
export function canSubmitGuided(project: GuidedProject) {
 return Boolean(project.recommendation && project.state && (project.state.direction === 'recommended' || project.state.direction === 'alternative' && project.requests?.some(r => r.status === 'approved')));
}
export function guidedInputError(action: unknown, data: unknown): string | undefined {
 if (!['config','recommendation','research','recommended','alternative','decide'].includes(String(action)) || !data || typeof data !== 'object' || Array.isArray(data)) return 'Invalid guided project request.';
 const d = data as Record<string, unknown>;
 if (!Number.isSafeInteger(d.version) || Number(d.version) < 0) return 'Reload this assignment before saving.';
 const fields = (v: unknown, names: string[], limit: number) => !!v && typeof v === 'object' && names.every(k => { const s=(v as Record<string,unknown>)[k]; return typeof s==='string' && s.trim().length>0 && Array.from(s).length<=limit; });
 if (action==='research' && !fields(d.research,['risk1','risk2','question'],10000)) return 'Complete both risks/citations and your initial question (up to 10,000 characters each).';
 if (action==='alternative' && !fields(d.proposal,['risk','direction','question','evidence'],10000)) return 'Complete the risk, direction, question and evidence plan (up to 10,000 characters each).';
 if (action==='config' && (!['standard','guided'].includes(String(d.workflow)) || !fields(d,['overview','directionIntro','finalBrief'],50000))) return 'Complete each instruction section (up to 50,000 characters).';
 if (action==='recommendation' && (!fields(d,['company','title'],300) || !fields(d,['guidance'],50000))) return 'Enter the company, direction title and guidance within their limits.';
 if (action==='decide' && (!['approved','changes_requested'].includes(String(d.decision)) || typeof d.note!=='string' || Array.from(d.note).length>50000 || d.decision==='changes_requested' && !d.note.trim())) return 'Choose a decision and explain requested changes.';
}
