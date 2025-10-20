package org.proteus1121.model.enums;

public enum Period {
    LIVE,
    ONE_MINUTE,
    FIVE_MINUTES,
    FIFTEEN_MINUTES,
    THIRTY_MINUTES,
    ONE_HOUR,
    SIX_HOURS,
    TWELVE_HOURS,
    ONE_DAY;

    public int stepSeconds() {
        return switch (this) {
            case LIVE -> 1;
            case ONE_MINUTE -> 60;
            case FIVE_MINUTES -> 5 * 60;
            case FIFTEEN_MINUTES -> 15 * 60;
            case THIRTY_MINUTES -> 30 * 60;
            case ONE_HOUR -> 60 * 60;
            case SIX_HOURS -> 6 * 60 * 60;
            case TWELVE_HOURS -> 12 * 60 * 60;
            case ONE_DAY -> 24 * 60 * 60;
        };
    }
}
