#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MAX30105.h>
#include "PpgAnalysis.h"
#include <esp_timer.h>
#include "Monitor.h"
#include "CheckedFifo.h"
#include "secrets.h" // Copy secrets.example.h; keep credentials out of Git.

MAX30105 sensor;
Monitor monitor;
struct Packet { char data[12288]; };
struct Command { char id[65]; };
QueueHandle_t packets, commands;
uint32_t irRing[100], redRing[100];
int sampleCount=0, writeIndex=0;
uint32_t samplesReceived=0, samplingGapResets=0;
uint64_t lastSample=0, lastReport=0;
bool sensorFound=false;
const char* acquisitionStatus="sensor_missing";
bool captureRequested=false;
struct DiagnosticWindow {
  uint32_t seq; uint64_t endMs;
  uint32_t ir[100],red[100];
  orion::AlgorithmDiagnostics algorithm;
};
QueueHandle_t diagnosticWindows;
void diagnosticOutput(void*) {
  static DiagnosticWindow d;
  for(;;) {
    if(xQueueReceive(diagnosticWindows,&d,portMAX_DELAY)!=pdTRUE) continue;
    Serial.printf("PPG_BEGIN,seq=%lu,end_ms=%llu,rate_hz=25,count=100\n",(unsigned long)d.seq,(unsigned long long)d.endMs);
    Serial.println("PPG_COLUMNS,seq,index,red,ir");
    for(int i=0;i<100;i++) {
      Serial.printf("PPG,%lu,%d,%lu,%lu\n",(unsigned long)d.seq,i,(unsigned long)d.red[i],(unsigned long)d.ir[i]);
      vTaskDelay(pdMS_TO_TICKS(1));
    }
    Serial.println("BEAT_COLUMNS,seq,index,red_ac,red_dc,ir_ac,ir_dc,R");
    for(int i=0;i<d.algorithm.beatCount;i++) {
      auto b=d.algorithm.beats[i];
      Serial.printf("BEAT,%lu,%d,%.1f,%.1f,%.1f,%.1f,%.6f\n",(unsigned long)d.seq,i,b.redAC,b.redDC,b.irAC,b.irDC,b.ratio);
    }
    Serial.printf("PPG_END,seq=%lu\n",(unsigned long)d.seq);
  }
}
uint64_t lastSensorAttempt=0, sensorStartedAt=0, lastPoll=0;
uint8_t lastBusError=0;
char bootId[17], lastCommand[65]="";
String telemetryTopic=String("eva/")+DEVICE_ID+"/telemetry";
String commandTopic=String("eva/")+DEVICE_ID+"/command";
uint64_t nowMs() { return esp_timer_get_time()/1000ULL; }

void callback(char* topic, byte* payload, unsigned int length) {
  if (String(topic)!=commandTopic || length<9 || length>72 || memcmp(payload,"restart:",8)) return;
  Command c{};
  for(unsigned i=8;i<length;i++) {
    char v=payload[i];
    if(!isalnum(v) && v!='-') return;
    c.id[i-8]=v;
  }
  xQueueOverwrite(commands,&c);
}
// Wi-Fi and potentially blocking TCP reconnects never block optical sampling.
void networking(void*) {
  WiFiClient wifi;
  PubSubClient mqtt(wifi);
  mqtt.setServer(MQTT_HOST,MQTT_PORT);
  mqtt.setCallback(callback);
  mqtt.setBufferSize(12288);
  mqtt.setSocketTimeout(1);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  static Packet pending;
  bool havePending=false;
  uint32_t lastAttempt=0;
  for(;;) {
    if(xQueueReceive(packets,&pending,0)==pdTRUE) havePending=true;
    if(WiFi.status()==WL_CONNECTED) {
      if(!mqtt.connected() && millis()-lastAttempt>=3000) {
        lastAttempt=millis();
        String clientId=String(DEVICE_ID)+"-"+bootId;
        if(mqtt.connect(clientId.c_str(),MQTT_USER,MQTT_PASSWORD)) {
          if(!mqtt.subscribe(commandTopic.c_str())) mqtt.disconnect();
          else Serial.println("MQTT connected");
        } else Serial.printf("MQTT failed: %d\n",mqtt.state());
      }
      if(mqtt.connected()) {
        mqtt.loop();
        if(havePending) {
          String wire(pending.data);
          wire.remove(wire.length()-1);
          wire+=",\"sent_at_ms\":"+number(nowMs())+"}";
          if(mqtt.publish(telemetryTopic.c_str(),wire.c_str(),false)) havePending=false;
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
String number(uint64_t n) { char b[24]; snprintf(b,sizeof(b),"%llu",(unsigned long long)n); return String(b); }
void emit(Reading r) {
  String json; json.reserve(10000);
  json="{\"schema\":2,\"device_id\":\"" DEVICE_ID "\",\"boot_id\":\"";
  json+=bootId;
  json+="\",\"calibration_id\":"+String(monitor.calibration);
  json+=",\"last_command_id\":\""+String(lastCommand)+"\",\"baseline\":{\"ready\":";
  json+=monitor.ready()?"true":"false";
  json+=",\"count\":"+String(monitor.baselineCount)+",\"required\":15,\"hr\":";
  json+=monitor.ready()?String(monitor.baselineHR,2):"null";
  json+=",\"spo2\":"; json+=monitor.ready()?String(monitor.baselineSpO2,2):"null";
  json+="},\"history\":[";
  for(int i=0;i<monitor.count;i++) {
    Reading a=monitor.history[i];
    if(i) json+=',';
    json+="{\"seq\":"+String(a.seq)+",\"t_ms\":"+number(a.t_ms)+",\"hr\":";
    json+=a.hrValid?String(a.hr):"null";
    json+=",\"spo2\":"; json+=a.spo2Valid?String(a.spo2):"null";
    json+=",\"hr_elevated\":"; json+=a.hrElevated?"true":"false";
    json+=",\"valid\":"; json+=a.valid?"true":"false";
    json+=",\"hr_valid\":"; json+=a.hrValid?"true":"false";
    json+=",\"spo2_valid\":"; json+=a.spo2Valid?"true":"false";
    json+=",\"acquisition\":\""+String(a.acquisition)+"\"";
    json+=",\"hr_quality\":\""+String(a.hrQuality)+"\"";
    json+=",\"spo2_quality\":\""+String(a.spo2Quality)+"\"";
    json+=",\"quality\":\""+String(a.quality)+"\",\"state\":\""+a.state+"\",\"alert\":\""+a.alert+"\"}";
  }
  json+="]}";
  static Packet p;
  if(json.length()>=sizeof(p.data)) { Serial.println("Telemetry too large"); return; }
  json.toCharArray(p.data,sizeof(p.data));
  xQueueOverwrite(packets,&p);
  String hrText=r.hrValid?String(r.hr):"NA";
  String spo2Text=r.spo2Valid?String(r.spo2):"NA";
  Serial.printf("seq=%lu HR=%s hr_valid=%d SpO2=%s spo2_valid=%d state=%s acquisition=%s HR_quality=%s SpO2_quality=%s baseline=%d/15\n",
    (unsigned long)r.seq,hrText.c_str(),r.hrValid,spo2Text.c_str(),r.spo2Valid,r.state,
    r.acquisition,r.hrQuality,r.spo2Quality,monitor.baselineCount);
}
void report() {
  Serial.printf("Sampling: window=%d/100 received_total=%lu gap_resets_total=%lu\n",
    sampleCount,(unsigned long)samplesReceived,(unsigned long)samplingGapResets);
  bool complete=sensorFound && sampleCount==100 && nowMs()-lastSample<250;
  if(!complete) {
    const char* status=!strcmp(acquisitionStatus,"ok")?"no_samples":acquisitionStatus;
    emit(monitor.add(nowMs(),0,0,false,false,status,"not_evaluated","not_evaluated"));
    return;
  }
  acquisitionStatus="ok";
  uint32_t ir[100],red[100];
  for(int i=0;i<100;i++) {
    ir[i]=irRing[(writeIndex+i)%100]; red[i]=redRing[(writeIndex+i)%100];
  }
  auto result=orion::analyzePpg(ir,red);
  Serial.printf("Optical IR: DC=%.1f RMS=%.1f span/DC=%.3f drift/DC=%.3f step/DC=%.3f | RED: DC=%.1f RMS=%.1f span/DC=%.3f drift/DC=%.3f step/DC=%.3f\n",
    result.ir.dc,result.ir.rms,result.ir.spanFraction,result.ir.driftFraction,result.ir.stepFraction,
    result.red.dc,result.red.rms,result.red.spanFraction,result.red.driftFraction,result.red.stepFraction);
  Serial.printf("Candidates only: HR=%ld algorithm_hr_valid=%d SpO2=%ld algorithm_spo2_valid=%d | correlation=%.3f interval_CV=%.3f beats=%d R_mean=%.5f R_CV=%.3f\n",
    (long)result.hr,result.hrCandidateValid,(long)result.spo2,result.spo2CandidateValid,
    result.correlation,result.intervalCV,result.algorithm.beatCount,result.ratioMean,result.ratioCV);
  // Queue a snapshot; printing 100 rows must not pause acquisition.
  if(captureRequested) {
    static DiagnosticWindow d;
    d.seq=monitor.sequence+1; d.endMs=nowMs(); d.algorithm=result.algorithm;
    memcpy(d.ir,ir,sizeof(ir)); memcpy(d.red,red,sizeof(red));
    xQueueOverwrite(diagnosticWindows,&d); captureRequested=false;
  }
  emit(monitor.add(nowMs(),result.hr,result.spo2,result.hrValid,result.spo2Valid,
    "ok",result.hrQuality,result.spo2Quality));
}
bool readSensorRegister(uint8_t reg,uint8_t* bytes,size_t count) {
  Wire.beginTransmission(0x57);
  Wire.write(reg);
  lastBusError=Wire.endTransmission(reg==0x07); // Match the original library FIFO transaction.
  if(lastBusError) return false;
  size_t received=Wire.requestFrom((uint8_t)0x57,count,true);
  if(received!=count) {
    while(Wire.available()) Wire.read();
    lastBusError=6; // Local diagnostic: short/failed read, not a Wire status code.
    return false;
  }
  for(size_t i=0;i<count;i++) {
    int value=Wire.read();
    if(value<0) { lastBusError=6; return false; }
    bytes[i]=(uint8_t)value;
  }
  return true;
}
void acquisitionFailed(const char* reason,const char* status="i2c_error") {
  acquisitionStatus=status;
  Serial.printf("Acquisition paused: %s (transfer_code=%u); retry in 5 seconds\n",reason,lastBusError);
  ++samplingGapResets;
  sampleCount=writeIndex=0;
  lastSample=0;
  sensorFound=false;
  lastSensorAttempt=nowMs();
}
void tryInitializeSensor() {
  lastSensorAttempt=nowMs();
  // Same begin/setup sequence as the working raw test. Do not repeatedly end/restart Wire.
  sensorFound=sensor.begin(Wire,I2C_SPEED_STANDARD);
  if(!sensorFound) {
    acquisitionStatus="sensor_missing";
    uint8_t part=0;
    if(readSensorRegister(0xFF,&part,1))
      Serial.printf("Initialization failed; subsequent part ID=0x%02X, expected 0x15; retry in 5 seconds\n",part);
    else Serial.printf("Initialization failed: I2C transfer_code=%u; retry in 5 seconds\n",lastBusError);
    return;
  }
  sensor.setup(0x1F,4,2,100,411,4096);
  // Configuration writes in the library have no error return; verify the essential settings.
  const uint8_t registers[]={0x08,0x09,0x0A,0x0C,0x0D};
  const uint8_t expected[]={0x50,0x03,0x27,0x1F,0x1F};
  const uint8_t masks[]={0xF0,0xC7,0x7F,0xFF,0xFF};
  for(unsigned i=0;i<sizeof(registers);i++) {
    uint8_t value=0;
    if(!readSensorRegister(registers[i],&value,1)) {
      acquisitionFailed("configuration read failed"); return;
    }
    if((value & masks[i])!=expected[i]) {
      Serial.printf("Configuration mismatch: register=0x%02X value=0x%02X expected=0x%02X\n",registers[i],value,expected[i]);
      acquisitionFailed("configuration not confirmed","configuration_error"); return;
    }
  }
  sensor.clearFIFO();
  sampleCount=writeIndex=0;
  lastSample=0;
  sensorStartedAt=lastPoll=nowMs();
  acquisitionStatus="warming_up";
  Serial.println("MAX30102 ready: verified 25 samples/s, red + IR, LED=31");
}
void setup() {
  Serial.begin(115200);
  delay(1000); // Match the startup settling time of the working raw-reading test.
  Serial.println("EVA firmware: ppg-quality-v2. Send w for the next complete raw window + beat AC/DC ratios.");
  snprintf(bootId,sizeof(bootId),"%08lx%08lx",(unsigned long)esp_random(),(unsigned long)esp_random());
  packets=xQueueCreate(1,sizeof(Packet)); commands=xQueueCreate(1,sizeof(Command));
  diagnosticWindows=xQueueCreate(1,sizeof(DiagnosticWindow));
  configASSERT(packets && commands && diagnosticWindows);
  xTaskCreatePinnedToCore(diagnosticOutput,"ppg-log",4096,nullptr,1,nullptr,0);
  Wire.begin(21,22);
  tryInitializeSensor();
  xTaskCreatePinnedToCore(networking,"mqtt",8192,nullptr,1,nullptr,0);
  lastReport=nowMs();
}
void loop() {
  if(Serial.available()) {
    char command=Serial.read();
    if(command=='w' || command=='W') { captureRequested=true; Serial.println("Raw capture requested; waiting for a complete window."); }
  }
  if(!sensorFound && nowMs()-lastSensorAttempt>=5000) tryInitializeSensor();
  Command cmd;
  if(xQueueReceive(commands,&cmd,0)==pdTRUE && strcmp(lastCommand,cmd.id)) {
    monitor.reset(); if(sensorFound) acquisitionStatus="warming_up"; strlcpy(lastCommand,cmd.id,sizeof(lastCommand));
    sampleCount=writeIndex=0; if(sensorFound) sensor.clearFIFO(); lastReport=nowMs();
  }
  if(sensorFound && nowMs()-lastPoll>=10) {
    bool pollingGap=nowMs()-lastPoll>200;
    lastPoll=nowMs();
    FifoBatch batch;
    FifoResult result=readCheckedFifo(readSensorRegister,batch);
    if(result==FifoResult::Backlog || (result==FifoResult::Ok && pollingGap)) {
      // The reader has drained the backlog. Discard this window, not the sensor configuration.
      sampleCount=writeIndex=0;
      ++samplingGapResets;
      sensorStartedAt=nowMs();
      lastSample=0;
      acquisitionStatus="sampling_gap";
      Serial.println("Sample timing gap: backlog drained; collecting a new window");
    } else if(result!=FifoResult::Ok) {
      acquisitionFailed("I2C read failed");
    } else {
      for(uint8_t i=0;i<batch.count;i++) {
        irRing[writeIndex]=batch.ir[i]; redRing[writeIndex]=batch.red[i];
        writeIndex=(writeIndex+1)%100; if(sampleCount<100) ++sampleCount;
        ++samplesReceived;
        lastSample=nowMs();
      }
      // FIFO buffers short scheduling delays. Recover only on a prolonged stop;
      // confirmed FIFO overflow or a failed transfer invalidates the window immediately.
      if(nowMs()-(lastSample?lastSample:sensorStartedAt)>2000)
        acquisitionFailed("no samples for two seconds","no_samples");
    }
  }
  if(nowMs()-lastReport>=6000) { lastReport=nowMs(); report(); }
  delay(1);
}
