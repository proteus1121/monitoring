import { Icon } from '@iconify/react';
import { useGetSsoProvidersQuery } from '@src/redux/generatedApi';
import { AuthTexts } from './authTexts';

const PROVIDERS = [
  { id: 'google', icon: 'logos:google-icon', label: (t: AuthTexts) => t.continueWithGoogle },
  { id: 'github', icon: 'mdi:github', label: (t: AuthTexts) => t.continueWithGithub },
];

// The backend handles the whole OAuth flow and redirects back to the dashboard with a session
export function SsoButtons({ texts }: { texts: AuthTexts }) {
  const { data: enabled } = useGetSsoProvidersQuery();
  const providers = PROVIDERS.filter(p => enabled?.includes(p.id));

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-slate-400 uppercase">
        <span className="h-px flex-1 bg-black/10" />
        {texts.or}
        <span className="h-px flex-1 bg-black/10" />
      </div>
      {providers.map(provider => (
        <a
          key={provider.id}
          href={`${process.env.BASE_URL}/oauth2/authorization/${provider.id}`}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-black/15 bg-white text-sm font-medium transition-colors hover:bg-gray-50"
        >
          <Icon icon={provider.icon} className="size-5" />
          {provider.label(texts)}
        </a>
      ))}
    </div>
  );
}
