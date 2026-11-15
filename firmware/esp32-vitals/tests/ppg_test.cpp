#include "../esp32_vitals/PpgAnalysis.h"
#include <assert.h>
#include <stdio.h>
#include <random>
#include <algorithm>

uint32_t ir[100], red[100];
void wave(double amplitude=600,double phase=0,double ratio=.5,double bpm=75) {
  for(int i=0;i<100;i++) {
    double a=2*3.141592653589793*(bpm/60)*i/25;
    ir[i]=(uint32_t)llround(110000+amplitude*cos(a));
    red[i]=(uint32_t)llround(110000+ratio*amplitude*cos(a+phase));
  }
}
int main() {
  wave(); auto r=orion::analyzePpg(ir,red);
  assert(r.hrValid && r.spo2Valid && r.hr==75 && r.spo2>=97 && r.spo2<=100);
  // Regression: original signed multiplications overflowed for this waveform.
  wave(30000); r=orion::analyzePpg(ir,red);
  assert(r.hrCandidateValid && r.spo2CandidateValid && r.spo2==98);
  // Arithmetic correctness must not bypass optical quality rejection.
  assert(!r.hrValid && !r.spo2Valid && !strcmp(r.ir.reason,"unstable_signal"));
  // Shift red relative to IR: each channel's AC must use its OWN peak index.
  wave(600,0.5); r=orion::analyzePpg(ir,red);
  for(int k=0;k<r.algorithm.beatCount;k++) {
    int start=r.algorithm.valleys[k], end=r.algorithm.valleys[k+1], peak=start;
    for(int j=start;j<end;j++) if(ir[j]>ir[peak]) peak=j;
    int expected=ir[peak]-((int)ir[start]+((int)ir[end]-(int)ir[start])*(peak-start)/(end-start));
    assert(r.algorithm.beats[k].irAC==expected);
  }
  wave(); for(int i=0;i<100;i++) red[i]=5000;
  r=orion::analyzePpg(ir,red);
  assert(r.hrValid && !r.spo2Valid && !strcmp(r.spo2Quality,"weak_signal"));
  wave(600,3.141592653589793); r=orion::analyzePpg(ir,red);
  assert(r.hrValid && !r.spo2Valid && !strcmp(r.spo2Quality,"channel_disagreement"));
  wave(); for(int i=50;i<100;i++) { ir[i]+=20000; red[i]+=20000; }
  r=orion::analyzePpg(ir,red); assert(!r.hrValid && !r.spo2Valid);
  // The earlobe log's large spans must not be promoted to accepted readings.
  for(int i=0;i<100;i++) { ir[i]=7233+(11278-7233)*i/99; red[i]=7377+(11754-7377)*i/99; }
  r=orion::analyzePpg(ir,red); assert(!r.hrValid && !r.spo2Valid);
  wave(); for(int i=0;i<100;i++) red[i]=ir[i]=260000;
  r=orion::analyzePpg(ir,red); assert(!r.hrValid && !r.spo2Valid);
  for(int i=0;i<100;i++) red[i]=ir[i]=0;
  r=orion::analyzePpg(ir,red); assert(!r.hrValid && !r.spo2Valid);
  // A credible low estimate is not rejected merely for being low.
  wave(600,0,1.0); r=orion::analyzePpg(ir,red);
  assert(r.hrValid && r.spo2Valid && r.spo2<90);
  // Variable red modulation keeps a pulse but produces inconsistent beat ratios.
  wave();
  for(int i=0;i<100;i++) {
    double a=2*3.141592653589793*1.25*i/25;
    red[i]=(uint32_t)llround(110000+600*(0.5+0.25*cos(2*3.141592653589793*i/100))*cos(a));
  }
  r=orion::analyzePpg(ir,red);
  assert(r.hrValid && !r.spo2Valid && !strcmp(r.spo2Quality,"unstable_ratio"));
  for(int bpm: {60,75,90}) {
    wave(600,0,0.5,bpm);
    for(int i=0;i<100;i++) red[i]=110000+(int)llround(((double)red[i]-110000)*(0.7+i/100.0));
    r=orion::analyzePpg(ir,red);
    int ratios[5]{}, n=r.algorithm.beatCount;
    assert(n>=2);
    for(int i=0;i<n;i++) {
      auto b=r.algorithm.beats[i];
      ratios[i]=(((int64_t)b.redAC*(int64_t)b.irDC)>>7)*100 / (((int64_t)b.irAC*(int64_t)b.redDC)>>7);
    }
    std::sort(ratios,ratios+n);
    int median=n%2?ratios[n/2]:(ratios[n/2-1]+ratios[n/2])/2;
    assert(r.spo2CandidateValid && r.spo2==orion::uch_spo2_table[median]);
  }
  // Flat-topped peak reaching the end previously read beyond the array.
  int32_t plateau[100]{}, peaks[15]{}, count=0;
  for(int i=50;i<100;i++) plateau[i]=100;
  orion::maxim_peaks_above_min_height(peaks,&count,plateau,100,30);
  assert(count==0);
  int32_t hr=0,sp=0; int8_t hv=1,sv=1;
  orion::maxim_heart_rate_and_oxygen_saturation(ir,99,red,&sp,&sv,&hr,&hv);
  assert(!hv && !sv);
  // Exercise the full legal 18-bit range with sanitizers enabled.
  std::mt19937 random(123);
  for(int trial=0;trial<2000;trial++) {
    for(int i=0;i<100;i++) { ir[i]=random()&0x3ffff; red[i]=random()&0x3ffff; }
    r=orion::analyzePpg(ir,red);
    assert(!r.hrValid && !r.spo2Valid);
  }
  puts("PPG overflow/indexing/quality/bounds tests passed");
}
