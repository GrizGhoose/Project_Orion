# ESP32 ↔ Raspberry Pi communication test sketch

This document describes the local Arduino folder `sketch_nov14a_copy_20261114174051/`. It establishes two-way Wi-Fi/MQTT communication between an ESP32 and a Raspberry Pi before adding sensors or displays.

The local folder contains one Arduino sketch with network-specific configuration and is excluded from Git. The reusable copy below replaces the Wi-Fi name, passwords, MQTT username, and Raspberry Pi address with placeholders.

For Raspberry Pi broker installation, Arduino dependencies, and terminal commands, follow the adjacent [ESP32 ↔ Raspberry Pi MQTT setup guide](ESP32_RASPBERRY_PI_MQTT.md).

## What the sketch does

1. Starts USB serial output at 115200 baud.
2. Connects the ESP32 to a 2.4 GHz Wi-Fi network.
3. Connects to the Raspberry Pi's MQTT broker on TCP port 1883, retrying failed connections about every three seconds (connection attempts can themselves block).
4. Subscribes to `eva/astro01/command` and prints incoming messages to Serial Monitor.
5. Publishes a JSON hello message to `eva/astro01/status` about once per second while connected.

Change `DEVICE_ID` to `astro02` for the buddy's ESP32. This changes both topics and gives the second MQTT client a unique identity.

## Dependencies and configuration

- Arduino IDE with **esp32 by Espressif Systems** installed; `WiFi.h` comes with this package.
- **PubSubClient by Nick O'Leary**, installed through Library Manager.
- For the project's ESP32-WROOM-32E board, select **ESP32 Dev Module** and the USB serial port that appears when it is connected.
- A reachable Raspberry Pi running Mosquitto, with a network listener and an MQTT account.

| Placeholder | Set locally to |
| --- | --- |
| `YOUR_WIFI_NAME` | Exact Wi-Fi network name |
| `YOUR_WIFI_PASSWORD` | Wi-Fi password |
| `YOUR_RASPBERRY_PI_IP` | Pi address on the shared network, obtained with `hostname -I` on the Pi |
| `YOUR_MQTT_USERNAME` | Account created in Mosquitto; the setup guide uses the example username `eva` |
| `YOUR_MQTT_PASSWORD` | Password for that MQTT account |

Replace placeholders only in your ignored local sketch. Do not put actual configuration into this document. The ESP32's own IP printed in Serial Monitor is not the broker address.

## Generic sketch

Paste this into an Arduino sketch, configure it locally, and upload it. Arduino sketch folders and their main `.ino` files should have matching names. The ignored local folder already follows this convention.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* PI_IP = "YOUR_RASPBERRY_PI_IP";

const char* MQTT_USER = "YOUR_MQTT_USERNAME";
const char* MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";

// Change to "astro02" for the second ESP32.
const char* DEVICE_ID = "astro01";

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

String statusTopic;
String commandTopic;

unsigned long lastConnectAttempt = 0;
unsigned long lastPublish = 0;
unsigned long sequence = 0;

void onMessage(char* topic, byte* payload, unsigned int length) {
  Serial.print("Received on ");
  Serial.print(topic);
  Serial.print(": ");

  for (unsigned int i = 0; i < length; i++) {
    Serial.write(payload[i]);
  }
  Serial.println();
}

void setup() {
  Serial.begin(115200);

  statusTopic = String("eva/") + DEVICE_ID + "/status";
  commandTopic = String("eva/") + DEVICE_ID + "/command";

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  mqtt.setServer(PI_IP, 1883);
  mqtt.setCallback(onMessage);

  Serial.println("Connecting to Wi-Fi...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(10);
    return;
  }

  unsigned long now = millis();

  if (!mqtt.connected()) {
    if (now - lastConnectAttempt >= 3000) {
      lastConnectAttempt = now;

      Serial.print("Wi-Fi IP: ");
      Serial.println(WiFi.localIP());

      if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASSWORD)) {
        Serial.println("MQTT connected");

        if (!mqtt.subscribe(commandTopic.c_str())) {
          Serial.println("Subscription failed");
          mqtt.disconnect();
        }
      } else {
        Serial.print("MQTT connection failed, code: ");
        Serial.println(mqtt.state());
      }
    }
    return;
  }

  mqtt.loop();

  if (now - lastPublish >= 1000) {
    lastPublish = now;

    char message[128];
    snprintf(
      message, sizeof(message),
      "{\"device\":\"%s\",\"sequence\":%lu,\"message\":\"hello\"}",
      DEVICE_ID, sequence++
    );

    if (!mqtt.publish(statusTopic.c_str(), message)) {
      Serial.println("Publish failed");
    }
  }
}
```

## Verify communication

1. Open Serial Monitor at **115200 baud**, then press **RST/EN** to capture startup output.
2. `Connecting to Wi-Fi...` means the sketch has started. This version waits silently while Wi-Fi is unavailable.
3. `Wi-Fi IP: ...` means Wi-Fi is connected; the displayed address belongs to the ESP32.
4. `MQTT connected` confirms a broker connection. Successful outgoing hello messages are not printed by this sketch.
5. On the Pi, subscribe to `eva/#` using the commands in the setup guide. Confirm increasing sequence numbers in the status messages.
6. Publish a message from the Pi to `eva/astro01/command`. Confirm `Received on eva/astro01/command: ...` appears on the ESP32.

An upload ending with `Hash of data verified` and `Hard resetting via RTS pin...` confirms programming, not Wi-Fi or MQTT connectivity. Open Serial Monitor to observe the running program.

## Troubleshooting and limits

| Symptom | Meaning / next check |
| --- | --- |
| `PubSubClient.h: No such file or directory` | Install PubSubClient in Library Manager. |
| Only `Connecting to Wi-Fi...` | Check local SSID/password, 2.4 GHz availability, and network security settings. |
| MQTT error `-2` | TCP connection to the broker failed: check Pi address, Mosquitto listener, firewall, and client isolation. |
| MQTT error `4` or `5` | Check MQTT credentials and broker authorization. |
| Repeated disconnections with two boards | Use distinct device IDs. |

This is a transport smoke test. It sends no physiological readings, renders no UI, and only prints received commands. The sequence counter restarts on reboot. Messages are not retained, and this sketch does not implement application-level delivery acknowledgements, offline buffering, or stale-data alarms. MQTT uses an unencrypted connection here; use it on a trusted development network. Sensor processing and dashboard integration are separate steps.
