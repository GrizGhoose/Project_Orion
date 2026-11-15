# HERBv1 PCB

This folder preserves the team's KiCad project without changing the design:

- [Project](Astronaut%20Health%20Device.kicad_pro)
- [Schematic](Astronaut%20Health%20Device.kicad_sch)
- [Board](Astronaut%20Health%20Device.kicad_pcb)

Keep these three files together and retain their shared filename. The board references KiCad 10 standard 3D model libraries through `KICAD10_3DMODEL_DIR`; matching libraries are needed for the 3D view.

The schematic includes an ESP32-C3 and MAX30102. The [live firmware](../../firmware/esp32-vitals/README.md) documents an ESP32-WROOM development setup, so board pinout, power, and target compatibility must be checked before use. Repository relocation does not establish electrical or manufacturing readiness.
