import os
import re
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from django.conf import settings
from django.contrib.auth.models import User
from marketplace.models import NotificationLog

logger = logging.getLogger("iothive.sms")


def get_sms_config():
    return {
        "gateway": getattr(settings, "SMS_GATEWAY", os.getenv("SMS_GATEWAY", "notifylk")).lower(),
        "twilio_sid": getattr(settings, "TWILIO_ACCOUNT_SID", os.getenv("TWILIO_ACCOUNT_SID", "")),
        "twilio_token": getattr(settings, "TWILIO_AUTH_TOKEN", os.getenv("TWILIO_AUTH_TOKEN", "")),
        "twilio_from": getattr(settings, "TWILIO_PHONE_NUMBER", os.getenv("TWILIO_PHONE_NUMBER", "")),
        "notifylk_user": getattr(settings, "NOTIFY_LK_USER_ID", os.getenv("NOTIFY_LK_USER_ID", "")),
        "notifylk_key": getattr(settings, "NOTIFY_LK_API_KEY", os.getenv("NOTIFY_LK_API_KEY", "")),
        "notifylk_sender": getattr(settings, "NOTIFY_LK_SENDER_ID", os.getenv("NOTIFY_LK_SENDER_ID", "NotifyDEMO")),
    }


def normalize_phone_number(raw_phone):
    """
    Normalizes local Sri Lankan numbers (07XXXXXXXX / 7XXXXXXXX) and international E.164 numbers.
    Example: '077 123 4567' -> '+94771234567'
    """
    if not raw_phone:
        return ""
    
    cleaned = re.sub(r"[\s\-\(\)]", "", str(raw_phone))
    
    if cleaned.startswith("0") and len(cleaned) == 10:
        return "+94" + cleaned[1:]
    elif cleaned.startswith("7") and len(cleaned) == 9:
        return "+94" + cleaned
    elif cleaned.startswith("94") and not cleaned.startswith("+"):
        return "+" + cleaned
    elif not cleaned.startswith("+"):
        return "+" + cleaned

    return cleaned


def send_sms_twilio(to_phone, message, config):
    sid = config["twilio_sid"]
    token = config["twilio_token"]
    from_num = config["twilio_from"]

    if not sid or not token or not from_num or "ACXXXXXX" in sid:
        return False, "Twilio credentials missing or placeholder in .env."

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    data = urllib.parse.urlencode({
        "To": to_phone,
        "From": from_num,
        "Body": message
    }).encode("utf-8")

    import base64
    auth_header = "Basic " + base64.b64encode(f"{sid}:{token}".encode("utf-8")).decode("utf-8")

    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", auth_header)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read().decode("utf-8")
            return True, resp_body
    except urllib.error.HTTPError as e:
        return False, e.read().decode("utf-8")
    except Exception as e:
        return False, str(e)


def send_sms_notifylk(to_phone, message, config):
    user_id = config["notifylk_user"]
    api_key = config["notifylk_key"]
    sender_id = config["notifylk_sender"] or "NotifyDEMO"

    if not user_id or not api_key:
        return False, "Notify.lk credentials missing in .env."

    dest_number = to_phone.replace("+", "")
    url = "https://app.notify.lk/api/v1/send"

    def do_request(sender):
        data = urllib.parse.urlencode({
            "user_id": user_id,
            "api_key": api_key,
            "sender_id": sender,
            "to": dest_number,
            "message": message
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_body = resp.read().decode("utf-8")
                try:
                    res_json = json.loads(resp_body)
                    if res_json.get("status") == "error":
                        return False, res_json.get("errors") or resp_body
                except Exception:
                    pass
                return True, resp_body
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            # If custom sender ID is unapproved, fallback to NotifyDEMO
            if "Sender ID is not registered" in err_body and sender != "NotifyDEMO":
                return do_request("NotifyDEMO")
            try:
                err_json = json.loads(err_body)
                if "Account balance is not enough" in str(err_json.get("errors", "")):
                    logger.warning("[SMS Gateway] Notify.lk account balance is 0. Please recharge SMS credits on notify.lk.")
            except Exception:
                pass
            return False, err_body
        except Exception as e:
            return False, str(e)

    return do_request(sender_id)


def send_sms(phone_number, message, event_type="notification", recipient_user=None):
    """
    Master SMS Dispatcher.
    Normalizes phone number, selects configured gateway, logs to DB, and returns status.
    """
    normalized = normalize_phone_number(phone_number)
    if not normalized:
        logger.warning(f"[SMS Gateway] Invalid phone number provided: '{phone_number}'")
        return {
            "success": False,
            "status": "failed",
            "error": "Invalid phone number.",
            "phone_number": phone_number
        }

    config = get_sms_config()
    gateway = config["gateway"]
    success = False
    response_data = ""

    # Check if Notify.lk is active
    if (gateway in ["notifylk", "srilanka"] or config["notifylk_user"]) and config["notifylk_key"]:
        gateway = "notifylk"
        success, response_data = send_sms_notifylk(normalized, message, config)
        if not success and "Account balance is not enough" in str(response_data):
            print(f"\n[IoT HIVE SMS NOTICE] Notify.lk balance is 0. Simulated SMS fallback:")
            print(f"To: {normalized} | Event: {event_type.upper()} | Msg: {message}\n")
    # Check if Twilio is active
    elif (gateway == "twilio") and config["twilio_sid"] and "ACXXXXXX" not in config["twilio_sid"]:
        gateway = "twilio"
        success, response_data = send_sms_twilio(normalized, message, config)
    else:
        # Fallback to Console Mock Driver
        gateway = "console"
        success = True
        response_data = json.dumps({
            "status": "mock_delivered",
            "info": "Simulated SMS in Console Mock mode. Configure NOTIFY_LK or TWILIO in .env for physical cellular delivery."
        })
        print(f"\n==================== [IoT HIVE SMS GATEWAY] ====================")
        print(f"To: {normalized} (User: {recipient_user.username if recipient_user else 'Guest'})")
        print(f"Event: {event_type.upper()}")
        print(f"Message: {message}")
        print(f"=================================================================\n")

    status = "sent" if (success and gateway != "console") else ("mock_delivered" if (success and gateway == "console") else "failed")

    log_id = None
    try:
        log_entry = NotificationLog.objects.create(
            recipient=recipient_user,
            phone_number=normalized,
            event_type=event_type,
            message=message,
            gateway=gateway,
            status=status,
            gateway_response=str(response_data)
        )
        log_id = log_entry.id
    except Exception as e:
        logger.warning("[SMS Gateway] NotificationLog record skipped: %s", e)

    return {
        "success": success,
        "log_id": log_id,
        "phone_number": normalized,
        "gateway": gateway,
        "status": status,
        "message": message,
        "error": response_data if not success else None
    }


def _async_send_sms(phone_number, message, event_type="notification", recipient_user=None):
    """Dispatches SMS in a non-blocking background daemon thread with connection cleanup."""
    import threading
    from django.db import connection

    def _worker():
        try:
            send_sms(phone_number, message, event_type, recipient_user)
        finally:
            try:
                connection.close()
            except Exception:
                pass

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


# --- Event Triggers ---

def notify_order_created(order):
    project = order.project
    tier = order.tier
    buyer = order.buyer
    seller = order.seller
    buyer_phone = order.shipping_phone or (buyer.profile.phone_number if hasattr(buyer, "profile") else "")

    if buyer_phone and (not hasattr(buyer, "profile") or buyer.profile.notify_sms_orders):
        tier_title = tier.name if tier else "Hardware Blueprint"
        msg = f"[IoT HIVE] Order #{order.transaction_id} Confirmed! You ordered '{project.title}' ({tier_title}) for Rs. {order.amount:,.2f}. Thank you for supporting open hardware!"
        _async_send_sms(buyer_phone, msg, event_type="order_created", recipient_user=buyer)

    if hasattr(seller, "profile") and seller.profile.phone_number and seller.profile.notify_sms_orders:
        seller_phone = seller.profile.phone_number
        buyer_name = order.shipping_full_name or buyer.username
        msg = f"[IoT HIVE] New Hardware Sale! {buyer_name} purchased '{project.title}' for Rs. {order.amount:,.2f}. Check your dashboard to manage fulfillment."
        _async_send_sms(seller_phone, msg, event_type="order_created", recipient_user=seller)


def notify_order_shipped(order):
    buyer = order.buyer
    buyer_phone = order.shipping_phone or (buyer.profile.phone_number if hasattr(buyer, "profile") else "")
    if buyer_phone:
        msg = f"[IoT HIVE] Your order #{order.transaction_id} for '{order.project.title}' has been dispatched via courier! Doorstep delivery in progress."
        _async_send_sms(buyer_phone, msg, event_type="order_shipped", recipient_user=buyer)


def notify_bounty_proposal(proposal):
    bounty = proposal.bounty
    client = bounty.client
    maker = proposal.maker

    if hasattr(client, "profile") and client.profile.phone_number and client.profile.notify_sms_bounties:
        msg = f"[IoT HIVE] New Proposal on Bounty #{bounty.id} '{bounty.title}'! Maker {maker.username} submitted a bid of Rs. {proposal.bid_amount:,.2f} ({proposal.delivery_days} days). Review at iothive.lk/bounties/"
        _async_send_sms(client.profile.phone_number, msg, event_type="bounty_proposal", recipient_user=client)


def notify_bounty_awarded(bounty):
    maker = bounty.awarded_maker
    if maker and hasattr(maker, "profile") and maker.profile.phone_number and maker.profile.notify_sms_bounties:
        msg = f"[IoT HIVE] Congratulations {maker.username}! Your proposal for bounty #{bounty.id} '{bounty.title}' has been ACCEPTED & AWARDED! Check your dashboard to begin fabrication."
        _async_send_sms(maker.profile.phone_number, msg, event_type="bounty_awarded", recipient_user=maker)


def notify_chat_message(chat_msg):
    recipient = chat_msg.recipient
    sender = chat_msg.sender

    if hasattr(recipient, "profile") and recipient.profile.phone_number and recipient.profile.notify_sms_chat:
        preview = chat_msg.message[:60] + "..." if len(chat_msg.message) > 60 else chat_msg.message
        msg = f"[IoT HIVE] New Live Message from {sender.username}: \"{preview}\" Reply directly on iothive.lk"
        _async_send_sms(recipient.profile.phone_number, msg, event_type="chat_message", recipient_user=recipient)


def send_test_sms(user, phone_number):
    msg = f"[IoT HIVE] Verification Test SMS: Your phone number ({phone_number}) is successfully connected to your IoT HIVE account!"
    return send_sms(phone_number, msg, event_type="test_sms", recipient_user=user)
