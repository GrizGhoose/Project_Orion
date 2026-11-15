#include <Wire.h>
#include <MAX30105.h>
#include "CheckedFifo.h"

// Raw-only acquisition. No Wi-Fi, HR, SpO2, filtering or physiological thresholds.
MAX30105 sensor;
bool ready=false, recording=false;
uint32_t started=0, lastPoll=0, lastSample=0, count=0;
const uint32_t DURATION_MS=60000;

bool readRegister(uint8_t reg,uint8_t* bytes,size_t length) {
  Wire.beginTransmission(0x57); Wire.write(reg);
  if(Wire.endTransmission(reg==0x07)) return false;
  if(Wire.requestFrom(uint8_t(0x57),length,true)!=length) {
    while(Wire.available()) Wire.read();
    return false;
  }
  for(size_t i=0;i<length;++i) {
    int value=Wire.read(); if(value<0) return false;
    bytes[i]=uint8_t(value);
  }
  return true;
}
bool clearFifo() {
  for(uint8_t reg=4;reg<=6;++reg) {
    Wire.beginTransmission(0x57); Wire.write(reg); Wire.write(uint8_t(0));
    if(Wire.endTransmission()) return false;
  }
  return true;
}
void status() {
  if(!ready) Serial.println("RAW_ERROR,reason=sensor_not_ready");
  else if(recording) Serial.println("RAW_BUSY");
  else Serial.println("RAW_READY,version=raw60-v1,duration_ms=60000,rate_hz=25,led=31,adc_range_na=4096,pulse_width_us=411,averaging=4");
}
void finish(const char* outcome,const char* reason) {
  recording=false;
  Serial.printf("RAW_END,elapsed_ms=%lu,count=%lu,status=%s,reason=%s\n",
    (unsigned long)(millis()-started),(unsigned long)count,outcome,reason);
}
void failure(const char* reason) {
  if(recording) finish("aborted",reason);
  else Serial.printf("RAW_ERROR,reason=%s\n",reason);
  ready=false;
}
void setup() {
  Serial.begin(115200); delay(1000);
  Wire.begin(21,22);
  if(!sensor.begin(Wire,I2C_SPEED_STANDARD)) { status(); return; }
  sensor.setup(0x1F,4,2,100,411,4096);
  const uint8_t registers[]={0x08,0x09,0x0A,0x0C,0x0D};
  const uint8_t expected[]={0x50,0x03,0x27,0x1F,0x1F};
  const uint8_t masks[]={0xF0,0xC7,0x7F,0xFF,0xFF};
  for(unsigned i=0;i<sizeof(registers);++i) {
    uint8_t value=0;
    if(!readRegister(registers[i],&value,1) || (value&masks[i])!=expected[i]) {
      failure("configuration_not_confirmed"); return;
    }
  }
  if(!clearFifo()) { failure("fifo_reset_failed"); return; }
  ready=true; lastPoll=lastSample=millis(); status();
}
void loop() {
  if(recording && millis()-started>=DURATION_MS) finish("complete","none");
  if(Serial.available()) {
    char command=Serial.read();
    if(command=='p') status();
    else if(command=='r') {
      if(!ready || recording) status();
      else if(!clearFifo()) failure("fifo_reset_failed");
      else {
        count=0; started=lastPoll=lastSample=millis(); recording=true;
        Serial.printf("RAW_BEGIN,start_ms=%lu,duration_ms=60000\n",(unsigned long)started);
      }
    } else if(command=='x' && recording) finish("aborted","host_cancelled");
  }
  uint32_t now=millis();
  if(ready && now-lastPoll>=5) {
    if(recording && now-lastPoll>200) { failure("polling_gap"); return; }
    lastPoll=now;
    FifoBatch batch;
    FifoResult result=readCheckedFifo(readRegister,batch);
    if(result!=FifoResult::Ok) {
      failure(result==FifoResult::Backlog?"fifo_backlog":"i2c_read_failed"); return;
    }
    if(batch.count) lastSample=now;
    if(recording) {
      for(uint8_t i=0;i<batch.count;++i) {
        // Timestamp is MCU FIFO-read time, not an exact optical conversion timestamp.
        Serial.printf("RAW,%lu,%lu,%lu,%lu\n",(unsigned long)count++,
          (unsigned long)(now-started),(unsigned long)batch.red[i],(unsigned long)batch.ir[i]);
      }
      if(now-lastSample>2000) failure("no_samples");
    }
  }
  delay(1);
}
