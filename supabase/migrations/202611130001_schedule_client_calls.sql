begin;
-- Optional admin-authored visual category; existing plans and history stay untouched.
create or replace function private.valid_schedule_format(rows jsonb,complete boolean,p_format integer,require_staff boolean) returns boolean language plpgsql immutable set search_path='' as $$
declare r jsonb;b jsonb;v jsonb;ids uuid[]='{}';bids uuid[];rid uuid;bid uuid;previous_end integer;hours numeric;
begin
 if p_format=1 then return private.valid_schedule(rows,complete);end if;
 if p_format is distinct from 2 or jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows)>30 or (complete and jsonb_array_length(rows)=0) then return false;end if;
 for r in select value from jsonb_array_elements(rows) loop
  if jsonb_typeof(r) is distinct from 'object' or (r-array['id','name','blocks','consultants','hours','category'])<>'{}'::jsonb
   or jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'name') is distinct from 'string' or length(r->>'name')>200
   or (complete and (r->>'name') ~ '^[[:space:]]*$') or jsonb_typeof(r->'blocks') is distinct from 'array'
   or jsonb_array_length(r->'blocks')>35 or (complete and jsonb_array_length(r->'blocks')=0)
   or jsonb_typeof(r->'consultants') is distinct from 'array' or jsonb_array_length(r->'consultants')>5
   or (require_staff and jsonb_array_length(r->'consultants')=0) or not(r ? 'hours') then return false;end if;
  if r ? 'category' and r->'category' is distinct from '"client_call"'::jsonb then return false;end if;
  rid=(r->>'id')::uuid;
  if rid=any(ids) then return false;end if;ids=array_append(ids,rid);bids='{}';previous_end=-1;
  for b in select value from jsonb_array_elements(r->'blocks') loop
   if jsonb_typeof(b) is distinct from 'object' or (b-array['id','start','end'])<>'{}'::jsonb or jsonb_typeof(b->'id') is distinct from 'string'
    or jsonb_typeof(b->'start') is distinct from 'number' or jsonb_typeof(b->'end') is distinct from 'number'
    or b->>'start' !~ '^([1-9]|[1-6][0-9]|70)$' or b->>'end' !~ '^([1-9]|[1-6][0-9]|70)$' then return false;end if;
   bid=(b->>'id')::uuid;
   if bid=any(bids) or (b->>'start')::integer<=previous_end+1 or (b->>'end')::integer<(b->>'start')::integer then return false;end if;
   bids=array_append(bids,bid);previous_end=(b->>'end')::integer;
  end loop;
  if (select count(*) from jsonb_array_elements(r->'consultants'))<>(select count(distinct value) from jsonb_array_elements(r->'consultants')) then return false;end if;
  for v in select value from jsonb_array_elements(r->'consultants') loop
   if jsonb_typeof(v)<>'number' or v::text !~ '^[1-5]$' then return false;end if;
  end loop;
  if jsonb_typeof(r->'hours')='null' then if require_staff then return false;end if;
  elsif jsonb_typeof(r->'hours')='number' then
   hours=(r->>'hours')::numeric;
   if hours<=0 or hours>90071992547409.91 or hours<>trunc(hours,2) then return false;end if;
  else return false;end if;
 end loop;return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end $$;
revoke all on function private.valid_schedule_format(jsonb,boolean,integer,boolean) from public,anon,authenticated,service_role;


create or replace function public.mutate_schedule(p_action text,p_assignment uuid,p_data jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.assignments;c private.schedule_configs;r private.schedule_runs;receipt private.schedule_receipts;eid uuid;expected bigint;
 payload jsonb;result jsonb;content jsonb;rows jsonb;reason text;target public.submission_targets;s public.submissions;sid uuid;fmt integer;
begin
 perform private.submission_gate();
 if private.my_person_id() is null or private.is_viewer() or p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception using errcode='42501',message='Access denied';end if;
 if octet_length(p_data::text)>(case when p_action='configure' then 1000000 else 200000 end) then raise exception using errcode='22023',message='Schedule data is too large';end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null then raise exception using errcode='22023',message='Save the assignment first';end if;
 if p_action='configure' then
  if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 else eid=private.schedule_enrollment(a.id);end if;
 payload=jsonb_build_object('action',p_action,'assignment',a.id,'enrollment',eid,'data',p_data);
 select * into receipt from private.schedule_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then if receipt.payload<>payload then raise exception using errcode='22023',message='Retry request changed';end if;return receipt.result;end if;
 if jsonb_typeof(p_data->'version') is distinct from 'number' or (p_data->>'version') !~ '^[0-9]+$' then raise exception using errcode='22023',message='Reload before saving';end if;
 expected=(p_data->>'version')::bigint;
 select * into c from private.schedule_configs where assignment_id=a.id for update;
 if p_action='configure' then
  if a.submission_mode<>'individual' or exists(select 1 from public.program_weeks where id=a.week_id and published) then raise exception using errcode='22023',message='Use Individual mode and a draft week';end if;
  if exists(select 1 from private.schedule_runs where assignment_id=a.id) or exists(select 1 from public.submissions where assignment_id=a.id)
   or exists(select 1 from private.upload_intents where assignment_id=a.id) or exists(select 1 from public.assignment_completions where assignment_id=a.id)
   or exists(select 1 from private.case_runs where assignment_id=a.id) or exists(select 1 from private.guided_states where assignment_id=a.id)
   or exists(select 1 from private.investigation_runs where assignment_id=a.id) then raise exception using errcode='22023',message='Activity configuration is locked because work exists';end if;
  if expected<>coalesce(c.version,0) then raise exception using errcode='40001',message='Configuration changed. Copy your edits before reloading';end if;
  content=p_data->'content';
  if content ? 'formatVersion' and content->'formatVersion' not in ('1'::jsonb,'2'::jsonb) then raise exception using errcode='22023',message='Invalid schedule format';end if;
  fmt=coalesce((content->>'formatVersion')::integer,1);
  if coalesce((c.content->>'formatVersion')::integer,1)>fmt then raise exception using errcode='22023',message='Day-level activities cannot revert to whole weeks';end if;
  if jsonb_typeof(content) is distinct from 'object' or exists(select 1 from unnest(array['overview','scenario','disruption']) k where jsonb_typeof(content->k) is distinct from 'string' or (content->>k) ~ '^[[:space:]]*$' or length(content->>k)>50000)
   or not private.valid_schedule_format(content->'starter',true,fmt,false) then raise exception using errcode='22023',message='Complete all instructions and a valid starting schedule';end if;
  insert into private.schedule_configs(assignment_id,content) values(a.id,content) on conflict(assignment_id) do update set content=excluded.content,version=schedule_configs.version+1;
  update public.assignments set workflow='schedule' where id=a.id;result=jsonb_build_object('saved',true);
 elsif p_action in ('draft','reveal','submit') then
  if a.workflow<>'schedule' or c.assignment_id is null then raise exception using errcode='22023',message='Your schedule activity is being prepared';end if;
  if jsonb_typeof(p_data->'configVersion') is distinct from 'number' or (p_data->>'configVersion')::bigint is distinct from c.version then raise exception using errcode='40001',message='The activity instructions changed. Copy your work before reloading';end if;
  fmt=coalesce((c.content->>'formatVersion')::integer,1);
  if coalesce(p_data->'formatVersion','1'::jsonb)<>to_jsonb(fmt) then raise exception using errcode='40001',message='The schedule format changed. Copy your work before reloading';end if;
  insert into private.schedule_runs(assignment_id,enrollment_id,working) values(a.id,eid,c.content->'starter') on conflict do nothing;
  select * into r from private.schedule_runs where assignment_id=a.id and enrollment_id=eid for update;
  if expected<>r.version then raise exception using errcode='40001',message='Your schedule changed in another tab. Copy your input before reloading';end if;
  rows=p_data->'rows';reason=p_data->>'explanation';
  if not private.valid_schedule_format(rows,p_action<>'draft',fmt,p_action<>'draft') or jsonb_typeof(p_data->'explanation') is distinct from 'string' or length(reason)>2000 then raise exception using errcode='22023',message='Use up to 30 tasks, 200 characters per name, ten project weeks and 2,000 explanation characters. Complete task schedules, consultant assignments and hours before proceeding';end if;
  if fmt=2 and exists(select 1 from jsonb_array_elements(rows) task where task->'category' is distinct from
   (select preset->'category' from jsonb_array_elements(c.content->'starter') preset where preset->>'id'=task->>'id')) then
   raise exception using errcode='22023',message='Client-call markers are managed by admins. Reload the starting schedule';
  end if;
  target=private.resolve_submission_target_before_cases(a.id);
  select * into s from public.submissions where target_id=target.id and is_current for update;
  if s.status='completed' then raise exception using errcode='22023',message='Completed schedules are read-only';end if;
  if p_action='reveal' then
   if r.revealed_at is not null then raise exception using errcode='22023',message='The original plan is already locked';end if;
   update private.schedule_runs set working=rows,original=rows,revised=rows,explanation='',revealed_at=clock_timestamp(),saved_at=clock_timestamp(),version=version+1 where id=r.id;
  elsif p_action='submit' then
   if r.revealed_at is null or reason ~ '^[[:space:]]*$' then raise exception using errcode='22023',message='Reveal the disruption and explain your changes before submitting';end if;
   if s.id is distinct from (p_data->>'expectedId')::uuid or s.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then raise exception using errcode='40001',message='Your submission changed. Refresh before submitting again';end if;
   sid=gen_random_uuid();
   insert into private.schedule_attempts(submission_id,assignment_id,enrollment_id,original,revised,explanation,format_version) values(sid,a.id,eid,r.original,rows,reason,fmt);
   update public.submissions set is_current=false where id=s.id;
   insert into public.submissions(id,assignment_id,target_id,enrollment_id,submitted_by,submission_type,submitted_text,supersedes_submission_id)
   values(sid,a.id,target.id,eid,private.my_person_id(),'text','Schedule planning conclusion: '||reason,s.id);
   update private.schedule_runs set revised=rows,explanation=reason,saved_at=clock_timestamp(),version=version+1 where id=r.id;
  else
   update private.schedule_runs set working=case when r.revealed_at is null then rows else working end,revised=case when r.revealed_at is not null then rows else revised end,
    explanation=case when r.revealed_at is not null then reason else '' end,saved_at=clock_timestamp(),version=version+1 where id=r.id;
  end if;
  result=jsonb_build_object('saved',true,'submissionId',sid);
 else raise exception using errcode='22023',message='Unknown schedule operation';end if;
 insert into private.schedule_receipts values(auth.uid(),p_request,payload,result);return result;
end $$;

commit;
