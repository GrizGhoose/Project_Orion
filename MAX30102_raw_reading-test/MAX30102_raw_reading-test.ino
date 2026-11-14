#include <Wire.h>
#include "MAX30105.h"

MAX30105 sensor;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(21, 22);

  if (!sensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("Sensor not found. Check wiring.");
    while (true) {
      delay(1000);
    }
  }

  // LED brightness, averaging, LED mode,
  // sample rate, pulse width, ADC range.
  // Mode 2 enables red + infrared.
  sensor.setup(0x1F, 4, 2, 100, 411, 4096);

  Serial.println("Sensor ready. Place a finger over the window.");
}

void loop() {
  sensor.check();

  while (sensor.available()) {
    uint32_t red = sensor.getFIFORed();
    uint32_t infrared = sensor.getFIFOIR();
    sensor.nextSample();

    Serial.print("Red:");
    Serial.print(red);
    Serial.print("\tIR:");
    Serial.println(infrared);
  }
}