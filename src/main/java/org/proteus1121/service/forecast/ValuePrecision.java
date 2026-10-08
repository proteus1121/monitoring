package org.proteus1121.service.forecast;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * How the sensor reports its values, so a forecast looks like a reading: a 0/1 input is forecast as 0 or 1,
 * a sensor with two decimals gets two decimals. Learned from the raw readings, not the hourly averages,
 * which have arbitrary decimals.
 */
record ValuePrecision(int decimals, boolean binary) {

    /**
     * Readings stored from floats can carry noise like 23.450000762, more decimals than this are not real.
     */
    static final int MAX_DECIMALS = 3;

    static final ValuePrecision DEFAULT = new ValuePrecision(2, false);

    static ValuePrecision of(List<? extends Number> values) {
        if (values.isEmpty()) {
            return DEFAULT;
        }
        int decimals = 0;
        boolean binary = true;
        for (Number number : values) {
            double value = number.doubleValue();
            if (!Double.isFinite(value)) continue;
            int scale = BigDecimal.valueOf(value).stripTrailingZeros().scale();
            decimals = Math.max(decimals, Math.min(Math.max(scale, 0), MAX_DECIMALS));
            binary &= value == 0 || value == 1;
        }
        return new ValuePrecision(decimals, binary);
    }

    double apply(double value) {
        if (binary) {
            return value >= 0.5 ? 1 : 0;
        }
        return BigDecimal.valueOf(value).setScale(decimals, RoundingMode.HALF_UP).doubleValue();
    }
}
