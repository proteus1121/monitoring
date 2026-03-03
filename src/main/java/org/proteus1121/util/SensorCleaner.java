package org.proteus1121.util;

import lombok.experimental.UtilityClass;
import org.proteus1121.model.response.metric.SensorData;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;

@UtilityClass
public class SensorCleaner {

    /**
     * Removes any contiguous block of "strange" values that is strictly sandwiched
     * between non-strange values on both sides.
     *
     * Examples (S = strange, N = non-strange):
     * - N S N         -> remove S
     * - N S S N       -> remove [S S]
     * - S S N         -> keep leading S S
     * - N S S         -> keep trailing S S
     * - S S S         -> keep (no surrounding N on both sides)
     *
     * O(n) single pass after optional sort.
     */
    public static List<SensorData> removeSandwichedRuns(
            List<SensorData> data,
            Predicate<Double> isStrange
    ) {
        if (data == null || data.isEmpty()) return List.of();

        // If your service guarantees chronological order, you can drop this sort.
        List<SensorData> sorted = data.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(SensorData::getTimestamp))
                .toList();

        List<SensorData> out = new ArrayList<>(sorted.size());
        int n = sorted.size();
        int i = 0;

        while (i < n) {
            SensorData cur = sorted.get(i);
            Double v = cur.getValue();

            if (isStrange.test(v)) {
                // find the full run [i, j) of strange values
                int start = i;
                int j = i;
                while (j < n && isStrange.test(sorted.get(j).getValue())) {
                    j++;
                }

                // neighbors around the strange run
                Double prev = (start > 0) ? sorted.get(start - 1).getValue() : null;
                Double next = (j < n) ? sorted.get(j).getValue() : null;

                boolean prevIsNonStrange = prev != null && !isStrange.test(prev);
                boolean nextIsNonStrange = next != null && !isStrange.test(next);

                if (prevIsNonStrange && nextIsNonStrange) {
                    // sandwiched run -> DROP
                } else {
                    // leading/trailing or touching only one side -> KEEP
                    for (int k = start; k < j; k++) out.add(sorted.get(k));
                }

                i = j;
            } else {
                out.add(cur);
                i++;
            }
        }

        return out;
    }

    /**
     * Convenience builder: values are "strange" if they are <= thresholdInclusive
     * OR approximately equal (within eps) to any sentinel (e.g., -1, -999).
     *
     * Examples:
     * - thresholdInclusive = 0.1 treats 0, 0.05, -0.01 as strange.
     * - sentinels = [-1.0, -999.0] treats those as strange (within eps).
     */
    public static Predicate<Double> lowOrSentinel(double thresholdInclusive,
                                                  Collection<Double> sentinels,
                                                  double eps) {
        Set<Double> sentinelSet = new HashSet<>(Optional.ofNullable(sentinels).orElse(List.of()));
        return v -> {
            if (v == null) return false;      // treat null as not-strange (adjust if needed)
            if (Double.isNaN(v)) return true; // NaN considered strange; change if undesired
            if (v <= thresholdInclusive) return true;
            // match to any sentinel within eps (useful if your values are floats)
            for (Double s : sentinelSet) {
                if (Math.abs(v - s) <= eps) return true;
            }
            return false;
        };
    }
}