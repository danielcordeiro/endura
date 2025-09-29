package com.endura.domain.workout;

import com.endura.domain.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "workouts")
public class Workout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(name = "strava_activity_id", unique = true)
    private Long stravaActivityId;

    @Column(name = "activity_type")
    private String activityType;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "distance_meters")
    private BigDecimal distanceMeters;

    @Column(name = "moving_time_seconds")
    private Integer movingTimeSeconds;

    @Column(name = "elapsed_time_seconds")
    private Integer elapsedTimeSeconds;

    @Column(name = "elevation_gain_meters")
    private BigDecimal elevationGainMeters;

    @Column(name = "average_speed")
    private BigDecimal averageSpeed;

    @Column(name = "max_speed")
    private BigDecimal maxSpeed;

    @Column(name = "average_heartrate")
    private Integer averageHeartrate;

    @Column(name = "max_heartrate")
    private Integer maxHeartrate;

    @Column(name = "calories")
    private Integer calories;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "sync_source")
    private String syncSource = "STRAVA";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Long getStravaActivityId() { return stravaActivityId; }
    public void setStravaActivityId(Long stravaActivityId) { this.stravaActivityId = stravaActivityId; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public BigDecimal getDistanceMeters() { return distanceMeters; }
    public void setDistanceMeters(BigDecimal distanceMeters) { this.distanceMeters = distanceMeters; }

    public Integer getMovingTimeSeconds() { return movingTimeSeconds; }
    public void setMovingTimeSeconds(Integer movingTimeSeconds) { this.movingTimeSeconds = movingTimeSeconds; }

    public Integer getElapsedTimeSeconds() { return elapsedTimeSeconds; }
    public void setElapsedTimeSeconds(Integer elapsedTimeSeconds) { this.elapsedTimeSeconds = elapsedTimeSeconds; }

    public BigDecimal getElevationGainMeters() { return elevationGainMeters; }
    public void setElevationGainMeters(BigDecimal elevationGainMeters) { this.elevationGainMeters = elevationGainMeters; }

    public BigDecimal getAverageSpeed() { return averageSpeed; }
    public void setAverageSpeed(BigDecimal averageSpeed) { this.averageSpeed = averageSpeed; }

    public BigDecimal getMaxSpeed() { return maxSpeed; }
    public void setMaxSpeed(BigDecimal maxSpeed) { this.maxSpeed = maxSpeed; }

    public Integer getAverageHeartrate() { return averageHeartrate; }
    public void setAverageHeartrate(Integer averageHeartrate) { this.averageHeartrate = averageHeartrate; }

    public Integer getMaxHeartrate() { return maxHeartrate; }
    public void setMaxHeartrate(Integer maxHeartrate) { this.maxHeartrate = maxHeartrate; }

    public Integer getCalories() { return calories; }
    public void setCalories(Integer calories) { this.calories = calories; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSyncSource() { return syncSource; }
    public void setSyncSource(String syncSource) { this.syncSource = syncSource; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}