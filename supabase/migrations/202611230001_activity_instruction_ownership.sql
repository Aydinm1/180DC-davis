begin;
-- Preserve the authorized wrapper and all existing collection/locking/publication gates.
create or replace function private.save_week_before_teams(p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid=(p_data->>'id')::uuid; w public.program_weeks%rowtype;
 items jsonb; r jsonb; aid uuid; ids uuid[]='{}'; position integer=0; legacy_id uuid;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid week'; end if;
 select * into w from public.program_weeks where id=target for update;
 if w.id is null then raise exception 'Week not found'; end if;
 if coalesce(btrim(p_data->>'title'),'')='' or p_data->>'publicationState' not in ('published','draft') then raise exception 'Invalid week'; end if;
 if p_data->>'publicationState'='published' and coalesce(btrim(p_data->>'description'),'')='' then raise exception 'Description required'; end if;
 if nullif(p_data->>'slidesUrl','') is not null and p_data->>'slidesUrl' !~ '^https?://[^[:space:]]+$' then raise exception 'Invalid slides URL'; end if;
 perform id from public.assignments where week_id=target order by id for update;
 if p_data ? 'assignments' then
   items=p_data->'assignments';
   if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>100 then raise exception 'Invalid assignment list'; end if;
   if p_data ? 'expectedAssignmentIds' then
     if jsonb_typeof(p_data->'expectedAssignmentIds') is distinct from 'array' then raise exception 'Invalid assignment version'; end if;
     if array(select value::uuid from jsonb_array_elements_text(p_data->'expectedAssignmentIds') order by 1)
       is distinct from array(select id from public.assignments where week_id=target order by id) then
       raise exception using errcode='40001',message='Assignment list changed. Reload before saving';
     end if;
   end if;
 else
   -- Existing single-assignment callers may still save, but cannot erase a collection.
   if (select count(*) from public.assignments where week_id=target)>1 then raise exception using errcode='40001',message='Reload this week before editing multiple assignments'; end if;
   select id into legacy_id from public.assignments where week_id=target;
   if p_data->'assignment' is null or p_data->'assignment'='null'::jsonb then items='[]'::jsonb;
   else items=jsonb_build_array((p_data->'assignment')||jsonb_build_object('id',coalesce(legacy_id,gen_random_uuid()))); end if;
 end if;
 for r in select value from jsonb_array_elements(items) loop
   if jsonb_typeof(r) is distinct from 'object' then raise exception 'Invalid assignment'; end if;
   aid=(r->>'id')::uuid;
   if aid is null or aid=any(ids) then raise exception 'Missing or duplicate assignment ID'; end if;
   if exists(select 1 from public.assignments where id=aid and week_id<>target) then raise exception using errcode='42501',message='Assignment belongs to another week'; end if;
   if r->>'dueAt' is null or not isfinite((r->>'dueAt')::timestamptz) then raise exception 'Deadline required'; end if;
   -- Use the persisted workflow, never the caller's claimed workflow. New rows are Standard.
   if p_data->>'publicationState'='published' and (coalesce(btrim(r->>'title'),'')=''
    or (coalesce(btrim(r->>'instructions'),'')='' and not exists(
     select 1 from public.assignments a where a.id=aid and a.week_id=target
      and a.workflow in ('guided','cases','investigation','schedule','slide_swap')
    ))) then raise exception 'Assignment title and Standard instructions required'; end if;
   if r ? 'summary' and r->'summary' <> 'null'::jsonb and jsonb_typeof(r->'summary') is distinct from 'string' then raise exception 'Invalid summary'; end if;
   if r ? 'instructionsFormat' and coalesce(r->>'instructionsFormat','') not in ('plain','markdown') then raise exception 'Invalid instruction format'; end if;
   ids=array_append(ids,aid); position=position+1;
   insert into public.assignments(id,week_id,title,instructions,due_at,sort_order,summary,instructions_format)
   values(aid,target,coalesce(r->>'title',''),coalesce(r->>'instructions',''),(r->>'dueAt')::timestamptz,position,nullif(btrim(r->>'summary'),''),coalesce(r->>'instructionsFormat','plain'))
   on conflict(id) do update set title=excluded.title,instructions=excluded.instructions,due_at=excluded.due_at,sort_order=excluded.sort_order,
   summary=case when r ? 'summary' then excluded.summary else assignments.summary end,
   instructions_format=case when r ? 'instructionsFormat' then excluded.instructions_format else assignments.instructions_format end
   where assignments.week_id=target;
   if not found then raise exception using errcode='42501',message='Assignment belongs to another week'; end if;
 end loop;
 -- FK restrictions retain submissions, upload intents and assignment briefs. Any
 -- protected deletion rolls back the entire save, including edits to other items.
 delete from public.assignments where week_id=target and not(id=any(ids));
 update public.program_weeks set title=p_data->>'title',description=coalesce(p_data->>'description',''),
 published=p_data->>'publicationState'='published',slides_url=nullif(p_data->>'slidesUrl','') where id=target;
 if jsonb_typeof(p_data->'resources') is distinct from 'array' then raise exception 'Invalid resources'; end if;
 delete from public.resources where week_id=target;
 for r in select value from jsonb_array_elements(p_data->'resources') loop
   if coalesce(r->>'url','') !~ '^https?://[^[:space:]]+$' or (p_data->>'publicationState'='published' and coalesce(btrim(r->>'title'),'')='') then raise exception 'Invalid resource'; end if;
   insert into public.resources(week_id,title,description,resource_type,url,sort_order)
   values(target,r->>'title',r->>'description',r->>'type',r->>'url',(r->>'sortOrder')::integer);
 end loop;
 return target;
end $$;
revoke all on function private.save_week_before_teams(jsonb) from public,anon,authenticated,service_role;
commit;
