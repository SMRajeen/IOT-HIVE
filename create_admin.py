import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile
from marketplace.models import (
    Category,
    Project,
    ProjectTier,
    ProjectBOMItem
)

# -------------------------------------------------------------
# 1. Superuser Initialization / Credential Synchronization
# -------------------------------------------------------------
admin_username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'IOT-HIVE')
admin_email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'rajeenm2003@gmail.com')
admin_password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'IotHive2026!Admin')

admin_user, created = User.objects.get_or_create(
    username=admin_username,
    defaults={'email': admin_email, 'is_staff': True, 'is_superuser': True}
)

admin_user.email = admin_email
admin_user.is_staff = True
admin_user.is_superuser = True
admin_user.set_password(admin_password)
admin_user.save()

profile, _ = UserProfile.objects.get_or_create(user=admin_user)
profile.role = 'admin'
profile.phone_number = '+94770000001'
profile.save()

print(f"[OK] Admin user '{admin_username}' synchronized successfully.")

# -------------------------------------------------------------
# 2. Standard Hardware Taxonomy (Categories) Seeding
# -------------------------------------------------------------
STANDARD_CATEGORIES = [
    {
        'name': 'Smart Home',
        'slug': 'smart-home',
        'icon': 'home_iot_device',
        'description': 'Automated ambient lighting, smart relays, energy monitors, and voice-assisted home controllers.'
    },
    {
        'name': 'Robotics & Autonomous',
        'slug': 'robotics',
        'icon': 'smart_toy',
        'description': 'Autonomous mobile rovers, robotic arms, computer vision payloads, and smart kinematics machines.'
    },
    {
        'name': 'DIY Electronics',
        'slug': 'electronics',
        'icon': 'memory',
        'description': 'Custom breakout PCBs, microcontroller development modules, sensor shields, and open hardware.'
    },
    {
        'name': 'Agriculture & Garden',
        'slug': 'agriculture',
        'icon': 'agriculture',
        'description': 'Long-range field telemetry, multispectral moisture sensors, and automated smart farming nodes.'
    },
    {
        'name': 'Health & Fitness',
        'slug': 'healthcare',
        'icon': 'monitor_heart',
        'description': 'Wearable health monitors, personal wellness gadgets, bio-signal loggers, and smart fitness trackers.'
    },
    {
        'name': 'Gadgets & Tools',
        'slug': 'gadgets',
        'icon': 'build',
        'description': 'Everyday pocket tools, digital desk displays, custom macro controllers, and wireless gizmos.'
    },
    {
        'name': 'Connectivity & LoRaWAN',
        'slug': 'connectivity',
        'icon': 'router',
        'description': 'Long-range packet forwarders, multi-hop mesh relays, and zero-downtime gateway appliances.'
    },
    {
        'name': 'Edge AI & Compute',
        'slug': 'edge-compute',
        'icon': 'developer_board',
        'description': 'Low-latency edge artificial intelligence, embedded inference engines, and industrial DIN gateways.'
    }
]

for cat_data in STANDARD_CATEGORIES:
    cat, _ = Category.objects.get_or_create(
        slug=cat_data['slug'],
        defaults=cat_data
    )
    cat.name = cat_data['name']
    cat.icon = cat_data['icon']
    cat.description = cat_data['description']
    cat.save()

print(f"[OK] {len(STANDARD_CATEGORIES)} platform categories verified & ready.")

# -------------------------------------------------------------
# 3. Seed Sample Creator & Demo Project if marketplace is empty
# -------------------------------------------------------------
if Project.objects.count() == 0:
    demo_creator, _ = User.objects.get_or_create(
        username='techmaker_lk',
        defaults={'email': 'maker@iothive.lk', 'first_name': 'Kasun', 'last_name': 'Perera'}
    )
    demo_creator.set_password('maker123456')
    demo_creator.save()

    c_prof, _ = UserProfile.objects.get_or_create(user=demo_creator)
    c_prof.role = 'seller'
    c_prof.bio = 'Embedded IoT Systems Engineer based in Moratuwa, Sri Lanka. Specializing in ESP32 automation, sensors, and precision agriculture.'
    c_prof.location = 'Colombo, Sri Lanka'
    c_prof.phone_number = '+94710509154'
    c_prof.save()

    agri_cat = Category.objects.filter(slug='agriculture').first() or Category.objects.first()

    p_title = 'Automated Smart Hydroponics & Aeroponics Controller (ESP32)'
    proj, created_p = Project.objects.get_or_create(
        title=p_title,
        defaults={
            'seller': demo_creator,
            'category': agri_cat,
            'short_description': 'Complete ESP32 IoT hydroponics monitoring unit with automatic pH, EC dosers, water temperature, and OLED telemetry.',
            'description': 'Production-grade, closed-loop IoT hydroponic management system designed for vertical indoor farms.\n\n### Features:\n- Dual-Core ESP32-WROOM-32 Wi-Fi & BLE\n- Industrial pH & EC Sensor integration\n- 4-Channel Relays for peristaltic dosing\n- Live MQTT Telemetry and OLED dashboard',
            'price': 2500.00,
            'is_free': False,
            'status': 'published',
            'featured': True,
            'microcontroller': 'ESP32-WROOM-32',
            'connectivity': 'Wi-Fi 802.11 b/g/n, Bluetooth 5.0 LE, MQTT',
            'difficulty': 'intermediate',
            'estimated_build_time': '2-3 Hours',
            'source_code_language': 'cpp',
            'source_code': '// IoT HIVE Hydroponics Firmware\nvoid setup() { Serial.begin(115200); }\nvoid loop() { delay(1000); }'
        }
    )

    if created_p:
        ProjectTier.objects.create(
            project=proj,
            tier_type='digital',
            name='Digital Blueprint & KiCad Files',
            price=2500.00,
            currency='LKR',
            description='Instant digital download of Gerber PCB files, KiCad schematics, firmware source code, and 3D STL enclosure.',
            requires_shipping=False
        )
        ProjectTier.objects.create(
            project=proj,
            tier_type='kit',
            name='Complete DIY Electronic Parts Kit',
            price=8500.00,
            currency='LKR',
            description='Includes custom fabricated dual-layer PCB, ESP32 board, optocoupled relays, screw terminals, and sensors.',
            requires_shipping=True
        )
        ProjectBOMItem.objects.create(
            project=proj,
            name='ESP32 NodeMCU Development Board',
            part_number='ESP32-WROOM-32D',
            quantity=1,
            estimated_cost=1850.00,
            supplier_url='https://tronic.lk'
        )
        print("[OK] Demo hardware project & BOM seeded.")
