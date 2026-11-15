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
class Monitor {
 public:
  Reading history[15]{};
  int count=0, baselineCount=0, calibration=1;
  double baselineHR=0, baselineSpO2=0;
  const char* alert="NORMAL";
  int lowCount=0, severeCount=0, recoveryCount=0;
  uint32_t sequence=0;
  bool ready() const { return baselineCount==15; }
  void reset() {
    count=baselineCount=0; baselineHR=baselineSpO2=0;
    lowCount=severeCount=recoveryCount=0; alert="NORMAL"; ++calibration;
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
    // Never incorporate low saturation into a supposedly healthy baseline.
    if (!ready() && valid && spo2>=95 && hr>=40 && hr<=120) {
      ++baselineCount;
      baselineHR+=(hr-baselineHR)/baselineCount;
      baselineSpO2+=(spo2-baselineSpO2)/baselineCount;
    }
    if (!spo2Valid) {
      lowCount=severeCount=recoveryCount=0;
    } else {
      bool low=spo2<94 || (ready() && baselineSpO2-spo2>=3);
      bool severe=spo2<90 || (ready() && baselineSpO2-spo2>=6);
      lowCount=low?lowCount+1:0;
      severeCount=severe?severeCount+1:0;
      bool recovered=spo2>=95 && (!ready() || baselineSpO2-spo2<2);
      recoveryCount=recovered?recoveryCount+1:0;
      if (spo2<85 || severeCount>=2) alert="CRITICAL";
      else if (lowCount>=3 && alert[0]!='C') alert="WARNING";
      else if (recoveryCount>=3) alert="NORMAL";
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
    if(count==15) { for(int i=1;i<15;i++) history[i-1]=history[i]; --count; }
    history[count++]=r; return r;
  }
};
