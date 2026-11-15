#include "../esp32_vitals/CheckedFifo.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
struct Fake {
  uint8_t wr=7, rd=0, overflow=0;
  int calls=0, failCall=0, sample=0;
  bool read(uint8_t reg,uint8_t* out,size_t length) {
    if(++calls==failCall) return false;
    if(reg>=4 && reg<=6) {assert(length==1);out[0]=reg==4?wr:reg==5?overflow:rd;return true;}
    assert(reg==7 && length<=24 && length%6==0);
    for(size_t i=0;i<length;i+=6) {
      uint32_t red=100000+sample,ir=110000+sample++;
      out[i]=red>>16;out[i+1]=red>>8;out[i+2]=red;
      out[i+3]=ir>>16;out[i+4]=ir>>8;out[i+5]=ir;
    }
    return true;
  }
};
FifoResult run(Fake& f,FifoBatch& b) {return readCheckedFifo([&](uint8_t r,uint8_t* o,size_t n){return f.read(r,o,n);},b);}
int main() {
  FifoBatch b; Fake f;
  assert(run(f,b)==FifoResult::Ok && b.count==7 && b.red[6]==100006 && b.ir[6]==110006);
  f=Fake{};f.rd=30;f.wr=5;
  assert(run(f,b)==FifoResult::Ok && b.count==7);
  f=Fake{};f.failCall=4; // First data chunk succeeds, second fails.
  assert(run(f,b)==FifoResult::TransferFailed && b.count==0);
  f=Fake{};f.failCall=1;
  assert(run(f,b)==FifoResult::TransferFailed && b.count==0);
  f=Fake{};f.wr=9;
  assert(run(f,b)==FifoResult::Backlog && b.count==0);
  f=Fake{};f.wr=255;
  assert(run(f,b)==FifoResult::Backlog && b.count==0);
  f=Fake{};f.wr=0;
  assert(run(f,b)==FifoResult::Ok && b.count==0);
  f=Fake{};f.wr=31;
  assert(run(f,b)==FifoResult::Backlog && b.count==0 && f.sample==31);
  auto corrupt=[](uint8_t reg,uint8_t* out,size_t n) {
    if(reg>=4 && reg<=6) {out[0]=reg==4?1:0;}
    else memset(out,255,n);
    return true;
  };
  assert(readCheckedFifo(corrupt,b)==FifoResult::Ok && b.count==1 && b.red[0]==262143 && b.ir[0]==262143);
  puts("FIFO recovery tests passed: partial reads, ADC masking, pointer wrap and excessive backlogs");
}
