// Crew Health sensor node: ESP32 + MAX30102 pulse oximeter.
//
// Reads red/IR light from the MAX30102, works out SpO2 and heart rate once a second, and
// broadcasts one JSON reading per second over WebSocket to every connected display:
//   {"crew":"EV1","seq":812,"t_ms":812345,"spo2":97,"hr":78,"signal":true}
// The helmet HUD and the tablet backend both connect to ws://<HOSTNAME>.local:81/.
//
// Libraries (Arduino Library Manager):
//   - "SparkFun MAX3010x Pulse and Proximity Sensor Library" (MAX30105.h, spo2_algorithm.h)
//   - "WebSockets" by Markus Sattler (WebSocketsServer.h)
// Board: "ESP32 Dev Module" (esp32 board package by Espressif).

#include <Wire.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebSocketsServer.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"

// ---------- settings: edit these ----------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* CREW_ID = "EV1";              // "EV2" for a second board
const char* HOSTNAME = "crewhealth-ev1";  // board is reachable as crewhealth-ev1.local
const uint16_t WS_PORT = 81;
const int SDA_PIN = 21;
const int SCL_PIN = 22;
const uint32_t FINGER_IR_MIN = 50000;     // IR level below this means no finger on the sensor

// ---------- sensor buffers ----------
// 100 samples/s averaged 4x -> 25 samples/s. The algorithm looks at the last 4 s (100 samples)
// and is re-run every 25 new samples, so a new reading comes out about once a second.
const int BUF_LEN = 100;
const int STEP = 25;
uint32_t irBuf[BUF_LEN];
uint32_t redBuf[BUF_LEN];

MAX30105 sensor;
WebSocketsServer ws(WS_PORT);
uint32_t seq = 0;

void readSample(int i) {
  while (!sensor.available()) {
    sensor.check();
    ws.loop();  // keep WebSocket clients serviced while waiting for the sensor
  }
  redBuf[i] = sensor.getRed();
  irBuf[i] = sensor.getIR();
  sensor.nextSample();
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.printf("\nConnected, IP %s\n", WiFi.localIP().toString().c_str());
  if (MDNS.begin(HOSTNAME)) Serial.printf("mDNS: ws://%s.local:%u/\n", HOSTNAME, WS_PORT);
}

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found: check wiring (3.3V, GND, SDA, SCL)");
    while (true) delay(1000);
  }
  // brightness 60 (~12 mA), average 4, red+IR mode, 100 samples/s, 411 us pulse, 4096 nA range
  sensor.setup(60, 4, 2, 100, 411, 4096);

  connectWifi();
  ws.begin();

  for (int i = 0; i < BUF_LEN; i++) readSample(i);  // fill the first 4 s
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  // Drop the oldest second, read one new second.
  memmove(irBuf, irBuf + STEP, (BUF_LEN - STEP) * sizeof(uint32_t));
  memmove(redBuf, redBuf + STEP, (BUF_LEN - STEP) * sizeof(uint32_t));
  for (int i = BUF_LEN - STEP; i < BUF_LEN; i++) readSample(i);

  int32_t spo2, hr;
  int8_t spo2Valid, hrValid;
  maxim_heart_rate_and_oxygen_saturation(irBuf, BUF_LEN, redBuf, &spo2, &spo2Valid, &hr, &hrValid);

  bool finger = irBuf[BUF_LEN - 1] > FINGER_IR_MIN;
  bool spo2Ok = finger && spo2Valid && spo2 >= 70 && spo2 <= 100;
  bool hrOk = finger && hrValid && hr >= 30 && hr <= 220;

  char json[160];
  char spo2Txt[8], hrTxt[8];
  if (spo2Ok) snprintf(spo2Txt, sizeof spo2Txt, "%ld", (long)spo2); else strcpy(spo2Txt, "null");
  if (hrOk) snprintf(hrTxt, sizeof hrTxt, "%ld", (long)hr); else strcpy(hrTxt, "null");
  snprintf(json, sizeof json, "{\"crew\":\"%s\",\"seq\":%lu,\"t_ms\":%lu,\"spo2\":%s,\"hr\":%s,\"signal\":%s}",
           CREW_ID, (unsigned long)seq++, (unsigned long)millis(), spo2Txt, hrTxt,
           (spo2Ok && hrOk) ? "true" : "false");

  ws.broadcastTXT(json);
  Serial.println(json);
}
