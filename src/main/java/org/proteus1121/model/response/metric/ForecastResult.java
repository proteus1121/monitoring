package org.proteus1121.model.response.metric;

import org.proteus1121.model.enums.ForecastModel;

/**
 * Outcome of a forecast run.
 *
 * @param trainingHours hourly points the model was fitted on
 * @param mae           mean absolute error on the held-out last hours
 * @param rmse          root mean squared error on the held-out last hours
 */
public record ForecastResult(ForecastModel model, boolean done, String message, int trainingHours,
                             int forecastHours, Double mae, Double rmse) {

    public static ForecastResult skipped(ForecastModel model, String message) {
        return new ForecastResult(model, false, message, 0, 0, null, null);
    }
}
