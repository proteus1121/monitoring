package org.proteus1121.service.forecast;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.proteus1121.model.enums.ForecastModel;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;

/**
 * Rolling-origin comparison of the forecast models on hourly series (experiments of subsection 4.1.4
 * of the thesis). Every origin gives each model the previous 30 days, as the server does with its
 * default settings, and records the next 24 hours, the backtest error the server would store and the
 * fitting time. Metrics are computed from the output by docs/dissertation/build/forecast_exp.py.
 *
 * <pre>
 * ./gradlew test --tests '*ForecastBenchmark' --rerun -Dforecast.benchmark=&lt;dir of series csv&gt; -Dforecast.benchmark.out=&lt;csv&gt;
 * </pre>
 * Optional: -Dforecast.benchmark.window=48 -Dforecast.benchmark.epochs=40 -Dforecast.benchmark.models=TRANSFORMER
 */
@EnabledIfSystemProperty(named = "forecast.benchmark", matches = ".+")
class ForecastBenchmark {

    private static final int HISTORY = 720;
    private static final int HORIZON = 24;
    // not a multiple of 24, so the origins go round all hours of the day
    private static final int STEP = 103;

    private record Series(String name, LocalDateTime start, double[] values, boolean[] filled) {
    }

    @Test
    void run() throws Exception {
        Path dir = Path.of(System.getProperty("forecast.benchmark"));
        Path out = Path.of(System.getProperty("forecast.benchmark.out", "forecast_benchmark.csv"));
        int window = Integer.getInteger("forecast.benchmark.window", 48);
        int epochs = Integer.getInteger("forecast.benchmark.epochs", 40);
        String only = System.getProperty("forecast.benchmark.models", "");
        EnumSet<ForecastModel> models = only.isBlank() ? EnumSet.allOf(ForecastModel.class) : EnumSet.noneOf(ForecastModel.class);
        for (String name : only.split(",")) if (!name.isBlank()) models.add(ForecastModel.valueOf(name.trim()));
        boolean baselines = only.isBlank();

        ForecastSettings settings = new ForecastSettings(models, HORIZON, 30, 2, 1, 1, 0.01, 1.0, 100, 4, window, epochs);
        List<Forecaster> forecasters = Stream.of(new ArimaForecaster(), new KalmanForecaster(),
                        new XgboostForecaster(), new TransformerForecaster())
                .filter(f -> models.contains(f.model()))
                .map(f -> (Forecaster) f)
                .toList();

        List<Series> series = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".csv")).sorted().toList()) {
                series.add(read(file));
            }
        }

        int threads = Math.max(1, Runtime.getRuntime().availableProcessors() - 1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Future<List<String>>> tasks = new ArrayList<>();
        for (Series s : series) {
            for (int origin = HISTORY; origin + HORIZON <= s.values().length; origin += STEP) {
                if (!usable(s, origin)) continue;
                int o = origin;
                tasks.add(pool.submit(() -> origin(s, o, forecasters, settings, baselines)));
            }
        }
        System.out.printf("%d series, %d origins, %d threads%n", series.size(), tasks.size(), threads);

        try (PrintWriter writer = new PrintWriter(Files.newBufferedWriter(out))) {
            writer.println("series,origin,time,model,h,y,yhat,fit_ms,bt_mae,bt_rmse,scale,sd");
            int done = 0;
            for (Future<List<String>> task : tasks) {
                task.get().forEach(writer::println);
                if (++done % 25 == 0) System.out.printf("%d / %d origins%n", done, tasks.size());
            }
        }
        pool.shutdown();
    }

    /**
     * The origin is skipped when the hours to forecast were not measured or the last three days
     * of history are mostly interpolated.
     */
    private static boolean usable(Series s, int origin) {
        int recentFilled = 0;
        for (int i = origin - 72; i < origin; i++) if (s.filled()[i]) recentFilled++;
        for (int i = origin; i < origin + HORIZON; i++) if (s.filled()[i]) return false;
        return recentFilled <= 7;
    }

    private static List<String> origin(Series s, int origin, List<Forecaster> forecasters,
                                       ForecastSettings settings, boolean baselines) {
        double[] train = Arrays.copyOfRange(s.values(), origin - HISTORY, origin);
        LocalDateTime start = s.start().plusHours(origin - HISTORY);
        double[] truth = Arrays.copyOfRange(s.values(), origin, origin + HORIZON);

        // scale of the mean absolute scaled error: in-sample one-step naive error
        double scale = 0;
        for (int i = 1; i < train.length; i++) scale += Math.abs(train[i] - train[i - 1]);
        scale /= train.length - 1;
        double mean = Arrays.stream(train).average().orElse(0);
        double sd = Math.sqrt(Arrays.stream(train).map(v -> (v - mean) * (v - mean)).sum() / train.length);

        List<String> rows = new ArrayList<>();
        String time = start.plusHours(HISTORY).toString();
        String common = "%s,%d,%s".formatted(s.name(), origin, time);
        double[] backtestTrain = Arrays.copyOf(train, train.length - HORIZON);
        double[] backtestTruth = Arrays.copyOfRange(train, train.length - HORIZON, train.length);

        for (Forecaster forecaster : forecasters) {
            double[] check = forecaster.forecast(backtestTrain, start, HORIZON, settings);
            long begin = System.nanoTime();
            double[] forecast = forecaster.forecast(train, start, HORIZON, settings);
            double fitMs = (System.nanoTime() - begin) / 1e6;
            add(rows, common, forecaster.model().name(), truth, forecast, fitMs, check, backtestTruth, scale, sd);
        }
        if (baselines) {
            double[] naive = Forecaster.naive(train, HORIZON);
            add(rows, common, "NAIVE", truth, naive, 0, Forecaster.naive(backtestTrain, HORIZON), backtestTruth, scale, sd);
            add(rows, common, "SNAIVE", truth, seasonal(train), 0, seasonal(backtestTrain), backtestTruth, scale, sd);
        }
        return rows;
    }

    /**
     * Same hour yesterday.
     */
    private static double[] seasonal(double[] train) {
        return Arrays.copyOfRange(train, train.length - 24, train.length - 24 + HORIZON);
    }

    private static void add(List<String> rows, String common, String model, double[] truth, double[] forecast,
                            double fitMs, double[] check, double[] checkTruth, double scale, double sd) {
        double abs = 0, square = 0;
        for (int i = 0; i < HORIZON; i++) {
            double e = check[i] - checkTruth[i];
            abs += Math.abs(e);
            square += e * e;
        }
        double btMae = abs / HORIZON;
        double btRmse = Math.sqrt(square / HORIZON);
        for (int h = 0; h < HORIZON; h++) {
            rows.add(String.format(Locale.ROOT, "%s,%s,%d,%.6g,%.6g,%.3f,%.6g,%.6g,%.6g,%.6g",
                    common, model, h + 1, truth[h], forecast[h], fitMs, btMae, btRmse, scale, sd));
        }
    }

    private static Series read(Path file) throws IOException {
        List<String> lines = Files.readAllLines(file);
        int n = lines.size() - 1;
        double[] values = new double[n];
        boolean[] filled = new boolean[n];
        LocalDateTime start = null;
        for (int i = 0; i < n; i++) {
            String[] cells = lines.get(i + 1).split(",");
            if (i == 0) start = LocalDateTime.parse(cells[0]);
            values[i] = Double.parseDouble(cells[1]);
            filled[i] = cells.length > 2 && "1".equals(cells[2]);
        }
        String name = file.getFileName().toString().replace(".csv", "");
        return new Series(name, start, values, filled);
    }
}
