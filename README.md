# Project_Orion
NASA Space Apps 2026 Health Monitor Device

## Hardware connection guide

See [ESP32 ↔ Raspberry Pi over Wi-Fi and MQTT](docs/ESP32_RASPBERRY_PI_MQTT.md) for setup, firmware, and two-way connection tests.

## Live sensor measurements and astronaut HUD

- [ESP32 firmware and startup baseline](esp32-vitals/README.md): computes heart rate, SpO₂, signal validity and prototype alert state; publishes the latest 15 reports every six seconds.
- [Raspberry Pi gateway setup](raspberry-pi-gateway/README.md): persists readings and calibration sessions in SQLite, serves the HUD and exposes the shared tablet API.
- [Astronaut HUD](astronaut-eva-hud-hardware/README.md): live Pi data by default; `?demo=1` selects the original simulator.
