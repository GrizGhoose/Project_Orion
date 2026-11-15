#pragma once
#include <stdint.h>
#include <stddef.h>

// Stream a complete JSON packet on the network task, without a large MQTT buffer.
// Disconnect after any partial write so a retry cannot corrupt MQTT framing.
template <typename Client>
bool publishStream(Client& client,const char* topic,const uint8_t* bytes,size_t length) {
  if(!length || length>48000) return false; // PubSubClient's header builder uses 16-bit length.
  if(!client.beginPublish(topic,length,false)) { client.disconnect(); return false; }
  for(size_t offset=0;offset<length;) {
    size_t n=length-offset>1024?1024:length-offset;
    if(client.write(bytes+offset,n)!=n) { client.disconnect(); return false; }
    offset+=n;
  }
  if(!client.endPublish()) { client.disconnect(); return false; }
  return true;
}
