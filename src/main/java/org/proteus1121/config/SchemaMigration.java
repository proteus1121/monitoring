package org.proteus1121.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * ddl-auto=update adds new tables and columns but never changes existing ones. Hibernate creates
 * MySQL ENUM columns for enums, so adding a value (e.g. DeviceType.RELAY) breaks inserts until the
 * column is widened to VARCHAR.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void migrate() {
        convertEnumToVarchar("devices", "type");
        // every measurement queries the last minutes of sensor_data; without these it is a full table scan
        createIndex("sensor_data", "idx_sensor_data_timestamp", "`timestamp`");
        createIndex("sensor_data", "idx_sensor_data_device_timestamp", "device_id, `timestamp`");
        // e-mail notifications have no Telegram chat
        makeNullable("notifications", "telegram_chat_id", "VARCHAR(64)");
        enableDefaultForecasts();
    }

    /**
     * Before forecast settings existed every device got an XGBoost forecast; keep that for numeric
     * sensors once, when the column is still empty everywhere.
     */
    private void enableDefaultForecasts() {
        try {
            Integer configured = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM devices WHERE forecast_model IS NOT NULL", Integer.class);
            if (configured != null && configured == 0) {
                int updated = jdbcTemplate.update("UPDATE devices SET forecast_model = 'XGBOOST' WHERE type IN " +
                        "('TEMPERATURE', 'HUMIDITY', 'PRESSURE', 'LPG', 'CH4', 'SMOKE')");
                log.info("Enabled XGBoost forecast for {} existing devices", updated);
            }
        } catch (Exception e) {
            log.error("Failed to enable default forecasts", e);
        }
    }

    private void makeNullable(String table, String column, String type) {
        try {
            List<String> nullable = jdbcTemplate.queryForList(
                    "SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                    String.class, table, column);
            if (!nullable.isEmpty() && "NO".equalsIgnoreCase(nullable.get(0))) {
                log.info("Making {}.{} nullable", table, column);
                jdbcTemplate.execute("ALTER TABLE " + table + " MODIFY COLUMN `" + column + "` " + type + " NULL");
            }
        } catch (Exception e) {
            log.error("Failed to make {}.{} nullable", table, column, e);
        }
    }

    private void createIndex(String table, String index, String columns) {
        try {
            Integer existing = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
                    Integer.class, table, index);
            if (existing != null && existing == 0) {
                log.info("Creating index {} on {}({})", index, table, columns);
                jdbcTemplate.execute("CREATE INDEX " + index + " ON " + table + " (" + columns + ")");
            }
        } catch (Exception e) {
            log.error("Failed to create index {} on {}", index, table, e);
        }
    }

    private void convertEnumToVarchar(String table, String column) {
        try {
            List<String> types = jdbcTemplate.queryForList(
                    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                    String.class, table, column);
            if (!types.isEmpty() && "enum".equalsIgnoreCase(types.get(0))) {
                log.info("Converting {}.{} from ENUM to VARCHAR(32)", table, column);
                jdbcTemplate.execute("ALTER TABLE " + table + " MODIFY COLUMN `" + column + "` VARCHAR(32) NULL");
            }
        } catch (Exception e) {
            log.error("Failed to migrate {}.{}", table, column, e);
        }
    }
}
