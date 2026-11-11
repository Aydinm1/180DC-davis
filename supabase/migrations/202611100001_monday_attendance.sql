-- Trusted export boundary: no client-supplied attendance, items or actor identity.
create function public.monday_attendance_snapshot(p_actor uuid, p_cohort uuid, p_week uuid,
 p_account text, p_board text, p_enrollment uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare week_number integer; participants jsonb;
begin
 if not exists(select 1 from auth.users u join public.approved_members a on a.email=lower(u.email)
 join public.people p on p.id=a.person_id and p.email=a.email
 where u.id=p_actor and u.email_confirmed_at is not null and a.active and a.role='admin'
 and a.email ~ '^[^[:space:]@]+@ucdavis[.]edu$'
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')) then
 raise exception using errcode='42501',message='Active admin required'; end if;
 select w.week_number into week_number from public.program_weeks w
 where w.id=p_week and w.cohort_id=p_cohort;
 if week_number is null or week_number not between 1 and 6 or nullif(trim(p_account),'') is null
 or nullif(trim(p_board),'') is null then
 raise exception using errcode='22023',message='Invalid attendance scope'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('enrollmentId',e.id,'name',p.full_name,'email',p.email,
  'items',(select coalesce(jsonb_agg(l.item_id order by l.item_id),'[]'::jsonb)
   from private.monday_application_links l where l.enrollment_id=e.id
   and l.account_id=p_account and l.board_id=p_board)) order by e.id),'[]'::jsonb)
 into participants from public.cohort_enrollments e join public.people p on p.id=e.person_id
 join public.attendance_records r on r.enrollment_id=e.id and r.present
 join public.attendance_sessions s on s.id=r.session_id and s.week_id=p_week
 where e.cohort_id=p_cohort and not e.is_test and (p_enrollment is null or e.id=p_enrollment);
 return jsonb_build_object('weekNumber',week_number,'participants',participants);
end $$;
revoke all on function public.monday_attendance_snapshot(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.monday_attendance_snapshot(uuid,uuid,uuid,text,text,uuid) to service_role;
