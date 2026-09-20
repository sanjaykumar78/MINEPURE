#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* backendUrl = "http://192.168.1.20:5000/api/sensors/readings";
const char* deviceId = "MINEPURE-001";

float ph = 7.1;
float tds = 185.0;
float turbidity = 1.4;
float temperature = 28.2;
float flowRate = 12.6;

void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
}

void readSensors() {
  ph = 7.1 + ((random(0, 100) / 100.0) - 0.5) * 0.8;
  tds = 180 + random(0, 120);
  turbidity = 1.0 + (random(0, 100) / 100.0) * 3.0;
  temperature = 27.5 + (random(0, 100) / 100.0) * 3.0;
  flowRate = 10.0 + (random(0, 100) / 100.0) * 8.0;
}

void sendReading() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["ph"] = ph;
  doc["tds"] = tds;
  doc["turbidity"] = turbidity;
  doc["temperature"] = temperature;
  doc["flowRate"] = flowRate;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(backendUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("HTTP response: " + String(httpCode));
    Serial.println(response);
  } else {
    Serial.println("HTTP POST failed");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  randomSeed(analogRead(0));
  connectWiFi();
}

void loop() {
  readSensors();
  sendReading();
  delay(10000);
}
