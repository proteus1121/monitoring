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
