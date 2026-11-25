"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import {useRouter} from 'next/navigation';
import type {ProgramCohort,ProgramUser} from '@/lib/program/types';
import {AdminShell} from './admin-shell';
export type WeekListItem={id:string;weekNumber:number;title:string;publicationState:'published'|'draft';assignmentCount:number};

export function AdminWeeks({user,cohorts,cohortId,weeks,hasMyProgram}:{user:ProgramUser;cohorts:readonly ProgramCohort[];cohortId:string;weeks:readonly WeekListItem[];hasMyProgram:boolean}) {
  const router=useRouter();
  return (
    <AdminShell user={user} cohorts={cohorts} selectedCohortId={cohortId} hasMyProgram={hasMyProgram} onCohortChange={id=>router.push(`/admin/weeks?cohort=${encodeURIComponent(id)}`)}><main className="pb-20 sm:pb-24">
      <PageContainer className="py-9 sm:py-11">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Program content</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Weeks</h1>
        {weeks.length ? (
          <ol className="mt-7 overflow-hidden rounded-card border border-border bg-surface shadow-card">
            {weeks.map((week) => {
              const count = week.assignmentCount;
              const published = week.publicationState === "published";
              return (
                <li key={week.id} className="border-b border-border last:border-0">
                  <Link
                    prefetch={false}
                    href={`/admin/weeks/${week.id}?cohort=${cohortId}`}
                    className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-5 hover:bg-surface-subtle sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:px-6"
                  >
                    <span className="grid size-10 self-start place-items-center rounded-full bg-surface-subtle text-sm font-bold text-ink sm:self-center">
                      <span className="sr-only">Week </span>{week.weekNumber}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-6 sm:text-base">{week.title}</span>
                      <span className="mt-1 block text-xs text-ink-soft sm:text-sm">
                        {count ? `${count} ${count === 1 ? "assignment" : "assignments"}` : "No assignments yet"}
                      </span>
                    </span>
                    <Badge className="col-start-2 justify-self-start sm:col-start-auto" tone={published ? "success" : "neutral"}>
                      {published ? "Published" : "Draft"}
                    </Badge>
                    <span aria-hidden="true" className="col-start-3 row-start-1 text-action sm:col-start-auto sm:row-start-auto">→</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-7">
            <StateMessage title="No weeks in this cohort">New cohorts receive six draft weeks when they are created.</StateMessage>
          </div>
        )}
      </PageContainer>
    </main></AdminShell>
  );
}
