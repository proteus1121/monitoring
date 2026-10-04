"""
Collects the built firmware into a folder the site serves as /firmware/:

    manifest.json                       versions and files, read by the site and the backend
    monitoring-<board>-<version>.bin    application image: updates from the site, OTA
    monitoring-<board>-<version>-full.bin  whole flash image for the first install over USB (ESP32 needs the
                                        bootloader and partition table too; ESP8266 boots the application image)
    install-<board>.json                ESP Web Tools manifest for "Install" in the browser

Run after `pio run` in the firmware project:  python tools/firmware_manifest.py <output dir>
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# env name of platformio.ini -> how the board is shown; chipFamily is what ESP Web Tools expects
BOARDS = {
    'esp8266': {'label': 'ESP8266 · NodeMCU v2', 'chip': 'ESP8266'},
    'esp32dev': {'label': 'ESP32 DevKit', 'chip': 'ESP32'},
}
# shown on the site as coming
PLANNED = [{'board': 'esp32cam', 'label': 'ESP32-CAM', 'note': 'camera snapshots, in progress'}]


def firmware_version():
    header = open(os.path.join(PROJECT, 'src', 'network', 'mqtt', 'MQTTHandler.h'), encoding='utf-8').read()
    return re.search(r'#define FIRMWARE_VERSION "([^"]+)"', header).group(1)


def git(*args):
    try:
        return subprocess.check_output(['git', *args], cwd=PROJECT, text=True).strip()
    except Exception:
        return None


def digest(path, algorithm):
    h = hashlib.new(algorithm)
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def esptool():
    home = os.environ.get('PLATFORMIO_CORE_DIR', os.path.join(os.path.expanduser('~'), '.platformio'))
    found = glob.glob(os.path.join(home, 'packages', 'tool-esptoolpy*', 'esptool.py'))
    if not found:
        raise SystemExit('esptool.py not found in ' + home)

    # ESP8266 brings esptool 3.0 (1.30000.x) without merge_bin next to the ESP32 one: take the newest
    def version(path):
        with open(os.path.join(os.path.dirname(path), 'package.json'), encoding='utf-8') as f:
            return tuple(int(part) for part in json.load(f)['version'].split('.'))
    return max(found, key=version)


def merge_esp32(build_dir, out_path):
    home = os.environ.get('PLATFORMIO_CORE_DIR', os.path.join(os.path.expanduser('~'), '.platformio'))
    boot_app0 = glob.glob(os.path.join(home, 'packages', 'framework-arduinoespressif32', 'tools', 'partitions',
                                       'boot_app0.bin'))[0]
    subprocess.check_call([sys.executable, esptool(), '--chip', 'esp32', 'merge_bin', '-o', out_path,
                           '--flash_mode', 'dio', '--flash_size', '4MB',
                           '0x1000', os.path.join(build_dir, 'bootloader.bin'),
                           '0x8000', os.path.join(build_dir, 'partitions.bin'),
                           '0xe000', boot_app0,
                           '0x10000', os.path.join(build_dir, 'firmware.bin')])


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    version = firmware_version()
    builds = []
    for board, info in BOARDS.items():
        build_dir = os.path.join(PROJECT, '.pio', 'build', board)
        app = os.path.join(build_dir, 'firmware.bin')
        if not os.path.exists(app):
            raise SystemExit(f'{app} is missing, run `pio run -e {board}` first')
        name = f'monitoring-{board}-{version}'
        app_out = os.path.join(out_dir, name + '.bin')
        with open(app, 'rb') as src, open(app_out, 'wb') as dst:
            dst.write(src.read())

        if info['chip'] == 'ESP32':
            full_name = name + '-full.bin'
            merge_esp32(build_dir, os.path.join(out_dir, full_name))
        else:
            full_name = name + '.bin'

        install = {
            'name': 'Smart Sensor Network',
            'version': version,
            'new_install_prompt_erase': False,
            'builds': [{'chipFamily': info['chip'], 'parts': [{'path': full_name, 'offset': 0}]}],
        }
        install_name = f'install-{board}.json'
        with open(os.path.join(out_dir, install_name), 'w', encoding='utf-8') as f:
            json.dump(install, f, indent=2)

        builds.append({
            'board': board,
            'label': info['label'],
            'chip': info['chip'],
            'file': name + '.bin',
            'size': os.path.getsize(app_out),
            'md5': digest(app_out, 'md5'),
            'sha256': digest(app_out, 'sha256'),
            'fullFile': full_name,
            'install': install_name,
        })

    manifest = {
        'version': version,
        'date': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'commit': git('rev-parse', '--short', 'HEAD'),
        # what changed in the firmware: the latest commit touching it
        'notes': git('log', '-1', '--format=%s', '--', '.'),
        'builds': builds,
        'planned': PLANNED,
    }
    with open(os.path.join(out_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(PROJECT, '.pio', 'firmware'))
