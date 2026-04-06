#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <LiquidCrystal_I2C.h>
#include <math.h>

Adafruit_MPU6050 mpu;
LiquidCrystal_I2C lcd(0x27, 16, 2);

// -------------------- Pins --------------------
const int moisturePin = A0;
const int greenLED    = 5;
const int yellowLED   = 6;
const int redLED      = 7;
const int buzzer      = 8;
const int alertLED    = 9;

// -------------------- Timing --------------------
const unsigned long sampleInterval = 150; // ms

// -------------------- Soil thresholds --------------------
const int wetSoilLimit = 400;
const int moistureHysteresis = 20;

// -------------------- Motion thresholds --------------------
// Balanced values: not too sensitive, not too strict
const float alpha = 0.98f;

const float warningTiltThreshold = 2.2f;   // degrees
const float dangerTiltThreshold  = 4.2f;   // degrees

const float gyroWarningThreshold  = 12.0f;  // deg/s
const float gyroDangerThreshold   = 22.0f;  // deg/s

const float accelWarningDelta     = 0.55f;  // m/s^2
const float accelDangerDelta      = 0.95f;  // m/s^2

// Recovery thresholds: when motion becomes calm, go back to safe
const float calmTiltThreshold   = 1.1f;
const float calmGyroThreshold   = 4.5f;
const float calmAccelThreshold  = 0.35f;

// -------------------- Counters --------------------
const int warningConfirmCount = 2;
const int dangerConfirmCount  = 2;
const int recoveryConfirmCount = 10;

// -------------------- Runtime variables --------------------
unsigned long lastSampleTime = 0;

enum SystemState { STATE_SAFE, STATE_WARNING, STATE_DANGER };
SystemState currentState = STATE_SAFE;

float pitch = 0.0f;
float roll  = 0.0f;

float baselinePitch = 0.0f;
float baselineRoll  = 0.0f;

float gyroBiasX = 0.0f;
float gyroBiasY = 0.0f;
float gyroBiasZ = 0.0f;

bool moistureWetStable = false;

int warningCounter = 0;
int dangerCounter = 0;
int calmCounter = 0;

float prevMag = 0.0f;

float magBuffer[5] = {0, 0, 0, 0, 0};
int magIndex = 0;
bool magFilled = false;

// -------------------- Helper: moving average --------------------
float movingAverage(float value) {
  magBuffer[magIndex] = value;
  magIndex = (magIndex + 1) % 5;
  if (magIndex == 0) magFilled = true;

  int count = magFilled ? 5 : magIndex;
  if (count == 0) return value;

  float sum = 0.0f;
  for (int i = 0; i < count; i++) {
    sum += magBuffer[i];
  }
  return sum / count;
}

// -------------------- Helper: set outputs --------------------
void setOutputs(SystemState state) {
  digitalWrite(greenLED,  state == STATE_SAFE ? HIGH : LOW);
  digitalWrite(yellowLED, state == STATE_WARNING ? HIGH : LOW);
  digitalWrite(redLED,    state == STATE_DANGER ? HIGH : LOW);
  digitalWrite(alertLED,  state == STATE_DANGER ? HIGH : LOW);

  if (state == STATE_DANGER) {
    tone(buzzer, 2000);
  } else if (state == STATE_WARNING) {
    noTone(buzzer);
  } else {
    noTone(buzzer);
  }
}

// -------------------- Helper: LCD update --------------------
void showState(SystemState state) {
  lcd.clear();

  if (state == STATE_DANGER) {
    lcd.setCursor(0, 0);
    lcd.print("DANGER ALERT!");
    lcd.setCursor(0, 1);
    lcd.print("LANDSLIDE RISK");
  } 
  else if (state == STATE_WARNING) {
    lcd.setCursor(0, 0);
    lcd.print("WARNING");
    lcd.setCursor(0, 1);
    lcd.print("Check Soil/Motion");
  } 
  else {
    lcd.setCursor(0, 0);
    lcd.print("SYSTEM SAFE");
    lcd.setCursor(0, 1);
    lcd.print("Monitoring...");
  }
}

// -------------------- Helper: moisture hysteresis --------------------
void updateMoistureState(int moistureValue) {
  if (!moistureWetStable) {
    if (moistureValue < (wetSoilLimit - moistureHysteresis)) {
      moistureWetStable = true;
    }
  } else {
    if (moistureValue > (wetSoilLimit + moistureHysteresis)) {
      moistureWetStable = false;
    }
  }
}

// -------------------- Calibration --------------------
void calibrateSensors() {
  const int samples = 200;

  float gxSum = 0, gySum = 0, gzSum = 0;
  float axSum = 0, aySum = 0, azSum = 0;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibrating...");
  Serial.println("Calibrating sensors...");

  for (int i = 0; i < samples; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    gxSum += g.gyro.x;
    gySum += g.gyro.y;
    gzSum += g.gyro.z;

    axSum += a.acceleration.x;
    aySum += a.acceleration.y;
    azSum += a.acceleration.z;

    delay(5);
  }

  gyroBiasX = gxSum / samples;
  gyroBiasY = gySum / samples;
  gyroBiasZ = gzSum / samples;

  float axAvg = axSum / samples;
  float ayAvg = aySum / samples;
  float azAvg = azSum / samples;

  baselinePitch = atan2(-axAvg, sqrt(ayAvg * ayAvg + azAvg * azAvg)) * 57.2957795f;
  baselineRoll  = atan2(ayAvg, azAvg) * 57.2957795f;

  pitch = baselinePitch;
  roll  = baselineRoll;

  prevMag = sqrt(axAvg * axAvg + ayAvg * ayAvg + azAvg * azAvg);

  Serial.println("Calibration done.");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibration Done");
  delay(1000);
}

// -------------------- Setup --------------------
void setup() {
  Serial.begin(9600);
  delay(500);

  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);
  pinMode(alertLED, OUTPUT);
  pinMode(buzzer, OUTPUT);

  lcd.init();
  lcd.backlight();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Landslide Sys");
  lcd.setCursor(0, 1);
  lcd.print("Booting...");

  if (!mpu.begin()) {
    Serial.println("MPU6050 NOT FOUND");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("MPU6050 ERROR");
    lcd.setCursor(0, 1);
    lcd.print("Check Wiring");
    while (1) {
      delay(100);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  calibrateSensors();

  currentState = STATE_SAFE;
  setOutputs(currentState);
  showState(currentState);

  Serial.println("System Ready");
}

// -------------------- Loop --------------------
void loop() {
  unsigned long now = millis();
  if (now - lastSampleTime < sampleInterval) return;

  float dt = (now - lastSampleTime) / 1000.0f;
  lastSampleTime = now;

  // Read moisture
  int moistureValue = analogRead(moisturePin);
  updateMoistureState(moistureValue);

  // Read MPU6050
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Acceleration magnitude
  float mag = sqrt(
    a.acceleration.x * a.acceleration.x +
    a.acceleration.y * a.acceleration.y +
    a.acceleration.z * a.acceleration.z
  );

  float smoothMag = movingAverage(mag);

  // Accel-based angles
  float accelPitch = atan2(-a.acceleration.x,
                           sqrt(a.acceleration.y * a.acceleration.y +
                                a.acceleration.z * a.acceleration.z)) * 57.2957795f;

  float accelRoll  = atan2(a.acceleration.y, a.acceleration.z) * 57.2957795f;

  // Gyro in deg/s with bias removed
  float gyroX = (g.gyro.x - gyroBiasX) * 57.2957795f;
  float gyroY = (g.gyro.y - gyroBiasY) * 57.2957795f;
  float gyroZ = (g.gyro.z - gyroBiasZ) * 57.2957795f;

  float gyroMag = sqrt(gyroX * gyroX + gyroY * gyroY + gyroZ * gyroZ);

  // Complementary filter
  pitch = alpha * (pitch + gyroX * dt) + (1.0f - alpha) * accelPitch;
  roll  = alpha * (roll  + gyroY * dt) + (1.0f - alpha) * accelRoll;

  // Deviation from baseline
  float pitchDeviation = fabs(pitch - baselinePitch);
  float rollDeviation   = fabs(roll - baselineRoll);
  float tiltDeviation   = max(pitchDeviation, rollDeviation);

  float accelDelta = fabs(smoothMag - prevMag);
  prevMag = smoothMag;

  // -------------------- Detection logic --------------------
  bool wetCondition = moistureWetStable;

  bool warningSignal = (tiltDeviation > warningTiltThreshold) ||
                       (gyroMag > gyroWarningThreshold) ||
                       (accelDelta > accelWarningDelta);

  bool dangerSignal  = (tiltDeviation > dangerTiltThreshold) ||
                       (gyroMag > gyroDangerThreshold) ||
                       (accelDelta > accelDangerDelta) ||
                       ((tiltDeviation > warningTiltThreshold) &&
                        (gyroMag > gyroWarningThreshold));

  // Wet soil makes the system slightly more responsive
  if (wetCondition) {
    warningSignal = warningSignal || (tiltDeviation > 1.7f) || (gyroMag > 10.0f);
    dangerSignal  = dangerSignal  || ((tiltDeviation > 3.5f) && (gyroMag > 18.0f));
  }

  // -------------------- Counter handling --------------------
  if (warningSignal) {
    warningCounter++;
  } else {
    if (warningCounter > 0) warningCounter--;
  }

  if (dangerSignal) {
    dangerCounter++;
  } else {
    if (dangerCounter > 0) dangerCounter--;
  }

  bool calmMotion = (tiltDeviation < calmTiltThreshold) &&
                    (gyroMag < calmGyroThreshold) &&
                    (accelDelta < calmAccelThreshold);

  if (calmMotion) {
    calmCounter++;
  } else {
    calmCounter = 0;
  }

  // -------------------- Decide system state --------------------
  SystemState newState = currentState;

  if (calmCounter >= recoveryConfirmCount) {
    newState = STATE_SAFE;
    warningCounter = 0;
    dangerCounter = 0;
  } else if (dangerCounter >= dangerConfirmCount) {
    newState = STATE_DANGER;
  } else if (warningCounter >= warningConfirmCount) {
    newState = STATE_WARNING;
  } else {
    newState = STATE_SAFE;
  }

  // -------------------- Update outputs if state changes --------------------
  if (newState != currentState) {
    currentState = newState;
    setOutputs(currentState);
    showState(currentState);
  }

  // -------------------- Debug output --------------------
  Serial.print("moisture=");
  Serial.print(moistureValue);
  Serial.print(" wet=");
  Serial.print(moistureWetStable ? "1" : "0");
  Serial.print(" pitch=");
  Serial.print(pitch, 2);
  Serial.print(" roll=");
  Serial.print(roll, 2);
  Serial.print(" tiltDev=");
  Serial.print(tiltDeviation, 2);
  Serial.print(" gyroMag=");
  Serial.print(gyroMag, 2);
  Serial.print(" accelDelta=");
  Serial.print(accelDelta, 2);
  Serial.print(" warnCnt=");
  Serial.print(warningCounter);
  Serial.print(" dangerCnt=");
  Serial.print(dangerCounter);
  Serial.print(" calmCnt=");
  Serial.println(calmCounter);
}