package org.proteus1121.service.network;

import org.deeplearning4j.nn.conf.NeuralNetConfiguration;
import org.deeplearning4j.nn.conf.layers.DenseLayer;
import org.deeplearning4j.nn.conf.layers.OutputLayer;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.optimize.listeners.ScoreIterationListener;
import org.deeplearning4j.util.ModelSerializer;
import org.nd4j.linalg.activations.Activation;
import org.nd4j.linalg.api.ndarray.INDArray;
import org.nd4j.linalg.dataset.DataSet;
import org.nd4j.linalg.dataset.api.preprocessor.NormalizerStandardize;
import org.nd4j.linalg.factory.Nd4j;
import org.nd4j.linalg.learning.config.Nadam;
import org.nd4j.linalg.lossfunctions.LossFunctions;
import org.proteus1121.model.response.metric.SensorData;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Component
public class NeuralNetwork {
    private MultiLayerNetwork model;
    
    public NeuralNetwork() {
        int numInputs = 2; // For timestamp and hour features
        int numOutputs = 1; // For the value field
        int numHiddenNodes = 20;

        var config = new NeuralNetConfiguration.Builder()
                .updater(new Nadam())
                .list()
                .layer(new DenseLayer.Builder().nIn(numInputs).nOut(numHiddenNodes) // More nodes
                        .activation(Activation.RELU).build())
                .layer(new DenseLayer.Builder().nIn(numHiddenNodes).nOut(10) // Additional hidden layer
                        .activation(Activation.RELU).build())
                .layer(new OutputLayer.Builder(LossFunctions.LossFunction.MSE)
                        .activation(Activation.IDENTITY)
                        .nIn(10).nOut(numOutputs).build())
                .build();

        this.model = new MultiLayerNetwork(config);
        this.model.init();
        this.model.setListeners(new ScoreIterationListener(10));
    }

    public NormalizerStandardize train(INDArray input, INDArray labels) {
        // Create the dataset
        DataSet dataSet = new DataSet(input, labels);

        // Create and apply the normalizer
        NormalizerStandardize normalizer = new NormalizerStandardize();
        normalizer.fit(dataSet);      // Fit normalizer to data
        normalizer.transform(dataSet); // Apply normalization to the dataset

        // Train the model
        int numEpochs = 1000;
        for (int i = 0; i < numEpochs; i++) {
            model.fit(dataSet);
        }
        return normalizer;
    }

    public double predict(SensorData sensorData, NormalizerStandardize normalizer) {
        // Prepare the input INDArray (single feature: timestamp)
        INDArray input = Nd4j.create(new double[]{
                sensorData.getTimestamp().toEpochSecond(java.time.ZoneOffset.UTC), // First feature: Timestamp
                sensorData.getTimestamp().getHour()                                // Second feature: Hour of the day
        }, new int[]{1, 2}); // Shape: (1, 2) - One sample, two features

        // Normalize the input
        normalizer.transform(input);

        // Perform prediction
        INDArray output = model.output(input);
        return output.getDouble(0); // Extract the predicted value
    }

    public List<SensorData> generateHourlyFeatures(LocalDateTime currentTime) {
        // Initialize a list to hold SensorData objects
        List<SensorData> hourlyFeatures = new ArrayList<>();

        // Calculate the start of the next day
        LocalDateTime nextDayStart = currentTime.plusDays(1).toLocalDate().atStartOfDay();

        // Generate a SensorData object for each hour of the next day
        for (int hour = 0; hour < 24; hour++) {
            LocalDateTime hourlyTimestamp = nextDayStart.plusHours(hour);

            // Create a SensorData object with only the timestamp
            SensorData sensorData = new SensorData(hourlyTimestamp, null); // Null value as it's not available for prediction
            hourlyFeatures.add(sensorData);
        }

        return hourlyFeatures;
    }

    public void saveModel(String filePath) throws Exception {
        ModelSerializer.writeModel(model, filePath, true);
    }

    public void loadModel(String filePath) throws Exception {
        this.model = ModelSerializer.restoreMultiLayerNetwork(filePath);
    }

    // Convert list of SensorData to input and label arrays
    public INDArray extractInputs(List<SensorData> data) {
        INDArray inputs = Nd4j.zeros(data.size(), 2); // One feature: timestamp in seconds
        for (int i = 0; i < data.size(); i++) {
            long timestamp = data.get(i).getTimestamp().toEpochSecond(ZoneOffset.UTC); // Convert timestamp to seconds
            inputs.putScalar(i, 0, timestamp);
            int hour = data.get(i).getTimestamp().getHour();
            inputs.putScalar(i, 1, hour);
        }
        return inputs;
    }

    public INDArray extractLabels(List<SensorData> data) {
        INDArray labels = Nd4j.zeros(data.size(), 1); // Single output: value
        for (int i = 0; i < data.size(); i++) {
            labels.putScalar(i, 0, data.get(i).getValue());
        }
        return labels;
    }
}
