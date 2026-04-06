
# Terra-Scape: Integrated IoT Landslide Early Warning System

## Problem Statement

Traditional landslide warning systems lack real-time responsiveness, affordability, and accessibility in vulnerable regions.

## Proposed Solution

Terra-Scape is a low-cost, real-time IoT system designed to detect early signs of landslides by combining soil moisture sensing and motion analysis to trigger preventive alerts.


## Programming and Technologies Used

*Embedded C and Arduino IDE for microcontroller programming
*HTML, CSS, JavaScript for web dashboard
*Python for simulation and data visualization
*Communication protocols: MQTT and HTTP
*Hardware integration using I2C and analog input

---

## System Architecture and Hardware

* Soil Moisture Sensor : Detects ground saturation levels
* MPU6050 Accelerometer and Gyroscope: Detects ground tilt, vibration, and movement
* Microcontroller (Arduino or ESP32): Processes sensor data and applies logic
* Alert System: LED and buzzer for immediate warning
* Web Dashboard: Real-time data visualization and monitoring


---

## Working Logic

1. Continuous data collection from sensors
2. Soil moisture compared with predefined threshold
3. Movement detected using accelerometer readings
4. Alerts triggered when critical conditions are met
5. Data sent to dashboard for visualization



## Features

* Real-time monitoring of environmental conditions
* Graph-based data visualization
* Instant alert system using LED and buzzer
* Low-cost and easy to deploy
* Scalable for rural and hilly regions


---

<img width="1919" height="912" alt="Screenshot 2026-04-04 005535" src="https://github.com/user-attachments/assets/b1967071-4d32-41df-81c2-4bf1a63bd4ef" />


---


## Future Scope

* AI-based landslide prediction
* Mobile alert system
* Integration with GIS and satellite data
* Deployment in high-risk regions for real-world testing


## Conclusion

Terra-Scape presents a practical and scalable approach to landslide early warning by combining real-time sensing, local alert systems, and data visualization. It aims to provide an affordable solution for disaster-prone regions.
