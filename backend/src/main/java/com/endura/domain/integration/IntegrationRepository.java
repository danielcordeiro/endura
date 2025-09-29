package com.endura.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IntegrationRepository extends JpaRepository<Integration, Long> {
    
    List<Integration> findByUserIdAndIsActive(Long userId, Boolean isActive);
    
    Optional<Integration> findByUserIdAndPlatformAndIsActive(Long userId, Integration.Platform platform, Boolean isActive);
    
    @Query("SELECT i FROM Integration i WHERE i.user.id = ?1 AND i.platform = ?2 AND i.isActive = true")
    Optional<Integration> findActiveByUserAndPlatform(Long userId, Integration.Platform platform);
    
    List<Integration> findByPlatformAndIsActive(Integration.Platform platform, Boolean isActive);
    
    @Query("SELECT i FROM Integration i WHERE i.expiresAt < CURRENT_TIMESTAMP AND i.isActive = true")
    List<Integration> findExpiredTokens();
    
    Optional<Integration> findByUserIdAndPlatform(Long userId, Integration.Platform platform);
    
    // Método adicional para compatibilidade com String
    @Query("SELECT i FROM Integration i WHERE i.platform = :platform AND i.isActive = :isActive")
    List<Integration> findByPlatformStringAndIsActive(String platform, Boolean isActive);
}