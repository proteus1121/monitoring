package org.proteus1121.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.time.Duration;

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
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/recent")
    @Operation(summary = "Get recent incidents", description = "Newest incidents of the current user, optionally only unresolved ones")
    public List<Incident> getRecentIncidents(@RequestParam(value = "openOnly", defaultValue = "false") boolean openOnly,
                                             @RequestParam(value = "limit", defaultValue = "50") int limit) {
        return incidentService.getIncidents(getCurrentUser().getId(), openOnly, Math.min(Math.max(limit, 1), 500));
    }

    @GetMapping("/open-count")
    @Operation(summary = "Count unresolved incidents")
    public long getOpenIncidentCount() {
        return incidentService.countOpenIncidents(getCurrentUser().getId());
    }

    @PostMapping("/resolve-all")
    @Operation(summary = "Resolve all incidents", description = "Marks every unresolved incident of the current user as resolved")
    public int resolveAllIncidents() {
        return incidentService.resolveAllIncidents(getCurrentUser().getId());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get incident by ID", description = "Retrieve details of a specific incident by its ID")
    public Optional<Incident> getIncident(@PathVariable Long id) {
        User principal = getCurrentUser();
        return incidentService.getIncident(id, principal.getId());
    }
    
    @GetMapping(value = "/{id}/image", produces = MediaType.IMAGE_JPEG_VALUE)
    @Operation(summary = "Get the picture of an incident", description = "The frame a camera raised its flame alarm on, with the flame's box; 404 without one")
    public ResponseEntity<byte[]> getIncidentImage(@PathVariable Long id) {
        return incidentService.getImage(id, getCurrentUser().getId())
                .map(jpeg -> ResponseEntity.ok()
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePrivate())
                        .contentType(MediaType.IMAGE_JPEG)
                        .body(jpeg))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "Resolve an incident", description = "Marks an incident as resolved for the current user")
    public void resolveIncident(@PathVariable Long id) {
        User principal = getCurrentUser();
        incidentService.resolveIncident(id, principal.getId());
    }
}
