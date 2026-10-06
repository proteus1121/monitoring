# Monitoring

An IoT monitoring system for home and lab sensors: ESP8266 / ESP32 boards send readings over MQTT, a Spring Boot
backend stores them, finds incidents, forecasts the next values and sends alerts, and a React site shows it all,
configures the boards and updates their firmware.

Live at [ssn.pp.ua](https://ssn.pp.ua) (API: `api.ssn.pp.ua`). The interface is in Ukrainian and English.

## Features

- **Boards and sensors.** NodeMCU v2, Wemos D1 mini, ESP32 DevKit and AI-Thinker ESP32-CAM. Supported modules:
  DHT11 / DHT22, MQ-2 (LPG, methane, smoke), BMP180, IR flame sensor, light sensor, PIR, soil moisture, any digital
  or analog input, relays controlled from the site, the ESP32-CAM camera and an OLED display.
- **Setup from the site.** A board is linked by signing in from its own access point page; the site scans its free
  pins for modules, configures sensors and the display over MQTT, calibrates the soil moisture sensor and shows the
  board's USB log. Each board gets its own broker login.
- **Firmware.** One firmware for every board (PlatformIO), built by CI and published with the site. Boards update
  from the site over Wi-Fi; the Library page flashes a board from the browser over USB (Web Serial, esptool-js).
- **Dashboard.** Live readings, history charts, a map of the boards, sharing whole boards with other users.
- **Incidents and alerts.** Rule-based anomaly detection with multi-sensor patterns (e.g. a fire signature); alerts by
  Telegram and e-mail, in each user's own time zone. Gemini writes incident explanations and device descriptions.
- **Forecasts.** Several models per device: ARIMA, Kalman filter, XGBoost and a small Transformer
  (`service/forecast`), with uncertainty bounds.
- **Cameras.** The ESP32-CAM detects flame on the board; the Cameras page shows the live view, and flame alerts carry
  the frame with the flame outlined.
- **Sign-in** with a password, Google or GitHub.

## Architecture

```
ESP8266 / ESP32 ──MQTT──▶ Mosquitto (go-auth, logins in MySQL) ◀──▶ Spring Boot backend ──▶ MySQL
                                                                      │   ├─ Telegram, e-mail
                                                                      │   ├─ Gemini
                                                                      │   └─ Loki (logs)
                                       React frontend ──REST (OpenAPI)─┘
```

On the server everything runs as a Docker Swarm stack behind Traefik (HTTPS by Let's Encrypt).

| Part | Where | Stack |
|---|---|---|
| Backend | `src/main/java/org/proteus1121` | Java 17, Spring Boot 3.2, JPA, Spring Integration MQTT, XGBoost4J |
| Frontend | `src/frontend` | React 19, Redux Toolkit (RTK Query generated from the OpenAPI spec), Ant Design, Tailwind, Chart.js |
| Firmware | `scripts/251208-101749-esp32dev` | Arduino on PlatformIO: `esp8266`, `esp32dev`, `esp32cam` (+ `-ota` envs) |
| Broker | `mosquitto/` | mosquitto-go-auth |
| Proxy | `traefik/` | Traefik v2 |
| Deploy | `.github/workflows/release.yml`, `docker-compose.yml` | GitHub Actions → GHCR → Docker Swarm |
| Docs | `docs/` | ML notes (`ml-architecture.md`), DB init script, teaching materials |

## Running locally

Requirements: JDK 17, Node.js 20, Docker; Python with PlatformIO for the firmware.

```bash
# MySQL (+ phpMyAdmin on :8081) and Mosquitto on :1883
docker compose -f docker-compose.local.yml up -d

# backend on :8080, Swagger UI at /swagger-ui.html
./gradlew bootRun

# frontend against the local backend
cd src/frontend
npm ci --legacy-peer-deps
npm run dev:local
```

After a change to the backend API, regenerate the frontend client: `npm run api-typegen:local`.

Optional settings come from environment variables (empty = the feature is off): `TELEGRAM_BOT_TOKEN`,
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, `MAIL_HOST`, `MAIL_PORT`,
`MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `GEMINI_KEY`, `GRAFANA_KEY`.

### Firmware

```bash
cd scripts/251208-101749-esp32dev
cp secrets.example.ini secrets.ini   # OTA password and board addresses, not in git
pio run -e esp8266 -t upload         # over USB
pio run -e esp8266-ota -t upload     # over Wi-Fi
```

### Tests

```bash
./gradlew test
# forecast model benchmark on CSV series, options in the ForecastBenchmark javadoc
./gradlew test --tests '*ForecastBenchmark' --rerun -Dforecast.benchmark=<dir of series csv> -Dforecast.benchmark.out=<csv>
```

## Deployment

A push to `main` runs `.github/workflows/release.yml`: it builds the backend, the firmware and the frontend, checks the
broker logins, pushes the images to `ghcr.io/proteus1121/monitoring-backend` and `monitoring-frontend` and deploys
`docker-compose.yml` as the `monitoring_stack` stack.

Useful commands on the server:

```bash
docker stack services monitoring_stack
docker service ps monitoring_stack_monitoring-backend
docker service ps monitoring_stack_mysql-db
docker logs $(docker ps -q --filter name=monitoring_stack_monitoring-backend)
docker logs $(docker ps -q --filter name=monitoring_stack_mysql-db)
docker pull ghcr.io/proteus1121/monitoring-backend:latest
docker stack rm monitoring_stack
```

Building the images by hand:

```bash
./gradlew build
docker build . --no-cache -t ghcr.io/proteus1121/monitoring-backend:latest
docker build ./src/frontend --no-cache -t ghcr.io/proteus1121/monitoring-frontend:latest
docker run -e PROFILE=docker -t ghcr.io/proteus1121/monitoring-backend:latest
```

## VPS setup

Setting up a new VPS for the stack: Docker, Docker Swarm, swap and Docker data on an extra disk.

### 1. Install Docker

From the [official guide](https://docs.docker.com/engine/install/ubuntu/):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Initialize Docker Swarm

```bash
sudo docker swarm init --advertise-addr 139.59.148.159
```

### 3. Create swap

With little RAM, swap prevents out-of-memory errors. 1G is used here; 512M should also be fine.

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Move Docker data to an extra disk

If the root partition is small, move Docker's storage to an attached volume:

```bash
sudo systemctl stop docker
sudo mv /var/lib/docker /mnt/volume_fra1_02/docker
sudo ln -s /mnt/volume_fra1_02/docker /var/lib/docker
sudo systemctl start docker
docker info | grep "Docker Root Dir"
```

Make sure the volume is mounted at boot (`/etc/fstab`).

## License

[MIT](LICENSE)
