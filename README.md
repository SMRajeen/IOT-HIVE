# IoT HIVE — Smart Hardware & IoT Marketplace

<div align="center">

![IoT HIVE Badge](https://img.shields.io/badge/Platform-IoT%20HIVE-00ff88?style=for-the-badge&logo=microchip&logoColor=black)
![Django](https://img.shields.io/badge/Backend-Django%205.x-092E20?style=for-the-badge&logo=django&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production%20Ready-00E5FF?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-orange?style=for-the-badge)

**The premier open-hardware marketplace and decentralized maker ecosystem for IoT blueprints, dynamic BOM component sourcing, DIY electronics kits, and custom engineering bounties.**

</div>

---

## Key Features & Value Proposition

### 1. Dual-Sided Role-Adaptive Commerce
- **Buyer Experience**: Explore IoT hardware, browse by microcontroller categories, post custom hardware bounties, and track islandwide courier deliveries.
- **Creator Studio**: Publish circuit blueprints, KiCad/Gerber files, dynamic Bill of Materials (BOM), sell assembled units, and manage logistics dispatch.
- **Dual-Role Mode**: Full privileges to simultaneously create, bid, buy, and sell.

### 2. Multi-Tier Hardware Monetization
- **Tier 1 (Digital Blueprint)**: Instant access to Gerber PCB files, firmware source code, and 3D STL enclosures.
- **Tier 2 (DIY Parts Kit)**: Shipped electronic components and unpopulated custom PCB for hands-on makers.
- **Tier 3 (Assembled & Tested Unit)**: Pre-soldered, bench-tested, and programmed hardware ready for immediate deployment.

### 3. Automated Revenue Engine & Unit Economics
- **Transparent Platform Take-Rate**: 8% escrow and buyer protection fee automatically collected on transactions.
- **SaaS Subscription (Maker Pro Tier)**: Rs. 1,490/month recurring plan providing 0% commission, Gold Verified status, priority search placement, and instant SMS alerts.
- **Milestone Escrow (SafePay™)**: Funds held securely until physical prototype delivery and verification.

### 4. Logistics & SMS Telemetry
- **Sri Lanka Courier Integration**: Pre-configured dispatch tracking for Domex, PromptX, SpeedPost (SL Post), and Certis Lanka.
- **Automated SMS Gateway (NotifyLK / Twilio)**: Instant cellular SMS alerts dispatched on order placement, shipping updates, and bounty bids.

---

## Technology Stack

- **Backend Framework**: Python 3.11+ / Django 5.x / Django REST Framework
- **Frontend Architecture**: Modern Vanilla JavaScript (ES6+), Cyber-Modern Design System, CSS3 Variables, Glassmorphism HUD
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **Payment Processing**: PayHere Sri Lanka Gateway + Direct Card Processing Engine
- **SMS Communications**: NotifyLK (Sri Lanka) & Twilio Gateway
- **Security & Integrity**: 256-bit SSL token encryption, CSRF protection, PBKDF2 password hashing

---

## Getting Started & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SMRajeen/IOT-HIVE.git
cd IOT-HIVE
```

### 2. Set Up Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your specific API keys and secrets
```

### 5. Run Migrations & Start Server
```bash
python manage.py migrate
python manage.py runserver
```
Visit `http://localhost:8000` in your browser.

---

## Admin Credentials (Development)
- **Username**: `IOT-HIVE`
- **Password**: `123456`
- **Portal**: `/admin-panel/` or `/admin/`

---

## Hosting & Cloud Deployment

Ready for 1-click deployment on:
- **Render / Railway / Fly.io**: Uses `gunicorn config.wsgi:application`
- **VPS (Ubuntu / Nginx / Gunicorn)**: Standard WSGI setup with systemd services

---

<div align="center">
  <sub>Developed &amp; Engineered by <strong>Rajeen</strong> (@SMRajeen) &bull; IoT HIVE Platform</sub>
</div>
