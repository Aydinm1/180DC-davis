import {serveSwapFile} from '@/lib/slide-swap/server';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return serveSwapFile((await params).id,false,true);}
