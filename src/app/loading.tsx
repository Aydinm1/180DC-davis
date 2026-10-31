import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center px-6 py-16">
      <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col items-center gap-8">
        <Image
          src="/brand/180dc-uc-davis-landscape-dark.png"
          alt=""
          width={928}
          height={318}
          loading="eager"
          className="h-auto w-56 max-w-full sm:w-64"
        />
        <span aria-hidden="true" className="h-1 w-12 rounded-full bg-brand motion-safe:animate-pulse" />
        <span className="sr-only">Loading GAP…</span>
      </div>
    </div>
  );
}
