package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.incident.Incident;
import org.proteus1121.model.dto.user.User;
import org.proteus1121.service.IncidentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/incidents")
@RequiredArgsConstructor
@Tag(name = "Incident Management", description = "Endpoints for managing incidents")
public class IncidentController {
    
    private final IncidentService incidentService;
    
    @GetMapping
    @Operation(summary = "Get all incidents", description = "Retrieve all incidents for the current user")
    public List<Incident> getAllIncidents() {
        User principal = getCurrentUser();
        return incidentService.getAllIncidents(principal.getId());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get incident by ID", description = "Retrieve details of a specific incident by its ID")
    public Optional<Incident> getIncident(@PathVariable Long id) {
        User principal = getCurrentUser();
        return incidentService.getIncident(id, principal.getId());
    }
    
    @PostMapping("/{id}/resolve")
    @Operation(summary = "Resolve an incident", description = "Marks an incident as resolved for the current user")
    public void resolveIncident(@PathVariable Long id) {
        User principal = getCurrentUser();
        incidentService.resolveIncident(id, principal.getId());
    }
}
