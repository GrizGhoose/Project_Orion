#include "../esp32_vitals/Monitor.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
int main() {
  Monitor m;
  for(int i=1;i<=15;i++) m.add(i*6000,72,98,true,true,"ok","accepted","accepted");
  assert(m.ready() && m.count==15 && m.baselineHR==72 && m.baselineSpO2==98);
  auto a=m.add(96000,94,95,true,true,"ok","accepted","accepted");
  assert(a.hrElevated && !strcmp(a.state,"NORMAL"));
  m.add(102000,94,95,true,true,"ok","accepted","accepted");
  a=m.add(108000,94,95,true,true,"ok","accepted","accepted"); assert(!strcmp(a.state,"WARNING"));
  m.add(114000,94,91,true,true,"ok","accepted","accepted");
  a=m.add(120000,94,91,true,true,"ok","accepted","accepted"); assert(!strcmp(a.state,"CRITICAL"));
  a=m.add(126000,0,0,false,false,"ok","weak_signal","weak_signal");
  assert(!strcmp(a.state,"MEASUREMENT_REJECTED") && !strcmp(a.alert,"CRITICAL"));
  m.add(132000,72,98,true,true,"ok","accepted","accepted"); m.add(138000,72,98,true,true,"ok","accepted","accepted");
  a=m.add(144000,72,98,true,true,"ok","accepted","accepted"); assert(!strcmp(a.state,"NORMAL"));
  assert(m.baselineSpO2==98 && m.baselineHR==72 && m.history[0].seq==10);
  uint32_t sequence=m.sequence; m.reset();
  assert(!m.ready() && m.count==0 && m.calibration==2 && m.sequence==sequence);
  for(int i=0;i<20;i++) m.add(150000+i*6000,90,93,true,true,"ok","accepted","accepted");
  assert(m.baselineCount==0 && !strcmp(m.alert,"WARNING"));
  m.reset();
  a=m.add(300000,90,84,true,true,"ok","accepted","accepted"); assert(!strcmp(a.state,"CRITICAL"));
  m.reset();
  for(int i=0;i<15;i++) m.add(400000+i*6000,72,98,true,true,"ok","accepted","accepted");
  m.add(500000,90,91,true,true,"ok","accepted","accepted"); m.add(506000,0,0,false,false,"ok","algorithm_invalid","algorithm_invalid");
  a=m.add(512000,90,91,true,true,"ok","accepted","accepted"); assert(!strcmp(a.state,"NORMAL"));
  a=m.add(518000,300,98,true,true,"ok","accepted","accepted"); assert(!a.valid && !a.hrValid && a.spo2Valid && !strcmp(a.state,"PARTIAL_SIGNAL"));
  m.reset();
  a=m.add(600000,75,80,true,false,"ok","accepted","unstable_ratio");
  assert(a.hrValid && !a.spo2Valid && !a.valid && !strcmp(a.state,"PARTIAL_SIGNAL"));
  assert(!strcmp(a.alert,"NORMAL") && m.baselineCount==0);
  // An accepted oxygen estimate must still trigger its alert without an accepted HR.
  a=m.add(606000,300,80,false,true,"ok","out_of_range","accepted");
  assert(!a.hrValid && a.spo2Valid && !strcmp(a.state,"CRITICAL"));
  a=m.add(612000,75,98,true,true,"i2c_error","accepted","accepted");
  assert(!a.hrValid && !a.spo2Valid && !strcmp(a.state,"ACQUISITION_ERROR"));
  assert(!strcmp(a.alert,"CRITICAL") && !strcmp(a.hrQuality,"not_evaluated"));
  a=m.add(618000,0,0,false,false,"warming_up","not_evaluated","not_evaluated");
  assert(!strcmp(a.state,"WARMING_UP"));
  puts("Firmware baseline/history/alert tests passed");
}
