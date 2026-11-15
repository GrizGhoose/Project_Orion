#pragma once
#include <stdint.h>
#include <stddef.h>

namespace orion {
constexpr uint8_t DEFAULT_LED_DRIVE=31;
// Limited comparison levels, not automatic gain control or calibrated sensitivity.
inline bool validLedDrive(uint8_t value) {
  return value==15 || value==31 || value==47 || value==63;
}
inline bool ledCommand(char command,uint8_t current,uint8_t& requested) {
  requested=current;
  if(command=='+') requested=current<63?current+16:63;
  else if(command=='-') requested=current>15?current-16:15;
  else if(command=='d' || command=='D') requested=DEFAULT_LED_DRIVE;
  else return false;
  return true;
}
enum class LedWriteResult { Ok, TransferFailed, VerifyFailed, InvalidLevel };
// Caller must discard its RAM window and reset baseline even after a partial failure.
template <typename Write,typename Read>
LedWriteResult configureLedDrive(Write write,Read read,uint8_t value) {
  if(!validLedDrive(value)) return LedWriteResult::InvalidLevel;
  if(!write(0x0C,value) || !write(0x0D,value)) return LedWriteResult::TransferFailed;
  for(uint8_t reg=0x0C;reg<=0x0D;++reg) {
    uint8_t actual=0;
    if(!read(reg,&actual,1)) return LedWriteResult::TransferFailed;
    if(actual!=value) return LedWriteResult::VerifyFailed;
  }
  // Clear FIFO write pointer, overflow counter and read pointer.
  for(uint8_t reg=0x04;reg<=0x06;++reg)
    if(!write(reg,0)) return LedWriteResult::TransferFailed;
  return LedWriteResult::Ok;
}
} // namespace orion
