#pragma once
#include <stdint.h>

// Set false and upload again to restore MAX30102 acquisition.
constexpr bool SIMULATED_TELEMETRY = true;

namespace orion {
struct SimulatedVitals { int hr; int spo2; const char* phase; };
// Deterministic 4-minute loop. The first 100 seconds allow the existing
// 15 samples / 6 seconds baseline to finish before any deterioration.
inline SimulatedVitals simulatedVitals(uint64_t elapsedMs) {
  const uint64_t s=(elapsedMs/1000)%240;
  if(s<100) return {72+int((s/4)%3)-1,98,"normal"};
  if(s<130) return {72,98-int((s-100)*4/30),"oxygen falling"};
  if(s<150) return {80,94,"low oxygen"};
  if(s<180) return {120,88,"low oxygen + elevated HR"};
  if(s<200) return {120-int((s-180)*48/20),88+int((s-180)*10/20),"recovery"};
  return {72,98,"recovered"};
}
}
