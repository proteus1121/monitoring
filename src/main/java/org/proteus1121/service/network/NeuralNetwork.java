package org.proteus1121.service.network;

import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import org.proteus1121.model.response.metric.SensorData;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Component
public class NeuralNetwork {
    private Booster booster;

    public NeuralNetwork() {
        // Model will be trained in train() method
    }

    public void train(List<SensorData> data) throws Exception {
        if (data.isEmpty()) return;
        float[][] features = new float[data.size()][2];
        float[] labels = new float[data.size()];
        for (int i = 0; i < data.size(); i++) {
            int hourOfDay = data.get(i).getTimestamp().getHour();
            int dayOfYear = data.get(i).getTimestamp().getDayOfYear();
            features[i][0] = hourOfDay;
            features[i][1] = dayOfYear;
            labels[i] = data.get(i).getValue().floatValue();
        }
        // Flatten features for DMatrix
        float[] flatFeatures = new float[data.size() * 2];
        for (int i = 0; i < data.size(); i++) {
            flatFeatures[i * 2] = features[i][0];
            flatFeatures[i * 2 + 1] = features[i][1];
        }
        DMatrix trainMat = new DMatrix(flatFeatures, data.size(), 2);
        trainMat.setLabel(labels);
        Map<String, Object> params = new HashMap<>();
        params.put("objective", "reg:squarederror");
        params.put("max_depth", 3);
        params.put("eta", 0.1);
        params.put("verbosity", 0);
        params.put("tree_method", "auto");
        booster = XGBoost.train(trainMat, params, 50, new HashMap<>(), null, null);
    }

    public double predict(SensorData sensorData) throws Exception {
        int hourOfDay = sensorData.getTimestamp().getHour();
        int dayOfYear = sensorData.getTimestamp().getDayOfYear();
        float[] features = new float[]{
                hourOfDay,
                dayOfYear
        };
        DMatrix dmat = new DMatrix(features, 1, 2);
        float[][] preds = booster.predict(dmat);
        return preds[0][0];
    }

    public List<SensorData> generateHourlyFeatures(LocalDateTime currentTime) {
        List<SensorData> hourlyFeatures = new ArrayList<>();
        LocalDateTime nextDayStart = currentTime.plusDays(1).toLocalDate().atStartOfDay();
        for (int hour = 0; hour < 24; hour++) {
            LocalDateTime hourlyTimestamp = nextDayStart.plusHours(hour);
            SensorData sensorData = new SensorData(hourlyTimestamp, null);
            hourlyFeatures.add(sensorData);
        }
        return hourlyFeatures;
    }

    public void saveModel(String filePath) throws Exception {
        booster.saveModel(filePath);
        // No meta file needed
    }

    public void loadModel(String filePath) throws Exception {
        booster = XGBoost.loadModel(filePath);
        // No meta file needed
    }
}
