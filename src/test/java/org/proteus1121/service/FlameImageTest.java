package org.proteus1121.service;

import org.junit.jupiter.api.Test;
import org.proteus1121.model.dto.camera.CameraVision;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FlameImageTest {

    @Test
    void boxIsDrawnScaledToTheJpeg() throws IOException {
        // a 640x480 frame, the detector's box in a 320x240 analysed frame
        byte[] jpeg = grey(640, 480);
        CameraVision vision = vision(List.of(100, 50, 199, 149));

        BufferedImage result = ImageIO.read(new ByteArrayInputStream(FlameImage.annotate(jpeg, vision)));

        assertEquals(640, result.getWidth());
        // the left edge of the box: x = 100 * 2 less the 2 px padding, half way down it
        assertTrue(isRed(result.getRGB(198, 200)), "box edge");
        // inside the box nothing is drawn
        assertTrue(!isRed(result.getRGB(300, 200)), "inside");
    }

    @Test
    void withoutABoxTheFrameIsSentAsItIs() throws IOException {
        byte[] jpeg = grey(320, 240);

        assertSame(jpeg, FlameImage.annotate(jpeg, vision(null)));
        assertSame(jpeg, FlameImage.annotate(jpeg, null));
    }

    private static boolean isRed(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 180 && c.getGreen() < 120 && c.getBlue() < 120;
    }

    private static CameraVision vision(List<Integer> box) {
        return new CameraVision(true, 0.02, 1e-5, 3, 3, box, 320, 240, 8.9, 20, List.of(120, 120, 120),
                LocalDateTime.now());
    }

    private static byte[] grey(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.GRAY);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }
}
