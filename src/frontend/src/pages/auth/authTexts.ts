import { useOutletContext } from 'react-router-dom';

export type Lang = 'uk' | 'en';

const uk = {
  langName: 'UA',
  appName: 'Smart Sensor Network',
  appTagline: 'Розумна мережа сенсорів',
  heroTitle: 'Моніторинг приміщень на ESP32 / ESP8266 без перепрошивки',
  heroLead:
    'Підключіть датчики до плати, опишіть їх у веб-інтерфейсі — плата сама отримає конфігурацію через MQTT і почне надсилати показники, а система стежитиме за аномаліями та сповіщатиме про небезпеку.',
  universityLabel: 'Проєкт виконано в',
  university: 'Державний університет інтелектуальних технологій і зв’язку',
  universityShort: 'ДУІТЗ, м. Одеса',

  signIn: 'Вхід',
  signUp: 'Реєстрація',
  username: 'Ім’я користувача',
  password: 'Пароль',
  passwordConfirmation: 'Повторіть пароль',
  usernamePlaceholder: 'username',
  submitSignIn: 'Увійти',
  submitSignUp: 'Створити акаунт',
  or: 'або',
  continueWithGoogle: 'Увійти через Google',
  continueWithGithub: 'Увійти через GitHub',
  loginFailed: 'Не вдалося увійти',
  registerFailed: 'Не вдалося зареєструватися',
  ssoFailed: 'Не вдалося увійти через Google / GitHub',
  minLength: 'Щонайменше 3 символи',
  noSpaces: 'Без пробілів',
  passwordsMustMatch: 'Паролі не збігаються',

  whyTitle: 'Навіщо цей проєкт',
  why: [
    {
      icon: 'lucide:flame',
      title: 'Безпека',
      text: 'Раннє виявлення витоку газу, диму та полум’я з миттєвим сповіщенням у Telegram.',
    },
    {
      icon: 'lucide:thermometer',
      title: 'Мікроклімат',
      text: 'Постійний контроль температури, вологості, тиску й освітленості з історією та прогнозом.',
    },
    {
      icon: 'lucide:wallet',
      title: 'Доступність',
      text: 'Недорогі DIY-модулі замість промислових систем: одна прошивка для будь-якого набору датчиків.',
    },
  ],

  featuresTitle: 'Можливості',
  features: [
    {
      icon: 'lucide:radio-tower',
      title: 'Автоконфігурація плат',
      text: 'Плата реєструється сама й отримує список датчиків, пінів та інтервалів по MQTT.',
    },
    {
      icon: 'lucide:chart-line',
      title: 'Графіки та історія',
      text: 'Живі показники, агрегація за періодами та порівняння пристроїв.',
    },
    {
      icon: 'lucide:brain',
      title: 'Виявлення аномалій',
      text: 'Правила й кореляція між датчиками, прогноз значень моделлю XGBoost.',
    },
    {
      icon: 'lucide:bell-ring',
      title: 'Сповіщення',
      text: 'Інциденти з пояснювальним повідомленням у Telegram.',
    },
    {
      icon: 'lucide:power',
      title: 'Керування',
      text: 'Команди на виконавчі пристрої (реле) прямо з інтерфейсу.',
    },
    {
      icon: 'lucide:users',
      title: 'Спільний доступ',
      text: 'Діліться пристроями з іншими користувачами з різними ролями.',
    },
  ],

  howTitle: 'Як це працює',
  how: [
    'Прошийте плату ESP32 або ESP8266 прошивкою проєкту.',
    'Підключіться до точки доступу плати та вкажіть Wi-Fi і свій User ID.',
    'Додайте датчики в інтерфейсі: плата, модуль, пін.',
    'Плата застосує конфігурацію й почне надсилати дані.',
  ],

  stackTitle: 'Технології',
  footer: 'Державний університет інтелектуальних технологій і зв’язку, м. Одеса',
};

export type AuthTexts = typeof uk;

const en: AuthTexts = {
  langName: 'EN',
  appName: 'Smart Sensor Network',
  appTagline: 'Smart sensor network',
  heroTitle: 'Indoor monitoring on ESP32 / ESP8266 without reflashing',
  heroLead:
    'Wire sensors to a board and describe them in the web interface — the board receives its configuration over MQTT and starts sending readings, while the system watches for anomalies and alerts you about danger.',
  universityLabel: 'The project was carried out at',
  university: 'State University of Intelligent Technologies and Telecommunications',
  universityShort: 'Odesa, Ukraine',

  signIn: 'Sign in',
  signUp: 'Sign up',
  username: 'Username',
  password: 'Password',
  passwordConfirmation: 'Confirm password',
  usernamePlaceholder: 'username',
  submitSignIn: 'Sign in',
  submitSignUp: 'Create account',
  or: 'or',
  continueWithGoogle: 'Continue with Google',
  continueWithGithub: 'Continue with GitHub',
  loginFailed: 'Failed to sign in',
  registerFailed: 'Failed to sign up',
  ssoFailed: 'Failed to sign in with Google / GitHub',
  minLength: 'At least 3 characters',
  noSpaces: 'Cannot contain spaces',
  passwordsMustMatch: 'Passwords must match',

  whyTitle: 'Why this project',
  why: [
    {
      icon: 'lucide:flame',
      title: 'Safety',
      text: 'Early detection of gas leaks, smoke and fire with instant Telegram alerts.',
    },
    {
      icon: 'lucide:thermometer',
      title: 'Indoor climate',
      text: 'Continuous tracking of temperature, humidity, pressure and light with history and forecasts.',
    },
    {
      icon: 'lucide:wallet',
      title: 'Affordability',
      text: 'Cheap DIY modules instead of industrial systems: one firmware for any set of sensors.',
    },
  ],

  featuresTitle: 'Features',
  features: [
    {
      icon: 'lucide:radio-tower',
      title: 'Board auto-configuration',
      text: 'A board registers itself and receives its sensors, pins and intervals over MQTT.',
    },
    {
      icon: 'lucide:chart-line',
      title: 'Charts and history',
      text: 'Live readings, aggregation by period and comparison of devices.',
    },
    {
      icon: 'lucide:brain',
      title: 'Anomaly detection',
      text: 'Rules and cross-sensor correlation, value forecasts with an XGBoost model.',
    },
    {
      icon: 'lucide:bell-ring',
      title: 'Alerts',
      text: 'Incidents with an explanatory message in Telegram.',
    },
    {
      icon: 'lucide:power',
      title: 'Control',
      text: 'Commands to actuators (relays) right from the interface.',
    },
    {
      icon: 'lucide:users',
      title: 'Sharing',
      text: 'Share devices with other users using different roles.',
    },
  ],

  howTitle: 'How it works',
  how: [
    'Flash an ESP32 or ESP8266 with the project firmware.',
    'Connect to the board access point and enter Wi-Fi and your User ID.',
    'Add sensors in the interface: board, module, pin.',
    'The board applies the configuration and starts sending data.',
  ],

  stackTitle: 'Technologies',
  footer: 'State University of Intelligent Technologies and Telecommunications, Odesa',
};

export const AUTH_TEXTS: Record<Lang, AuthTexts> = { uk, en };

export const STACK = [
  'ESP32 / ESP8266',
  'MQTT · Mosquitto',
  'Spring Boot',
  'React',
  'MySQL',
  'XGBoost',
  'Docker Swarm',
];

// texts of the language chosen in AuthLayout
export function useAuthTexts() {
  return useOutletContext<AuthTexts>();
}
