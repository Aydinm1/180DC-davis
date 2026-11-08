import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmissionReviewWorkspace } from "@/components/program/submission-review-workspace";
import { PageContainer } from "@/components/ui/container";
import { readWeek } from '@/lib/supabase/data';


type SubmissionReviewPageProps = {
  params: Promise<{ weekNumber: string }>;
  searchParams: Promise<{ assignment?: string | string[] }>;
};

const getDetail = readWeek;

export async function generateMetadata({ params, searchParams }: SubmissionReviewPageProps): Promise<Metadata> {
  const { weekNumber } = await params;
  const detail = await getDetail(weekNumber);
  const selected = (await searchParams).assignment;
  const assignment = selected === undefined ? detail?.assignments[0] : detail?.assignments.find((item) => item.id === selected);
  return { title: assignment ? `${assignment.title} Review | GAP` : "Submission not found | GAP" };
}

export default async function SubmissionReviewPage({ params, searchParams }: SubmissionReviewPageProps) {
  const { weekNumber } = await params;
  const detail = await getDetail(weekNumber);
  if (!detail) notFound();
  const selected = (await searchParams).assignment;
  const assignment = selected === undefined ? detail.assignments[0] : detail.assignments.find((item) => item.id === selected);
  if (!assignment) notFound();
  if (assignment.workflow==='cases') redirect(`/week/${weekNumber}/assignments/${assignment.id}`);

  const attempts = assignment.attempts;

  return (
    <main className="pb-20 sm:pb-24">
      <PageContainer className="py-9 sm:py-11">
        <Link href={`/week/${detail.week.weekNumber}/assignments/${encodeURIComponent(assignment.id)}`} className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover">
          <span className="mr-2" aria-hidden="true">←</span> Assignment
        </Link>

        <header className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">Week {detail.week.weekNumber.toString().padStart(2, "0")} · Submission review</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">{assignment.title}</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-ink-soft">Due {assignment.dueLabel}</p>
        </header>

        <div className="mt-10 lg:mt-12">
          <SubmissionReviewWorkspace
            assignmentId={assignment.id}
            enrollmentId={detail.enrollmentId}
            initialAttempts={attempts}
            completionCredit={assignment.completionCredit}
            documentsOnly={assignment.workflow==='guided'}
            checkedWorkflow={assignment.workflow==='investigation'}
          />
        </div>
      </PageContainer>
    </main>
  );
}
