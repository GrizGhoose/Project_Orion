# MAX30102 raw-reading test

For a saved, timed at-rest recording with only red/IR values, use the separate [60-second capture sketch and Mac recorder](capture_60s/README.md).

This standalone Arduino sketch checks that an ESP32 can initialise the MAX30102 sensor over I²C and receive raw red and infrared optical samples. Use it to check sensor operation before integrating heart-rate estimation, SpO₂ estimation, or Raspberry Pi communication.

The test prints raw optical counts. It does **not** calculate heart rate or SpO₂, validate measurement accuracy, or send data over Wi-Fi/MQTT.

## Hardware and wiring

Development setup: ESP32-WROOM-32E development board and the project's MAX30102 breakout board.

Disconnect USB power before changing wiring.

| ESP32 | Sensor breakout |
| --- | --- |
| 3V3 | VIN |
| GND | GND |
| GPIO21 | SDA |
| GPIO22 | SCL |

Leave INT, IRD, and RD disconnected. Power the ESP32 through USB. This records the project's initial 3.3 V breakout test configuration, not wiring for a bare MAX30102 chip. Other breakout boards may have different power and logic requirements.

## Software setup

1. Install **esp32 by Espressif Systems** in Arduino IDE's Boards Manager.
2. Install **SparkFun MAX3010x Pulse and Proximity Sensor Library** in Library Manager.
3. Open `MAX30102_raw_reading-test.ino` in this folder.
4. For the project's ESP32-WROOM board, select **ESP32 Dev Module** and its USB serial port.
5. Upload the sketch and open **Serial Monitor at 115200 baud**.

The library uses `MAX30105.h` and the `MAX30105` class for this sensor family, including the MAX30102. `Wire.h` is included with the ESP32 board package.

## What the code does

- Starts I²C on GPIO21/GPIO22 at the library's standard speed of 100 kHz.
- Initialises the sensor, stopping with an error message if detection fails.
- Enables red and infrared channels with `sensor.setup(0x1F, 4, 2, 100, 411, 4096)`.
- Configures LED drive code `0x1F`, four-sample averaging, red/IR mode, a 100 samples/second sensor rate, 411 µs pulse width, and a 4096 nA ADC range. Averaging reduces the FIFO output rate to approximately 25 sample pairs/second.
- Reads available samples from the sensor FIFO and prints paired `Red` and `IR` values.

## Run the test

1. Confirm Serial Monitor shows `Sensor ready. Place a finger over the window.` followed by readings.
2. Observe the readings with the optical window uncovered.
3. Gently cover the window with a fingertip and keep your hand still for about 10 seconds. Avoid pressing hard.
4. Remove your finger and compare the readings again.
5. Optionally open Arduino IDE's Serial Plotter at 115200 baud to inspect the two signals over time.

Each sample line has this format:

```text
Red:<raw count>    IR:<raw count>
```

The values should respond to finger placement. With stable contact, a small pulse-related variation may be visible on top of the larger baseline. Exact counts depend on contact, light, and the optical setup; there is no single required raw value.

A successful test establishes that the sensor produces responsive optical samples over I²C. It does not establish that a heart-rate or oxygen-saturation estimate is accurate. Test ear placement separately after the fingertip check.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `MAX30105.h: No such file or directory` | Install the SparkFun MAX3010x library listed above. |
| `Sensor not found. Check wiring.` | Power, common ground, SDA/SCL connections, and solder joints. Restart after correcting wiring. |
| No serial output | Correct USB port, 115200 baud, and Serial Monitor rather than the upload Output panel. Press RST/EN to see startup output. |
| Ready message but no sample lines | The sensor initialised but is not delivering samples; inspect power and connections and retry the I²C detection test. |
| Flat, zero, or clipped readings | Check optical contact and power; LED drive and ADC range may need tuning. |
| Large erratic changes | Keep the finger and board still, use gentle contact, and reduce changing ambient light. |

## Related documentation

- [ESP32 ↔ Raspberry Pi MQTT setup](../docs/ESP32_RASPBERRY_PI_MQTT.md)
- [Communication test sketch walkthrough](../docs/ESP32_RASPBERRY_PI_COMMUNICATION_SKETCH.md)
- [SparkFun MAX3010x library](https://github.com/sparkfun/SparkFun_MAX3010x_Sensor_Library)
