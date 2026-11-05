export const marketingSite = {
  name: '180 Degrees Consulting at UC Davis',
  description: 'The public website of 180 Degrees Consulting at UC Davis.',
  gapHref: '/',
} as const;

/** Only this public subtree skips GAP session refresh; similarly named paths do not. */
export function isMarketingPath(pathname: string) {
  return pathname === '/landing' || pathname.startsWith('/landing/');
}
