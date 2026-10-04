import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { PairBoardForm } from './DevicesPage/ControllersSection';

/**
 * Opened from the link on the board's display / setup page: /pair?code=4F7K2Q. Signing in first is handled
 * by AuthGuard, which brings the user back here afterwards.
 */
export function PairPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = (params.get('code') ?? '').toUpperCase();

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Link a board</PageHeaderTitle>
          <PageHeaderDescription>
            The board joins your account and appears on the My devices page
          </PageHeaderDescription>
        </div>
      </PageHeader>

      <Card className="max-w-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
            <Icon icon="lucide:cpu" className="size-5" />
          </div>
          <p className="text-sm text-slate-600">
            {code
              ? 'Check that the code matches the one on the board display and link it.'
              : 'Enter the code shown on the board display or its setup page.'}
          </p>
        </div>
        <PairBoardForm initialCode={code} onPaired={() => navigate('/settings/devices')} />
      </Card>
    </PageLayout>
  );
}
