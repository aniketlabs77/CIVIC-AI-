package com.nagarseva.repository;

import com.nagarseva.entity.SlaConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SlaConfigRepository extends JpaRepository<SlaConfig, SlaConfig.SlaConfigId> {

    Optional<SlaConfig> findByIdCategoryAndIdDepartmentAndIsActiveTrue(String category, String department);

    @Query("SELECT s FROM SlaConfig s WHERE s.id.category = :category AND s.isActive = true")
    List<SlaConfig> findActiveByCategory(@Param("category") String category);

    @Query("SELECT s FROM SlaConfig s WHERE s.id.department = :department AND s.isActive = true")
    List<SlaConfig> findActiveByDepartment(@Param("department") String department);

    List<SlaConfig> findByIsActiveTrue();
}