import 'server-only';
import {requireUser} from './auth';
import {createClient} from './server';
import {readPages} from './pagination';
import {readAdminWeeksRows} from './admin-weeks-rows';

export async function readAdminWeeks(requestedCohort?:string){
 const user=await requireUser(true),db=await createClient();
 const requested=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedCohort??'')?requestedCohort:undefined;
 const [catalog,own,requestedWeeks]=await Promise.all([
  readPages((from,to)=>db.from('program_cohorts').select('id,quarter,year,starts_on,ends_on,state').order('id').range(from,to)),
  readPages((from,to)=>db.from('cohort_enrollments').select('cohort_id,participation_status').eq('person_id',user.personId).order('id').range(from,to)),
  requested?readAdminWeeksRows(db,requested):undefined,
 ]);
 const cohorts=catalog.data.map(c=>({id:c.id,quarter:c.quarter,year:c.year,startsOn:c.starts_on,endsOn:c.ends_on,state:c.state}));
 const cohort=cohorts.find(c=>c.id===requestedCohort)??cohorts.find(c=>c.state==='active')??cohorts[0];
 const weeks=!cohort?[]:requested===cohort.id&&requestedWeeks?requestedWeeks:await readAdminWeeksRows(db,cohort.id);
 const hasMyProgram=own.data.some(e=>e.participation_status==='enrolled'&&cohorts.some(c=>c.id===e.cohort_id&&c.state==='active'));
 return {user,cohorts,cohortId:cohort?.id??'',weeks,hasMyProgram};
}
