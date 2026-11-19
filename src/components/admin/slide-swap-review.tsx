'use client';
import {useState} from 'react';
import {PdfPreview} from './pdf-preview';
import {AssignmentBrief} from '@/components/program/assignment-brief';
export type SwapReview={photoId:string;members:{name:string;assetId:string;url?:string|null;story:{title:string;body:string}}[]};
export function SlideSwapReview({snapshot}:{snapshot:SwapReview}){
 const [selected,setSelected]=useState(0),member=snapshot.members[selected];
 return <section className="mt-6 space-y-4 border-t border-border pt-5" aria-label="Slide Swap decks and stories"><h3 className="font-semibold">Presentation decks</h3><label className="block text-sm font-semibold">Presenter<select className="ml-3 min-h-11 rounded border border-border px-3" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{snapshot.members.map((m,i)=><option value={i} key={m.assetId}>{m.name}</option>)}</select></label>{member?<><details><summary className="min-h-11 cursor-pointer text-sm font-semibold">Original story · {member.story.title}</summary><AssignmentBrief instructions={member.story.body} format="markdown"/></details><>{member.url?<a className="action-link inline-flex min-h-11 items-center font-semibold text-action" href={member.url} target="_blank" rel="noopener noreferrer">Open slides ↗</a>:<PdfPreview key={member.assetId} resource={{kind:'swap',id:member.assetId,name:member.name+' — five slides'}} lazy/>}</></>:null}</section>;
}
