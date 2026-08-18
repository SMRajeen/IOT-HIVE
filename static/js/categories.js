/**
 * IoT HIVE - Categories Page & Box Setup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  loadCategoriesPage();
});

const DEFAULT_CATEGORIES_METADATA = {
  'smart-home': {
    icon: 'home_iot_device',
    color: '#ff5357',
    tags: ['Matter', 'Thread', 'ESP32-S3', 'Zigbee 3.0', 'Home Assistant'],
    description: 'Automated ambient lighting, smart relays, energy monitors, and voice-assisted home controllers.'
  },
  'robotics': {
    icon: 'smart_toy',
    color: '#00ff88',
    tags: ['ROS2', 'SLAM LiDAR', 'Motor Drivers', 'Jetson Nano', 'CAN-FD'],
    description: 'Autonomous mobile rovers, robotic arms, computer vision payloads, and smart kinematics machines.'
  },
  'electronics': {
    icon: 'memory',
    color: '#00bfff',
    tags: ['Arduino', 'ESP32', 'KiCad BOM', 'STM32 ARM', 'RISC-V'],
    description: 'Custom breakout PCBs, microcontroller development modules, sensor shields, and open hardware.'
  },
  'agriculture': {
    icon: 'agriculture',
    color: '#a8ff00',
    tags: ['LoRaWAN', 'Soil NPK', 'Solar MPPT', 'Weather Station', 'Irrigation'],
    description: 'Long-range field telemetry, multispectral moisture sensors, and automated smart farming nodes.'
  },
  'healthcare': {
    icon: 'monitor_heart',
    color: '#ff007f',
    tags: ['BLE 5.3', 'PPG Vitals', 'Pulse Oximeter', 'Wearable', 'Ultra-Low Power'],
    description: 'Wearable health monitors, personal wellness gadgets, bio-signal loggers, and smart fitness trackers.'
  },
  'gadgets': {
    icon: 'build',
    color: '#ffaa00',
    tags: ['E-Paper', 'Wireless Remote', 'USB-C PD', 'Macro Pad', 'Sensors'],
    description: 'Everyday pocket tools, digital desk displays, custom macro controllers, and wireless gizmos.'
  },
  'connectivity': {
    icon: 'router',
    color: '#9d00ff',
    tags: ['LoRaWAN', 'Mesh Radio', 'Satellite SBD', 'Wi-Fi 6', 'Thread'],
    description: 'Long-range packet forwarders, multi-hop mesh relays, and zero-downtime gateway appliances.'
  },
  'edge-compute': {
    icon: 'developer_board',
    color: '#00e5ff',
    tags: ['TinyML', 'FPGA Accel', 'NPU Co-Proc', 'Linux SBC', 'MQTT Broker'],
    description: 'Low-latency edge artificial intelligence, embedded inference engines, and industrial DIN gateways.'
  }
};

async function loadCategoriesPage() {
  const grid = document.getElementById('categories-page-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
      <span class="material-symbols-outlined spin" style="font-size: 36px; color: var(--primary);">sync</span>
      <p style="margin-top: 12px; font-family: var(--font-mono); font-size: 0.9rem;">Loading hardware taxonomy...</p>
    </div>
  `;

  try {
    let categories = [];
    try {
      const data = await API.categories.list();
      categories = Array.isArray(data) ? data : (data.results || []);
    } catch (e) {
      console.warn('API error, falling back to static category definitions:', e);
    }

    if (!categories || categories.length === 0) {
      categories = [
        { id: 1, name: 'Smart Home', slug: 'smart-home', description: 'Automated lights, sensors, smart plugs, thermostats, and connected home gadgets.', icon: 'home_iot_device', project_count: 14 },
        { id: 2, name: 'Robotics & Autonomous', slug: 'robotics', description: 'Mobile robots, robotic arms, motor drivers, and smart moving machines.', icon: 'smart_toy', project_count: 22 },
        { id: 3, name: 'DIY Electronics', slug: 'electronics', description: 'Arduino and ESP32 boards, sensors, breakout modules, and custom maker circuits.', icon: 'memory', project_count: 38 },
        { id: 4, name: 'Agriculture & Garden', slug: 'agriculture', description: 'Soil moisture monitors, automatic plant waterers, and mini weather stations.', icon: 'agriculture', project_count: 9 },
        { id: 5, name: 'Health & Fitness', slug: 'healthcare', description: 'Wearable step counters, heart rate sensors, and personal wellness gadgets.', icon: 'monitor_heart', project_count: 11 },
        { id: 6, name: 'Gadgets & Tools', slug: 'gadgets', description: 'Everyday smart tools, remote controllers, digital displays, and wireless gadgets.', icon: 'build', project_count: 17 },
      ];
    }

    grid.innerHTML = categories.map((cat, idx) => {
      const meta = DEFAULT_CATEGORIES_METADATA[cat.slug] || {
        icon: cat.icon || 'device_hub',
        color: '#ff5357',
        tags: ['IoT', 'Hardware', 'Sensors', 'ESP32'],
        description: cat.description || 'Explore projects and open hardware in this category.'
      };

      const icon = cat.icon || meta.icon;
      const count = cat.project_count !== undefined ? cat.project_count : 0;
      const countLabel = count === 1 ? '1 PROJECT' : `${count} PROJECTS`;

      return `
        <div class="category-box-card card-cyber" style="padding: 28px 24px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); transition: all 0.25s ease;">
          <div class="card-ambient-glow"></div>
          
          <div>
            <!-- Top Box Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
              <div class="category-box-icon" style="width: 52px; height: 52px; border-radius: 12px; background: rgba(255, 83, 87, 0.1); border: 1px solid rgba(255, 83, 87, 0.3); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(255, 83, 87, 0.15);">
                <span class="material-symbols-outlined" style="font-size: 26px; color: var(--primary);">${icon}</span>
              </div>
              <span class="tag-mono" style="background: var(--bg-surface-high); border-color: var(--border-medium); color: var(--text-secondary); font-size: 0.72rem; padding: 4px 8px;">
                ${countLabel}
              </span>
            </div>

            <!-- Title & Description -->
            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">${Auth.escapeHtml(cat.name)}</h3>
            <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 18px;">
              ${Auth.escapeHtml(cat.description || meta.description)}
            </p>

            <!-- Popular Tech Tags inside box -->
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px;">
              ${meta.tags.map(t => `<span class="tag-mono" style="font-size: 0.7rem; padding: 2px 7px; background: var(--bg-surface-lowest);">${Auth.escapeHtml(t)}</span>`).join('')}
            </div>
          </div>

          <!-- Bottom Action Link -->
          <a href="/marketplace/?category=${encodeURIComponent(cat.slug)}" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span>Explore Category</span>
            <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span>
          </a>
        </div>
      `;
    }).join('');

  } catch (error) {
    grid.innerHTML = `
      <div class="card-cyber" style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted);">
        Unable to load categories at the moment.
      </div>
    `;
  }
}
