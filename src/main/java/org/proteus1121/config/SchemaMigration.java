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
        migrateForecastModels();
    }

    /**
     * A device used to have one forecast model in devices.forecast_model, now it has a set of them in
     * device_forecast_models with the error of each in device_forecast_scores. The old column is copied
     * once and dropped. Before forecast settings existed every device got an XGBoost forecast, so a
     * column that is still empty everywhere enables XGBoost for numeric sensors, as it did before.
     */
    private void migrateForecastModels() {
        try {
            if (!columnExists("devices", "forecast_model")) return;
            Integer configured = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM devices WHERE forecast_model IS NOT NULL", Integer.class);
            int copied;
            if (configured != null && configured == 0) {
                copied = jdbcTemplate.update("INSERT INTO device_forecast_models (device_id, model) " +
                        "SELECT id, 'XGBOOST' FROM devices WHERE type IN " +
                        "('TEMPERATURE', 'HUMIDITY', 'PRESSURE', 'LPG', 'CH4', 'SMOKE')");
            } else {
                copied = jdbcTemplate.update("INSERT INTO device_forecast_models (device_id, model) " +
                        "SELECT id, forecast_model FROM devices WHERE forecast_model IS NOT NULL AND forecast_model <> 'NONE'");
                if (columnExists("devices", "forecast_mae")) {
                    jdbcTemplate.update("INSERT INTO device_forecast_scores (device_id, model, mae, rmse, updated_at) " +
                            "SELECT id, forecast_model, forecast_mae, forecast_rmse, forecast_updated_at FROM devices " +
                            "WHERE forecast_model IS NOT NULL AND forecast_model <> 'NONE' AND forecast_updated_at IS NOT NULL");
                }
            }
            jdbcTemplate.execute("ALTER TABLE devices DROP COLUMN forecast_model");
            log.info("Moved forecast models of {} devices to device_forecast_models", copied);
        } catch (Exception e) {
            log.error("Failed to migrate forecast models", e);
        }
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                Integer.class, table, column);
        return count != null && count > 0;
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
