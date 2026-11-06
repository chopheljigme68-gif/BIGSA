import type { ApplicationStatus } from '@bigsa/shared';

export const STATUS_TONE: Record<ApplicationStatus, string> = {
  received: 'info',
  under_review: 'warn',
  needs_info: 'warn',
  approved: 'ok',
  rejected: 'bad',
  withdrawn: 'neutral',
};
