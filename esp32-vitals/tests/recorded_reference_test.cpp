#include "../esp32_vitals/RecordedReference.h"
#include "../esp32_vitals/Monitor.h"
#include <assert.h>
#include <stdio.h>
#include <initializer_list>

int main() {
  using namespace orion;
  auto same=compareRecordedReference(RECORDED_RED_MEAN,RECORDED_IR_MEAN,31,true);
  assert(same.comparable && fabs(same.redChangePct)<1e-9 && fabs(same.irChangePct)<1e-9);
  assert(fabs(same.dcRatioChangePct)<1e-9);
  // A shared optical drop must not become a reported oxygen change.
  auto dim=compareRecordedReference(.5*RECORDED_RED_MEAN,.5*RECORDED_IR_MEAN,31,true);
  assert(dim.comparable && fabs(dim.redChangePct+50)<1e-9 && fabs(dim.irChangePct+50)<1e-9);
  assert(fabs(dim.dcRatioChangePct)<1e-9);
  auto redShift=compareRecordedReference(1.1*RECORDED_RED_MEAN,RECORDED_IR_MEAN,31,true);
  assert(redShift.comparable && fabs(redShift.redChangePct-10)<1e-9 && fabs(redShift.dcRatioChangePct-10)<1e-9);
  auto mismatch=compareRecordedReference(RECORDED_RED_MEAN,RECORDED_IR_MEAN,47,true);
  assert(!mismatch.comparable && !strcmp(mismatch.status,"settings_mismatch"));
  assert(!compareRecordedReference(RECORDED_RED_MEAN,RECORDED_IR_MEAN,31,false).comparable);
  for(double bad: {0.0,-1.0,262144.0,(double)NAN,(double)INFINITY}) {
    assert(!compareRecordedReference(bad,RECORDED_IR_MEAN,31,true).comparable);
    assert(!compareRecordedReference(RECORDED_RED_MEAN,bad,31,true).comparable);
  }
  // Optical agreement alone does not populate a vital-sign baseline.
  Monitor m;
  for(int i=1;i<=100;++i) {
    auto comparison=compareRecordedReference(RECORDED_RED_MEAN,RECORDED_IR_MEAN,31,true);
    assert(comparison.comparable);
    auto reading=m.add(i*1000,53,98,false,false,"ok","inconsistent_pulses","unstable_ratio");
    assert(!reading.hrValid && !reading.spo2Valid && !strcmp(reading.state,"MEASUREMENT_REJECTED"));
  }
  assert(!m.ready() && m.baselineCount==0);
  puts("Recorded optical reference: comparison, settings, invalid data and baseline isolation passed");
}
