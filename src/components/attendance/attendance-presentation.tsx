'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { attendanceTime, isCheckInOpen, type AttendanceAdminData } from '@/lib/attendance/types';

export function AttendancePresentation({ session, weekNumber, title, now }: {
  session: AttendanceAdminData['sessions'][number]; weekNumber: number; title: string; now: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const enteredFullscreen = useRef(false);
  const open = isCheckInOpen(session, now);

  useEffect(() => {
    const element = dialog.current;
    const fullscreenChanged = () => {
      if (document.fullscreenElement === document.documentElement && element?.open) enteredFullscreen.current = true;
      else if (enteredFullscreen.current) {
        enteredFullscreen.current = false;
        element?.close();
      }
    };
    document.addEventListener('fullscreenchange', fullscreenChanged);
    return () => {
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      element?.close();
      if (enteredFullscreen.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  function present() {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    // Full-window presentation still works when fullscreen is unsupported or denied.
    if (document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().then(() => {
      if (!element.open && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
    }).catch(() => {});
  }
  function exit() {
    dialog.current?.close();
    if (enteredFullscreen.current && document.fullscreenElement === document.documentElement) void document.exitFullscreen().catch(() => {});
  }

  return <>
    {open ? <Button variant="secondary" onClick={present}>Present check-in</Button> : null}
    <dialog ref={dialog} aria-labelledby="attendance-presentation-title" aria-describedby={open ? undefined : 'attendance-presentation-instructions'}
      onCancel={event => { event.preventDefault(); exit(); }}
      onKeyDown={event => {
        // Exit is the presentation's only interactive control; keep Tab inside it.
        if (event.key === 'Tab') { event.preventDefault(); event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus(); }
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 bg-surface p-0 text-ink backdrop:bg-surface">
      <div className="flex min-h-full flex-col p-5 sm:p-8 lg:px-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-widest text-brand-deep">GAP · Workshop check-in</p>
            <h2 id="attendance-presentation-title" className="mt-2 text-xl font-bold sm:text-2xl">Week {weekNumber} · {title}</h2></div>
          <Button variant="quiet" onClick={exit}>Exit presentation</Button>
        </header>
        {open ? <>
          <div className="my-auto grid items-center justify-items-center gap-8 py-8 text-center sm:grid-cols-2 sm:gap-10">
            <div className="w-full max-w-xl">
              {session.qr ? <Image unoptimized src={session.qr} alt={`Scan to check in for Week ${weekNumber}`} width={640} height={640}
                className="mx-auto aspect-square h-auto w-full max-w-[min(60dvh,560px)] bg-white" />
                : <p className="rounded-card border border-border p-6 text-lg">QR unavailable. Open GAP and use the check-in code.</p>}
              <p className="mt-4 text-lg font-semibold">Scan to check in</p>
            </div>
            <div className="min-w-0 w-full">
              <p className="text-base font-semibold text-ink-soft sm:text-xl">Or enter this code in GAP</p>
              <p aria-label={`Code ${session.code.split('').join(' ')}`} className="my-5 whitespace-nowrap font-mono text-[clamp(2.75rem,7.5vw,8rem)] font-bold leading-tight tracking-[0.08em] text-action">{session.code}</p>
              <p className="text-base font-semibold sm:text-lg">Closes {attendanceTime(session.closes_at)}</p>
            </div>
          </div>
        </> : <section role="status" className="m-auto py-12 text-center"><h3 className="text-3xl font-bold sm:text-5xl">Check-in closed</h3><p id="attendance-presentation-instructions" className="mt-5 text-lg text-ink-soft">Return to Attendance to reopen check-in.</p></section>}
      </div>
    </dialog>
  </>;
}
