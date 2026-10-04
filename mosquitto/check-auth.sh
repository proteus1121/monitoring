#!/usr/bin/env bash
# Runs the broker of the stack (mosquitto-go-auth, mosquitto/config/mosquitto.conf) against the MySQL image of
# the stack and checks the logins before a deploy: the backend sees everything, a board only its owner's
# topics, a wrong or missing password is refused. Needs docker, python3 and mosquitto-clients.
set -euo pipefail

cd "$(dirname "$0")"
MYSQL_IMAGE=$(grep -A1 '^  mysql-db:' ../docker-compose.yml | sed -n 's/ *image: *//p')
BROKER_IMAGE=$(grep -A2 '^  mosquitto:' ../docker-compose.yml | sed -n 's/ *image: *//p')
NET=auth-check
DB_PASS=check-db-pass
WORK=$(mktemp -d)

cleanup() {
    docker logs auth-check-broker > "$WORK/broker.log" 2>&1 || true
    docker rm -f auth-check-db auth-check-broker > /dev/null 2>&1 || true
    docker network rm $NET > /dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
    echo "FAIL: $*"
    echo "--- broker log"
    docker logs auth-check-broker 2>&1 | tail -40 || true
    exit 1
}

docker network create $NET > /dev/null
docker run -d --name auth-check-db --network $NET -e MYSQL_ROOT_PASSWORD=$DB_PASS -e MYSQL_DATABASE=monitoring \
    "$MYSQL_IMAGE" > /dev/null

echo "Waiting for MySQL ($MYSQL_IMAGE)"
for i in $(seq 1 90); do
    if docker exec auth-check-db mysql -uroot -p$DB_PASS -e 'SELECT 1' monitoring > /dev/null 2>&1; then
        break
    fi
    [ "$i" = 90 ] && fail "MySQL did not start"
    sleep 2
done

# the table as Hibernate creates it from MqttAccountEntity; hashes as Spring's BCryptPasswordEncoder writes them
pip install --quiet bcrypt
hash() { python3 -c "import bcrypt,sys; print(bcrypt.hashpw(sys.argv[1].encode(), bcrypt.gensalt(10)).decode().replace('\$2b\$', '\$2a\$', 1))" "$1"; }
docker exec -i auth-check-db mysql -uroot -p$DB_PASS monitoring <<SQL
CREATE TABLE mqtt_accounts (
    username VARCHAR(64) NOT NULL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    user_id BIGINT NULL,
    superuser BIT NOT NULL
);
INSERT INTO mqtt_accounts VALUES ('backend', '$(hash backend-pass)', NULL, 1);
INSERT INTO mqtt_accounts VALUES ('esp8266-aaaaaa', '$(hash board-pass)', 1, 0);
SQL

# the conf of the stack, with the password CI appends and this database
sed 's/^auth_opt_mysql_host .*/auth_opt_mysql_host auth-check-db/' config/mosquitto.conf > "$WORK/mosquitto.conf"
echo "auth_opt_mysql_password $DB_PASS" >> "$WORK/mosquitto.conf"
sed -i 's|^log_dest file .*||' "$WORK/mosquitto.conf"
mkdir -p "$WORK/data" && chmod 777 "$WORK/data"
docker run -d --name auth-check-broker --network $NET -p 18830:1883 --user 1883:1883 \
    -v "$WORK/mosquitto.conf:/etc/mosquitto/mosquitto.conf:ro" -v "$WORK/data:/mosquitto/data" \
    "$BROKER_IMAGE" > /dev/null

echo "Waiting for the broker ($BROKER_IMAGE)"
for i in $(seq 1 30); do
    if mosquitto_pub -h localhost -p 18830 -u backend -P backend-pass -t check/ready -m 1 > /dev/null 2>&1; then
        break
    fi
    [ "$i" = 30 ] && fail "the backend login does not work"
    sleep 2
done

pub() { mosquitto_pub -h localhost -p 18830 -q 1 "$@"; }

# what the backend receives while the board publishes
mosquitto_sub -h localhost -p 18830 -u backend -P backend-pass -t 'users/#' -v > "$WORK/seen.txt" &
SUB=$!
sleep 2
pub -u esp8266-aaaaaa -P board-pass -t users/1/controllers/esp8266-aaaaaa/hello -m own || fail "the board cannot publish on its topics"
pub -u esp8266-aaaaaa -P board-pass -t users/2/controllers/esp8266-bbbbbb/hello -m foreign || true
pub -u backend -P backend-pass -t users/1/controllers/esp8266-aaaaaa/configuration -m config || fail "the backend cannot publish"
sleep 2
kill $SUB

grep -q 'users/1/controllers/esp8266-aaaaaa/hello own' "$WORK/seen.txt" || fail "the board's message did not arrive"
grep -q 'users/1/controllers/esp8266-aaaaaa/configuration config' "$WORK/seen.txt" || fail "the backend's message did not arrive"
if grep -q foreign "$WORK/seen.txt"; then fail "the board published on another user's topic"; fi

# a board receives its own topics (as the firmware subscribes them) and nothing of other users
timeout 6 mosquitto_sub -h localhost -p 18830 -u esp8266-aaaaaa -P board-pass -t 'users/1/devices/+/command' -v -C 1 > "$WORK/board.txt" &
BSUB=$!
timeout 6 mosquitto_sub -h localhost -p 18830 -u esp8266-aaaaaa -P board-pass -t 'users/2/#' -v > "$WORK/foreign.txt" 2>&1 &
FSUB=$!
sleep 2
pub -u backend -P backend-pass -t users/2/devices/9/command -m other
pub -u backend -P backend-pass -t users/1/devices/3/command -m mine
wait $BSUB || true
wait $FSUB || true
grep -q 'users/1/devices/3/command mine' "$WORK/board.txt" || fail "the board did not get its own command: $(cat "$WORK/board.txt")"
if grep -q other "$WORK/board.txt" "$WORK/foreign.txt"; then fail "the board read another user's topic"; fi

if pub -u esp8266-aaaaaa -P wrong -t users/1/x -m 1 2> /dev/null; then fail "a wrong password was accepted"; fi
if pub -t users/1/x -m 1 2> /dev/null; then fail "a client without a login was accepted"; fi
if pub -u esp8266-unknown -P board-pass -t users/1/x -m 1 2> /dev/null; then fail "an unknown board was accepted"; fi

echo "Broker logins OK"
