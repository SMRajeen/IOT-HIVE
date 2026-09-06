import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
ARTIFACTS_DIR = Path(r"C:\Users\rajee\.gemini\antigravity-ide\brain\5ea66bd8-b3c4-4e6a-acc5-c6563990321b")
WORKSPACE_SCREENSHOTS = Path(r"c:\Users\rajee\Downloads\IOT-HIVE 3rd Version\screenshots")
WORKSPACE_SCREENSHOTS.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 950})
    
    print("Navigating to Project 27...")
    page.goto(f"{BASE_URL}/project/27/", timeout=15000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    
    # 1. Verify multi-column grid
    grid_display = page.evaluate("() => window.getComputedStyle(document.querySelector('.hardware-spec-grid')).display")
    grid_cols = page.evaluate("() => window.getComputedStyle(document.querySelector('.hardware-spec-grid')).gridTemplateColumns")
    cards_count = page.locator(".hardware-spec-card").count()
    print(f"Spec Grid Display: {grid_display}")
    print(f"Spec Grid Columns: {grid_cols}")
    print(f"Spec Cards Count: {cards_count}")
    
    # 2. Verify selected tier style
    tier_bg = page.evaluate("() => window.getComputedStyle(document.querySelector('.tier-selected')).backgroundColor")
    tier_border = page.evaluate("() => window.getComputedStyle(document.querySelector('.tier-selected')).borderColor")
    print(f"Selected Tier Background: {tier_bg}")
    print(f"Selected Tier Border Color: {tier_border}")
    
    # Save overview screenshot
    overview_art = ARTIFACTS_DIR / "09_project_detail.png"
    overview_ws = WORKSPACE_SCREENSHOTS / "09_project_detail.png"
    page.screenshot(path=str(overview_art), full_page=True)
    page.screenshot(path=str(overview_ws), full_page=True)
    print(f"Saved overview screenshot to {overview_ws}")
    
    # 3. Click Firmware & Code tab
    print("Switching to Firmware & Code tab...")
    page.locator(".project-tab-btn:has-text('Firmware & Code')").click()
    time.sleep(0.8)
    
    code_bg = page.evaluate("() => window.getComputedStyle(document.querySelector('.code-viewer-container')).backgroundColor")
    pre_color = page.evaluate("() => window.getComputedStyle(document.querySelector('.code-viewer-pre')).color")
    print(f"Code Viewer Background: {code_bg}")
    print(f"Code Text Color: {pre_color}")
    
    # Save code tab screenshot
    code_art = ARTIFACTS_DIR / "12_project_code_dark_mode.png"
    code_ws = WORKSPACE_SCREENSHOTS / "12_project_code_dark_mode.png"
    page.screenshot(path=str(code_art), full_page=True)
    page.screenshot(path=str(code_ws), full_page=True)
    print(f"Saved code tab screenshot to {code_ws}")
    
    browser.close()
    print("Verification completed successfully!")
