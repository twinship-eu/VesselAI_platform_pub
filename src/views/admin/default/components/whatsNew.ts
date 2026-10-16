/**
 * "What's new" entries for the overview page. Newest first.
 *
 * Add an entry when a user-visible feature ships; the card shows the first
 * MAX_VISIBLE and the "Latest" badge on the first one. The `id` must be stable
 * (it is stored in localStorage so returning users see a "New" marker only for
 * entries they have not seen yet).
 *
 * `href` may be an internal route (/admin/...) or an absolute URL (opens in a
 * new tab). `roles` restricts an entry to users holding ANY of those roles;
 * omit for everyone.
 */

export interface WhatsNewEntry {
  id: string;
  /** ISO date the feature became available on the platform. */
  date: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  /** Show only to users holding at least one of these roles. */
  roles?: string[];
}

export const MAX_VISIBLE = 4;

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: 'report-a-problem',
    date: '2026-09-16',
    title: 'Report a problem',
    description:
      'Found a bug or something unclear? "Report a problem" in the sidebar opens a pre-filled ' +
      'issue in the consortium GitHub tracker. The page you were on is attached automatically.',
    href: process.env.NEXT_PUBLIC_ISSUES_URL || '#',
    linkLabel: 'See open reports',
  },

];
