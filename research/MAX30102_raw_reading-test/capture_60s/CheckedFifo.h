#pragma once
#include <stdint.h>
#include <stddef.h>

enum class FifoResult { Ok, TransferFailed, Backlog };
struct FifoBatch {
  uint32_t red[31]{};
  uint32_t ir[31]{};
  uint8_t count=0;
};
// Transport must return false unless every requested byte was received.
// Publish a batch only after all transfers succeed: never decode missing bytes as 0xFF.
template <typename Read>
FifoResult readCheckedFifo(Read read, FifoBatch& batch) {
  batch.count=0;
  uint8_t wr,rd;
  if(!read(0x04,&wr,1) || !read(0x06,&rd,1)) return FifoResult::TransferFailed;
  wr &= 0x1F; rd &= 0x1F; // Reserved register bits are not pointer bits.
  const uint8_t count=(wr-rd) & 0x1F;
  // At verified 25 Hz and <=200 ms between polls, >8 pending samples means lost timing.
  // Detect loss through backlog size and the caller's polling deadline, not the overflow register alone.
  const bool overflow=count>8;
  for(uint8_t start=0;start<count;) {
    const uint8_t n=(count-start)>4?4:(count-start);
    uint8_t bytes[24]; // Fits Wire buffers; six bytes per red/IR pair.
    if(!read(0x07,bytes,n*6)) return FifoResult::TransferFailed;
    for(uint8_t j=0;j<n;j++) {
      const uint8_t* b=bytes+j*6;
      // Match the sensor library: only the low 18 bits represent the ADC sample.
      batch.red[start+j]=((uint32_t)(b[0]&3)<<16)|((uint32_t)b[1]<<8)|b[2];
      batch.ir[start+j]=((uint32_t)(b[3]&3)<<16)|((uint32_t)b[4]<<8)|b[5];
    }
    start+=n;
  }
  if(overflow) return FifoResult::Backlog;
  batch.count=count;
  return FifoResult::Ok;
}
