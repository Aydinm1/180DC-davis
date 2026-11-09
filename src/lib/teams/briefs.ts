export type TeamBrief = {teamId:string;teamName:string;isTest:boolean;instructions:string;version:number;updatedAt:string|null};
export function teamBriefError(body:unknown,version:unknown):string|undefined {
 if(typeof body!=='string'||body.includes('\0')||Array.from(body).length>50000)return 'Use up to 50,000 characters for the team brief.';
 if(typeof version!=='number'||!Number.isSafeInteger(version)||version<0)return 'Reload before saving the team brief.';
}
