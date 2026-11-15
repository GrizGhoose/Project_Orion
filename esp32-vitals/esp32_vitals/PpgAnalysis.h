#pragma once
#include "PpgAlgorithm.h"
#include <math.h>
#include <string.h>

namespace orion {
// Conservative prototype gates, NOT calibrated accuracy or clinical quality scores.
struct ChannelQuality {
  double dc=0, rms=0, spanFraction=0, driftFraction=0, stepFraction=0;
  const char* reason="flat_signal";
  bool accepted() const { return strcmp(reason,"accepted")==0; }
};
struct PpgResult {
  int32_t hr=-999, spo2=-999;
  int8_t hrCandidateValid=0, spo2CandidateValid=0;
  bool hrValid=false, spo2Valid=false;
  const char* hrQuality="algorithm_invalid";
  const char* spo2Quality="algorithm_invalid";
  ChannelQuality ir, red;
  AlgorithmDiagnostics algorithm;
  double correlation=0, intervalCV=0, ratioMean=0, ratioCV=0;
};

inline ChannelQuality channelQuality(const uint32_t* raw, double* detrended) {
  ChannelQuality q;
  uint32_t lo=0x3FFFF, hi=0, step=0;
  double xy=0, xx=0;
  for(int i=0;i<PPG_WINDOW_SIZE;++i) {
    q.dc+=raw[i];
    if(raw[i]<lo) lo=raw[i];
    if(raw[i]>hi) hi=raw[i];
    if(i) { uint32_t d=raw[i]>raw[i-1]?raw[i]-raw[i-1]:raw[i-1]-raw[i]; if(d>step) step=d; }
    double x=i-(PPG_WINDOW_SIZE-1)/2.0;
    xy+=x*raw[i]; xx+=x*x;
  }
  q.dc/=PPG_WINDOW_SIZE;
  double slope=xy/xx;
  for(int i=0;i<PPG_WINDOW_SIZE;++i) {
    detrended[i]=raw[i]-q.dc-slope*(i-(PPG_WINDOW_SIZE-1)/2.0);
    q.rms+=detrended[i]*detrended[i];
  }
  q.rms=sqrt(q.rms/PPG_WINDOW_SIZE);
  double dc=q.dc>0?q.dc:1;
  q.spanFraction=(hi-lo)/dc;
  q.driftFraction=fabs(slope)*(PPG_WINDOW_SIZE-1)/dc;
  q.stepFraction=step/dc;
  q.reason=hi>=260000?"clipped_signal":q.dc<=10000?"weak_signal":
    hi-lo<=50 || q.rms/dc<0.0005?"flat_signal":
    q.spanFraction>0.20 || q.driftFraction>0.10 || q.stepFraction>0.05 || q.rms/dc>0.05?
    "unstable_signal":"accepted";
  return q;
}

inline double coefficientOfVariation(const double* values,int count,double& mean) {
  mean=0;
  if(!count) return 0;
  for(int i=0;i<count;++i) mean+=values[i];
  mean/=count;
  double variance=0;
  for(int i=0;i<count;++i) variance+=(values[i]-mean)*(values[i]-mean);
  return mean>0?sqrt(variance/count)/mean:0;
}

inline PpgResult analyzePpg(uint32_t* ir,uint32_t* red) {
  PpgResult r;
  double x[PPG_WINDOW_SIZE],y[PPG_WINDOW_SIZE];
  r.ir=channelQuality(ir,x); r.red=channelQuality(red,y);
  maxim_heart_rate_and_oxygen_saturation(ir,PPG_WINDOW_SIZE,red,
    &r.spo2,&r.spo2CandidateValid,&r.hr,&r.hrCandidateValid,&r.algorithm);
  double xy=0,xx=0,yy=0;
  for(int i=0;i<PPG_WINDOW_SIZE;++i) { xy+=x[i]*y[i]; xx+=x[i]*x[i]; yy+=y[i]*y[i]; }
  if(xx>0 && yy>0) r.correlation=xy/sqrt(xx*yy);
  double intervals[14]{},mean=0;
  int count=r.algorithm.valleyCount>0?r.algorithm.valleyCount-1:0;
  for(int i=0;i<count;++i) intervals[i]=r.algorithm.valleys[i+1]-r.algorithm.valleys[i];
  r.intervalCV=coefficientOfVariation(intervals,count,mean);
  const bool periodic=count>=2 && r.intervalCV<=0.20;
  r.hrQuality=!r.ir.accepted()?r.ir.reason:!periodic?"inconsistent_pulses":
    !r.hrCandidateValid?"algorithm_invalid":r.hr<35 || r.hr>220?"out_of_range":"accepted";
  r.hrValid=strcmp(r.hrQuality,"accepted")==0;
  double ratios[5]{};
  for(int i=0;i<r.algorithm.beatCount;++i) ratios[i]=r.algorithm.beats[i].ratio;
  r.ratioCV=coefficientOfVariation(ratios,r.algorithm.beatCount,r.ratioMean);
  // SpO2 needs a credible pulse in both channels, agreement and repeatable ratios.
  // HR can still be accepted from IR when the red channel fails these checks.
  r.spo2Quality=!r.ir.accepted()?r.ir.reason:!r.red.accepted()?r.red.reason:
    !periodic?"inconsistent_pulses":r.correlation<0.80?"channel_disagreement":
    r.algorithm.beatCount<2 || r.ratioCV>0.15?"unstable_ratio":
    !r.spo2CandidateValid?"algorithm_invalid":r.spo2<70 || r.spo2>100?"out_of_range":"accepted";
  r.spo2Valid=strcmp(r.spo2Quality,"accepted")==0;
  return r;
}
} // namespace orion
