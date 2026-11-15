#include "../esp32_vitals/MqttStream.h"
#include <assert.h>
#include <stdio.h>
#include <vector>
struct FakeClient {
  bool header=true, finish=true, disconnected=false, ended=false;
  int failChunk=-1, calls=0;
  size_t expected=0;
  std::vector<uint8_t> output;
  bool beginPublish(const char*,size_t length,bool retained) { assert(!retained); expected=length; return header; }
  size_t write(const uint8_t* bytes,size_t length) {
    if(calls++==failChunk) return length-1;
    output.insert(output.end(),bytes,bytes+length); return length;
  }
  bool endPublish() { ended=true; return finish; }
  void disconnect() { disconnected=true; }
};
int main() {
  std::vector<uint8_t> payload(48000);
  for(size_t i=0;i<payload.size();++i) payload[i]=i%251;
  FakeClient success;
  assert(publishStream(success,"eva/astro01/telemetry",payload.data(),payload.size()));
  assert(success.output==payload && success.expected==48000 && !success.disconnected);
  for(int failure: {0,20,46}) {
    FakeClient partial; partial.failChunk=failure;
    assert(!publishStream(partial,"topic",payload.data(),payload.size()));
    assert(partial.disconnected && !partial.ended);
  }
  FakeClient header; header.header=false;
  assert(!publishStream(header,"topic",payload.data(),payload.size()) && header.disconnected);
  FakeClient finish; finish.finish=false;
  assert(!publishStream(finish,"topic",payload.data(),payload.size()) && finish.disconnected);
  FakeClient tooLarge;
  assert(!publishStream(tooLarge,"topic",payload.data(),65536) && tooLarge.expected==0);
  puts("MQTT streamed history tests passed: full payload and disconnect on partial transmission");
}
