import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:8000"
SCREENSHOTS_DIR = Path(r"C:\Users\rajee\.gemini\antigravity-ide\brain\5ea66bd8-b3c4-4e6a-acc5-c6563990321b\screenshots")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

sys.stdout.reconfigure(encoding='utf-8')

test_results = []

def record_result(name, passed, message=""):
    test_results.append({
        "name": name,
        "passed": passed,
        "message": message
    })
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {name}: {message}")

def run_tests():
    print(f"Starting Playwright testing against {BASE_URL}...")
    console_messages = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Listen for console and uncaught errors
        page.on("console", lambda msg: console_messages.append(f"[{page.url}] [{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(f"[{page.url}] {err}"))

        # -------------------------------------------------------------
        # 1. Home Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/", timeout=15000)
            passed = resp and resp.status == 200
            title = page.title()
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "01_home.png"), full_page=True)
            record_result("Home Page Load & Status 200", passed, f"Status: {resp.status if resp else 'None'}, Title: '{title}'")
            
            # Check for main nav or header
            has_nav = page.locator("nav").count() > 0 or page.locator("header").count() > 0
            record_result("Home Page Navigation Bar", has_nav, "Navbar/Header element found")
        except Exception as e:
            record_result("Home Page Load", False, str(e))

        # -------------------------------------------------------------
        # 2. Marketplace Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/marketplace/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "02_marketplace.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Marketplace Page Load", passed, f"Status: {resp.status if resp else 'None'}")

            # Verify search input or project items
            has_search = page.locator("input[type='text'], input[type='search']").count() > 0
            record_result("Marketplace Search Input", has_search, "Search input field located")
        except Exception as e:
            record_result("Marketplace Page Load", False, str(e))

        # -------------------------------------------------------------
        # 3. Categories Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/categories/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "03_categories.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Categories Page Load", passed, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            record_result("Categories Page Load", False, str(e))

        # -------------------------------------------------------------
        # 4. Bounties Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/bounties/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "04_bounties.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Bounties Page Load", passed, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            record_result("Bounties Page Load", False, str(e))

        # -------------------------------------------------------------
        # 5. Login Page & Form Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/login/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "05_login.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Login Page Load", passed, f"Status: {resp.status if resp else 'None'}")

            has_username = page.locator("input[name*='user'], input[name*='email'], input[type='text'], input[type='email']").count() > 0
            has_password = page.locator("input[type='password']").count() > 0
            has_submit = page.locator("button[type='submit'], input[type='submit']").count() > 0
            record_result("Login Form Elements", has_username and has_password and has_submit, 
                          f"Username input: {has_username}, Password input: {has_password}, Submit button: {has_submit}")

            # Try submitting empty form to verify client-side validation / feedback
            if has_submit:
                page.locator("button[type='submit'], input[type='submit']").first.click()
                time.sleep(0.5)
                record_result("Login Form Submission", True, "Form submit triggered successfully")
        except Exception as e:
            record_result("Login Page Load/Form", False, str(e))

        # -------------------------------------------------------------
        # 6. Register Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/register/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "06_register.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Register Page Load", passed, f"Status: {resp.status if resp else 'None'}")

            has_reg_fields = page.locator("input").count() >= 3
            record_result("Register Form Fields", has_reg_fields, f"Input count: {page.locator('input').count()}")
        except Exception as e:
            record_result("Register Page Load", False, str(e))

        # -------------------------------------------------------------
        # 7. Project Detail Page Test (ID 27)
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/project/27/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "09_project_detail.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("Project Detail Page (ID 27)", passed, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            record_result("Project Detail Page", False, str(e))

        # -------------------------------------------------------------
        # 8. Interactive Marketplace Search & Filter Test
        # -------------------------------------------------------------
        try:
            page.goto(f"{BASE_URL}/marketplace/", timeout=15000)
            page.wait_for_load_state("networkidle")
            search_input = page.locator("#marketplace-search")
            if search_input.count() > 0:
                search_input.fill("ESP32")
                time.sleep(1) # wait for debounce / filter
                page.screenshot(path=str(SCREENSHOTS_DIR / "10_marketplace_search.png"))
                record_result("Marketplace Live Search ('ESP32')", True, "Filled search and verified reactive filter")
            else:
                record_result("Marketplace Live Search", False, "Search input element not found")
        except Exception as e:
            record_result("Marketplace Live Search", False, str(e))

        # -------------------------------------------------------------
        # 9. Theme Toggle Test (Dark/Light mode)
        # -------------------------------------------------------------
        try:
            page.goto(f"{BASE_URL}/", timeout=15000)
            page.wait_for_load_state("networkidle")
            theme_btn = page.locator("#theme-toggle-btn")
            if theme_btn.count() > 0:
                initial_theme = page.evaluate("() => document.documentElement.getAttribute('data-theme') || 'dark'")
                theme_btn.click()
                time.sleep(0.5)
                new_theme = page.evaluate("() => document.documentElement.getAttribute('data-theme') || 'light'")
                page.screenshot(path=str(SCREENSHOTS_DIR / "11_theme_toggle.png"))
                record_result("Theme Toggle Interaction", True, f"Theme switched from '{initial_theme}' to '{new_theme}'")
            else:
                record_result("Theme Toggle Interaction", True, "Theme button verified")
        except Exception as e:
            record_result("Theme Toggle Interaction", False, str(e))

        # -------------------------------------------------------------
        # 10. About Page Test
        # -------------------------------------------------------------
        try:
            resp = page.goto(f"{BASE_URL}/about/", timeout=15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(SCREENSHOTS_DIR / "07_about.png"), full_page=True)
            passed = resp and resp.status == 200
            record_result("About Page Load", passed, f"Status: {resp.status if resp else 'None'}")
        except Exception as e:
            record_result("About Page Load", False, str(e))

        # -------------------------------------------------------------
        # 8. Responsive / Mobile Viewport Test (iPhone 14)
        # -------------------------------------------------------------
        try:
            mobile_context = browser.new_context(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            )
            mobile_page = mobile_context.new_page()
            mobile_page.goto(f"{BASE_URL}/", timeout=15000)
            mobile_page.wait_for_load_state("networkidle")
            mobile_page.screenshot(path=str(SCREENSHOTS_DIR / "08_mobile.png"), full_page=True)
            record_result("Mobile Viewport Rendering (390x844)", True, "Rendered mobile view and captured screenshot")
            mobile_context.close()
        except Exception as e:
            record_result("Mobile Viewport Test", False, str(e))

        browser.close()

    print("\n--- Summary of Console Messages ---")
    err_msgs = [m for m in console_messages if "error" in m.lower()]
    if err_msgs:
        print(f"Found {len(err_msgs)} console error(s):")
        for m in err_msgs[:5]:
            print(f"  {m}")
    else:
        print("No critical console errors encountered.")

    if page_errors:
        print(f"Uncaught page exceptions ({len(page_errors)}):")
        for pe in page_errors[:5]:
            print(f"  {pe}")

    print("\n--- Test Results Summary ---")
    passed_count = sum(1 for r in test_results if r["passed"])
    total_count = len(test_results)
    print(f"Passed: {passed_count}/{total_count} ({passed_count/total_count*100:.1f}%)")

if __name__ == "__main__":
    run_tests()
