'use client';
import { Button } from '@/components/ui/button';
export default function AttendanceAdminError({ reset }: { reset: () => void }) {
  return <main className="px-6 py-12"><h1 className="text-2xl font-bold">Attendance could not load</h1><p role="alert" className="my-5">Refresh to retry.</p><Button onClick={reset}>Refresh attendance</Button></main>;
}
