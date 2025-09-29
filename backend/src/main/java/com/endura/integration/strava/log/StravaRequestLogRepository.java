package com.endura.integration.strava.log;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StravaRequestLogRepository extends JpaRepository<StravaRequestLog, Long> {
}
