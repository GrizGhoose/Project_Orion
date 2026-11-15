#include "../esp32_vitals/Monitor.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
Reading sample(Monitor& m,uint64_t ms,int hr=72,int spo2=98,bool hv=true,bool sv=true,const char* acquisition="ok") {
  return m.add(ms,hr,spo2,hv,sv,acquisition,hv?"accepted":"algorithm_invalid",sv?"accepted":"algorithm_invalid");
}
int main() {
  Monitor m;
  for(int i=1;i<90;++i) { sample(m,i*1000); assert(!m.ready()); }
  assert(m.baselineCount==14);
  sample(m,90000);
  assert(m.ready() && m.count==90 && m.baselineHR==72 && m.baselineSpO2==98);
  // One-second overlapping estimates must NOT turn 3 reports into a 2-second warning.
  for(int i=91;i<103;++i) {
    auto r=sample(m,i*1000,94,95);
    assert(r.hrElevated && !strcmp(r.state,"NORMAL"));
  }
  auto r=sample(m,103000,94,95); assert(!strcmp(r.state,"WARNING"));
  for(int i=104;i<110;++i) {
    r=sample(m,i*1000,94,91); assert(!strcmp(r.state,"WARNING"));
  }
  r=sample(m,110000,94,91); assert(!strcmp(r.state,"CRITICAL"));
  r=sample(m,111000,0,0,false,false);
  assert(!strcmp(r.state,"MEASUREMENT_REJECTED") && !strcmp(r.alert,"CRITICAL"));
  for(int i=112;i<124;++i) { r=sample(m,i*1000); assert(!strcmp(r.alert,"CRITICAL")); }
  r=sample(m,124000); assert(!strcmp(r.alert,"NORMAL"));
  assert(m.count==90 && m.history[0].t_ms==35000 && m.history[89].t_ms==124000);
  assert(m.baselineHR==72 && m.baselineSpO2==98);
  // A stalled sampling/reporting period cannot leave old rows in the 90-second view.
  sample(m,215000);
  assert(m.count==1 && m.history[0].t_ms==215000);
  uint32_t sequence=m.sequence; m.reset(215000);
  assert(!m.ready() && m.count==0 && m.sequence==sequence && m.calibration==2);
  for(int i=216;i<305;++i) { sample(m,i*1000); assert(!m.ready()); }
  sample(m,305000); assert(m.ready());
  // Missing and rejected reports interrupt persistence, even when endpoints are low.
  Monitor gap;
  for(int i=1;i<=4;++i) sample(gap,i*1000,72,89);
  for(int i=10;i<16;++i) {
    r=sample(gap,i*1000,72,89); assert(!strcmp(r.alert,"NORMAL"));
  }
  r=sample(gap,16000,72,89); assert(!strcmp(r.alert,"CRITICAL"));
  gap.reset(16000);
  for(int i=17;i<=21;++i) sample(gap,i*1000,72,89);
  sample(gap,22000,0,0,false,false);
  for(int i=23;i<29;++i) { r=sample(gap,i*1000,72,89); assert(!strcmp(r.alert,"NORMAL")); }
  r=sample(gap,29000,72,89); assert(!strcmp(r.alert,"CRITICAL"));
  // Low readings cannot populate the healthy baseline.
  Monitor low;
  for(int i=1;i<=100;++i) sample(low,i*1000,90,93);
  assert(low.baselineCount==0 && !strcmp(low.alert,"WARNING"));
  low.reset(100000);
  r=sample(low,101000,75,80,true,false);
  assert(r.hrValid && !r.spo2Valid && !r.valid && !strcmp(r.state,"PARTIAL_SIGNAL"));
  assert(!strcmp(r.alert,"NORMAL") && low.baselineCount==0);
  r=sample(low,102000,300,80,false,true);
  assert(!r.hrValid && r.spo2Valid && !strcmp(r.state,"CRITICAL"));
  r=sample(low,103000,75,98,true,true,"i2c_error");
  assert(!r.hrValid && !r.spo2Valid && !strcmp(r.state,"ACQUISITION_ERROR"));
  assert(!strcmp(r.alert,"CRITICAL") && !strcmp(r.hrQuality,"not_evaluated"));
  r=sample(low,104000,0,0,false,false,"warming_up"); assert(!strcmp(r.state,"WARMING_UP"));
  r=sample(low,105000,300,98); assert(!r.hrValid && r.spo2Valid && !strcmp(r.hrQuality,"out_of_range"));
  puts("1 Hz baseline, duration alerts, missing reports and 90-second retention tests passed");
}
