# Pinout figures for the methodology: one data unit = 1 cm, so font sizes are the printed sizes.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle

plt.rcParams['font.family'] = 'Arial'
FS = 7.5          # label font, pt
PITCH = 0.52      # pin pitch, cm
BH = 0.40         # label box height, cm
BW = 1.45         # label box width, cm
GAP = 0.08
BOARD_W = 3.0

CAT = {'pwr': ('#f4cccc', '#a33333'), 'gnd': ('#d4d4d4', '#444444'), 'io': ('#ffffff', '#333333'),
       'in': ('#cfe0f5', '#2a5a9a'), 'strap': ('#ffe2ad', '#b07000'), 'uart': ('#d9ecd0', '#3d7a2a'),
       'flash': ('#ececec', '#9a9a9a'), 'adc': ('#eadcf3', '#6a3d8a'), 'fn': ('#ffffff', '#9a9a9a')}
LEG = {'pwr': 'живлення, скидання', 'gnd': 'загальний провід', 'io': 'вхід/вихід',
       'in': 'лише вхід, без підтяжок', 'strap': 'конфігурація під час запуску',
       'uart': 'UART0: прошивання, монітор', 'flash': 'зайняті флеш-пам’яттю',
       'adc': 'вхід АЦП', 'fn': 'альтернативна функція'}


def box(ax, x0, y, text, cat, w=BW):
    f, e = CAT[cat]
    ax.add_patch(FancyBboxPatch((x0, y - BH / 2), w, BH, boxstyle='round,pad=0,rounding_size=0.07',
                                fc=f, ec=e, lw=0.7))
    ax.text(x0 + w / 2, y, text, ha='center', va='center', fontsize=FS)


def board(fname, module, left, right, legend, button):
    n = len(left)
    mod_h = 2.2
    pins_h = (n - 1) * PITCH
    H = 0.5 + mod_h + 0.45 + pins_h + 1.1          # board height
    side = 0.35 + 2 * (BW + GAP) + 0.1             # label column width
    xmin, xmax = -BOARD_W / 2 - side, BOARD_W / 2 + side
    rows = (len(legend) + 1) // 2
    ymin = -0.9 - rows * 0.5 - 0.1
    ymax = H + 0.1
    w_cm, h_cm = xmax - xmin, ymax - ymin
    fig = plt.figure(figsize=(w_cm / 2.54, h_cm / 2.54))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(xmin, xmax); ax.set_ylim(ymin, ymax); ax.axis('off')

    ax.add_patch(FancyBboxPatch((-BOARD_W / 2, 0), BOARD_W, H, boxstyle='round,pad=0,rounding_size=0.18',
                                fc='#f6f6f6', ec='#222222', lw=1.0))
    mx, mw, mtop = -BOARD_W / 2 + 0.4, BOARD_W - 0.8, H - 0.25
    ax.add_patch(Rectangle((mx, mtop - mod_h), mw, mod_h, fc='#e6e6e6', ec='#222222', lw=0.8))
    ax.plot([mx, mx + mw], [mtop - 0.55] * 2, color='#222222', lw=0.6, ls=(0, (2, 2)))
    ax.text(0, mtop - 0.28, 'антена', ha='center', va='center', fontsize=6.5)
    ax.text(0, mtop - 0.55 - (mod_h - 0.55) / 2, module, ha='center', va='center', fontsize=7, weight='bold',
            linespacing=1.3)
    # USB and buttons
    ax.add_patch(Rectangle((-0.5, -0.25), 1.0, 0.6, fc='#d6d6d6', ec='#222222', lw=0.8))
    ax.text(0, -0.35, 'micro-USB', ha='center', va='top', fontsize=6.5)
    for sx, t in ((-BOARD_W / 2 + 0.45, button[0]), (BOARD_W / 2 - 0.45, button[1])):
        ax.add_patch(Rectangle((sx - 0.2, 0.55), 0.4, 0.3, fc='#bdbdbd', ec='#222222', lw=0.6))
        ax.text(sx, 0.45, t, ha='center', va='top', fontsize=6)

    ytop = mtop - mod_h - 0.45
    for s, pins in ((-1, left), (1, right)):
        for k, (name, labels) in enumerate(pins):
            y = ytop - k * PITCH
            px = s * (BOARD_W / 2 - 0.22)
            ax.add_patch(Circle((px, y), 0.1, fc='#c9a227', ec='#222222', lw=0.5))
            ax.text(px - s * 0.2, y, name, ha='left' if s < 0 else 'right', va='center', fontsize=FS)
            x = s * (BOARD_W / 2 + 0.35)
            for text, cat in labels:
                x0 = x if s > 0 else x - BW
                box(ax, x0, y, text, cat)
                x += s * (BW + GAP)
            # leader from the pin to the first label
            ax.plot([s * BOARD_W / 2, s * (BOARD_W / 2 + 0.35)], [y, y], color='#666666', lw=0.5)

    for i, k in enumerate(legend):
        cx = xmin + 0.1 + (i % 2) * (w_cm / 2)
        cy = -0.95 - (i // 2) * 0.5
        f, e = CAT[k]
        ax.add_patch(FancyBboxPatch((cx, cy - 0.15), 0.5, 0.3, boxstyle='round,pad=0,rounding_size=0.05',
                                    fc=f, ec=e, lw=0.7))
        ax.text(cx + 0.65, cy, LEG[k], va='center', fontsize=7)
    fig.savefig(fname, dpi=300)
    print(fname, round(w_cm, 1), 'x', round(h_cm, 1), 'cm')


def G(n, c='io'):
    return (n, c)


def F(n, c='fn'):
    return (n, c)


esp32_left = [
    ('EN', [G('скидання', 'pwr')]),
    ('VP', [G('GPIO36', 'in'), F('АЦП1_0', 'adc')]),
    ('VN', [G('GPIO39', 'in'), F('АЦП1_3', 'adc')]),
    ('D34', [G('GPIO34', 'in'), F('АЦП1_6', 'adc')]),
    ('D35', [G('GPIO35', 'in'), F('АЦП1_7', 'adc')]),
    ('D32', [G('GPIO32'), F('АЦП1_4', 'adc')]),
    ('D33', [G('GPIO33'), F('АЦП1_5', 'adc')]),
    ('D25', [G('GPIO25'), F('ЦАП1')]),
    ('D26', [G('GPIO26'), F('ЦАП2')]),
    ('D27', [G('GPIO27'), F('АЦП2_7', 'adc')]),
    ('D14', [G('GPIO14'), F('АЦП2_6', 'adc')]),
    ('D12', [G('GPIO12', 'strap'), F('АЦП2_5', 'adc')]),
    ('D13', [G('GPIO13'), F('АЦП2_4', 'adc')]),
    ('GND', [G('GND', 'gnd')]),
    ('VIN', [G('+5 В', 'pwr')]),
]
esp32_right = [
    ('D23', [G('GPIO23'), F('SPI MOSI')]),
    ('D22', [G('GPIO22'), F('I2C SCL')]),
    ('TX0', [G('GPIO1', 'uart'), F('TXD0', 'uart')]),
    ('RX0', [G('GPIO3', 'uart'), F('RXD0', 'uart')]),
    ('D21', [G('GPIO21'), F('I2C SDA')]),
    ('D19', [G('GPIO19'), F('SPI MISO')]),
    ('D18', [G('GPIO18'), F('SPI SCK')]),
    ('D5', [G('GPIO5', 'strap'), F('SPI SS')]),
    ('TX2', [G('GPIO17'), F('TXD2')]),
    ('RX2', [G('GPIO16'), F('RXD2')]),
    ('D4', [G('GPIO4'), F('АЦП2_0', 'adc')]),
    ('D2', [G('GPIO2', 'strap'), F('світлодіод')]),
    ('D15', [G('GPIO15', 'strap'), F('АЦП2_3', 'adc')]),
    ('GND', [G('GND', 'gnd')]),
    ('3V3', [G('+3,3 В', 'pwr')]),
]
board('fig_esp32.png', 'ESP32-\nWROOM-32', esp32_left, esp32_right,
      ['pwr', 'gnd', 'io', 'in', 'strap', 'uart', 'adc', 'fn'], ('EN', 'BOOT'))

nm_left = [
    ('A0', [G('ADC0', 'adc'), F('0…3,3 В', 'adc')]),
    ('RSV', [G('–', 'flash')]),
    ('RSV', [G('–', 'flash')]),
    ('SD3', [G('GPIO10', 'flash')]),
    ('SD2', [G('GPIO9', 'flash')]),
    ('SD1', [G('GPIO8', 'flash')]),
    ('CMD', [G('GPIO11', 'flash')]),
    ('SD0', [G('GPIO7', 'flash')]),
    ('CLK', [G('GPIO6', 'flash')]),
    ('GND', [G('GND', 'gnd')]),
    ('3V3', [G('+3,3 В', 'pwr')]),
    ('EN', [G('EN', 'pwr')]),
    ('RST', [G('скидання', 'pwr')]),
    ('GND', [G('GND', 'gnd')]),
    ('Vin', [G('+5 В', 'pwr')]),
]
nm_right = [
    ('D0', [G('GPIO16'), F('без ШІМ')]),
    ('D1', [G('GPIO5'), F('I2C SCL')]),
    ('D2', [G('GPIO4'), F('I2C SDA')]),
    ('D3', [G('GPIO0', 'strap'), F('FLASH')]),
    ('D4', [G('GPIO2', 'strap'), F('світлодіод')]),
    ('3V3', [G('+3,3 В', 'pwr')]),
    ('GND', [G('GND', 'gnd')]),
    ('D5', [G('GPIO14'), F('SPI SCK')]),
    ('D6', [G('GPIO12'), F('SPI MISO')]),
    ('D7', [G('GPIO13'), F('SPI MOSI')]),
    ('D8', [G('GPIO15', 'strap'), F('SPI SS')]),
    ('RX', [G('GPIO3', 'uart'), F('RXD0', 'uart')]),
    ('TX', [G('GPIO1', 'uart'), F('TXD0', 'uart')]),
    ('GND', [G('GND', 'gnd')]),
    ('3V3', [G('+3,3 В', 'pwr')]),
]
board('fig_nodemcu.png', 'ESP-12E\n(ESP8266)', nm_left, nm_right,
      ['pwr', 'gnd', 'io', 'strap', 'uart', 'flash', 'adc', 'fn'], ('RST', 'FLASH'))
