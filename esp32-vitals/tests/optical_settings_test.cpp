#include "../esp32_vitals/OpticalSettings.h"
#include <assert.h>
#include <stdio.h>

int main() {
  uint8_t requested=31;
  assert(orion::ledCommand('+',31,requested) && requested==47);
  assert(orion::ledCommand('+',47,requested) && requested==63);
  assert(orion::ledCommand('+',63,requested) && requested==63);
  assert(orion::ledCommand('-',31,requested) && requested==15);
  assert(orion::ledCommand('-',15,requested) && requested==15);
  assert(orion::ledCommand('d',63,requested) && requested==31);
  assert(!orion::ledCommand('w',31,requested));
  using orion::LedWriteResult;
  uint8_t registers[256]{};
  auto write=[&](uint8_t reg,uint8_t value) { registers[reg]=value; return true; };
  auto read=[&](uint8_t reg,uint8_t* bytes,size_t) { *bytes=registers[reg]; return true; };
  registers[4]=21; registers[5]=2; registers[6]=18;
  assert(orion::configureLedDrive(write,read,47)==LedWriteResult::Ok);
  assert(registers[0x0C]==47 && registers[0x0D]==47);
  assert(registers[4]==0 && registers[5]==0 && registers[6]==0);
  // Fail each LED/FIFO write: partial configuration is never reported as successful.
  for(int failed=0;failed<5;++failed) {
    int calls=0;
    auto failWrite=[&](uint8_t reg,uint8_t value) {
      if(calls++==failed) return false;
      return write(reg,value);
    };
    assert(orion::configureLedDrive(failWrite,read,31)==LedWriteResult::TransferFailed);
  }
  for(int failed=0;failed<2;++failed) {
    int calls=0;
    auto failRead=[&](uint8_t reg,uint8_t* bytes,size_t count) {
      if(calls++==failed) return false;
      return read(reg,bytes,count);
    };
    assert(orion::configureLedDrive(write,failRead,31)==LedWriteResult::TransferFailed);
  }
  auto mismatch=[](uint8_t,uint8_t* bytes,size_t) { *bytes=0; return true; };
  assert(orion::configureLedDrive(write,mismatch,31)==LedWriteResult::VerifyFailed);
  assert(orion::configureLedDrive(write,read,255)==LedWriteResult::InvalidLevel);
  puts("Optical tuning tests passed: bounded levels, readback and partial-transfer failure handling");
}
