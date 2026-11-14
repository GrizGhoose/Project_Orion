#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MAX30105.h>
#include <spo2_algorithm.h>
#include <esp_timer.h>
#include "Monitor.h"
#include "secrets.h" // Copy secrets.example.h; keep credentials out of Git.

MAX30105 sensor;
Monitor monitor;
struct Packet { char data[8192]; };
struct Command { char id[65]; };
QueueHandle_t packets, commands;
uint32_t irRing[100], redRing[100];
int sampleCount=0, writeIndex=0;
uint64_t lastSample=0, lastReport=0;
bool sensorFound=false;
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
  mqtt.setBufferSize(8192);
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
  String json; json.reserve(6500);
  json="{\"schema\":1,\"device_id\":\"" DEVICE_ID "\",\"boot_id\":\"";
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
    json+=a.valid?String(a.hr):"null";
    json+=",\"spo2\":"; json+=a.valid?String(a.spo2):"null";
    json+=",\"hr_elevated\":"; json+=a.hrElevated?"true":"false";
    json+=",\"valid\":"; json+=a.valid?"true":"false";
    json+=",\"quality\":\""+String(a.quality)+"\",\"state\":\""+a.state+"\",\"alert\":\""+a.alert+"\"}";
  }
  json+="]}";
  static Packet p;
  if(json.length()>=sizeof(p.data)) { Serial.println("Telemetry too large"); return; }
  json.toCharArray(p.data,sizeof(p.data));
  xQueueOverwrite(packets,&p);
  Serial.printf("seq=%lu HR=%d SpO2=%d valid=%d state=%s quality=%s baseline=%d/15\n",
    (unsigned long)r.seq,r.valid?r.hr:0,r.valid?r.spo2:0,r.valid,r.state,r.quality,monitor.baselineCount);
}
void report() {
  int32_t hr=0,spo2=0; int8_t hv=0,sv=0;
  const char* quality="warming_up";
  bool good=sensorFound && sampleCount==100 && nowMs()-lastSample<250;
  if(!sensorFound) quality="sensor_missing";
  else if(good) {
    uint32_t ir[100],red[100],imin=UINT32_MAX,imax=0,rmin=UINT32_MAX,rmax=0;
    uint64_t isum=0,rsum=0;
    for(int i=0;i<100;i++) {
      ir[i]=irRing[(writeIndex+i)%100]; red[i]=redRing[(writeIndex+i)%100];
      imin=min(imin,ir[i]); imax=max(imax,ir[i]); rmin=min(rmin,red[i]); rmax=max(rmax,red[i]);
      isum+=ir[i]; rsum+=red[i];
    }
    good=isum/100>10000 && rsum/100>10000 && imax<260000 && rmax<260000 &&
         imax-imin>50 && rmax-rmin>50;
    quality=good?"algorithm_invalid":"poor_contact_or_signal";
    if(good) {
      maxim_heart_rate_and_oxygen_saturation(ir,100,red,&spo2,&sv,&hr,&hv);
      good=sv && hv && hr>=35 && hr<=220 && spo2>=70 && spo2<=100;
    }
  }
  emit(monitor.add(nowMs(),hr,spo2,good,quality));
}
void setup() {
  Serial.begin(115200);
  snprintf(bootId,sizeof(bootId),"%08lx%08lx",(unsigned long)esp_random(),(unsigned long)esp_random());
  packets=xQueueCreate(1,sizeof(Packet)); commands=xQueueCreate(1,sizeof(Command));
  Wire.begin(21,22);
  sensorFound=sensor.begin(Wire,I2C_SPEED_STANDARD);
  if(sensorFound) { sensor.setup(60,4,2,100,411,4096); sensor.clearFIFO(); }
  else Serial.println("MAX30102 not found; check wiring and reset after fixing");
  xTaskCreatePinnedToCore(networking,"mqtt",8192,nullptr,1,nullptr,0);
  lastReport=nowMs();
}
void loop() {
  Command cmd;
  if(xQueueReceive(commands,&cmd,0)==pdTRUE && strcmp(lastCommand,cmd.id)) {
    monitor.reset(); strlcpy(lastCommand,cmd.id,sizeof(lastCommand));
    sampleCount=writeIndex=0; if(sensorFound) sensor.clearFIFO(); lastReport=nowMs();
  }
  if(sensorFound) {
    // A sampling pause invalidates the window rather than fabricating a waveform.
    if(lastSample && nowMs()-lastSample>250) { sampleCount=writeIndex=0; sensor.clearFIFO(); lastSample=nowMs(); }
    sensor.check();
    while(sensor.available()) {
      irRing[writeIndex]=sensor.getFIFOIR(); redRing[writeIndex]=sensor.getFIFORed();
      writeIndex=(writeIndex+1)%100; if(sampleCount<100) ++sampleCount;
      lastSample=nowMs(); sensor.nextSample();
    }
  }
  if(nowMs()-lastReport>=6000) { lastReport=nowMs(); report(); }
  delay(1);
}
