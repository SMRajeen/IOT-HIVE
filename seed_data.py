import os
import sys

BASE_DIR = r"C:\Users\rajee\Downloads\Front End"
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from marketplace.models import (
    Category,
    Project,
    ProjectTier,
    ProjectBOMItem,
    ProjectAttachment,
    ProjectImage,
    ProjectVideo,
    ProjectModel3D,
    Favorite,
    ProjectRequest,
    Order,
    ProjectReview,
    HardwareBounty,
    BountyProposal,
    ChatMessage,
    NotificationLog,
)

print('Clearing existing records for Phase 4 fresh seed...')
NotificationLog.objects.all().delete()
ChatMessage.objects.all().delete()
BountyProposal.objects.all().delete()
HardwareBounty.objects.all().delete()
ProjectReview.objects.all().delete()
Order.objects.all().delete()
ProjectRequest.objects.all().delete()
Favorite.objects.all().delete()
ProjectTier.objects.all().delete()
ProjectBOMItem.objects.all().delete()
ProjectAttachment.objects.all().delete()
ProjectModel3D.objects.all().delete()
ProjectVideo.objects.all().delete()
ProjectImage.objects.all().delete()
Project.objects.all().delete()
UserProfile.objects.all().delete()
User.objects.all().delete()
Category.objects.all().delete()

print('Creating platform users with verified phone numbers...')
admin_user = User.objects.create_superuser(
    username='admin',
    email='admin@iothive.lk',
    password='adminpassword123',
    first_name='Platform',
    last_name='Admin'
)
UserProfile.objects.create(
    user=admin_user,
    role='both',
    bio='IoT HIVE Core Platform Administrator & Lead Hardware Engineer in Sri Lanka.',
    phone_number='+94770000001',
    notify_sms_orders=True,
    notify_sms_bounties=True,
    notify_sms_chat=True
)

alex_user = User.objects.create_user(
    username='maker_alex',
    email='alex@makerhub.lk',
    password='password123',
    first_name='Alex',
    last_name='Vance'
)
UserProfile.objects.create(
    user=alex_user,
    role='seller',
    bio='Embedded hardware engineer based in Colombo, specializing in ESP32, Smart Agriculture, and LoRaWAN.',
    location='Colombo, Sri Lanka',
    website='https://github.com/alex-vance-iot',
    phone_number='+94771234567',
    notify_sms_orders=True,
    notify_sms_bounties=True,
    notify_sms_chat=True
)

sarah_user = User.objects.create_user(
    username='sarah_robotics',
    email='sarah@robotics.lk',
    password='password123',
    first_name='Sarah',
    last_name='Silva'
)
UserProfile.objects.create(
    user=sarah_user,
    role='seller',
    bio='Robotics researcher and Mechatronics maker in Kandy. ROS2, STM32, and brushless motor driver design.',
    location='Kandy, Sri Lanka',
    phone_number='+94772345678',
    notify_sms_orders=True,
    notify_sms_bounties=True,
    notify_sms_chat=True
)

kasun_user = User.objects.create_user(
    username='kasun_perera',
    email='kasun@clienthub.lk',
    password='password123',
    first_name='Kasun',
    last_name='Perera'
)
UserProfile.objects.create(
    user=kasun_user,
    role='buyer',
    bio='IoT Enthusiast, Smart Home Builder, and Tech Entrepreneur.',
    location='Galle, Sri Lanka',
    phone_number='+94773456789',
    notify_sms_orders=True,
    notify_sms_bounties=True,
    notify_sms_chat=True
)

nuwan_user = User.objects.create_user(
    username='nuwan_embedded',
    email='nuwan@makerlab.lk',
    password='password123',
    first_name='Nuwan',
    last_name='Fernando'
)
UserProfile.objects.create(
    user=nuwan_user,
    role='both',
    bio='Custom PCB designer & high-speed digital systems engineer in Moratuwa.',
    location='Moratuwa, Sri Lanka',
    phone_number='+94774567890',
    notify_sms_orders=True,
    notify_sms_bounties=True,
    notify_sms_chat=True
)

print('Seeding hardware categories...')
cat_agri = Category.objects.create(
    name='Smart Agriculture & IoT',
    slug='smart-agriculture',
    description='Automated irrigation, soil analytics, LoRa environmental nodes, and greenhouse telemetry.',
    icon='psychiatry'
)
cat_robotics = Category.objects.create(
    name='Robotics & Automation',
    slug='robotics-automation',
    description='Mecanum rovers, robotic arms, BLDC motor drivers, and computer vision kits.',
    icon='precision_manufacturing'
)
cat_wearables = Category.objects.create(
    name='Wearables & Biometrics',
    slug='wearables-biometrics',
    description='ECG, pulse oximetry, motion tracking, and ultra-low power biometric smart bands.',
    icon='watch'
)
cat_audio = Category.objects.create(
    name='Audio DSP & Synthesizers',
    slug='audio-dsp',
    description='MIDI hardware, Eurorack modules, digital signal processing, and low-latency audio gear.',
    icon='graphic_eq'
)

print('Seeding projects, tiers, BOMs, and code...')

# Project 1: Smart Garden
p1 = Project.objects.create(
    seller=alex_user,
    category=cat_agri,
    title='ESP32 Autonomous Indoor Smart Garden System',
    short_description='Closed-loop hydroponic controller with capacitive moisture sensing, water level ultrasonic radar, OLED telemetry, and AWS IoT MQTT dashboard.',
    description="""## Overview
The ESP32 Autonomous Indoor Smart Garden monitors soil moisture, temperature, humidity, and ambient light levels, automatically regulating a 12V submersible peristaltic pump and full-spectrum LED grow array.

### Key Hardware Features
- **Dual-Core ESP32-WROOM-32E** handling FreeRTOS tasks for real-time sensor sampling.
- **Capacitive Soil Moisture Sensors (v1.2)** corrosion-resistant analog inputs.
- **I2C 0.96" 128x64 OLED Display** real-time local HUD.
- **Low-RDS(on) Dual N-Channel MOSFET (AO4606)** PWM pump and light power switching.

### Flashing Instructions
1. Clone the repository and open with **PlatformIO** in VSCode.
2. Update `config.h` with your local Wi-Fi SSID and MQTT broker endpoint.
3. Build and upload with `pio run --target upload` at 921600 baud.""",
    price=3500.00,
    is_free=False,
    status='published',
    featured=True,
    views=430,
    microcontroller='ESP32-WROOM-32E',
    connectivity='Wi-Fi & Bluetooth LE & MQTT',
    difficulty='intermediate',
    estimated_build_time='2-3 Hours',
    source_code_language='cpp',
    source_code="""#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define PUMP_PIN 25
#define MOISTURE_PIN 34
#define PUMP_THRESHOLD 1850

Adafruit_SSD1306 display(128, 64, &Wire, -1);
WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
  Serial.begin(115200);
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 10);
  display.println("IoT HIVE Garden v2");
  display.display();
}

void loop() {
  int moisture = analogRead(MOISTURE_PIN);
  if (moisture > PUMP_THRESHOLD) {
    digitalWrite(PUMP_PIN, HIGH);
    delay(2000);
    digitalWrite(PUMP_PIN, LOW);
  }
  delay(10000);
}"""
)

# Project 1 Tiers
ProjectTier.objects.create(
    project=p1,
    tier_type='digital',
    name='Digital Blueprint & Firmware Source',
    price=3500.00,
    currency='LKR',
    description='Instant download of KiCad schematics, 4-layer Gerber zip, BOM, and PlatformIO source code.',
    requires_shipping=False
)
ProjectTier.objects.create(
    project=p1,
    tier_type='kit',
    name='Complete DIY Component Kit',
    price=12500.00,
    currency='LKR',
    description='All parts included: Pre-manufactured matte-black PCB, ESP32, capacitive probes, 12V pump, and OLED display.',
    requires_shipping=True,
    stock_quantity=15
)
ProjectTier.objects.create(
    project=p1,
    tier_type='assembled',
    name='Turnkey Tested & Assembled Unit',
    price=24000.00,
    currency='LKR',
    description='Fully assembled in 3D PETG enclosure, quality tested, pre-flashed, ready to plug in.',
    requires_shipping=True,
    stock_quantity=8
)

# Project 1 BOM
ProjectBOMItem.objects.create(project=p1, name='ESP32-WROOM-32E MCU Module', part_number='ESP32-WROOM-32E-N4', quantity=1, estimated_cost=1650.00, supplier_url='https://lankatronics.com')
ProjectBOMItem.objects.create(project=p1, name='Capacitive Soil Moisture Sensor v1.2', part_number='SEN0193', quantity=2, estimated_cost=450.00, supplier_url='https://tronic.lk')
ProjectBOMItem.objects.create(project=p1, name='0.96 inch I2C OLED Display 128x64', part_number='SSD1306-096-I2C', quantity=1, estimated_cost=850.00, supplier_url='https://lankatronics.com')
ProjectBOMItem.objects.create(project=p1, name='12V Peristaltic Dosing Pump', part_number='G528-12V-DC', quantity=1, estimated_cost=2200.00, supplier_url='https://tronic.lk')

# Project 2: ROS2 Rover
p2 = Project.objects.create(
    seller=sarah_user,
    category=cat_robotics,
    title='Quad-Omni Autonomous ROS2 Surveillance Rover',
    short_description='All-terrain robotic rover with Mecanum wheels, dual STM32 motor co-processors, 2D LiDAR SLAM, and WebRTC ultra-low-latency video streaming.',
    description="""## Overview
The Quad-Omni Rover delivers 360° holonomic movement with precision odometry powered by dual STM32F4 microcontrollers and a central Raspberry Pi 4 running ROS2 Humble.""",
    price=12500.00,
    is_free=False,
    status='published',
    featured=True,
    views=890,
    microcontroller='STM32F401 + Raspberry Pi 4',
    connectivity='Wi-Fi 5GHz & WebRTC & ROS2 DDS',
    difficulty='advanced',
    estimated_build_time='6-8 Hours',
    source_code_language='python',
    source_code="""import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class RoverDriver(Node):
    def __init__(self):
        super().__init__('quad_rover_driver')
        self.sub = self.create_subscription(Twist, '/cmd_vel', self.vel_cb, 10)
        self.get_logger().info("Quad-Omni Rover Controller online.")

    def vel_cb(self, msg):
        vx = msg.linear.x
        vy = msg.linear.y
        wz = msg.angular.z
        # Inverse Kinematics for 4 Mecanum wheels
        w1 = vx - vy - wz
        w2 = vx + vy + wz
        w3 = vx + vy - wz
        w4 = vx + vy + wz
        # Send PWM via I2C to STM32 co-processor"""
)

# Project 2 Tiers
ProjectTier.objects.create(project=p2, tier_type='digital', name='ROS2 Code & 3D STL Blueprint Package', price=12500.00, currency='LKR', description='ROS2 packages, URDF files, STM32 motor driver firmware, and full CAD step files.', requires_shipping=False)
ProjectTier.objects.create(project=p2, tier_type='kit', name='Chassis & Mecanum Hardware Kit', price=48000.00, currency='LKR', description='Laser-cut anodized aluminum chassis, 4x Planetary Gear Motors with Hall encoders, and 4x Mecanum wheels.', requires_shipping=True, stock_quantity=5)
ProjectTier.objects.create(project=p2, tier_type='assembled', name='Turnkey Autonomous Rover (Ready-to-Run)', price=95000.00, currency='LKR', description='Complete with 2D LiDAR, Raspberry Pi 4 (4GB), battery pack, calibrated and pre-flashed.', requires_shipping=True, stock_quantity=3)

# Project 2 BOM
ProjectBOMItem.objects.create(project=p2, name='STM32F401CEU6 BlackPill Board', part_number='STM32F401CEU6', quantity=2, estimated_cost=1950.00, supplier_url='https://lankatronics.com')
ProjectBOMItem.objects.create(project=p2, name='12V Planetary DC Geared Motor with Optical Encoder', part_number='PG28-395-12V', quantity=4, estimated_cost=4200.00, supplier_url='https://tronic.lk')

# Seed Orders
o1 = Order.objects.create(
    project=p1,
    tier=p1.tiers.first(),
    tier_type='digital',
    buyer=kasun_user,
    seller=alex_user,
    amount=3500.00,
    currency='LKR',
    status='paid',
    payment_method='Mastercard',
    payment_gateway='payhere',
    transaction_id='HIVE-LK-A1B2C3D4',
    shipping_full_name='Kasun Perera',
    shipping_city='Colombo',
    shipping_address='No 45, Galle Road, Colombo 03',
    shipping_phone='0773456789'
)

# Seed Verified Reviews & Community Makes
print('Seeding Reviews and Community Makes...')
r1 = ProjectReview.objects.create(
    project=p1,
    user=kasun_user,
    rating=5,
    title='Flawless PCB design & crystal clear build guide!',
    comment='Assembled the smart garden circuit board over the weekend. The analog filtering on the moisture sensors is top-notch — zero noise issues when switching the 12V water pump. Uploaded the PlatformIO code to my ESP32 and it connected straight to MQTT.',
    is_verified_buyer=True
)

r2 = ProjectReview.objects.create(
    project=p1,
    user=nuwan_user,
    rating=5,
    title='Great BOM component selection and low standby current',
    comment='Substituted the AO4606 with a localized dual FET from my parts drawer without issue. Highly recommended for indoor hydroponic setups.',
    is_verified_buyer=False
)

r3 = ProjectReview.objects.create(
    project=p2,
    user=kasun_user,
    rating=5,
    title='Incredible omnidirectional kinematics & SLAM navigation',
    comment='The ROS2 driver nodes worked out of the box with Nav2. Mecanum wheel traction is superb on tile and hardwood floors.',
    is_verified_buyer=False
)

print('Seeding Hardware Bounties & Proposals...')
b1 = HardwareBounty.objects.create(
    client=kasun_user,
    category=cat_agri,
    title='Custom LoRaWAN Soil Moisture & Weather Array for Tea Estate',
    budget=45000.00,
    currency='LKR',
    deadline_days=14,
    difficulty='intermediate',
    preferred_mcu='ESP32-S3 / STM32WL55',
    connectivity='LoRaWAN (US915/AS923) & Solar MPPT',
    description="""We operate an organic tea plantation in Nuwara Eliya and need 5 rugged, battery-powered outdoor nodes. Must measure soil moisture at 15cm and 30cm depths, soil temperature, ambient humidity, and transmit data every 15 minutes to a central ChirpStack gateway.

Power supply: 18650 LiFePO4 cell + 2W monocrystalline solar panel.""",
    deliverables_needed='Custom PCB Gerber zip (JLCPCB friendly), schematic PDF, firmware source code in C++ (Arduino/PlatformIO), and 3D printable IP67 enclosure STL.',
    status='open'
)

b2 = HardwareBounty.objects.create(
    client=kasun_user,
    category=cat_robotics,
    title='STM32 Quad-BLDC Field-Oriented Motor Controller (FOC)',
    budget=85000.00,
    currency='LKR',
    deadline_days=21,
    difficulty='expert',
    preferred_mcu='STM32G431 / STM32F4',
    connectivity='CAN Bus (CAN-FD) + UART',
    description="""Need a compact 4-layer PCB motor controller board capable of driving 4 brushless gimbal motors with magnetic AS5600 angle encoders using SimpleFOC algorithm for precision robotic joint positioning.

Input voltage: 12V–24V DC up to 10A continuous per channel.""",
    deliverables_needed='Altium/KiCad hardware schematics, PCB layout with thermal relief, and calibrated SimpleFOC firmware.',
    status='open'
)

# Seed Proposals on Bounties
BountyProposal.objects.create(
    bounty=b1,
    maker=alex_user,
    pitch='I have extensive experience deploying LoRaWAN environmental stations across Sri Lanka using SX1262 modules and ChirpStack. I can design an ultra-low power board with deep-sleep current under 15uA and provide a tested IP67 3D enclosure.',
    bid_amount=42000.00,
    currency='LKR',
    delivery_days=10,
    status='pending'
)

BountyProposal.objects.create(
    bounty=b1,
    maker=nuwan_user,
    pitch='I can integrate an STM32WL55 SoC which combines MCU and LoRa transceiver on a single chip, drastically reducing PCB footprint and BOM cost. Will include full Gerber files and PlatformIO code.',
    bid_amount=45000.00,
    currency='LKR',
    delivery_days=12,
    status='pending'
)

print('Seeding Live Chat Message Threads...')
ChatMessage.objects.create(
    sender=kasun_user,
    recipient=alex_user,
    project=p1,
    message='Hi Alex! I ordered the Smart Garden digital blueprint. What wire gauge do you recommend for the 12V pump lead?'
)

ChatMessage.objects.create(
    sender=alex_user,
    recipient=kasun_user,
    project=p1,
    message='Hey Kasun! For the 12V peristaltic pump, standard 22 AWG or 20 AWG silicone stranded wire works great.'
)

# Seed Phase 4 Initial Notification Audit Logs
print('Seeding Phase 4 SMS Notification Logs...')
NotificationLog.objects.create(
    recipient=kasun_user,
    phone_number='+94773456789',
    event_type='order_created',
    message="[IoT HIVE] Order #HIVE-LK-A1B2C3D4 Confirmed! You ordered 'ESP32 Autonomous Indoor Smart Garden System' for Rs. 3,500.00. Thank you for supporting open hardware!",
    gateway='twilio',
    status='sent',
    gateway_response='{"sid": "SM_MOCK_123456", "status": "delivered"}'
)

NotificationLog.objects.create(
    recipient=alex_user,
    phone_number='+94771234567',
    event_type='order_created',
    message="[IoT HIVE] New Hardware Sale! Kasun Perera purchased 'ESP32 Autonomous Indoor Smart Garden System' for Rs. 3,500.00. Check your dashboard to manage fulfillment.",
    gateway='twilio',
    status='sent',
    gateway_response='{"sid": "SM_MOCK_654321", "status": "delivered"}'
)

print('Phase 4 Database Seeding Complete!')
print(f'Total Users: {User.objects.count()}')
print(f'Total Projects: {Project.objects.count()}')
print(f'Total Reviews: {ProjectReview.objects.count()}')
print(f'Total Bounties: {HardwareBounty.objects.count()}')
print(f'Total Proposals: {BountyProposal.objects.count()}')
print(f'Total Chat Messages: {ChatMessage.objects.count()}')
print(f'Total Notification Logs: {NotificationLog.objects.count()}')
