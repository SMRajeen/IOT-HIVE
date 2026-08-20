"""
IoT-HIVE Email Notification Utility
Handles secure, asynchronous-friendly email dispatch using Django's email architecture.
Sender: iothive221@gmail.com
"""

import logging
import threading
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _async_send_mail(subject, message, recipient_list):
    """Worker function to send mail in a background daemon thread to prevent request blocking."""
    def _worker():
        try:
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", f"IoT HIVE <{getattr(settings, 'EMAIL_HOST_USER', 'rajeenm2003@gmail.com')}>")
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=recipient_list,
                fail_silently=False,
            )
            logger.info("Successfully sent email to %s with subject '%s'", recipient_list, subject)
        except Exception as e:
            logger.error("Failed to send email to %s: %s", recipient_list, e)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


def send_inquiry_notification(recipient_email, recipient_name, sender_name, project_title, message_text):
    """Notify maker of a new project inquiry or custom request."""
    if not recipient_email:
        return False

    subject = f"[IoT-HIVE] New Hardware Inquiry from {sender_name}: {project_title or 'Custom Request'}"
    message = f"""Hello {recipient_name},

You have received a new inquiry on IoT-HIVE regarding "{project_title or 'your hardware project'}".

From: {sender_name}
Message:
--------------------------------------------------
{message_text}
--------------------------------------------------

To reply to this message, please sign in to your Creator Dashboard at:
https://iot-hive.onrender.com/project-requests/

Best regards,
The IoT-HIVE Team
https://iot-hive.onrender.com/
"""
    _async_send_mail(subject, message, [recipient_email])
    return True


def send_inquiry_reply_notification(recipient_email, recipient_name, sender_name, project_title, reply_text):
    """Notify buyer of a maker's reply to their inquiry."""
    if not recipient_email:
        return False

    subject = f"[IoT-HIVE] Reply from Maker {sender_name} on {project_title or 'Hardware Inquiry'}"
    message = f"""Hello {recipient_name},

Maker {sender_name} has replied to your hardware inquiry on IoT-HIVE!

Reply:
--------------------------------------------------
{reply_text}
--------------------------------------------------

View and continue your conversation in the Inquiries center:
https://iot-hive.onrender.com/project-requests/

Best regards,
The IoT-HIVE Team
"""
    _async_send_mail(subject, message, [recipient_email])
    return True


def send_order_notification(buyer_email, seller_email, buyer_name, seller_name, project_title, tier_name, amount, transaction_id):
    """Notify both buyer and seller when an order is completed."""
    # 1. Notify Buyer
    if buyer_email:
        buyer_subj = f"[IoT-HIVE] Order Confirmation: {project_title} (#{transaction_id})"
        buyer_msg = f"""Hello {buyer_name},

Thank you for your order on IoT-HIVE!

Order Summary:
- Project: {project_title}
- Tier: {tier_name}
- Total Paid: Rs. {amount}
- Transaction Ref: {transaction_id}
- Maker / Seller: {seller_name}

Access your order blueprints and tracking status on your dashboard:
https://iot-hive.onrender.com/dashboard/

Best regards,
The IoT-HIVE Team
"""
        _async_send_mail(buyer_subj, buyer_msg, [buyer_email])

    # 2. Notify Seller
    if seller_email:
        seller_subj = f"[IoT-HIVE] New Sale! Order for {project_title} (#{transaction_id})"
        seller_msg = f"""Hello {seller_name},

Great news! You have received a new purchase order for "{project_title}".

Order Details:
- Tier: {tier_name}
- Amount: Rs. {amount}
- Buyer: {buyer_name}
- Transaction ID: {transaction_id}

Manage fulfillment and delivery details in your Creator Dashboard:
https://iot-hive.onrender.com/dashboard/

Best regards,
The IoT-HIVE Team
"""
        _async_send_mail(seller_subj, seller_msg, [seller_email])


def send_bounty_awarded_notification(maker_email, maker_name, client_name, bounty_title, budget):
    """Notify winning maker when their proposal is accepted."""
    if not maker_email:
        return False

    subject = f"[IoT-HIVE] Proposal Accepted! You have been awarded: {bounty_title}"
    message = f"""Hello {maker_name},

Congratulations! Your hardware proposal for "{bounty_title}" has been accepted by {client_name}!

Bounty Details:
- Allocated Budget: Rs. {budget}
- Client: {client_name}

You can now start collaborating directly with the client. Access bounty milestones and live messaging here:
https://iot-hive.onrender.com/bounties/

Best regards,
The IoT-HIVE Team
"""
    _async_send_mail(subject, message, [maker_email])
    return True
