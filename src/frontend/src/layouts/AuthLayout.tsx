import { notification } from 'antd';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import {
  AUTH_TEXTS,
  AuthTexts,
  Lang,
  UNIVERSITY_URL,
} from '@src/pages/auth/authTexts';
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
    <div className="min-h-dvh bg-[#fbfaf8] text-[#1c1c1a]">
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-4 py-4 sm:px-6">
          <span className="font-serif text-lg">{t.appName}</span>
          <div className="flex gap-3 text-sm">
            {(['uk', 'en'] as Lang[]).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => changeLang(code)}
                className={clsx(
                  'underline-offset-4',
                  lang === code
                    ? 'font-semibold underline'
                    : 'text-black/50 hover:text-black'
                )}
              >
                {AUTH_TEXTS[code].langName}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="grid gap-10 py-10 md:grid-cols-[1fr_340px] md:gap-14 md:py-14">
          {/* the form is what most visitors came for, keep it first on phones */}
          <div className="order-first md:order-last">
            <div className="border border-black/15 bg-white p-6">
              <nav className="mb-6 flex gap-6 border-b border-black/10 text-sm">
                <AuthTab to="/auth/login">{t.signIn}</AuthTab>
                <AuthTab to="/auth/register">{t.signUp}</AuthTab>
              </nav>
              <Outlet context={t} />
              <SsoButtons texts={t} />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs tracking-[0.12em] text-[#1d4f91] uppercase">
              {t.kicker}
            </p>
            <h1 className="font-serif text-3xl leading-tight sm:text-[2.4rem]">
              {t.heroTitle}
            </h1>
            <div className="mt-6 space-y-4 text-[1.05rem] leading-relaxed text-black/75">
              {t.intro.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <University t={t} />
          </div>
        </section>

        <Section index="01" title={t.aboutTitle}>
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {t.about.map(item => (
              <div key={item.term}>
                <dt className="font-semibold">{item.term}</dt>
                <dd className="mt-1 leading-relaxed text-black/70">
                  {item.text}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section index="02" title={t.featuresTitle}>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {t.features.map(feature => (
              <li
                key={feature}
                className="border-b border-black/10 py-2.5 leading-relaxed text-black/75 first-letter:uppercase"
              >
                {feature}
              </li>
            ))}
          </ul>
        </Section>

        <Section index="03" title={t.howTitle}>
          <ol className="space-y-4">
            {t.how.map((step, i) => (
              <li key={step} className="grid grid-cols-[2rem_1fr] gap-2">
                <span className="font-serif text-lg text-[#1d4f91]">
                  {i + 1}.
                </span>
                <span className="leading-relaxed text-black/75">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      </main>

      <footer className="mt-10 border-t border-black/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-black/55 sm:flex-row sm:justify-between sm:px-6">
          <span>
            © {new Date().getFullYear()} {t.appName}
          </span>
          <a
            href={UNIVERSITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black hover:underline"
          >
            {t.university}
          </a>
        </div>
      </footer>
    </div>
  );
};

function University({ t }: { t: AuthTexts }) {
  return (
    <a
      href={UNIVERSITY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-8 flex items-center gap-4 border-t border-black/10 pt-6"
    >
      <img
        src="/suitt-logo.png"
        alt={t.university}
        width={56}
        height={56}
        className="size-14 shrink-0 object-contain"
      />
      <div className="text-sm">
        <div className="text-black/55">{t.universityLabel}</div>
        <div className="font-semibold group-hover:underline">
          {t.university}
        </div>
        <div className="text-black/55">
          {t.universityCity} · suitt.edu.ua
        </div>
      </div>
    </a>
  );
}

function AuthTab(props: { to: string; children: string }) {
  return (
    <NavLink
      to={props.to}
      replace
      className={({ isActive }) =>
        clsx(
          '-mb-px border-b-2 pb-2',
          isActive
            ? 'border-[#1d4f91] font-semibold text-black'
            : 'border-transparent text-black/50 hover:text-black'
        )
      }
    >
      {props.children}
    </NavLink>
  );
}

function Section(props: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-black/10 py-10 md:grid-cols-[220px_1fr] md:gap-10">
      <h2 className="font-serif text-xl">
        <span className="mr-3 text-sm text-black/40">{props.index}</span>
        {props.title}
      </h2>
      <div>{props.children}</div>
    </section>
  );
}

export default AuthLayout;
