export type SwapStory={id:string;title:string;body:string};
export type SwapMember={enrollmentId:string;storyId:string;name?:string;active?:boolean;ready?:boolean};
export type SwapGroup={id:string;name:string;isTest:boolean;unlocked_at?:string|null;members:SwapMember[]};
export type SwapSettings={workflow:string;version:number;overview:string|null;stories:SwapStory[];groups:SwapGroup[];locked:boolean;published:boolean};
export type SwapAsset={id:string;name:string;author?:string;url?:string|null};
export type SwapAttempt={id:string;assetId:string;status:'submitted'|'revision_requested'|'completed';feedback?:string;submittedAt:string;updatedAt:string;current:boolean};
export type SwapActivity={workflow:string;overview:string|null;enrollmentId:string;story?:SwapStory;ownDeck?:SwapAsset;assignedDeck?:SwapAsset;group?:{id:string;name:string;unlockedAt?:string;members:{id:string;name:string;active:boolean;ready:boolean}[]};attempts:SwapAttempt[]};
export const swapInstructions='Create exactly five slides that tell your assigned story visually. Share a Google Slides or Canva viewing link, or upload a five-page PDF. Enable viewing access for your partners before marking your slides ready. Once everyone in your presentation group is ready, swap decks. Meet in person or on Zoom, present the deck assigned to you without coaching, then have its creator tell the original story. Discuss what came across and what was hilariously lost. Take a photo or screenshot showing everyone and submit it once for your group.';
export function swapSettingsError(data:unknown):string|undefined{
 if(!data||typeof data!=='object')return 'Invalid settings.';const d=data as SwapSettings;
 if(!Number.isSafeInteger(d.version)||d.version<0||!d.overview?.trim()||d.overview.length>50000||!Array.isArray(d.stories)||!Array.isArray(d.groups))return 'Add instructions and a story library.';
 const stories=new Set<string>(),people=new Set<string>();
 for(const s of d.stories){if(!s.id||stories.has(s.id)||!s.title?.trim()||s.title.length>300||!s.body?.trim()||s.body.length>50000)return 'Each story needs a unique ID, title and text.';stories.add(s.id);}
 for(const g of d.groups){if(!g.id||!g.name?.trim()||g.name.length>100||typeof g.isTest!=='boolean'||g.members.length<2||g.members.length>3)return 'Each presentation group needs two or three people.';const assigned=new Set<string>();for(const m of g.members){if(!m.enrollmentId||people.has(m.enrollmentId)||!stories.has(m.storyId)||assigned.has(m.storyId))return 'Assign each person once and give partners different stories.';people.add(m.enrollmentId);assigned.add(m.storyId);}}
}

export function swapDeckUrl(value:string):string|null{
 if(value.length>2048||/[\s\u0000-\u001f\u007f]/.test(value))return null;
 try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
 const google=url.hostname==='docs.google.com'&&/^\/presentation\/(?:u\/\d+\/)?d\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_./-]*)?$/.test(url.pathname);
 const canva=['canva.com','www.canva.com'].includes(url.hostname)&&/^\/design\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_./-]*)?$/.test(url.pathname);
 const canvaShort=url.hostname==='canva.link'&&/^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
 return google||canva||canvaShort?url.href:null;}catch{return null;}
}
