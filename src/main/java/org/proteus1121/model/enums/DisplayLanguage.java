package org.proteus1121.model.enums;

/**
 * Language of the screens on the board's display.
 */
public enum DisplayLanguage {

    UK,
    EN;

    /**
     * Until the user picks one: Ukrainian, like the site.
     */
    public static DisplayLanguage orDefault(DisplayLanguage language) {
        return language != null ? language : UK;
    }
}
