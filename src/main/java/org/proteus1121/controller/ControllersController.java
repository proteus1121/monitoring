package org.proteus1121.controller;

import org.proteus1121.service.FirmwareService;
import org.proteus1121.model.dto.controller.FirmwareUpdateStatus;
import org.proteus1121.service.BoardScanService;
import org.proteus1121.model.dto.controller.BoardScan;
import org.proteus1121.model.request.DisplayRequest;
import org.proteus1121.model.enums.DisplayModel;
import org.proteus1121.model.dto.controller.DisplayModelInfo;
import org.proteus1121.service.UserService;
import org.proteus1121.service.BoardConnectService;
import org.proteus1121.model.dto.controller.BoardConnection;
import org.proteus1121.model.request.ShareControllerRequest;
import org.proteus1121.model.request.ConnectControllerRequest;
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
    private final BoardConnectService boardConnectService;
    private final UserService userService;
    private final BoardScanService boardScanService;
    private final FirmwareService firmwareService;

    @GetMapping
    @Operation(summary = "Get controllers of current user", description = "Boards appear here after they connect to MQTT with the user id")
    public ResponseEntity<List<Controller>> getControllers() {
        return ResponseEntity.ok(firmwareService.decorate(controllerService.getControllers(getCurrentUser().getId())));
    }

    @GetMapping("/sensor-models")
    @Operation(summary = "Get supported sensor models", description = "Hardware modules the firmware can drive and measurements they provide")
    public ResponseEntity<List<SensorModelInfo>> getSensorModels() {
        return ResponseEntity.ok(Arrays.stream(SensorModel.values()).map(SensorModelInfo::of).toList());
    }

    @GetMapping("/display-models")
    @Operation(summary = "Get supported displays", description = "Display modules the firmware can drive and their pins")
    public ResponseEntity<List<DisplayModelInfo>> getDisplayModels() {
        return ResponseEntity.ok(Arrays.stream(DisplayModel.values()).map(DisplayModelInfo::of).toList());
    }

    @PutMapping("/{id}/display")
    @Operation(summary = "Configure the display", description = "Model, pins and rotation; the board restarts to apply it")
    public ResponseEntity<Controller> updateDisplay(@PathVariable Long id, @Valid @RequestBody DisplayRequest request) {
        return ResponseEntity.ok(controllerService.updateDisplay(id, getCurrentUser().getId(), request.getModel(),
                request.getPins(), request.isFlip()));
    }

    @PostMapping("/{id}/firmware-update")
    @Operation(summary = "Update the firmware", description = "The board downloads the latest published firmware for it and restarts; progress is in firmwareUpdate of GET /controllers")
    public ResponseEntity<FirmwareUpdateStatus> updateFirmware(@PathVariable Long id) {
        return ResponseEntity.accepted().body(firmwareService.requestUpdate(id, getCurrentUser().getId()));
    }

    @PostMapping("/{id}/scan")
    @Operation(summary = "Scan the board", description = "The board looks for modules on its free pins; poll GET for the result")
    public ResponseEntity<BoardScan> scan(@PathVariable Long id) {
        return ResponseEntity.accepted().body(boardScanService.request(id, getCurrentUser().getId()));
    }

    @GetMapping("/{id}/scan")
    @Operation(summary = "Last scan of the board", description = "204 when the board was not scanned yet")
    public ResponseEntity<BoardScan> getScan(@PathVariable Long id) {
        BoardScan scan = boardScanService.get(id, getCurrentUser().getId());
        return scan == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(scan);
    }

    @PostMapping("/connect")
    @Operation(summary = "Link a board", description = "From the Sign in link on the board's page: binds the board to the current user and gives it its own MQTT login, which the site passes back to the board")
    public ResponseEntity<BoardConnection> connect(@Valid @RequestBody ConnectControllerRequest request) {
        return ResponseEntity.ok(boardConnectService.connect(getCurrentUser().getId(), request));
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
