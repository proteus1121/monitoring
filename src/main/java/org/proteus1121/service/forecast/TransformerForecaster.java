package org.proteus1121.service.forecast;

import org.proteus1121.model.enums.ForecastModel;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Random;

/**
 * Small Transformer trained from scratch on the history of one device. A token is one hour: the
 * standardised value and the hour of day as a point on a circle. The model sees the last
 * {@code window} hours and predicts the change to the next hour; the horizon is forecast
 * recursively, like XGBoost. The last tenth of the windows is kept aside to stop training at the
 * epoch with the lowest validation error, so a short history is not overfitted.
 */
@Component
public class TransformerForecaster implements Forecaster {

    static final int D_MODEL = 16;
    static final int HEADS = 2;
    static final int HIDDEN = 32;
    private static final int INPUTS = 3;
    private static final int BATCH = 32;
    private static final double LEARNING_RATE = 3e-3;
    private static final double CLIP = 1.0;
    private static final long SEED = 42;
    static final double BOUND_MARGIN = 0.25;

    @Override
    public ForecastModel model() {
        return ForecastModel.TRANSFORMER;
    }

    @Override
    public double[] forecast(double[] values, LocalDateTime start, int horizon, ForecastSettings settings) {
        int window = Math.min(settings.transformerWindow(), values.length / 3);
        int samples = values.length - window;
        if (window < 6 || samples < 24) {
            return Forecaster.naive(values, horizon);
        }

        double mean = Arrays.stream(values).average().orElse(0);
        double variance = Arrays.stream(values).map(v -> (v - mean) * (v - mean)).sum() / values.length;
        double std = Math.sqrt(variance);
        if (std < 1e-9) {
            return Forecaster.naive(values, horizon);
        }

        double[] z = new double[values.length + horizon];
        for (int i = 0; i < values.length; i++) z[i] = (values[i] - mean) / std;
        double[] hourSin = new double[z.length];
        double[] hourCos = new double[z.length];
        for (int t = 0; t < z.length; t++) {
            double angle = 2 * Math.PI * start.plusHours(t).getHour() / 24;
            hourSin[t] = Math.sin(angle);
            hourCos[t] = Math.cos(angle);
        }

        // sample s: window ending at t = s + window - 1, target z[t + 1] - z[t]
        double[][][] x = new double[samples][][];
        double[] target = new double[samples];
        for (int s = 0; s < samples; s++) {
            x[s] = tokens(z, hourSin, hourCos, s, window);
            int t = s + window - 1;
            target[s] = z[t + 1] - z[t];
        }

        TinyTransformer net = train(x, target, window, settings.transformerEpochs());

        // the recursion sums predicted changes, so a small bias drifts without bound (a CO sensor
        // went below zero within a day): keep it within the history range widened by a quarter
        double low = Double.MAX_VALUE, high = -Double.MAX_VALUE;
        for (int i = 0; i < values.length; i++) {
            low = Math.min(low, z[i]);
            high = Math.max(high, z[i]);
        }
        double margin = (high - low) * BOUND_MARGIN;

        double[] future = new double[horizon];
        for (int i = 0; i < horizon; i++) {
            int t = values.length + i;
            double delta = net.predict(tokens(z, hourSin, hourCos, t - window, window));
            z[t] = Math.max(low - margin, Math.min(high + margin, z[t - 1] + delta));
            future[i] = mean + std * z[t];
        }
        return future;
    }

    private static double[][] tokens(double[] z, double[] hourSin, double[] hourCos, int from, int window) {
        double[][] tokens = new double[window][];
        for (int j = 0; j < window; j++) {
            int t = from + j;
            tokens[j] = new double[]{z[t], hourSin[t], hourCos[t]};
        }
        return tokens;
    }

    static TinyTransformer train(double[][][] x, double[] target, int window, int epochs) {
        TinyTransformer net = new TinyTransformer(window, INPUTS, D_MODEL, HEADS, HIDDEN, SEED);
        int n = x.length;
        int validation = Math.max(1, n / 10);
        int training = n - validation;

        int size = net.size();
        double[] grad = new double[size];
        double[] m = new double[size];
        double[] v = new double[size];
        double[] best = net.params.clone();
        double bestLoss = loss(net, x, target, training, n);
        int[] order = new int[training];
        for (int i = 0; i < training; i++) order[i] = i;
        Random random = new Random(SEED);
        int step = 0;

        for (int epoch = 0; epoch < epochs; epoch++) {
            shuffle(order, random);
            for (int from = 0; from < training; from += BATCH) {
                int to = Math.min(training, from + BATCH);
                Arrays.fill(grad, 0);
                for (int b = from; b < to; b++) {
                    int s = order[b];
                    TinyTransformer.Pass pass = net.forward(x[s]);
                    net.backward(pass, 2 * (pass.y - target[s]) / (to - from), grad);
                }
                clip(grad);
                step++;
                adam(net.params, grad, m, v, step);
            }
            double validationLoss = loss(net, x, target, training, n);
            if (validationLoss < bestLoss) {
                bestLoss = validationLoss;
                System.arraycopy(net.params, 0, best, 0, size);
            }
        }
        System.arraycopy(best, 0, net.params, 0, size);
        return net;
    }

    private static double loss(TinyTransformer net, double[][][] x, double[] target, int from, int to) {
        double sum = 0;
        for (int s = from; s < to; s++) {
            double error = net.predict(x[s]) - target[s];
            sum += error * error;
        }
        return sum / (to - from);
    }

    private static void clip(double[] grad) {
        double norm = 0;
        for (double g : grad) norm += g * g;
        norm = Math.sqrt(norm);
        if (norm > CLIP) {
            double factor = CLIP / norm;
            for (int i = 0; i < grad.length; i++) grad[i] *= factor;
        }
    }

    private static void adam(double[] params, double[] grad, double[] m, double[] v, int step) {
        double beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
        double correction1 = 1 - Math.pow(beta1, step);
        double correction2 = 1 - Math.pow(beta2, step);
        for (int i = 0; i < params.length; i++) {
            m[i] = beta1 * m[i] + (1 - beta1) * grad[i];
            v[i] = beta2 * v[i] + (1 - beta2) * grad[i] * grad[i];
            params[i] -= LEARNING_RATE * (m[i] / correction1) / (Math.sqrt(v[i] / correction2) + eps);
        }
    }

    private static void shuffle(int[] order, Random random) {
        for (int i = order.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int swap = order[i];
            order[i] = order[j];
            order[j] = swap;
        }
    }
}
