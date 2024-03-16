#include <Servo.h>

#define SPU 80 // 20 teeth pulley, 16 microstep, 2mm a tooth belt, 16*200 microsteps per turn  == (16*200)/(20*2) == 80
#define PIN_SERVO D6

Servo servo;

typedef uint8_t (*CallbackFunction)(uint8_t*, int, uint8_t*);

struct EventCallback {
  String event;
  CallbackFunction callback;
};


float pos[] = {0, 0};

const int motor1StepPin = D10;
const int motor1DirPin = D9;
const int motor2StepPin = D8;
const int motor2DirPin = D7;

const int enablePin = D1;

void setup() {  
  servo.attach(PIN_SERVO);

  Serial.begin(9600);

  // on("light", onLight);
  on("go", go);
  on("servo", moveServo);
  on("motorsOn", motorsOn);
  on("motorsOff", motorsOff);
  on("moveTowardsOrigin", moveTowardsOrigin);
  on("setOrigin", setOrigin);

  pinMode(motor1StepPin, OUTPUT);
  pinMode(motor1DirPin, OUTPUT);
  pinMode(motor2StepPin, OUTPUT);
  pinMode(motor2DirPin, OUTPUT);

  pinMode(enablePin, OUTPUT); // enable pin

  // pinMode(PIN_LED, OUTPUT);

   startupIndicator(); // once startup is finished, indicate to user
}

void loop() {
  readSerial();
}

void startupIndicator() {
   std::vector<std::vector<double>> song = {{64.36045345417631,60.114538173750404},
                                             {72.31938122330324,68.06551099258336},
                                             {70.13424224470432,71.1130784888347},
                                             {67.08667474845298,68.92793951023579},
                                             {69.5115965366875,66.06747550575234},
                                             {72.37206054117095,68.49239729398687},
                                             {64.61758603033938,81.33249562152564},
                                             {61.4075614484547,79.39387699381773},
                                             {63.34618007616259,76.18385241193305},
                                             {66.55620465804728,78.12247103964094},
                                             {64.70919338581919,81.38606558557682},
                                             {52.35012737893227,72.88586044467507},
                                             {54.7750491671668,70.02539644019163},
                                             {57.864815668888525,72.15044772541707},
                                             {55.7397643836631,75.2402142271388},
                                             {52.69219688741175,73.0550752485399},
                                             {61.19240202831347,60.69600924165296},
                                             {64.2821685300352,62.8210605268784},
                                             {62.343549902327304,66.0310851087631},
                                             {59.184091844466444,64.01110372750779},
                                             {61.241244419016084,60.87572124924077},
                                             {64.28881191526743,63.06086022783967},
                                             {62.003507897322955,66.03405472964523},
                                             {56.69755605123832,60.73340618375663},
                                             {59.00429080615253,57.77680767018214},
                                             {61.96088931972703,60.083542425096326},
                                             {59.65415456481283,63.04014093867083},
                                             {56.518772086545816,60.982988364121184},
                                             {65.25932800094132,48.7927183791157},
                                             {68.21592651451583,51.0994531340299},
                                             {65.90919175960163,54.05605164760439},
                                             {62.952593246027135,51.74931689269019},
                                             {65.00974582057678,48.613934414423184},
                                             {77.20001580558218,57.3544903288188},
                                             {74.89328105066798,60.3110888423933},
                                             {71.93668253709349,58.0043540874791},
                                             {74.2434172920077,55.04775557390461},
                                             {77.2000158055822,57.3544903288188},
                                             {71.14007166181632,66.83286450240139},
                                             {68.0046891835493,64.77571192785176},
                                             {74.56010611934599,55.63300943909769},
                                             {77.64987262106771,57.758060724323116},
                                             {75.46473364246884,60.80562822057449},
                                             {67.50580587334187,52.85465540174158}};

   
  // flash LED to indicate board is initialized
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_LED, 0);
    delay(200);
    digitalWrite(PIN_LED, 1);
    delay(200);
  }
   for (const auto& x : song) {
        goTo(x[0], x[1]);
    }
}

uint8_t onLight(uint8_t* payload, int length, uint8_t* reply) {
  uint8_t value = payload[0];

  // Serial.println("light it up");

  digitalWrite(PIN_LED, value);

  return 0;
}

uint8_t motorsOn(uint8_t* payload, int length, uint8_t* reply) {
  digitalWrite(enablePin, 0);
  return 0;
}

uint8_t motorsOff(uint8_t* payload, int length, uint8_t* reply) {
  digitalWrite(enablePin, 1);
  return 0;
}

uint8_t moveTowardsOrigin(uint8_t* payload, int length, uint8_t* reply) {
  float x = pos[0];
  float y = pos[1];

  // this ternary may not be neccesary
  goTo(
    x + ( x < 0 ? 10 : -10), 
    y + ( y < 0 ? 10 : -10)
  );

  return 0;
}

uint8_t setOrigin(uint8_t* payload, int length, uint8_t* reply) {
  pos[0] = 0;
  pos[1] = 0;

  return 0;
}


/* ------------------------------------------------------------ */

int bufferIndex = 0;
uint8_t msgBuffer[100];

void readSerial() {
  while (Serial.available() > 0) {
    uint8_t incoming = Serial.read(); 

    msgBuffer[bufferIndex] = incoming;

    if (incoming != 0) {
      bufferIndex++;
      continue; // Proceed to the next byte if current byte is not null
    }

    // Serial.print("RECEIVED: ");
    // for (int i = 0; i < bufferIndex; i++) {
    //   Serial.print(msgBuffer[i]);
    //   Serial.print(", ");
    // }
    // Serial.println("DONE");

    // Now we have a full message, perform COBS decoding
    uint8_t decoded[bufferIndex];
    cobs_decode(decoded, msgBuffer, bufferIndex);

    // Serial.print("DECODED: ");
    // for (int i = 0; i < bufferIndex; i++) {
    //   Serial.print(decoded[i]);
    //   Serial.print(", ");
    // }
    // Serial.println("DONE");

    // Parse the decoded message
    int i = 0;

    uint8_t msgLength = decoded[i];
    // Serial.print("MSG-LENGTH: ");
    // Serial.println(msgLength);

    uint8_t msgArr[msgLength];
    i++;
    while (i < 1 + msgLength) {
      msgArr[i-1] = decoded[i];
      i++;
    }

    // Serial.print("MSGARR: ");
    // for (int i = 0; i < msgLength; i++) {
    //   Serial.print(msgArr[i]);
    //   Serial.print(", ");
    // }
    // Serial.println("MSGARR-END");

    uint8_t payloadLength = decoded[i];
    uint8_t payload[payloadLength];
    i++;
    while (i < 1 + msgLength + 1 + payloadLength) {
      payload[i-1-msgLength-1] = decoded[i];
      i++;
    }

    uint8_t msgCount = decoded[i];

    // String msg = String((char*)msgArr);
    String msg = byteArrayToString(msgArr, msgLength);

    // Serial.println(msg);

    // printArray("PAYLOAD", payload, payloadLength);

    // Serial.print("MSGCOUNT: ");
    // Serial.println(msgCount);

    bool triggered = triggerEvent(msg, payload, payloadLength, msgCount);

    bufferIndex = 0; // Reset the buffer for the next message
  }
}

/* ------------------------------------------------------------ */



const int MAX_EVENTS = 255; // Maximum number of events to store, adjust as needed
EventCallback eventCallbacks[MAX_EVENTS];
int eventCount = 0;

const int REPLY_PAYLOAD_LENGTH = 255;
uint8_t reply[REPLY_PAYLOAD_LENGTH];

void on(String event, CallbackFunction callback) {
  if (eventCount < MAX_EVENTS) {
    eventCallbacks[eventCount].event = event;
    eventCallbacks[eventCount].callback = callback;
    eventCount = (eventCount + 1) % MAX_EVENTS;
  } else {
    // Serial.println("Max number of events reached. Wrapping events.");
  }
}

bool triggerEvent(String event, uint8_t* payload, int payloadLength, uint8_t msgCount) {
  for (int i = 0; i < eventCount; i++) {
    if (eventCallbacks[i].event == event) {
      // want to pass payload and payloadLength, need to get response payload
      uint8_t reply_length = eventCallbacks[i].callback(payload, payloadLength, reply);

      sendAck(msgCount, reply, reply_length);
      return true;
    }
  }

  // Serial.println(" No event registered.");
  return false;
}

const int arrayLength = 7; // + length;
uint8_t byteArray[arrayLength];

void sendAck(uint8_t msgCount, uint8_t* reply, uint8_t length) {
  // Serial.println("SEND ACK");

  // int arrayLength = 7; // + length;
  // static uint8_t byteArray[arrayLength];

  byteArray[0] = 0x03;
  byteArray[1] = 0x61;
  byteArray[2] = 0x63;
  byteArray[3] = 0x6B;
  byteArray[4] = 0x00;
  byteArray[5] = msgCount;
  byteArray[6] = 0x0A;

  // byteArray[4] = length;
  // for (int i = 0; i < length; i++) {
  //   byteArray[i+5] = reply[i];
  // }
  // byteArray[5+length] = msgCount;
  // byteArray[6+length] = 0x0A;

  // Serial.println(msgCount);
  // printArray("ACK", byteArray, 5+length);

  Serial.write(byteArray, arrayLength);
      
  // uint8_t byteArrayEncoded[arrayLength + 2]; // +2 for possible COBS overhead
  // cobs_encode(byteArrayEncoded, byteArray, arrayLength);
  // Serial.write(byteArrayEncoded, arrayLength + 2);

  // printArray("ENCODED-ACK", byteArray, 5+length);

}

/* ------------------------------------------------------------ */

void cobs_encode(uint8_t *dst, const uint8_t *src, size_t len) {
    size_t read_index = 0;
    size_t write_index = 1;
    size_t code_index = 0;
    uint8_t code = 1;

    while (read_index < len) {
        if (src[read_index] == 0) {
            dst[code_index] = code;
            code = 1;
            code_index = write_index++;
            read_index++;
        } else {
            dst[write_index++] = src[read_index++];
            code++;
            if (code == 0xFF) {
                dst[code_index] = code;
                code = 1;
                code_index = write_index++;
            }
        }
    }

    dst[code_index] = code;

    // Add trailing zero
    if (write_index < len + 2) {
        dst[write_index] = 0;
    }
}

void cobs_decode(uint8_t *dst, const uint8_t *src, size_t len) {
    size_t i, j, dst_i = 0;
    for (i = 0; i < len;) {
        uint8_t code = src[i++];
        for (j = 1; j < code && i < len; j++) {
            dst[dst_i++] = src[i++];
        }
        if (code < 0xFF && dst_i < len) {
            dst[dst_i++] = 0;
        }
    }
}

/* ------------------------------------------------------------ */

// TODO: THINK THIS IS BUGGY
void cobs_print(const String& message) {
  // Convert the message to a byte array
  int length = message.length();
  uint8_t byteArray[length + 1]; // +1 for the null terminator
  message.getBytes(byteArray, length + 1);

  // Prepare the buffer for the encoded message
  uint8_t encoded[length + 2]; // +2 for possible COBS overhead
  
  // Perform COBS encoding
  cobs_encode(encoded, byteArray, length + 1);

  // Send the encoded message
  Serial.write(encoded, length + 2); // Write the encoded bytes
}

/* ------------------------------------------------------------ */

float read_float(uint8_t* buffer, int index) {
  uint8_t byte0 = buffer[index];
  uint8_t byte1 = buffer[index+1];
  uint8_t byte2 = buffer[index+2];
  uint8_t byte3 = buffer[index+3];

  uint8_t byteArray[] = {byte0, byte1, byte2, byte3};
  float floatValue;
  memcpy(&floatValue, &byteArray, sizeof(floatValue));

  return floatValue;
}

int read_int(uint8_t* buffer, int index) {
  uint8_t byte0 = buffer[index];
  uint8_t byte1 = buffer[index+1];
  uint8_t byte2 = buffer[index+2];
  uint8_t byte3 = buffer[index+3];

  uint8_t byteArray[] = {byte0, byte1, byte2, byte3};
  int value;
  memcpy(&value, &byteArray, sizeof(value));

  return value;
}

String byteArrayToString(byte arr[], int length) {
  String result = "";

  for (int i = 0; i < length; i++) {
    result += (char)arr[i]; // Convert each byte to a character and append it to the string
  }

  return result;
}

/* ------------------------------------------------------------------------ */

#define EPSILON 0.01

void goTo(float x, float y) {

  // Serial.println("START GOTO");

  // Set your target distances for each motor (in steps)
  float motor1Target = (x + y) - pos[0];
  float motor2Target = (y - x) - pos[1];

  // Set motor direction based on target values
  digitalWrite(motor1DirPin, motor1Target >= 0 ? HIGH : LOW);
  digitalWrite(motor2DirPin, motor2Target >= 0 ? HIGH : LOW);

  // Calculate the relative speeds and maximum duration for both motors
  float maxSteps = max(abs(motor1Target), abs(motor2Target));
  float motor1Speed = abs(motor1Target) / maxSteps;
  float motor2Speed = abs(motor2Target) / maxSteps;

  unsigned long stepDuration = 500; // The time it takes to perform one step in microseconds
  unsigned long motor1StepInterval = stepDuration / motor1Speed;
  unsigned long motor2StepInterval = stepDuration / motor2Speed;

  // Initialize variables for step timing
  unsigned long motor1PrevStepTime = 0;
  unsigned long motor2PrevStepTime = 0;
  float motor1Step = 0;
  float motor2Step = 0;

  // Loop until both motors reach their target steps
  while (abs(motor1Target - motor1Step) > EPSILON || abs(motor2Target - motor2Step) > EPSILON) {


    unsigned long currentTime = micros();

    // Motor 1
    if (abs(motor1Target - motor1Step) > EPSILON && ((currentTime - motor1PrevStepTime) >= motor1StepInterval)) {
      digitalWrite(motor1StepPin, HIGH);
      delayMicroseconds(1);
      digitalWrite(motor1StepPin, LOW);
      delayMicroseconds(1);

      motor1Step += (motor1Target >= 0 ? 1.0 : -1.0)/SPU;
      motor1PrevStepTime = currentTime;
    }

    // Motor 2
    if (abs(motor2Target - motor2Step) > EPSILON && ((currentTime - motor2PrevStepTime) >= motor2StepInterval)) {
      digitalWrite(motor2StepPin, HIGH);
      delayMicroseconds(1);
      digitalWrite(motor2StepPin, LOW);
      delayMicroseconds(1);

      motor2Step += (motor2Target >= 0 ? 1.0 : -1.0)/SPU;
      motor2PrevStepTime = currentTime;
    }
  }

  // Serial.println("END GOTO");

  pos[0] += motor1Step;
  pos[1] += motor2Step;
}

uint8_t go(uint8_t* payload, int length, uint8_t* reply) {
  float x = read_float(payload, 0);
  float y = read_float(payload, 4);
  
  goTo(x, y);

  return 0;
}

uint8_t moveServo(uint8_t* payload, int length, uint8_t* reply) {
  int angle = read_int(payload, 0);
  
  servo.writeMicroseconds(angle);

  return 0;
}

/* ------ */

void printArray(String label, uint8_t* arr, int arrSize) {
  Serial.print(label);
  Serial.print("-BEGIN: ");
  for (int i = 0; i < arrSize; i++) {
    Serial.print(arr[i]);
    Serial.print(", ");
  }
  Serial.print(label);
  Serial.println("-END");
}




