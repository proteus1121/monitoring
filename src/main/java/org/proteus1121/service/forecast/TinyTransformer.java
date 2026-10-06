package org.proteus1121.service.forecast;

import java.util.Random;

/**
 * One causal self-attention block small enough to train on a few weeks of hourly data on the server
 * CPU. Every token of the window is embedded from its features plus a learned position, the last
 * token attends to the whole window with several heads, then goes through a residual feed-forward
 * layer and a linear output. With a single block only the last position reaches the output, so the
 * other positions are used as keys and values only.
 *
 * <p>All parameters live in one array so the optimiser and the gradient check treat them alike.
 */
final class TinyTransformer {

    final int window;
    final int inputs;
    final int dModel;
    final int heads;
    final int dHead;
    final int hidden;

    final double[] params;

    // offsets of the parameter blocks in params
    private final int wIn, bIn, pos, wq, wk, wv, wo, w1, b1, w2, b2, wOut, bOut;

    TinyTransformer(int window, int inputs, int dModel, int heads, int hidden, long seed) {
        if (dModel % heads != 0) throw new IllegalArgumentException("dModel must be divisible by heads");
        this.window = window;
        this.inputs = inputs;
        this.dModel = dModel;
        this.heads = heads;
        this.dHead = dModel / heads;
        this.hidden = hidden;

        int offset = 0;
        wIn = offset; offset += dModel * inputs;
        bIn = offset; offset += dModel;
        pos = offset; offset += window * dModel;
        wq = offset; offset += dModel * dModel;
        wk = offset; offset += dModel * dModel;
        wv = offset; offset += dModel * dModel;
        wo = offset; offset += dModel * dModel;
        w1 = offset; offset += hidden * dModel;
        b1 = offset; offset += hidden;
        w2 = offset; offset += dModel * hidden;
        b2 = offset; offset += dModel;
        wOut = offset; offset += dModel;
        bOut = offset; offset += 1;
        params = new double[offset];

        Random random = new Random(seed);
        init(random, wIn, dModel * inputs, inputs);
        init(random, pos, window * dModel, dModel * 4.0);
        init(random, wq, dModel * dModel, dModel);
        init(random, wk, dModel * dModel, dModel);
        init(random, wv, dModel * dModel, dModel);
        init(random, wo, dModel * dModel, dModel * 2.0);
        init(random, w1, hidden * dModel, dModel);
        init(random, w2, dModel * hidden, hidden * 2.0);
        init(random, wOut, dModel, dModel * 4.0);
    }

    int size() {
        return params.length;
    }

    private void init(Random random, int offset, int count, double fanIn) {
        double scale = 1 / Math.sqrt(fanIn);
        for (int i = 0; i < count; i++) params[offset + i] = random.nextGaussian() * scale;
    }

    /**
     * Activations of one forward pass, kept for the backward pass.
     */
    final class Pass {
        final double[][] x;
        final double[][] e = new double[window][dModel];
        final double[][] k = new double[window][dModel];
        final double[][] v = new double[window][dModel];
        final double[] q = new double[dModel];
        final double[][] a = new double[heads][window];
        final double[] c = new double[dModel];
        final double[] h1 = new double[dModel];
        final double[] u = new double[hidden];
        final double[] h2 = new double[dModel];
        double y;

        Pass(double[][] x) {
            this.x = x;
        }
    }

    /**
     * @param x window × inputs features, oldest token first
     */
    Pass forward(double[][] x) {
        Pass s = new Pass(x);
        double[] p = params;
        for (int j = 0; j < window; j++) {
            for (int i = 0; i < dModel; i++) {
                double sum = p[bIn + i] + p[pos + j * dModel + i];
                for (int f = 0; f < inputs; f++) sum += p[wIn + i * inputs + f] * x[j][f];
                s.e[j][i] = sum;
            }
            matVec(wk, s.e[j], s.k[j], dModel, dModel);
            matVec(wv, s.e[j], s.v[j], dModel, dModel);
        }
        double[] last = s.e[window - 1];
        matVec(wq, last, s.q, dModel, dModel);

        double scale = 1 / Math.sqrt(dHead);
        for (int h = 0; h < heads; h++) {
            int from = h * dHead;
            double max = Double.NEGATIVE_INFINITY;
            for (int j = 0; j < window; j++) {
                double score = 0;
                for (int i = from; i < from + dHead; i++) score += s.q[i] * s.k[j][i];
                s.a[h][j] = score * scale;
                max = Math.max(max, s.a[h][j]);
            }
            double total = 0;
            for (int j = 0; j < window; j++) {
                s.a[h][j] = Math.exp(s.a[h][j] - max);
                total += s.a[h][j];
            }
            for (int j = 0; j < window; j++) s.a[h][j] /= total;
            for (int i = from; i < from + dHead; i++) {
                double sum = 0;
                for (int j = 0; j < window; j++) sum += s.a[h][j] * s.v[j][i];
                s.c[i] = sum;
            }
        }

        // attention output with residual
        matVec(wo, s.c, s.h1, dModel, dModel);
        for (int i = 0; i < dModel; i++) s.h1[i] += last[i];

        // feed-forward with residual
        for (int r = 0; r < hidden; r++) {
            double sum = p[b1 + r];
            for (int i = 0; i < dModel; i++) sum += p[w1 + r * dModel + i] * s.h1[i];
            s.u[r] = sum;
        }
        for (int i = 0; i < dModel; i++) {
            double sum = p[b2 + i] + s.h1[i];
            for (int r = 0; r < hidden; r++) sum += p[w2 + i * hidden + r] * Math.max(0, s.u[r]);
            s.h2[i] = sum;
        }

        double y = p[bOut];
        for (int i = 0; i < dModel; i++) y += p[wOut + i] * s.h2[i];
        s.y = y;
        return s;
    }

    double predict(double[][] x) {
        return forward(x).y;
    }

    /**
     * Adds the gradient of {@code dy * y} with respect to the parameters to {@code grad}.
     */
    void backward(Pass s, double dy, double[] grad) {
        double[] p = params;

        // output layer
        double[] g2 = new double[dModel];
        for (int i = 0; i < dModel; i++) {
            grad[wOut + i] += dy * s.h2[i];
            g2[i] = dy * p[wOut + i];
        }
        grad[bOut] += dy;

        // feed-forward: h2 = h1 + W2 relu(W1 h1 + b1) + b2
        double[] g1 = g2.clone();
        double[] gu = new double[hidden];
        for (int r = 0; r < hidden; r++) {
            double relu = Math.max(0, s.u[r]);
            double sum = 0;
            for (int i = 0; i < dModel; i++) {
                grad[w2 + i * hidden + r] += g2[i] * relu;
                sum += p[w2 + i * hidden + r] * g2[i];
            }
            gu[r] = s.u[r] > 0 ? sum : 0;
        }
        for (int i = 0; i < dModel; i++) grad[b2 + i] += g2[i];
        for (int r = 0; r < hidden; r++) {
            grad[b1 + r] += gu[r];
            for (int i = 0; i < dModel; i++) {
                grad[w1 + r * dModel + i] += gu[r] * s.h1[i];
                g1[i] += p[w1 + r * dModel + i] * gu[r];
            }
        }

        // attention output: h1 = e_last + Wo c
        double[][] ge = new double[window][dModel];
        double[] gc = new double[dModel];
        for (int i = 0; i < dModel; i++) {
            ge[window - 1][i] += g1[i];
            for (int m = 0; m < dModel; m++) {
                grad[wo + i * dModel + m] += g1[i] * s.c[m];
                gc[m] += p[wo + i * dModel + m] * g1[i];
            }
        }

        // heads
        double scale = 1 / Math.sqrt(dHead);
        double[] gq = new double[dModel];
        double[][] gk = new double[window][dModel];
        double[][] gv = new double[window][dModel];
        for (int h = 0; h < heads; h++) {
            int from = h * dHead;
            double[] da = new double[window];
            double weighted = 0;
            for (int j = 0; j < window; j++) {
                double sum = 0;
                for (int i = from; i < from + dHead; i++) {
                    gv[j][i] += s.a[h][j] * gc[i];
                    sum += gc[i] * s.v[j][i];
                }
                da[j] = sum;
                weighted += s.a[h][j] * sum;
            }
            for (int j = 0; j < window; j++) {
                double ds = s.a[h][j] * (da[j] - weighted) * scale;
                for (int i = from; i < from + dHead; i++) {
                    gq[i] += ds * s.k[j][i];
                    gk[j][i] += ds * s.q[i];
                }
            }
        }

        // projections back to the embeddings
        matVecGrad(wq, s.e[window - 1], gq, ge[window - 1], grad);
        for (int j = 0; j < window; j++) {
            matVecGrad(wk, s.e[j], gk[j], ge[j], grad);
            matVecGrad(wv, s.e[j], gv[j], ge[j], grad);
        }

        // embeddings
        for (int j = 0; j < window; j++) {
            for (int i = 0; i < dModel; i++) {
                double g = ge[j][i];
                grad[bIn + i] += g;
                grad[pos + j * dModel + i] += g;
                for (int f = 0; f < inputs; f++) grad[wIn + i * inputs + f] += g * s.x[j][f];
            }
        }
    }

    private void matVec(int offset, double[] in, double[] out, int rows, int cols) {
        for (int r = 0; r < rows; r++) {
            double sum = 0;
            for (int c = 0; c < cols; c++) sum += params[offset + r * cols + c] * in[c];
            out[r] = sum;
        }
    }

    /**
     * For out = W in: adds dL/dW to grad and W' dL/dout to gIn.
     */
    private void matVecGrad(int offset, double[] in, double[] gOut, double[] gIn, double[] grad) {
        for (int r = 0; r < dModel; r++) {
            double g = gOut[r];
            if (g == 0) continue;
            for (int c = 0; c < dModel; c++) {
                grad[offset + r * dModel + c] += g * in[c];
                gIn[c] += params[offset + r * dModel + c] * g;
            }
        }
    }
}
