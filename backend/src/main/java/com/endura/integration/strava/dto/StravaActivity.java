package com.endura.integration.strava.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public class StravaActivity {

    private long id;
    private String name;
    private double distance;

    @JsonProperty("moving_time")
    private int movingTime;

    @JsonProperty("elapsed_time")
    private int elapsedTime;

    @JsonProperty("total_elevation_gain")
    private double totalElevationGain;

    private String type;

    @JsonProperty("sport_type")
    private String sportType;

    @JsonProperty("start_date")
    private Instant startDate;

    @JsonProperty("start_date_local")
    private Instant startDateLocal;

    @JsonProperty("average_speed")
    private double averageSpeed;

    @JsonProperty("max_speed")
    private double maxSpeed;

    @JsonProperty("average_heartrate")
    private Double averageHeartrate;

    @JsonProperty("max_heartrate")
    private Double maxHeartrate;

    @JsonProperty("calories")
    private Double calories;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getDistance() {
        return distance;
    }

    public void setDistance(double distance) {
        this.distance = distance;
    }

    public int getMovingTime() {
        return movingTime;
    }

    public void setMovingTime(int movingTime) {
        this.movingTime = movingTime;
    }

    public int getElapsedTime() {
        return elapsedTime;
    }

    public void setElapsedTime(int elapsedTime) {
        this.elapsedTime = elapsedTime;
    }

    public double getTotalElevationGain() {
        return totalElevationGain;
    }

    public void setTotalElevationGain(double totalElevationGain) {
        this.totalElevationGain = totalElevationGain;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSportType() {
        return sportType;
    }

    public void setSportType(String sportType) {
        this.sportType = sportType;
    }

    public Instant getStartDate() {
        return startDate;
    }

    public void setStartDate(Instant startDate) {
        this.startDate = startDate;
    }

    public Instant getStartDateLocal() {
        return startDateLocal;
    }

    public void setStartDateLocal(Instant startDateLocal) {
        this.startDateLocal = startDateLocal;
    }

    public double getAverageSpeed() {
        return averageSpeed;
    }

    public void setAverageSpeed(double averageSpeed) {
        this.averageSpeed = averageSpeed;
    }

    public double getMaxSpeed() {
        return maxSpeed;
    }

    public void setMaxSpeed(double maxSpeed) {
        this.maxSpeed = maxSpeed;
    }

    public Double getAverageHeartrate() {
        return averageHeartrate;
    }

    public void setAverageHeartrate(Double averageHeartrate) {
        this.averageHeartrate = averageHeartrate;
    }

    public Double getMaxHeartrate() {
        return maxHeartrate;
    }

    public void setMaxHeartrate(Double maxHeartrate) {
        this.maxHeartrate = maxHeartrate;
    }

    public Double getCalories() {
        return calories;
    }

    public void setCalories(Double calories) {
        this.calories = calories;
    }
}
