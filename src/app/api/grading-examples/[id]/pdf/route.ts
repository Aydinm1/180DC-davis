import {serveAdminPdf} from '@/lib/pdf/server';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 return serveAdminPdf('example',(await params).id,request.signal);
}
