'use client';

import {useState} from 'react';
import {SlideSwap} from '@/components/program/slide-swap';
import {Button} from '@/components/ui/button';
import {EditorSections} from './editor-sections';
import {swapDeckUrl,swapInstructions,type SwapActivity,type SwapSettings} from '@/lib/slide-swap/types';

const input='mt-2 block min-h-11 w-full rounded border border-border bg-surface px-3 font-normal';

type TestPair={urls:[string,string];run:number};

/** Admin-only simulation. No participant operations, persistence or uploaded assets. */
export function SlideSwapPreview({id,initial,samples}:{id:string;initial:SwapActivity;samples:SwapSettings}){
 const [mode,setMode]=useState<'pair'|'assignment'>('pair');
 const [urls,setUrls]=useState<[string,string]>(['','']);
 const [pair,setPair]=useState<TestPair|null>(null);
 const [editing,setEditing]=useState(true),[presenter,setPresenter]=useState<'first'|'second'>('first'),[error,setError]=useState('');
 const index=presenter==='first'?0:1,partner=index===0?1:0;
 function start(){
  const first=swapDeckUrl(urls[0].trim()),second=swapDeckUrl(urls[1].trim());
  if(!first||!second){setError('Add a Google Slides or Canva presentation link for each presenter.');return;}
  setPair(previous=>({urls:[first,second],run:(previous?.run??0)+1}));setPresenter('first');setEditing(false);setError('');
 }
 const deck=(i:number)=>({id:`test-deck-${i}`,name:pair?.urls[i].startsWith('https://docs.google.com/')?'Google Slides':'Canva',url:pair?.urls[i],author:`Presenter ${i+1}`});
 const activity:SwapActivity={workflow:'slide_swap',overview:samples.overview??swapInstructions,enrollmentId:`test-presenter-${index}`,story:samples.stories[index],ownDeck:deck(index),assignedDeck:deck(partner),group:{id:'preview-test-pair',name:'Test pair',unlockedAt:'preview',members:[0,1].map(i=>({id:`test-presenter-${i}`,name:`Presenter ${i+1}`,active:true,ready:true}))},attempts:[]};
 return <div className="mt-5 space-y-5">
  <EditorSections label="Preview mode" value={mode} onChange={setMode} options={[{value:'pair',label:'Test pair'},{value:'assignment',label:'Assignment preview'}]}/>
  {mode==='assignment'?<SlideSwap id={id} initial={initial} samples={samples} preview/>:<>
   {editing?<section aria-label="Test pair setup" className="max-w-3xl space-y-5 rounded-card border border-border bg-surface p-5 sm:p-7">
    <div><h2 className="text-xl font-bold">Try a slide swap</h2><p className="mt-2 text-sm text-ink-soft">Add two viewing links, then switch between presenters. Nothing is submitted; links reset when you leave this preview.</p></div>
    {[0,1].map(i=><label key={i} className="block text-sm font-semibold">Presenter {i+1} slide link<input type="url" className={input} value={urls[i]} placeholder="Google Slides or Canva link" onChange={e=>{setUrls(previous=>i===0?[e.target.value,previous[1]]:[previous[0],e.target.value]);setError('');}}/></label>)}
    <p className="text-sm text-ink-soft">Allow viewing access in Google Slides or Canva. GAP opens the links directly.</p>
    <Button onClick={start}>Preview swap</Button>{error?<p role="alert" className="text-sm font-semibold">{error}</p>:null}
   </section>:pair?<>
    <div className="flex flex-wrap items-center justify-between gap-3"><EditorSections label="View test pair as" value={presenter} onChange={setPresenter} options={[{value:'first',label:'Presenter 1'},{value:'second',label:'Presenter 2'}]}/><Button variant="secondary" onClick={()=>setEditing(true)}>Edit test links</Button></div>
    <SlideSwap key={pair.run} id={id} initial={activity} preview/>
   </>:null}
  </>}
 </div>;
}
