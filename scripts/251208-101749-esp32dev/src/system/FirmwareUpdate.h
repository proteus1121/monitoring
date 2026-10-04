#ifndef FIRMWARE_UPDATE_H
#define FIRMWARE_UPDATE_H

#include <Arduino.h>

/**
 * Firmware update ordered from the site.
 *
 * Request:  users/<userId>/controllers/<hardwareId>/update         {"url":"https://...bin","md5":"...","version":"2.4.0"}
 * Status:   users/<userId>/controllers/<hardwareId>/update-status  {"state":"downloading","progress":40,"version":"2.4.0"}
 *           state: downloading | done | failed (with "error")
 *
 * The file is downloaded over HTTPS only and the server certificate has to chain to a Let's Encrypt root
 * (TrustedRoots.h), so nobody on the network can hand the board another file; the MD5 from the request is
 * checked before the image is accepted. On success the board restarts into the new firmware.
 */
namespace FirmwareUpdate {

// remembered and run from loop(), the download blocks for a while
void request(const String &url, const String &md5, const String &version);

void loop();

// an update is being downloaded or written
bool inProgress();

} // namespace FirmwareUpdate

#endif
