import Image from "next/image";
import Link from "next/link";
import type { ProgramUser } from "@/lib/program/types";
import { cn } from "@/lib/ui";
import { PageContainer } from "@/components/ui/container";
import { ProfileMenu } from "./profile-menu";

export type NavigationItem = {
  label: string;
  href: string;
  current?: boolean;
};

export function AppHeader({
  user,
  navigation,
  profileLinks,
  cohortLabel,
  homeHref = '/',
  prefetchNavigation,
}: {
  user: ProgramUser;
  navigation: readonly NavigationItem[];
  profileLinks: readonly NavigationItem[];
  cohortLabel?: string;
  homeHref?: string;
  prefetchNavigation?: boolean;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <PageContainer>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-3 lg:flex lg:min-h-20 lg:gap-7">
          <Link prefetch={prefetchNavigation} href={homeHref} aria-label="180 Degrees Consulting UC Davis home" className="col-start-1 row-start-1 shrink-0 rounded-sm">
            <Image
              src="/brand/180dc-uc-davis-landscape-dark.png"
              alt=""
              width={928}
              height={318}
              priority
              className="h-auto w-40 sm:w-48"
            />
          </Link>
          {navigation.length ? (
            <nav
              aria-label="Primary"
              className="col-span-2 row-start-2 -mx-2 mt-2 flex min-w-0 gap-1 overflow-x-auto pb-2 lg:order-2 lg:mx-0 lg:mt-0 lg:flex-1 lg:pb-0"
            >
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={prefetchNavigation}
                  aria-current={item.current ? "page" : undefined}
                  className={cn(
                    "min-h-11 shrink-0 rounded-md px-3 py-2.5 text-sm font-bold",
                    item.current
                      ? "bg-success-bg text-success-text"
                      : "text-ink-soft hover:bg-surface-subtle hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="col-start-2 row-start-1 self-center lg:order-3 lg:ml-auto">
            <ProfileMenu user={user} links={profileLinks} cohortLabel={cohortLabel} />
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
