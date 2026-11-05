begin;
-- Extend only member submissions; assignment/grading PDF buckets remain unchanged.
update storage.buckets set allowed_mime_types=array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'] where id='submissions';

create or replace function public.file_upload(p_actor uuid,p_action text,p_intent uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.upload_intents; t public.submission_targets; s public.submissions;
 filename text; ext text; mime text; sid uuid; aid uuid; eid uuid; v bigint;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if private.my_person_id() is null or private.is_viewer() then raise exception using errcode='42501',message='Access denied'; end if;
 perform private.submission_gate();
 if p_action='prepare' then
  aid=(p_data->>'assignmentId')::uuid; t=private.resolve_submission_target(aid);
  select e.id into eid from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id join public.assignments a on a.week_id=w.id where a.id=aid and e.person_id=private.my_person_id() and e.participation_status='enrolled';
  select version into v from public.cohort_teams where id=t.team_id;
  filename=p_data->>'name'; ext=lower(substring(filename from '[.]([^.]+)$'));
  mime=case ext when 'pdf' then 'application/pdf' when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   when 'pptx' then 'application/vnd.openxmlformats-officedocument.presentationml.presentation' when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
   when 'png' then 'image/png' when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg' when 'webp' then 'image/webp' end;
  if mime is null or mime is distinct from p_data->>'mime' or filename ~ '[[:cntrl:]/\\]' then raise exception 'Invalid file'; end if;
  if mime in ('image/png','image/jpeg','image/webp') and exists(select 1 from public.assignments where id=aid and workflow<>'standard') then
   raise exception using errcode='22023',message='This assignment requires a document, not an image';
  end if;
  select * into s from public.submissions where target_id=t.id and is_current for update;
  if s.id is distinct from (p_data->>'expectedId')::uuid or s.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then return jsonb_build_object('error','stale'); end if;
  if s.status='completed' then return jsonb_build_object('error','closed'); end if;
  if (select count(*) from private.upload_intents where owner_id=p_actor and state='pending' and expires_at>clock_timestamp())>=10 then return jsonb_build_object('error','too_many'); end if;
  sid=gen_random_uuid();
  insert into private.upload_intents(owner_id,assignment_id,enrollment_id,target_id,team_version,submission_id,path,original_filename,expected_size,mime_type,expected_id,expected_updated_at)
  values(p_actor,aid,eid,t.id,v,sid,p_actor::text||'/'||aid::text||'/'||sid::text||'-'||regexp_replace(filename,'[^a-zA-Z0-9._-]','_','g'),filename,(p_data->>'size')::bigint,mime,s.id,s.updated_at) returning * into i;
 else
  select * into i from private.upload_intents where id=p_intent and owner_id=p_actor for update;
  if i.id is null then raise exception using errcode='42501',message='Upload unavailable'; end if;
  select * into t from public.submission_targets where id=i.target_id for update;
 end if;
 if i.state='committed' then
  if not private.can_read_target(i.target_id) then raise exception using errcode='42501',message='Access denied'; end if;
  return jsonb_build_object('id',i.id,'state',i.state,'submissionId',i.submission_id);
 end if;
 if p_action='cancel' or i.expires_at<=clock_timestamp() then
  update private.upload_intents set state='abandoned' where id=i.id; return jsonb_build_object('error','abandoned');
 end if;
 if i.state<>'pending' then return jsonb_build_object('error','abandoned'); end if;
 if p_action='finalize' then
  if i.mime_type in ('image/png','image/jpeg','image/webp') and exists(select 1 from public.assignments where id=i.assignment_id and workflow<>'standard') then
   update private.upload_intents set state='abandoned' where id=i.id; return jsonb_build_object('error','invalid');
  end if;
  select * into s from public.submissions where target_id=t.id and is_current for update;
  if not exists(select 1 from public.cohort_enrollments e join public.assignments a on a.id=i.assignment_id join public.program_weeks w on w.id=a.week_id
    where e.id=i.enrollment_id and e.person_id=private.my_person_id() and e.participation_status='enrolled' and e.cohort_id=w.cohort_id and w.published and private.can_learn(e.cohort_id)
    and (t.enrollment_id=e.id or exists(select 1 from public.team_memberships m join public.cohort_teams g on g.id=m.team_id where m.enrollment_id=e.id and g.id=t.team_id and g.version=i.team_version)))
   or s.status='completed' or s.id is distinct from i.expected_id or s.updated_at is distinct from i.expected_updated_at then
   update private.upload_intents set state='abandoned' where id=i.id; return jsonb_build_object('error','stale');
  end if;
  if (p_data->>'size')::bigint is distinct from i.expected_size or p_data->>'mime' is distinct from i.mime_type or not exists(select 1 from storage.objects o where o.bucket_id='submissions' and o.name=i.path and (o.metadata->>'size')::bigint=i.expected_size and o.metadata->>'mimetype'=i.mime_type) then
   update private.upload_intents set state='abandoned' where id=i.id; return jsonb_build_object('error','invalid');
  end if;
  update public.submissions set is_current=false where id=s.id;
  insert into public.submissions(id,assignment_id,target_id,enrollment_id,team_id,submitted_by,submission_type,original_filename,file_path,file_size,mime_type,supersedes_submission_id)
  values(i.submission_id,i.assignment_id,t.id,t.enrollment_id,t.team_id,private.my_person_id(),'file',i.original_filename,i.path,i.expected_size,i.mime_type,s.id);
  update private.upload_intents set state='committed' where id=i.id;
  return jsonb_build_object('id',i.id,'state','committed','submissionId',i.submission_id);
 elsif p_action not in ('prepare','get') then raise exception 'Unknown operation'; end if;
 return jsonb_build_object('id',i.id,'state',i.state,'path',i.path,'name',i.original_filename,'size',i.expected_size,'mime',i.mime_type,'expiresAt',i.expires_at);
end $$;
revoke all on function public.file_upload(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.file_upload(uuid,text,uuid,jsonb) to service_role;
create or replace function private.may_upload(p_path text) returns boolean language sql volatile security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from private.upload_intents i
 join public.cohort_enrollments e on e.id=i.enrollment_id join public.submission_targets t on t.id=i.target_id
 join public.assignments a on a.id=i.assignment_id join public.program_weeks w on w.id=a.week_id
 where i.path=p_path and i.owner_id=auth.uid() and i.state='pending' and i.expires_at>clock_timestamp()
 and (i.mime_type not in ('image/png','image/jpeg','image/webp') or a.workflow='standard')
 and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(e.cohort_id) and w.published
 and (t.enrollment_id=e.id or exists(select 1 from public.team_memberships m join public.cohort_teams g on g.id=m.team_id where m.enrollment_id=e.id and g.id=t.team_id and g.version=i.team_version))
 and not exists(select 1 from public.submissions s where s.target_id=t.id and s.is_current and s.status='completed'))
$$;

-- Defense in depth for any trusted submission writer, without changing approval/freeze rules.
create or replace function private.guard_guided_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if exists(select 1 from public.assignments where id=new.assignment_id and workflow='guided') then
  if new.submission_type='text' or (new.submission_type='file' and (new.mime_type is null or new.mime_type not in (
   'application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')))
   or not private.guided_ready(new.assignment_id,new.team_id)
  then raise exception using errcode='42501',message='Guided projects require an approved direction and a document or document link'; end if;
  update private.guided_states set frozen=true where assignment_id=new.assignment_id and team_id=new.team_id;
 end if;
 return new;
end $$;
revoke all on function private.guard_guided_submission() from public,anon,authenticated,service_role;
commit;
