package com.nagarseva.repository;

import com.nagarseva.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Long entityId, Pageable pageable);

    Page<AuditLog> findByActorEmailOrderByTimestampDesc(String actorEmail, Pageable pageable);

    Page<AuditLog> findByActionOrderByTimestampDesc(String action, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :start AND :end ORDER BY a.timestamp DESC")
    Page<AuditLog> findByTimestampBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType AND a.action IN :actions ORDER BY a.timestamp DESC")
    List<AuditLog> findByEntityTypeAndActionIn(@Param("entityType") String entityType, @Param("actions") List<String> actions);

    long countByActorEmailAndSuccessFalse(String actorEmail);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.timestamp > :since")
    long countSince(@Param("since") LocalDateTime since);
}