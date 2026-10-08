package org.proteus1121.service.forecast;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ValuePrecisionTest {

    @Test
    void binaryInputIsForecastAsZeroOrOne() {
        ValuePrecision precision = ValuePrecision.of(List.of(0.0, 1.0));
        assertEquals(0, precision.apply(-0.3));
        assertEquals(0, precision.apply(0.49));
        assertEquals(1, precision.apply(0.5));
        assertEquals(1, precision.apply(1.7));
    }

    @Test
    void keepsTheDecimalsOfTheReadings() {
        ValuePrecision precision = ValuePrecision.of(List.of(23.45, 23.5, 24.0));
        assertEquals(2, precision.decimals());
        assertEquals(23.46, precision.apply(23.4567));
    }

    @Test
    void integerReadingsGiveIntegerForecasts() {
        ValuePrecision precision = ValuePrecision.of(List.of(400, 512, 3));
        assertEquals(431, precision.apply(430.6));
    }

    @Test
    void floatNoiseIsCapped() {
        ValuePrecision precision = ValuePrecision.of(List.of((double) 23.45f));
        assertEquals(ValuePrecision.MAX_DECIMALS, precision.decimals());
    }
}
