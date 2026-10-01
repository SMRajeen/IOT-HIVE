"""
IoT HIVE - Account Email Utilities
Handles automated branded email notifications (welcome emails, password resets, onboarding)
via Resend HTTPS REST API (Port 443 - 100% reliable on cloud platforms like Render)
with graceful fallback to Django SMTP / Console backend.
"""

import json
import logging
import os
import threading
import urllib.error
import urllib.request
from email.mime.image import MIMEImage

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, send_mail

logger = logging.getLogger(__name__)


def send_resend_email(recipient_email, subject, html_content, plain_text, from_email=None):
    """
    Sends an email using Resend's HTTPS REST API over standard Port 443.
    This completely bypasses cloud firewall SMTP port blocks (Render, AWS, etc.).
    """
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        return False, "RESEND_API_KEY not configured in environment"

    sender = from_email or os.getenv("RESEND_FROM_EMAIL", "IoT HIVE <onboarding@resend.dev>").strip()

    payload = {
        "from": sender,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content,
        "text": plain_text,
    }

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "IoTHive-App/1.0",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body) if res_body else {}
            return True, data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        return False, f"Resend HTTP {e.code}: {err_msg}"
    except Exception as e:
        return False, str(e)


def send_system_email(recipient_email, subject, plain_text, html_content=None, from_email=None):
    """
    High-level email dispatch helper:
    1. If RESEND_API_KEY is present: Sends via Resend HTTPS API (Port 443).
    2. Otherwise: Falls back to Django SMTP / Console.
    """
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        sender = from_email or os.getenv("RESEND_FROM_EMAIL", "IoT HIVE <onboarding@resend.dev>").strip()
        success, result = send_resend_email(
            recipient_email=recipient_email,
            subject=subject,
            html_content=html_content or f"<pre>{plain_text}</pre>",
            plain_text=plain_text,
            from_email=sender,
        )
        if success:
            logger.info("System email sent via Resend HTTPS to %s: %s", recipient_email, result)
            return True, result
        else:
            logger.warning("Resend failed: %s. Falling back to Django SMTP.", result)

    # Fallback to Django core mail
    try:
        from_email_addr = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", f"IoT HIVE <{getattr(settings, 'EMAIL_HOST_USER', 'iothive221@gmail.com')}>")
        send_mail(
            subject=subject,
            message=plain_text,
            html_message=html_content,
            from_email=from_email_addr,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        return True, "Delivered via Django SMTP"
    except Exception as e:
        logger.error("Django SMTP failed for %s: %s", recipient_email, e)
        return False, str(e)


def send_welcome_email(user, role="both", site_url=None):
    """
    Dispatches a branded welcome email to newly registered users in a background thread.
    Features:
    - Embedded IoT HIVE logo and live HTTPS hosted asset
    - Personalized greeting with user's name and credentials card
    - Actionable quick links to sign in and explore the platform
    - Prioritizes Resend HTTPS REST API (Port 443) on Render, falls back to SMTP
    """
    if not user or not user.email:
        return False

    recipient_email = user.email.strip()
    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
    full_name = f"{first_name} {last_name}".strip() or user.username
    display_name = first_name or user.username

    # Map role to user-friendly title
    role_map = {
        "seller": "Hardware Creator & Maker",
        "buyer": "Hardware Explorer & Buyer",
        "both": "Hardware Creator & Explorer",
    }
    role_display = role_map.get(role, "IoT Hardware Maker")

    base_url = (site_url or getattr(settings, "SITE_URL", "https://iot-hive.onrender.com")).rstrip("/")
    login_url = f"{base_url}/login/?email={recipient_email}"
    marketplace_url = f"{base_url}/marketplace/"
    bounties_url = f"{base_url}/bounties/"
    dashboard_url = f"{base_url}/dashboard/"
    logo_url = f"{base_url}/static/images/email-logo.png"

    subject = f"Welcome to IoT HIVE, {display_name}! 🚀"

    # Plain text version for non-HTML email clients
    plain_text = f"""Hello {display_name},

Welcome to IoT HIVE — the premier ecosystem for smart hardware innovators and embedded developers!

Your account has been created successfully. Here are your account details:
--------------------------------------------------
Name:         {full_name}
Username:     @{user.username}
Email:        {recipient_email}
Account Role: {role_display}
--------------------------------------------------

Sign in to your account here:
{login_url}

What you can do on IoT HIVE:
- Explore the Hardware Marketplace: {marketplace_url}
- Post or Browse Maker Bounties:     {bounties_url}
- Access your Creator Dashboard:     {dashboard_url}

If you have any questions, feel free to reply directly to this email or reach us at iothive221@gmail.com.

Best regards,
The IoT HIVE Team
https://iot-hive.onrender.com/
"""

    # Rich Cyber-Themed HTML email with both live HTTPS logo and CID fallback
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to IoT HIVE</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0f172a; border: 1px solid rgba(0, 229, 255, 0.28); border-radius: 16px; padding: 36px 28px; box-shadow: 0 16px 48px rgba(0,0,0,0.6);">
          
          <!-- Brand Header with Logo and Name -->
          <tr>
            <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.12);">
              <table border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td align="center">
                    <img src="{logo_url}" width="60" height="60" alt="IoT HIVE Logo" style="display: block; width: 60px; height: 60px; border-radius: 12px; border: 1px solid rgba(0, 229, 255, 0.4); margin-bottom: 12px; box-shadow: 0 4px 20px rgba(0, 229, 255, 0.35);">
                    <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      IoT <span style="color: #00e5ff;">HIVE</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #00e5ff; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px;">
                      Smart Hardware Ecosystem
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Title & Greeting -->
          <tr>
            <td style="padding-top: 28px; padding-bottom: 20px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; text-align: center;">
                Welcome to the Hive, <span style="color: #00e5ff;">{display_name}</span>! 🚀
              </h1>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #94a3b8; text-align: center;">
                Your account is ready. You are now part of an active ecosystem of hardware makers, embedded engineers, and smart device innovators.
              </p>
            </td>
          </tr>

          <!-- Account Details Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #162036; border: 1px solid rgba(0, 229, 255, 0.18); border-radius: 12px; padding: 20px 22px;">
                <tr>
                  <td colspan="2" style="padding-bottom: 14px; border-bottom: 1px solid rgba(148, 163, 184, 0.12);">
                    <span style="font-size: 12px; font-weight: 700; color: #00e5ff; text-transform: uppercase; letter-spacing: 1.2px;">Account Credentials</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 6px 0; color: #64748b; font-size: 13px; width: 35%;">Full Name:</td>
                  <td style="padding: 10px 0 6px 0; color: #f1f5f9; font-size: 14px; font-weight: 600;">{full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Username:</td>
                  <td style="padding: 6px 0; color: #00e5ff; font-size: 14px; font-weight: 600;">@{user.username}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Email Address:</td>
                  <td style="padding: 6px 0; color: #f1f5f9; font-size: 14px;">{recipient_email}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0 0 0; color: #64748b; font-size: 13px;">Member Role:</td>
                  <td style="padding: 6px 0 0 0; color: #38bdf8; font-size: 14px; font-weight: 600;">{role_display}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Primary CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <a href="{login_url}" target="_blank" style="background: linear-gradient(135deg, #0066ff 0%, #00e5ff 100%); color: #ffffff; padding: 14px 34px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block; box-shadow: 0 4px 20px rgba(0, 229, 255, 0.4); letter-spacing: 0.3px;">
                Sign In to Your Account &rarr;
              </a>
            </td>
          </tr>

          <!-- Feature Highlights -->
          <tr>
            <td style="padding-bottom: 24px; border-top: 1px solid rgba(148, 163, 184, 0.12); padding-top: 24px;">
              <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 14px; text-align: center;">
                Discover What You Can Do
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="color: #00e5ff; font-weight: bold; margin-right: 6px;">&bull;</span>
                    <strong style="color: #f1f5f9; font-size: 13px;">Hardware Marketplace:</strong>
                    <span style="color: #94a3b8; font-size: 13px;"> Buy or sell custom IoT hardware, dev boards, and prototypes.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="color: #00e5ff; font-weight: bold; margin-right: 6px;">&bull;</span>
                    <strong style="color: #f1f5f9; font-size: 13px;">Custom Maker Bounties:</strong>
                    <span style="color: #94a3b8; font-size: 13px;"> Commission projects or bid on maker challenges.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="color: #00e5ff; font-weight: bold; margin-right: 6px;">&bull;</span>
                    <strong style="color: #f1f5f9; font-size: 13px;">SafePay™ Escrow:</strong>
                    <span style="color: #94a3b8; font-size: 13px;"> 100% protected payments until hardware is delivered and verified.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer & Support -->
          <tr>
            <td style="border-top: 1px solid rgba(148, 163, 184, 0.12); padding-top: 20px; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
              You received this email because an account was registered with <span style="color: #94a3b8;">{recipient_email}</span> on IoT HIVE.<br>
              Questions or support? Reach out at <a href="mailto:iothive221@gmail.com" style="color: #00e5ff; text-decoration: none;">iothive221@gmail.com</a>.<br><br>
              &copy; 2026 <strong>IoT HIVE</strong> &bull; Sri Lanka &amp; Global Smart Hardware Ecosystem
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    def _worker():
        # Priority 1: Resend HTTPS API (Port 443 - not blocked by Render)
        resend_key = os.getenv("RESEND_API_KEY", "").strip()
        if resend_key:
            from_email = os.getenv("RESEND_FROM_EMAIL", "IoT HIVE <onboarding@resend.dev>").strip()
            success, result = send_resend_email(
                recipient_email=recipient_email,
                subject=subject,
                html_content=html_content,
                plain_text=plain_text,
                from_email=from_email,
            )
            if success:
                logger.info("Welcome email sent successfully via Resend HTTPS API to %s: %s", recipient_email, result)
                print(f"\n==================== [IoT HIVE WELCOME EMAIL DISPATCHED (RESEND HTTPS)] ====================\nTo: {recipient_email}\nSubject: Welcome to IoT HIVE, {display_name}!\nRecipient: {full_name} (@{user.username})\nResult: {result}\n===========================================================================================\n")
                return
            else:
                logger.error("Resend API delivery failed for %s: %s. Attempting fallback to SMTP.", recipient_email, result)
                print(f"\n[IoT HIVE WELCOME EMAIL] Resend API error: {result}. Attempting SMTP fallback...\n")

        # Priority 2: Standard Django SMTP (for local dev or servers where port 587 is unblocked)
        try:
            from_email = getattr(
                settings,
                "DEFAULT_FROM_EMAIL",
                f"IoT HIVE <{getattr(settings, 'EMAIL_HOST_USER', 'iothive221@gmail.com')}>"
            )
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_text,
                from_email=from_email,
                to=[recipient_email],
            )
            msg.encoding = "utf-8"
            msg.attach_alternative(html_content, "text/html")

            # Attach brand logo as inline CID image if available
            logo_paths = [
                settings.BASE_DIR / "static" / "images" / "email-logo.png",
                settings.BASE_DIR / "static" / "images" / "favicon.png",
            ]
            attached_logo = False
            for logo_path in logo_paths:
                if os.path.exists(logo_path):
                    try:
                        with open(logo_path, "rb") as f:
                            logo_img = MIMEImage(f.read())
                            logo_img.add_header("Content-ID", "<iothive_logo>")
                            logo_img.add_header("Content-Disposition", "inline", filename="iothive_logo.png")
                            msg.attach(logo_img)
                            attached_logo = True
                            break
                    except Exception as logo_err:
                        logger.warning("Could not attach inline logo image: %s", logo_err)

            msg.send(fail_silently=False)
            logger.info("Welcome email sent successfully via SMTP to %s (logo_attached=%s)", recipient_email, attached_logo)
            print(f"\n==================== [IoT HIVE WELCOME EMAIL DISPATCHED (SMTP)] ====================\nTo: {recipient_email}\nSubject: Welcome to IoT HIVE, {display_name}!\nRecipient: {full_name} (@{user.username})\n=============================================================================\n")
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error("Failed to send welcome email to %s: %s\n%s", recipient_email, e, tb)
            print(f"\n==================== [IoT HIVE WELCOME EMAIL ERROR] ====================\nTo: {recipient_email}\nError: {e}\n{tb}========================================================================\n")

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    thread.join(timeout=3.5)
    return True
