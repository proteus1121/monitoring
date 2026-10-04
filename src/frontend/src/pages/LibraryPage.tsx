import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { DEVICE_TYPE_LABELS } from '@src/lib/hardware';
import { cn } from '@src/lib/classnameUtils';
import { DeviceTypeValue, SensorModel, useGetSensorModelsQuery } from '@src/redux/generatedApi';
import {
  BoardModelValue,
  DisplayModelValue,
  useGetDisplayModelsQuery,
  useGetFirmwareManifestQuery,
} from '@src/redux/controllersApi';
import { ModuleArt } from '@src/components/ModuleArt';
import { BOARDS, FirmwareDownloads } from '@src/components/FirmwareDownloads';
import { Lang, useLang, useTexts } from '@src/lib/lang';

// what a card is about, to group the cards and find them
type Group = 'climate' | 'gas' | 'safety' | 'light' | 'garden' | 'control' | 'io' | 'display' | 'board';
// how the module is wired
type Bus = 'digital' | 'analog' | 'i2c' | 'spi' | 'output' | 'esp8266' | 'esp32' | 'wifi';

const GROUP_TEXTS: Record<Lang, Record<Group, string>> = {
  uk: {
    climate: 'Клімат',
    gas: 'Гази',
    safety: 'Безпека',
    light: 'Освітлення',
    garden: 'Сад і город',
    control: 'Керування',
    io: 'Універсальні входи',
    display: 'Дисплей',
    board: 'Плата',
  },
  en: {
    climate: 'Climate',
    gas: 'Gases',
    safety: 'Safety',
    light: 'Light',
    garden: 'Garden',
    control: 'Control',
    io: 'General inputs',
    display: 'Display',
    board: 'Board',
  },
};

const BUS_TEXTS: Record<Lang, Record<Bus, string>> = {
  uk: {
    digital: 'Цифровий',
    analog: 'Аналоговий',
    i2c: 'I2C',
    spi: 'SPI',
    output: 'Вихід',
    esp8266: 'ESP8266',
    esp32: 'ESP32',
    wifi: 'Wi-Fi',
  },
  en: {
    digital: 'Digital',
    analog: 'Analog',
    i2c: 'I2C',
    spi: 'SPI',
    output: 'Output',
    esp8266: 'ESP8266',
    esp32: 'ESP32',
    wifi: 'Wi-Fi',
  },
};

type About = { groups: Group[]; bus: Bus[]; text: Record<Lang, string> };

const SENSOR_ABOUT: Record<SensorModel, About> = {
  DHT11: {
    groups: ['climate'],
    bus: ['digital'],
    text: {
      uk: 'Недорогий датчик температури й вологості повітря для кімнати. Температура 0…50 °C (±2 °C), вологість 20…90 % (±5 %), не частіше ніж раз на секунду. Підключається одним цифровим проводом DATA.',
      en: 'An inexpensive room temperature and humidity sensor. Temperature 0…50 °C (±2 °C), humidity 20…90 % (±5 %), at most once a second. Wired with a single digital DATA line.',
    },
  },
  DHT22: {
    groups: ['climate'],
    bus: ['digital'],
    text: {
      uk: 'Точніший варіант DHT11 (AM2302): температура −40…80 °C (±0,5 °C), вологість 0…100 % (±2 %), раз на 2 секунди. Підходить для вулиці, теплиці чи погреба. Один цифровий провід DATA.',
      en: 'The more accurate DHT11 (AM2302): temperature −40…80 °C (±0.5 °C), humidity 0…100 % (±2 %), every 2 seconds. Fits outdoors, a greenhouse or a cellar. A single digital DATA line.',
    },
  },
  MQ2: {
    groups: ['gas', 'safety'],
    bus: ['analog'],
    text: {
      uk: 'Датчик горючих газів і диму: показує концентрацію пропану (LPG), метану й диму в ppm. Нагрівач потребує 5 В і 1–2 хвилини прогріву, перші години показання «пливуть». Аналоговий вихід AO.',
      en: 'A sensor for flammable gases and smoke: the LPG, methane and smoke concentration in ppm. The heater needs 5 V and 1–2 minutes to warm up, readings drift for the first hours. Analog output AO.',
    },
  },
  BMP180: {
    groups: ['climate'],
    bus: ['i2c'],
    text: {
      uk: 'Барометр: атмосферний тиск 300…1100 гПа і температура. За тиском видно зміну погоди. Шина I2C (адреса 0x77), може ділити її з OLED-дисплеєм.',
      en: 'A barometer: air pressure 300…1100 hPa and temperature. Pressure shows the weather changing. I2C bus (address 0x77), can share it with an OLED display.',
    },
  },
  FLAME_IR: {
    groups: ['safety'],
    bus: ['digital'],
    text: {
      uk: 'Інфрачервоний датчик полум’я: бачить вогонь на відстані до ~1 м у секторі 60°. Чутливість задає потенціометр на модулі. Цифровий вихід DO, при полум’ї LOW.',
      en: 'An infrared flame sensor: sees fire up to ~1 m away within 60°. Sensitivity is set by the trimmer on the module. Digital output DO, LOW on flame.',
    },
  },
  LIGHT_DIGITAL: {
    groups: ['light'],
    bus: ['digital'],
    text: {
      uk: 'Модуль із фоторезистором: відповідає «світло» чи «темно», поріг задає потенціометр. Зручно вмикати освітлення в сутінках. Цифровий вихід DO, на світлі LOW.',
      en: 'A photoresistor module: answers light or dark, the threshold is set by the trimmer. Handy to turn the lights on at dusk. Digital output DO, LOW in light.',
    },
  },
  PIR: {
    groups: ['safety'],
    bus: ['digital'],
    text: {
      uk: 'Пасивний інфрачервоний датчик руху (HC-SR501 тощо): помічає людину до 5–7 м. Час утримання й чутливість — потенціометрами на модулі. Вихід OUT, при русі HIGH.',
      en: 'A passive infrared motion sensor (HC-SR501 and the like): notices a person up to 5–7 m. Hold time and sensitivity are set by the trimmers. Output OUT, HIGH on motion.',
    },
  },
  DIGITAL_INPUT: {
    groups: ['io'],
    bus: ['digital'],
    text: {
      uk: 'Будь-який сигнал «увімкнено / вимкнено»: геркон на дверях, кнопка, кінцевик, датчик протікання. HIGH = 1, LOW = 0.',
      en: 'Any on / off signal: a reed switch on a door, a button, a limit switch, a leak sensor. HIGH = 1, LOW = 0.',
    },
  },
  SOIL_MOISTURE: {
    groups: ['garden'],
    bus: ['analog'],
    text: {
      uk: 'Щуп вологості ґрунту, показує відсоток води в землі. Ємнісний служить роками, резистивний з часом окислюється. Аналоговий вихід AO.',
      en: 'A soil moisture probe, shows the percent of water in the soil. A capacitive one lasts for years, a resistive one corrodes. Analog output AO.',
    },
  },
  ANALOG_INPUT: {
    groups: ['io', 'light'],
    bus: ['analog'],
    text: {
      uk: 'Сире значення АЦП з будь-якого аналогового модуля: фоторезистор, потенціометр, дільник напруги. На ESP8266 вхід A0 приймає до 1 В (на NodeMCU і D1 mini до 3,3 В).',
      en: 'The raw ADC value of any analog module: a photoresistor, a potentiometer, a voltage divider. On the ESP8266 the A0 input takes up to 1 V (3.3 V on NodeMCU and D1 mini).',
    },
  },
  RELAY: {
    groups: ['control'],
    bus: ['output'],
    text: {
      uk: 'Реле чи будь-який цифровий вихід, який вмикають із сайту або за правилом: світло, насос, вентилятор, обігрівач. HIGH = увімкнено. Для 220 В беріть модуль з оптопарою.',
      en: 'A relay or any digital output switched from the site or by a rule: a light, a pump, a fan, a heater. HIGH = on. For mains take a module with an optocoupler.',
    },
  },
};

// SSD1306 and SH1106 are the same module to the user, the board card picks the chip
const DISPLAYS: {
  models: DisplayModelValue[];
  label: string;
  art: DisplayModelValue;
  pins: string[];
  bus: Bus;
  text: Record<Lang, string>;
}[] = [
  {
    models: ['SSD1306', 'SH1106'],
    label: 'OLED 128x64 (SSD1306 / SH1106)',
    art: 'SSD1306',
    pins: ['SDA', 'SCL'],
    bus: 'i2c',
    text: {
      uk: 'Монохромний OLED 128×64: яскравий, читається під кутом. Модулі 0,96″ зазвичай на SSD1306, 1,3″ на SH1106, чип обирають на картці плати. Шина I2C, адреса 0x3C або 0x3D.',
      en: 'A monochrome 128×64 OLED: bright and readable at an angle. 0.96″ modules usually have the SSD1306, 1.3″ ones the SH1106, the chip is chosen on the board card. I2C bus, address 0x3C or 0x3D.',
    },
  },
  {
    models: ['ST7565'],
    label: 'ST7565 LCD 128x64',
    art: 'ST7565',
    pins: ['CLK', 'DIN', 'CS', 'DC', 'RST'],
    bus: 'spi',
    text: {
      uk: 'Графічний РК-дисплей 128×64 з підсвіткою, добре видно на сонці. Шина SPI, займає п’ять виводів.',
      en: 'A 128×64 graphic LCD with a backlight, readable in sunlight. SPI bus, takes five pins.',
    },
  },
];

const BOARD_ABOUT: Record<BoardModelValue, { bus: Bus[]; text: Record<Lang, string> }> = {
  NODEMCU: {
    bus: ['esp8266', 'wifi'],
    text: {
      uk: 'Найпоширеніша плата з ESP8266: Wi-Fi, 11 цифрових виводів і один аналоговий, USB для прошивки й живлення. Вистачає на кілька датчиків і дисплей.',
      en: 'The most common ESP8266 board: Wi-Fi, 11 digital pins and one analog, USB for flashing and power. Enough for a few sensors and a display.',
    },
  },
  D1_MINI: {
    bus: ['esp8266', 'wifi'],
    text: {
      uk: 'Мініатюрна плата з ESP8266 (34×26 мм), та сама прошивка, що й на NodeMCU. Зручна для компактних корпусів, вивід 5 В живить датчики MQ.',
      en: 'A tiny ESP8266 board (34×26 mm) running the same firmware as the NodeMCU. Good for small cases, its 5 V pin powers MQ sensors.',
    },
  },
  ESP32_DEVKIT: {
    bus: ['esp32', 'wifi'],
    text: {
      uk: 'Потужніша плата з двоядерним ESP32: більше виводів, кілька аналогових входів. Для багатьох датчиків на одній платі.',
      en: 'A stronger board with the dual-core ESP32: more pins and several analog inputs. For many sensors on one board.',
    },
  },
};

const TEXTS = {
  uk: {
    title: 'Бібліотека',
    description:
      'Усе, що підтримують плати: прошивка, яку один раз записують на нову плату через USB, і модулі, якими вона керує. Під’єднайте модуль і додайте його на сторінці «Мої пристрої». Більше нічого прошивати не треба, подальші оновлення приходять із сайту.',
    search: 'Пошук: назва, тег чи вимірювання',
    clear: 'Очистити',
    nothing: 'Нічого не знайдено.',
    boards: 'Плати й прошивка',
    boardsNote: 'Одна прошивка для всіх плат.',
    modules: 'Модулі: датчики й виходи',
    pins: 'Виводи',
    displays: 'Дисплеї',
    displaysNote: 'Задається на картці плати на сторінці «Мої пристрої». Усі дисплеї показують ті самі екрани.',
  },
  en: {
    title: 'Library',
    description:
      'Everything available for the boards: the firmware to flash to a new board over USB once, and the modules it drives. Wire one and add it on the My devices page. Nothing else has to be flashed, later updates come from the site.',
    search: 'Search: name, tag or measurement',
    clear: 'Clear',
    nothing: 'Nothing found.',
    boards: 'Boards and firmware',
    boardsNote: 'One firmware for every board.',
    modules: 'Modules: sensors and outputs',
    pins: 'Pins',
    displays: 'Displays',
    displaysNote: 'Set on the board card of the My devices page. Every display shows the same screens.',
  },
};

type TagKind = 'group' | 'type' | 'bus';

const TAG_STYLES: Record<TagKind, string> = {
  group: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  type: 'bg-blue-50 text-blue-800 hover:bg-blue-100',
  bus: 'bg-gray-100 text-slate-700 hover:bg-gray-200',
};

type CardTag = { kind: TagKind; label: string };

function Tags({
  tags,
  query,
  onPick,
}: {
  tags: CardTag[];
  query: string;
  onPick: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => {
        const active = tag.label.toLowerCase() === query.trim().toLowerCase();
        return (
          <button
            key={`${tag.kind}-${tag.label}`}
            type="button"
            onClick={() => onPick(active ? '' : tag.label)}
            className={cn(
              'rounded-full px-2 py-0.5 text-xs transition-colors',
              TAG_STYLES[tag.kind],
              active && 'ring-1 ring-current'
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}

// every word of the query is somewhere in the card's name, description or tags
function matches(query: string, ...texts: string[]) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = texts.join(' ').toLowerCase();
  return words.every(word => haystack.includes(word));
}

/**
 * What to start with: the supported boards with the firmware to flash over USB once, then everything they can
 * drive (read from the server so the list always matches it). A search or a click on a tag hides the other cards.
 */
export function LibraryPage() {
  const { data: manifest, isLoading: manifestLoading } = useGetFirmwareManifestQuery();
  const { data: sensors, isLoading: sensorsLoading } = useGetSensorModelsQuery();
  const { data: displays, isLoading: displaysLoading } = useGetDisplayModelsQuery();
  const [query, setQuery] = useState('');
  const lang = useLang();
  const t = useTexts(TEXTS);

  if (manifestLoading || sensorsLoading || displaysLoading) {
    return <Loader />;
  }

  const groupTag = (group: Group): CardTag => ({ kind: 'group', label: GROUP_TEXTS[lang][group] });
  const busTag = (bus: Bus): CardTag => ({ kind: 'bus', label: BUS_TEXTS[lang][bus] });
  const typeTag = (type: DeviceTypeValue): CardTag => ({ kind: 'type', label: DEVICE_TYPE_LABELS[type] });
  const tagLabels = (tags: CardTag[]) => tags.map(tag => tag.label).join(' ');

  const boards = BOARDS.map(board => {
    const about = BOARD_ABOUT[board.model];
    const tags = [groupTag('board'), ...about.bus.map(busTag)];
    return { ...board, text: about.text[lang], tags };
  }).filter(board => matches(query, board.label, board.chip, board.text, tagLabels(board.tags)));

  const modules = (sensors ?? [])
    .map(sensor => {
      const about = sensor.model ? SENSOR_ABOUT[sensor.model] : undefined;
      const tags = [
        ...(about?.groups ?? []).map(groupTag),
        ...(sensor.supportedTypes ?? []).map(typeTag),
        ...(about?.bus ?? []).map(busTag),
      ];
      return { sensor, text: about?.text[lang] ?? sensor.description ?? '', tags };
    })
    .filter(({ sensor, text, tags }) =>
      matches(query, sensor.label ?? '', sensor.model ?? '', text, tagLabels(tags))
    );

  // only the displays the server knows
  const known = new Set((displays ?? []).map(display => display.model));
  const screens = DISPLAYS.filter(display => display.models.some(model => known.has(model)))
    .map(display => ({ ...display, tags: [groupTag('display'), busTag(display.bus)] }))
    .filter(display =>
      matches(query, display.label, display.text[lang], display.models.join(' '), tagLabels(display.tags))
    );

  const searching = query.trim() !== '';

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="relative max-w-md">
        <Icon
          icon="lucide:search"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t.search}
          className="bg-white pr-9 pl-9"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery('')}
            title={t.clear}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        )}
      </div>

      {searching && boards.length + modules.length + screens.length === 0 && (
        <p className="text-sm text-slate-500">{t.nothing}</p>
      )}

      {boards.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">{t.boards}</h2>
            <p className="text-sm text-slate-500">{t.boardsNote}</p>
          </div>
          <FirmwareDownloads
            manifest={manifest}
            shown={searching ? boards.map(board => board.model) : undefined}
            about={model => {
              const board = boards.find(b => b.model === model);
              return (
                board && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">{board.text}</p>
                    <Tags tags={board.tags} query={query} onPick={setQuery} />
                  </div>
                )
              );
            }}
          />
        </section>
      )}

      {modules.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{t.modules}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modules.map(({ sensor, text, tags }) => (
              <Card key={sensor.model} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-gray-50 p-1.5">
                    <ModuleArt module={sensor.model} className="h-20 w-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{sensor.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t.pins}: <span className="font-mono">{(sensor.pins ?? []).join(', ')}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{text}</p>
                <div className="mt-auto">
                  <Tags tags={tags} query={query} onPick={setQuery} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {screens.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">{t.displays}</h2>
            <p className="text-sm text-slate-500">{t.displaysNote}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {screens.map(display => (
              <Card key={display.label} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-gray-50 p-1.5">
                    <ModuleArt module={display.art} className="h-20 w-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{display.label}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t.pins}: <span className="font-mono">{display.pins.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{display.text[lang]}</p>
                <div className="mt-auto">
                  <Tags tags={display.tags} query={query} onPick={setQuery} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </PageLayout>
  );
}
