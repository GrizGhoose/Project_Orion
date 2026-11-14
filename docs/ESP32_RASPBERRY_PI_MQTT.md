# ESP32 ↔ Raspberry Pi over Wi-Fi and MQTT

This guide connects the astronaut ESP32 devices to the Raspberry Pi using Wi-Fi and MQTT. The Pi runs Mosquitto, an MQTT broker that routes messages between devices. Start with one ESP32, then repeat for the buddy's device.

The user confirmed that communication works. The Pi address reported for this setup is **192.168.10.110**. Addresses can change when reconnecting or changing networks; check before uploading firmware.

```text
ESP32 astro01 ── Wi-Fi ──┐
                        ├── Router / hotspot ── Raspberry Pi
ESP32 astro02 ── Wi-Fi ──┘                       Mosquitto :1883
```

The Pi may connect to the router through Wi-Fi or Ethernet. Both ESP32s must be able to reach it on the local network. Internet is only needed to download the required software.

## 1. Prepare the network

- Enable a 2.4 GHz Wi-Fi network for the ESP32 boards used in this project.
- Connect the Pi and ESP32s to the same local network.
- Avoid guest networks or hotspots with client isolation, which can block communication between devices.
- On the **Pi**, run:

```bash
hostname -I
```

Use the Pi's address on the network shared with the ESP32s. This guide uses `192.168.10.110`. A DHCP reservation in the router can keep that address stable.

## 2. Install the broker on the Raspberry Pi

Run these commands in a **Pi terminal**:

```bash
sudo apt update
sudo apt install -y mosquitto mosquitto-clients
```

For a first installation, create the MQTT user `eva`:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd eva
sudo chown root:mosquitto /etc/mosquitto/passwd
sudo chmod 640 /etc/mosquitto/passwd
```

Enter your chosen MQTT password twice when prompted. Password entry may show no characters; this is normal. The MQTT password is separate from the Wi-Fi password.

**Use `-c` only to create a new password file:** it overwrites an existing file. To change the password later, omit `-c`:

```bash
sudo mosquitto_passwd /etc/mosquitto/passwd eva
sudo systemctl restart mosquitto
```

## 3. Configure Mosquitto

On the **Pi**, open:

```bash
sudo nano /etc/mosquitto/conf.d/eva.conf
```

Add:

```conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
```

Save with **Ctrl+O**, then **Enter** to confirm the filename. After saving, press **Ctrl+X** to exit. If Nano still shows `Write to File`, press Enter before trying to exit.

Start the broker:

```bash
sudo systemctl enable mosquitto
sudo systemctl restart mosquitto
sudo systemctl status mosquitto --no-pager
```

Expected status: **active (running)**. This prototype uses password-authenticated, unencrypted MQTT on a trusted local network. Do not forward port 1883 to the internet.

## 4. Test the broker locally on the Pi

In one **Pi terminal**, subscribe:

```bash
mosquitto_sub -h localhost -u eva -P 'YOUR_MQTT_PASSWORD' -t 'eva/#' -v
```

Replace `YOUR_MQTT_PASSWORD` with the password you actually created. Keep the single quotation marks; they are shell syntax, not part of the password. These examples assume the password does not itself contain a single quote. Do not commit real passwords to this repository. The `-P` argument can appear in shell history and local process listings.

A blank terminal with no error means the subscriber is waiting. Leave it running. Stop it with **Ctrl+C** when finished.

In a **second Pi terminal**, publish:

```bash
mosquitto_pub -h localhost -u eva -P 'YOUR_MQTT_PASSWORD' -t 'eva/test' -m 'Pi broker works'
```

The subscriber should display:

```text
eva/test Pi broker works
```

This checks the broker and credentials without needing an ESP32.

## 5. Prepare and test the ESP32 on the laptop

1. Connect the ESP32 to the laptop using a USB **data cable**. Leave the sensor and display disconnected for this initial test.
2. Install/open Arduino IDE.
3. In Boards Manager, install **esp32 by Espressif Systems**.
4. Select the exact development board under **Tools → Board** and its USB port under **Tools → Port**.
5. Upload this basic program:

```cpp
void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.println("ESP32 is working");
  delay(1000);
}
```

Open Serial Monitor at **115200 baud**. Repeated `ESP32 is working` messages confirm that uploads and serial output work.

## 6. Upload the Wi-Fi/MQTT program

In Arduino IDE's Library Manager, install **PubSubClient by Nick O'Leary**. `WiFi.h` comes with the ESP32 board package.

Create a new sketch and paste the following. Replace the Wi-Fi credentials and MQTT password. Keep real credentials in a local sketch outside version control. Change `PI_IP` if the Pi's address changes.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* PI_IP = "192.168.10.110";

const char* MQTT_USER = "eva";
const char* MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";
const char* DEVICE_ID = "astro01";  // Use astro02 for the second ESP32.

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
    snprintf(message, sizeof(message),
             "{\"device\":\"%s\",\"sequence\":%lu,\"message\":\"hello\"}",
             DEVICE_ID, sequence++);
    if (!mqtt.publish(statusTopic.c_str(), message)) {
      Serial.println("Publish failed");
    }
  }
}
```

Upload and open Serial Monitor at **115200 baud**. Expected output includes an ESP32 IP address and `MQTT connected`.

## 7. Verify both directions

With the Pi subscriber from step 4 running, expect one message per second:

```text
eva/astro01/status {"device":"astro01","sequence":0,"message":"hello"}
eva/astro01/status {"device":"astro01","sequence":1,"message":"hello"}
```

In another **Pi terminal**, send a message back:

```bash
mosquitto_pub -h localhost -u eva -P 'YOUR_MQTT_PASSWORD' -t 'eva/astro01/command' -m 'hello from raspberry pi'
```

Expected in the **ESP32 Serial Monitor**:

```text
Received on eva/astro01/command: hello from raspberry pi
```

Seeing both outputs confirms two-way ESP32/Pi communication. The test firmware only prints received commands; it does not actuate hardware.

## 8. Add the buddy's ESP32

Upload the same sketch with `DEVICE_ID = "astro02"`. Each ESP32 must have a unique ID: MQTT clients sharing one ID disconnect each other.

| Device | Publishes to | Subscribes to |
| --- | --- | --- |
| Astronaut A (`astro01`) | `eva/astro01/status` | `eva/astro01/command` |
| Astronaut B (`astro02`) | `eva/astro02/status` | `eva/astro02/command` |

The Pi subscriber's `eva/#` filter receives both devices' messages. To send to the buddy, change the command topic to `eva/astro02/command`.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Connection Refused: not authorised` | Replace the password placeholder; verify username `eva`. Reset its password using step 2 if needed and restart Mosquitto. No ESP32 is needed to fix this. |
| Subscriber is blank without errors | It is waiting for messages. Run the local publish test or start the ESP32. |
| ESP32 never prints an IP address | Wi-Fi credentials, 2.4 GHz support, signal, and network availability. |
| ESP32 cannot reach MQTT | Current Pi IP, active broker, TCP port 1883, firewall, and router/client isolation. |
| MQTT state `4` or `5` | Credentials or broker authorization. |
| Devices repeatedly disconnect | Give each ESP32 a different `DEVICE_ID`. |
| No USB port or upload fails | USB data cable, correct board/port, and whether another serial monitor holds the port. |
| Nano will not exit after Ctrl+O | Press Enter to confirm the filename, then Ctrl+X. |

If the broker fails to start, inspect its logs on the Pi:

```bash
sudo journalctl -u mosquitto -n 50 --no-pager
```

## Dashboard integration is a separate step

This establishes message transport. The existing `tablet/` backend currently generates simulated telemetry; it does not subscribe to these MQTT topics. Running Mosquitto does not automatically put ESP32 data into the dashboard.

Future integration needs to process MAX30102 samples into validated readings, subscribe in the Pi backend, identify each astronaut, detect stale data/disconnections, and deliver buddy alerts. The hello messages here are connection tests, not physiological measurements.

## References

- [Mosquitto authentication and password files](https://mosquitto.org/documentation/authentication-methods/)
- [Espressif Arduino ESP32 Wi-Fi API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html)
- [PubSubClient API](https://pubsubclient.knolleary.net/api)
