#pragma once
#include <stdint.h>
#include <math.h>
#include <string.h>

// Hackathon demonstration rules, not validated medical alarm limits.
struct Reading {
  uint32_t seq; uint64_t t_ms; int hr, spo2; bool valid;
  const char* quality; const char* state; const char* alert; bool hrElevated;
  bool hrValid, spo2Valid;
  const char* acquisition; const char* hrQuality; const char* spo2Quality;
};
struct ConditionHold {
  bool active=false;
  uint64_t since=0;
  void reset() { active=false; }
  bool update(bool condition,uint64_t ms,uint64_t duration) {
    if(!condition) { reset(); return false; }
    if(!active) { active=true; since=ms; }
    return ms-since>=duration;
  }
};
class Monitor {
 public:
  static constexpr int HISTORY_CAPACITY=90;
  static constexpr uint64_t HISTORY_MS=90000;
  static constexpr uint64_t REPORT_MS=1000;
  Reading history[HISTORY_CAPACITY]{};
  int count=0, baselineCount=0, calibration=1;
  double baselineHR=0, baselineSpO2=0;
  const char* alert="NORMAL";
  ConditionHold low, severe, recovery;
  uint64_t lastBaselineMs=0, lastReadingMs=0;
  bool havePreviousReading=false;
  uint32_t sequence=0;
  bool ready() const { return baselineCount==15; }
  void reset(uint64_t ms=0) {
    count=baselineCount=0; baselineHR=baselineSpO2=0;
    low.reset(); severe.reset(); recovery.reset(); alert="NORMAL"; ++calibration;
    lastBaselineMs=ms; havePreviousReading=false;
  }
  Reading add(uint64_t ms,int hr,int spo2,bool hrValid,bool spo2Valid,
      const char* acquisition,const char* hrQuality,const char* spo2Quality) {
    bool acquired=strcmp(acquisition,"ok")==0;
    hrValid=acquired && hrValid && hr>=35 && hr<=220;
    spo2Valid=acquired && spo2Valid && spo2>=70 && spo2<=100;
    if(!acquired) hrQuality=spo2Quality="not_evaluated";
    else {
      if(hr<35 || hr>220) { if(hrValid || !strcmp(hrQuality,"accepted")) hrQuality="out_of_range"; }
      if(spo2<70 || spo2>100) { if(spo2Valid || !strcmp(spo2Quality,"accepted")) spo2Quality="out_of_range"; }
    }
    bool valid=hrValid && spo2Valid;
    // Missing reports must not count as observed persistence of a condition.
    if(havePreviousReading && (ms<=lastReadingMs || ms-lastReadingMs>2500)) {
      low.reset(); severe.reset(); recovery.reset();
    }
    lastReadingMs=ms; havePreviousReading=true;
    // Never incorporate low saturation into a supposedly healthy baseline.
    // Keep 15 baseline samples >=6 seconds apart despite faster live updates.
    if (!ready() && valid && spo2>=95 && hr>=40 && hr<=120 && ms-lastBaselineMs>=6000) {
      lastBaselineMs=ms;
      ++baselineCount;
      baselineHR+=(hr-baselineHR)/baselineCount;
      baselineSpO2+=(spo2-baselineSpO2)/baselineCount;
    }
    if (!spo2Valid) {
      low.reset(); severe.reset(); recovery.reset();
    } else {
      bool isLow=spo2<94 || (ready() && baselineSpO2-spo2>=3);
      bool isSevere=spo2<90 || (ready() && baselineSpO2-spo2>=6);
      bool recovered=spo2>=95 && (!ready() || baselineSpO2-spo2<2);
      // Preserve the elapsed spans of old 3/2/3 reports at six-second spacing.
      bool warningDue=low.update(isLow,ms,12000);
      bool criticalDue=severe.update(isSevere,ms,6000);
      bool recoveredDue=recovery.update(recovered,ms,12000);
      if (spo2<85 || criticalDue) alert="CRITICAL";
      else if (warningDue && alert[0]!='C') alert="WARNING";
      else if (recoveredDue) alert="NORMAL";
    }
    const char* quality=!acquired?"not_evaluated":valid?"accepted":
      hrValid || spo2Valid?"partial":"rejected";
    const char* state=!acquired?(!strcmp(acquisition,"warming_up") || !strcmp(acquisition,"sampling_gap")?
      "WARMING_UP":"ACQUISITION_ERROR"):
      spo2Valid && alert[0]!='N'?alert:
      !valid?(hrValid || spo2Valid?"PARTIAL_SIGNAL":"MEASUREMENT_REJECTED"):
      ready()?"NORMAL":"CALIBRATING";
    Reading r{++sequence,ms,hr,spo2,valid,quality,state,alert,ready() && hrValid && hr>=baselineHR+20,
      hrValid,spo2Valid,acquisition,hrQuality,spo2Quality};
    int expired=0;
    while(expired<count && ms-history[expired].t_ms>=HISTORY_MS) ++expired;
    if(!expired && count==HISTORY_CAPACITY) expired=1;
    if(expired) {
      for(int i=expired;i<count;++i) history[i-expired]=history[i];
      count-=expired;
    }
    history[count++]=r; return r;
  }
};
