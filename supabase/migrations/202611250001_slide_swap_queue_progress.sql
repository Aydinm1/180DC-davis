begin;
-- Queue preparation metadata only: no stories, asset references, URLs or proof content.
create function public.slide_swap_queue_progress(p_cohort uuid)
returns table(assignment_id uuid,group_id uuid,enrollment_id uuid,ready boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin access required'; end if;
 return query
 select m.assignment_id,m.group_id,m.enrollment_id,
  exists(select 1 from private.swap_assets f where f.assignment_id=m.assignment_id
   and f.enrollment_id=m.enrollment_id and f.group_id=m.group_id
   and f.kind='deck' and f.current and f.state='ready')
 from public.slide_swap_members m
 join public.slide_swap_groups g on g.id=m.group_id and g.assignment_id=m.assignment_id
 join public.assignments a on a.id=m.assignment_id
 join public.program_weeks w on w.id=a.week_id
 join public.cohort_enrollments e on e.id=m.enrollment_id
 where w.cohort_id=p_cohort and w.published and a.workflow='slide_swap'
  and e.cohort_id=w.cohort_id and e.participation_status='enrolled' and e.is_test=g.is_test;
end $$;
revoke all on function public.slide_swap_queue_progress(uuid) from public,anon;
grant execute on function public.slide_swap_queue_progress(uuid) to authenticated;
commit;
