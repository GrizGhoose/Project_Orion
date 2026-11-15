#pragma once
#include <math.h>
#include <stdint.h>

namespace orion {
// All 1,499 pairs from the 60-second resting earlobe recording, including
// its contact/drift artifacts. These are optical means, NOT healthy ranges.
// No independently measured HR or SpO2 was available for this recording.
constexpr char RECORDED_REFERENCE_ID[]="20261115_175545_SGT_earlobe";
constexpr double RECORDED_RED_MEAN=86713.27551701134;
constexpr double RECORDED_IR_MEAN=80606.34022681788;
constexpr uint8_t RECORDED_LED_DRIVE=31;
// Other settings match this sketch: 4096 nA, 411 us, 100 Hz, averaging 4.
struct ReferenceComparison {
  bool comparable=false;
  const char* status="acquisition_unavailable";
  double redChangePct=0, irChangePct=0, dcRatioChangePct=0;
};

inline ReferenceComparison compareRecordedReference(double redDC,double irDC,
    uint8_t ledDrive,bool completeWindow) {
  ReferenceComparison r;
  if(!completeWindow) return r;
  if(ledDrive!=RECORDED_LED_DRIVE) { r.status="settings_mismatch"; return r; }
  if(!isfinite(redDC) || !isfinite(irDC) || redDC<=0 || irDC<=0 ||
      redDC>262143 || irDC>262143) { r.status="invalid_counts"; return r; }
  r.comparable=true;
  r.status="optical_comparison_only";
  r.redChangePct=100.0*(redDC/RECORDED_RED_MEAN-1.0);
  r.irChangePct=100.0*(irDC/RECORDED_IR_MEAN-1.0);
  // Ratio of DC means, NOT the pulsatile ratio-of-ratios used for SpO2.
  r.dcRatioChangePct=100.0*((redDC/irDC)/(RECORDED_RED_MEAN/RECORDED_IR_MEAN)-1.0);
  return r;
}
} // namespace orion
