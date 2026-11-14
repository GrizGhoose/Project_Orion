#include "../esp32_vitals/Monitor.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
int main() {
  Monitor m;
  for(int i=1;i<=15;i++) m.add(i*6000,72,98,true,"good");
  assert(m.ready() && m.count==15 && m.baselineHR==72 && m.baselineSpO2==98);
  auto a=m.add(96000,94,95,true,"good");
  assert(a.hrElevated && !strcmp(a.state,"NORMAL"));
  m.add(102000,94,95,true,"good");
  a=m.add(108000,94,95,true,"good"); assert(!strcmp(a.state,"WARNING"));
  m.add(114000,94,91,true,"good");
  a=m.add(120000,94,91,true,"good"); assert(!strcmp(a.state,"CRITICAL"));
  a=m.add(126000,0,0,false,"poor_contact_or_signal");
  assert(!strcmp(a.state,"NO_SIGNAL") && !strcmp(a.alert,"CRITICAL"));
  m.add(132000,72,98,true,"good"); m.add(138000,72,98,true,"good");
  a=m.add(144000,72,98,true,"good"); assert(!strcmp(a.state,"NORMAL"));
  assert(m.baselineSpO2==98 && m.baselineHR==72 && m.history[0].seq==10);
  uint32_t sequence=m.sequence; m.reset();
  assert(!m.ready() && m.count==0 && m.calibration==2 && m.sequence==sequence);
  for(int i=0;i<20;i++) m.add(150000+i*6000,90,93,true,"good");
  assert(m.baselineCount==0 && !strcmp(m.alert,"WARNING"));
  m.reset();
  a=m.add(300000,90,84,true,"good"); assert(!strcmp(a.state,"CRITICAL"));
  m.reset();
  for(int i=0;i<15;i++) m.add(400000+i*6000,72,98,true,"good");
  m.add(500000,90,91,true,"good"); m.add(506000,0,0,false,"algorithm_invalid");
  a=m.add(512000,90,91,true,"good"); assert(!strcmp(a.state,"NORMAL"));
  a=m.add(518000,300,98,true,"good"); assert(!a.valid && !strcmp(a.state,"NO_SIGNAL"));
  puts("Firmware baseline/history/alert tests passed");
}
