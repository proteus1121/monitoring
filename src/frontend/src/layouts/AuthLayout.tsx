import { Icon } from '@iconify/react';
import { notification } from 'antd';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { Card } from '@src/components/Card';
import Logo from '@src/components/logo/Logo';
import { AUTH_TEXTS, Lang, STACK } from '@src/pages/auth/authTexts';
import { SsoButtons } from '@src/pages/auth/SsoButtons';

const LANG_KEY = 'auth-lang';

function loadLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'uk';
  } catch {
    return 'uk';
  }
}

const AuthLayout = () => {
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = AUTH_TEXTS[lang];
  const [searchParams, setSearchParams] = useSearchParams();

  const changeLang = (next: Lang) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // the choice is just not remembered
    }
  };

  useEffect(() => {
    if (searchParams.has('sso_error')) {
      notification.error({ message: t.ssoFailed });
      searchParams.delete('sso_error');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-50 via-white to-white text-slate-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Logo className="size-5" />
          </div>
          <div>
            <div className="font-semibold">{t.appName}</div>
            <div className="text-xs text-slate-500">{t.appTagline}</div>
          </div>
        </div>
        <div className="flex rounded-lg border border-black/10 bg-white p-0.5 text-sm">
          {(['uk', 'en'] as Lang[]).map(code => (
            <button
              key={code}
              type="button"
              onClick={() => changeLang(code)}
              className={clsx(
                'rounded-md px-3 py-1 font-medium transition-colors',
                lang === code
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-gray-100'
              )}
            >
              {AUTH_TEXTS[code].langName}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid items-center gap-8 py-6 lg:grid-cols-[1fr_400px] lg:py-12">
          {/* auth card goes first on phones */}
          <Card className="order-first w-full bg-white p-6 shadow-sm lg:order-last">
            <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1 text-sm">
              <AuthTab to="/auth/login">{t.signIn}</AuthTab>
              <AuthTab to="/auth/register">{t.signUp}</AuthTab>
            </div>
            <Outlet context={t} />
            <SsoButtons texts={t} />
          </Card>

          <div className="flex flex-col gap-5">
            <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
              {t.heroTitle}
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              {t.heroLead}
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-white/70 p-4">
              <Icon
                icon="lucide:graduation-cap"
                className="mt-0.5 size-6 shrink-0 text-blue-600"
              />
              <div className="text-sm">
                <div className="text-slate-500">{t.universityLabel}</div>
                <div className="font-semibold">{t.university}</div>
                <div className="text-slate-500">{t.universityShort}</div>
              </div>
            </div>
          </div>
        </section>

        <Section title={t.whyTitle}>
          <div className="grid gap-4 md:grid-cols-3">
            {t.why.map(item => (
              <InfoCard key={item.title} {...item} />
            ))}
          </div>
        </Section>

        <Section title={t.featuresTitle}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map(item => (
              <InfoCard key={item.title} {...item} />
            ))}
          </div>
        </Section>

        <Section title={t.howTitle}>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.how.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t.stackTitle}>
          <div className="flex flex-wrap gap-2">
            {STACK.map(item => (
              <span
                key={item}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-slate-700"
              >
                {item}
              </span>
            ))}
          </div>
        </Section>
      </main>

      <footer className="border-t border-black/10 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {t.appName} · {t.footer}
      </footer>
    </div>
  );
};

function AuthTab(props: { to: string; children: string }) {
  return (
    <NavLink
      to={props.to}
      replace
      className={({ isActive }) =>
        clsx(
          'rounded-md py-1.5 text-center font-medium transition-colors',
          isActive ? 'bg-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
        )
      }
    >
      {props.children}
    </NavLink>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6">
      <h2 className="mb-4 text-xl font-semibold">{props.title}</h2>
      {props.children}
    </section>
  );
}

function InfoCard(props: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-black/10 bg-white p-4">
      <div className="h-fit rounded-lg bg-blue-50 p-2 text-blue-600">
        <Icon icon={props.icon} className="size-5" />
      </div>
      <div>
        <h3 className="font-semibold">{props.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {props.text}
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
