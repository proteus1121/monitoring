package org.proteus1121.controller;

import org.proteus1121.service.UserService;
import org.proteus1121.service.PairingService;
import org.proteus1121.model.request.ShareControllerRequest;
import org.proteus1121.model.request.PairControllerRequest;
import org.proteus1121.model.dto.controller.ControllerShare;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.model.dto.controller.SensorModelInfo;
import org.proteus1121.model.enums.SensorModel;
import org.proteus1121.model.request.ControllerRequest;
import org.proteus1121.service.ControllerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/controllers")
@RequiredArgsConstructor
@Tag(name = "Controller Management", description = "Boards (ESP32 / ESP8266) that register over MQTT and run the configured devices")
public class ControllersController {

    private final ControllerService controllerService;
    private final PairingService pairingService;
    private final UserService userService;

    @GetMapping
    @Operation(summary = "Get controllers of current user", description = "Boards appear here after they connect to MQTT with the user id")
    public ResponseEntity<List<Controller>> getControllers() {
        return ResponseEntity.ok(controllerService.getControllers(getCurrentUser().getId()));
    }

    @GetMapping("/sensor-models")
    @Operation(summary = "Get supported sensor models", description = "Hardware modules the firmware can drive and measurements they provide")
    public ResponseEntity<List<SensorModelInfo>> getSensorModels() {
        return ResponseEntity.ok(Arrays.stream(SensorModel.values()).map(SensorModelInfo::of).toList());
    }

    @PostMapping("/pair")
    @Operation(summary = "Pair a board", description = "Binds the board that shows this code on its display to the current user")
    public ResponseEntity<Controller> pair(@Valid @RequestBody PairControllerRequest request) {
        return ResponseEntity.ok(pairingService.claim(getCurrentUser().getId(), request.getCode()));
    }

    @GetMapping("/shares")
    @Operation(summary = "Shares of own boards", description = "Users each board of the current user is shared with")
    public ResponseEntity<List<ControllerShare>> getShares() {
        return ResponseEntity.ok(controllerService.getShares(getCurrentUser().getId()));
    }

    @PutMapping("/{id}/share")
    @Operation(summary = "Share a whole board", description = "Shares every device of the board, including ones added later")
    public ResponseEntity<Void> share(@PathVariable Long id, @Valid @RequestBody ShareControllerRequest request) {
        Long userId = userService.loadUserByUsername(request.getUsername()).getId();
        controllerService.share(id, getCurrentUser().getId(), userId, request.getRole());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/share/{userId}")
    @Operation(summary = "Stop sharing a board")
    public ResponseEntity<Void> unshare(@PathVariable Long id, @PathVariable Long userId) {
        controllerService.unshare(id, getCurrentUser().getId(), userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "Rename controller")
    public ResponseEntity<Controller> updateController(@PathVariable Long id, @Valid @RequestBody ControllerRequest request) {
        return ResponseEntity.ok(controllerService.rename(id, getCurrentUser().getId(), request.getName()));
    }

    @PostMapping("/{id}/sync")
    @Operation(summary = "Resend configuration", description = "Publishes the configuration to the board again")
    public ResponseEntity<Void> syncController(@PathVariable Long id) {
        controllerService.checkController(id, getCurrentUser().getId());
        controllerService.publishConfiguration(id);
        return ResponseEntity.accepted().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete controller", description = "Devices bound to the controller are detached, not deleted")
    public ResponseEntity<Void> deleteController(@PathVariable Long id) {
        controllerService.delete(id, getCurrentUser().getId());
        return ResponseEntity.noContent().build();
    }
}
