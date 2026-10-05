package org.proteus1121.service;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;
import org.proteus1121.model.dto.camera.CameraVision;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * The frame of a camera alarm with the box of the flame-coloured pixels drawn on it, for the notifications.
 * Only shapes, no text: the server image may have no fonts.
 */
@Slf4j
@UtilityClass
public class FlameImage {

    private static final Color FLAME = new Color(0xEF, 0x44, 0x44);

    /**
     * @return the annotated JPEG, or the frame as it is when the detector gave no box or it cannot be decoded
     */
    public static byte[] annotate(byte[] jpeg, CameraVision vision) {
        List<Integer> box = vision == null ? null : vision.box();
        if (box == null || box.size() != 4 || vision.width() <= 0 || vision.height() <= 0) {
            return jpeg;
        }
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(jpeg));
            if (source == null) {
                return jpeg;
            }
            BufferedImage image = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.drawImage(source, 0, 0, null);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // the box is in the analysed frame's pixels; the JPEG may be another size
            double kx = (double) image.getWidth() / vision.width();
            double ky = (double) image.getHeight() / vision.height();
            int pad = 2;
            int x = (int) Math.round(box.get(0) * kx) - pad;
            int y = (int) Math.round(box.get(1) * ky) - pad;
            int w = (int) Math.round((box.get(2) - box.get(0) + 1) * kx) + 2 * pad;
            int h = (int) Math.round((box.get(3) - box.get(1) + 1) * ky) + 2 * pad;
            float thickness = Math.max(2f, image.getWidth() / 160f);

            // a dark outline keeps the red box visible on the bright flame
            g.setStroke(new BasicStroke(thickness + 2));
            g.setColor(new Color(0, 0, 0, 160));
            g.drawRect(x, y, w, h);
            g.setStroke(new BasicStroke(thickness));
            g.setColor(FLAME);
            g.drawRect(x, y, w, h);
            g.dispose();
            return encode(image);
        } catch (IOException | RuntimeException e) {
            log.warn("Cannot draw the flame box: {}", e.getMessage());
            return jpeg;
        }
    }

    private static byte[] encode(BufferedImage image) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream stream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(stream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(0.9f);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
