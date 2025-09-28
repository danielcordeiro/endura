package com.endura.integration.strava;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

public class StravaActivity {
    
    private Long id;
    private String name;
    private String type;
    private Double distance; // in meters
    private Integer movingTime; // in seconds
    private Integer elapsedTime; // in seconds
    private Double totalElevationGain; // in meters
    private LocalDateTime startDate;
    private Float averageSpeed; // in m/s
    private Float maxSpeed; // in m/s
    private Float averageHeartrate;
    private Float maxHeartrate;
    private Float averagePower;
    private Float maxPower;
    private Integer calories;
    
    @JsonProperty("start_date_local")
    private String startDateLocal;
    
    @JsonProperty("moving_time")
    private Integer stravaMovingTime;
    
    @JsonProperty("elapsed_time")
    private Integer stravaElapsedTime;
    
    @JsonProperty("total_elevation_gain")
    private Double stravaTotalElevationGain;
    
    @JsonProperty("average_speed")
    private Float stravaAverageSpeed;
    
    @JsonProperty("max_speed")
    private Float stravaMaxSpeed;
    
    @JsonProperty("average_heartrate")
    private Float stravaAverageHeartrate;
    
    @JsonProperty("max_heartrate")
    private Float stravaMaxHeartrate;
    
    @JsonProperty("average_watts")
    private Float stravaAveragePower;
    
    @JsonProperty("max_watts")
    private Float stravaMaxPower;
    
    // Constructors
    public StravaActivity() {}
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public Double getDistance() { return distance; }
    public void setDistance(Double distance) { this.distance = distance; }
    
    public Integer getMovingTime() { return movingTime != null ? movingTime : stravaMovingTime; }
    public void setMovingTime(Integer movingTime) { this.movingTime = movingTime; }
    
    public Integer getElapsedTime() { return elapsedTime != null ? elapsedTime : stravaElapsedTime; }
    public void setElapsedTime(Integer elapsedTime) { this.elapsedTime = elapsedTime; }
    
    public Double getTotalElevationGain() { return totalElevationGain != null ? totalElevationGain : stravaTotalElevationGain; }
    public void setTotalElevationGain(Double totalElevationGain) { this.totalElevationGain = totalElevationGain; }
    
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    
    public Float getAverageSpeed() { return averageSpeed != null ? averageSpeed : stravaAverageSpeed; }
    public void setAverageSpeed(Float averageSpeed) { this.averageSpeed = averageSpeed; }
    
    public Float getMaxSpeed() { return maxSpeed != null ? maxSpeed : stravaMaxSpeed; }
    public void setMaxSpeed(Float maxSpeed) { this.maxSpeed = maxSpeed; }
    
    public Float getAverageHeartrate() { return averageHeartrate != null ? averageHeartrate : stravaAverageHeartrate; }
    public void setAverageHeartrate(Float averageHeartrate) { this.averageHeartrate = averageHeartrate; }
    
    public Float getMaxHeartrate() { return maxHeartrate != null ? maxHeartrate : stravaMaxHeartrate; }
    public void setMaxHeartrate(Float maxHeartrate) { this.maxHeartrate = maxHeartrate; }
    
    public Float getAveragePower() { return averagePower != null ? averagePower : stravaAveragePower; }
    public void setAveragePower(Float averagePower) { this.averagePower = averagePower; }
    
    public Float getMaxPower() { return maxPower != null ? maxPower : stravaMaxPower; }
    public void setMaxPower(Float maxPower) { this.maxPower = maxPower; }
    
    public Integer getCalories() { return calories; }
    public void setCalories(Integer calories) { this.calories = calories; }
    
    public String getStartDateLocal() { return startDateLocal; }
    public void setStartDateLocal(String startDateLocal) { this.startDateLocal = startDateLocal; }
}