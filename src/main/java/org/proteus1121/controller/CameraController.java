package org.proteus1121.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.proteus1121.model.dto.camera.Camera;
import org.proteus1121.model.dto.camera.CameraVision;
import org.proteus1121.model.dto.controller.Controller;
import org.proteus1121.service.CameraService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

import static org.proteus1121.util.SessionUtils.getCurrentUser;

@RestController
@RequestMapping("/cameras")
@RequiredArgsConstructor
@Tag(name = "Cameras", description = "ESP32-CAM boards: live view and the flame detector's result")
public class CameraController {

    private final CameraService cameraService;

    @GetMapping
    @Operation(summary = "Get cameras of current user", description = "ESP32-CAM boards of the user and shared with them")
    public ResponseEntity<List<Camera>> getCameras() {
        return ResponseEntity.ok(cameraService.getCameras(getCurrentUser().getId()));
    }

    @GetMapping("/{id}/vision")
    @Operation(summary = "Get the detector's result", description = "What the flame detector saw in the latest frame; empty before the first frame")
    public ResponseEntity<CameraVision> getVision(@PathVariable Long id) {
        CameraVision vision = cameraService.vision(id, getCurrentUser().getId());
        return vision == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(vision);
    }

    @GetMapping(value = "/{id}/snapshot", produces = MediaType.IMAGE_JPEG_VALUE)
    @Operation(summary = "Get the latest frame", description = "JPEG; frames come only while somebody watches the stream")
    public ResponseEntity<byte[]> getSnapshot(@PathVariable Long id) {
        CameraService.Frame frame = cameraService.latestFrame(id, getCurrentUser().getId());
        if (frame == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_JPEG).body(frame.jpeg());
    }

    /**
     * MJPEG for an img element: the board is asked for frames while at least one stream is open.
     */
    @GetMapping("/{id}/stream")
    @Operation(summary = "Watch the camera", description = "multipart/x-mixed-replace MJPEG; ends after 30 s without frames, connect again")
    public void stream(@PathVariable Long id, HttpServletResponse response) throws IOException {
        Controller camera = cameraService.viewable(id, getCurrentUser().getId());
        response.setContentType("multipart/x-mixed-replace; boundary=frame");
        response.setHeader("Cache-Control", "no-store");
        // proxies must pass every part on at once
        response.setHeader("X-Accel-Buffering", "no");
        try {
            cameraService.stream(camera, response.getOutputStream());
        } catch (IOException e) {
            // the viewer closed the page
        }
    }
}
