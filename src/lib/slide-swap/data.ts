import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {requireUser} from '@/lib/supabase/auth';
import type {SwapActivity,SwapSettings} from './types';
export async function readSwapSettings(id:string):Promise<SwapSettings>{await requireUser(true);const r=await(await createClient()).rpc('read_slide_swap',{p_assignment:id,p_admin:true});if(r.error)throw Error('Could not load Slide Swap settings.');return r.data as unknown as SwapSettings;}
export async function readSlideSwap(id:string):Promise<SwapActivity>{await requireUser();const r=await(await createClient()).rpc('read_slide_swap',{p_assignment:id});if(r.error)throw Error('Could not load Slide Swap. Refresh and retry.');return r.data as unknown as SwapActivity;}
