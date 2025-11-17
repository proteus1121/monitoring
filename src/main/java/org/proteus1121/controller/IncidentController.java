package org.proteus1121.controller;

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

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/incidents")
@RequiredArgsConstructor
public class IncidentController {
    
    private final IncidentService incidentService;
    
    @GetMapping
    public List<Incident> getAllIncidents() {
        User principal = getCurrentUser();
        return incidentService.getAllIncidents(principal.getId());
    }
    
    @PostMapping("/{id}/resolve")
    public void resolveIncident(@PathVariable Long id) {
        User principal = getCurrentUser();
        incidentService.resolveIncident(id, principal.getId());
    }
}
