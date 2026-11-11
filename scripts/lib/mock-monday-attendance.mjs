// Local verification only. Never install this hook in production.
import {readFileSync,writeFileSync} from 'node:fs';
if(process.env.MONDAY_API_TOKEN!=='fixture-monday-token'||!['localhost','127.0.0.1'].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname))throw new Error('Monday mock requires isolated local configuration');
const original=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 if(new URL(typeof input==='string'?input:input.url??input).hostname!=='api.monday.com')return original(input,options);
 if(options.headers.Authorization!=='fixture-monday-token')throw new Error('Unexpected Monday credential');
 const fixture=JSON.parse(readFileSync(process.env.GAP_MONDAY_FIXTURE,'utf8')),body=JSON.parse(options.body),v=body.variables;
 if(body.query.includes('account{'))return Response.json({data:{account:{id:'fixture-account'},boards:[{id:'99001',columns:[{id:'email',title:'Email',type:'text'},...Array.from({length:6},(_,i)=>({id:'week'+(i+1),title:'Week '+(i+1),type:'checkbox'}))]}]}});
 if(body.query.startsWith('query'))return Response.json({data:{items:v.items.filter(id=>fixture.items[id]).map(id=>({id,board:{id:'99001'},column_values:[{id:'email',text:fixture.items[id].email},...Array.from({length:6},(_,i)=>({id:'week'+(i+1),value:JSON.stringify({checked:!!fixture.items[id]['week'+(i+1)]})}))]}))}});
 if(v.board!=='99001'||!fixture.items[v.item]||Object.entries(JSON.parse(v.values)).some(([key,value])=>!/^week[1-6]$/.test(key)||value.checked!=='true'))throw new Error('Unexpected mutation');
 fixture.writes.push({item:v.item,values:JSON.parse(v.values)});
 for(const key of Object.keys(JSON.parse(v.values)))fixture.items[v.item][key]=true;
 writeFileSync(process.env.GAP_MONDAY_FIXTURE,JSON.stringify(fixture));
 return Response.json({data:{change_multiple_column_values:{id:v.item}}});
};
