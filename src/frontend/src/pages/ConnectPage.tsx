import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Spinner } from '@src/components/Spinner';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { errorMessage } from '@src/redux/helpers';
import { useConnectControllerMutation } from '@src/redux/controllersApi';

// the board's own page on the local network, as the server checks it (BoardConnectService.isBoardAddress)
function isBoardAddress(back: string) {
  try {
    const url = new URL(back);
    if (url.protocol !== 'http:' || url.pathname !== '/connect' || url.search || url.hash || url.username) {
      return false;
    }
    const host = url.hostname.toLowerCase();
    const ip = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (ip) {
      const [a, b] = [Number(ip[1]), Number(ip[2])];
      return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    }
    return /^[a-z0-9-]{1,63}\.local$/.test(host);
  } catch {
    return false;
  }
}

/**
 * Opened from "Sign in" on the board's page: /connect?hw=esp8266-c62e98&platform=esp8266&fw=2.5.0&state=…&back=
 * http://192.168.1.150/connect. AuthGuard signs the user in first (password, Google or GitHub) and brings them
 * back here. Linking gives the board its own MQTT login, which goes back to the board through the browser.
 */
export function ConnectPage() {
  const [params] = useSearchParams();
  const hardwareId = params.get('hw') ?? '';
  const platform = params.get('platform') ?? undefined;
  const firmwareVersion = params.get('fw') ?? undefined;
  const state = params.get('state') ?? '';
  const back = params.get('back') ?? '';
  const valid = hardwareId.length > 0 && state.length > 0 && isBoardAddress(back);

  const [connect, { isLoading }] = useConnectControllerMutation();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const link = async () => {
    setError(null);
    const res = await connect({ hardwareId, platform, firmwareVersion, back });
    if ('error' in res) {
      setError(errorMessage(res.error));
      return;
    }
    const answer = new URLSearchParams({
      state,
      uid: String(res.data.userId),
      user: res.data.mqttUsername,
      pass: res.data.mqttPassword,
      host: res.data.mqttHost,
      port: String(res.data.mqttPort),
    });
    setRedirecting(true);
    // replace: the address with the board's password does not stay in the history
    window.location.replace(`${back}?${answer}`);
  };

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
        {!valid ? (
          <p className="text-sm text-slate-600">
            This link does not come from a board. Open the board's page on your Wi-Fi (its address is on the
            display) and press <b>Sign in</b> there.
          </p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
                <Icon icon="lucide:cpu" className="size-5" />
              </div>
              <div className="text-sm">
                <div className="font-mono font-semibold">{hardwareId}</div>
                <div className="text-slate-500">
                  {platform?.toUpperCase()} {firmwareVersion && <>· firmware {firmwareVersion}</>} · at{' '}
                  {new URL(back).host}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Linking gives the board its own login to the server and sends you back to its page. Keep this
              phone or computer on the same Wi-Fi as the board.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={link} disabled={isLoading || redirecting}>
              {isLoading || redirecting ? <Spinner /> : <Icon icon="lucide:link" />}
              {redirecting ? 'Back to the board…' : 'Link this board'}
            </Button>
          </>
        )}
      </Card>
    </PageLayout>
  );
}
