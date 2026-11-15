#include "../esp32_vitals/Simulation.h"
#include "../esp32_vitals/Monitor.h"
#include <cassert>
#include <cstring>
int main() {
  Monitor m;
  bool warning=false,critical=false,elevated=false;
  for(uint64_t s=1;s<=240;s++) {
    auto v=orion::simulatedVitals(s*1000);
    auto r=m.add(s*1000,v.hr,v.spo2,true,true,"ok","accepted","accepted");
    assert(r.valid);
    warning |= !strcmp(r.alert,"WARNING");
    critical |= !strcmp(r.alert,"CRITICAL");
    elevated |= r.hrElevated;
    if(s==90) assert(m.ready());
    if(s==239) assert(!strcmp(r.alert,"NORMAL"));
  }
  assert(warning && critical && elevated);
  assert(m.count==90);
  m.reset(240000);
  for(uint64_t s=1;s<=90;s++) {
    auto v=orion::simulatedVitals(s*1000);
    m.add(240000+s*1000,v.hr,v.spo2,true,true,"ok","accepted","accepted");
  }
  assert(m.ready() && m.calibration==2);
  assert(orion::simulatedVitals(240000).spo2==98);
}
