import { useOutletContext } from 'react-router-dom';
import type { Lang } from '@src/lib/lang';

export const UNIVERSITY_URL = 'https://suitt.edu.ua';

const uk = {
  langName: 'UA',
  appName: 'Smart Sensor Network',
  kicker: 'Дослідницька платформа Інтернету речей',
  heroTitle: 'Збір, аналіз і керування даними розподілених IoT-пристроїв',
  intro: [
    'Smart Sensor Network — платформа для досліджень і навчання в галузі Інтернету речей. Вона поєднує мікроконтролери з довільним набором датчиків і виконавчих пристроїв, брокер повідомлень MQTT та веб-застосунок для збору, зберігання й аналізу телеметрії.',
    'Склад пристроїв описується у веб-інтерфейсі: плата сама отримує конфігурацію й починає передавати показники, тож новий експеримент не потребує перепрошивки чи зміни коду.',
  ],
  universityLabel: 'Проєкт виконано в',
  university: 'Державний університет інтелектуальних технологій і зв’язку',
  universityCity: 'м. Одеса',

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

  aboutTitle: 'Для чого платформа',
  about: [
    {
      term: 'Дослідження IoT',
      text: 'Стенд для експериментів зі збиранням телеметрії з розподілених пристроїв, протоколом MQTT, віддаленим конфігуруванням і керуванням.',
    },
    {
      term: 'Аналіз даних',
      text: 'Накопичені часові ряди використовуються для виявлення аномалій, кореляції між датчиками та прогнозування значень методами машинного навчання.',
    },
    {
      term: 'Безпека приміщень',
      text: 'Раннє виявлення витоку газу, диму та полум’я зі сповіщенням у Telegram.',
    },
    {
      term: 'Навчання',
      text: 'Доступне обладнання та відкрита архітектура дають змогу студентам швидко зібрати власну мережу датчиків і працювати з реальними даними.',
    },
  ],

  featuresTitle: 'Що вміє',
  features: [
    'автоматична реєстрація й конфігурування плат через MQTT',
    'графіки показників і історія вимірювань',
    'виявлення аномалій і прогноз значень',
    'інциденти та сповіщення в Telegram',
    'команди на виконавчі пристрої (реле)',
    'схеми підключення плат і спільний доступ до пристроїв',
  ],

  howTitle: 'Як почати',
  how: [
    'Завантажте на мікроконтролер універсальну прошивку платформи — вона одна для всіх підтримуваних плат.',
    'Підключіться до точки доступу плати й укажіть мережу Wi-Fi та свій User ID.',
    'Додайте в інтерфейсі датчики: плату, модуль і пін, до якого він під’єднаний.',
    'Плата застосує конфігурацію й почне надсилати дані.',
  ],
};

export type AuthTexts = typeof uk;

const en: AuthTexts = {
  langName: 'EN',
  appName: 'Smart Sensor Network',
  kicker: 'Internet of Things research platform',
  heroTitle: 'Collecting, analysing and controlling data of distributed IoT devices',
  intro: [
    'Smart Sensor Network is a platform for research and education in the Internet of Things. It connects microcontrollers with any set of sensors and actuators, an MQTT message broker and a web application that collects, stores and analyses telemetry.',
    'Devices are described in the web interface: the board receives its configuration and starts sending readings by itself, so a new experiment needs neither reflashing nor code changes.',
  ],
  universityLabel: 'The project was carried out at',
  university: 'State University of Intelligent Technologies and Telecommunications',
  universityCity: 'Odesa, Ukraine',

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

  aboutTitle: 'What it is for',
  about: [
    {
      term: 'IoT research',
      text: 'A testbed for experiments with telemetry from distributed devices, the MQTT protocol, remote configuration and control.',
    },
    {
      term: 'Data analysis',
      text: 'Collected time series are used for anomaly detection, cross-sensor correlation and value forecasting with machine learning.',
    },
    {
      term: 'Indoor safety',
      text: 'Early detection of gas leaks, smoke and fire with Telegram alerts.',
    },
    {
      term: 'Education',
      text: 'Affordable hardware and an open architecture let students build their own sensor network quickly and work with real data.',
    },
  ],

  featuresTitle: 'What it does',
  features: [
    'automatic registration and configuration of boards over MQTT',
    'charts of readings and measurement history',
    'anomaly detection and value forecasts',
    'incidents and Telegram alerts',
    'commands to actuators (relays)',
    'board wiring diagrams and device sharing',
  ],

  howTitle: 'Getting started',
  how: [
    'Flash the microcontroller with the platform’s universal firmware — one firmware for all supported boards.',
    'Connect to the board’s access point and enter your Wi-Fi network and User ID.',
    'Add sensors in the interface: the board, the module and the pin it is wired to.',
    'The board applies the configuration and starts sending data.',
  ],
};

export const AUTH_TEXTS: Record<Lang, AuthTexts> = { uk, en };

// texts of the language chosen in AuthLayout
export function useAuthTexts() {
  return useOutletContext<AuthTexts>();
}
