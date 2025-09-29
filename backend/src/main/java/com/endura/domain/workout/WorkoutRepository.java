package com.endura.domain.workout;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkoutRepository extends JpaRepository<Workout, Long> {
    
    List<Workout> findByUserIdOrderByStartDateDesc(Long userId);
    
    Optional<Workout> findByStravaActivityId(Long stravaActivityId);
    
    boolean existsByStravaActivityId(Long stravaActivityId);
    
    @Query("SELECT w FROM Workout w WHERE w.user.id = :userId AND w.startDate >= :fromDate ORDER BY w.startDate DESC")
    List<Workout> findByUserIdAndStartDateAfter(@Param("userId") Long userId, @Param("fromDate") LocalDateTime fromDate);
    
    @Query("SELECT COUNT(w) FROM Workout w WHERE w.user.id = :userId AND w.syncSource = 'STRAVA'")
    Long countStravaWorkoutsByUserId(@Param("userId") Long userId);
}