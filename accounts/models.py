from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ("buyer", "Buyer"),
        ("seller", "Seller"),
        ("both", "Buyer & Seller"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="both"
    )

    avatar = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True
    )

    bio = models.TextField(blank=True)

    location = models.CharField(
        max_length=150,
        blank=True
    )

    website = models.URLField(
        blank=True
    )

    # Phase 4: Phone Number & SMS Notification Preferences
    phone_number = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text="Phone number with country code (e.g. +94771234567 or 0771234567)"
    )

    notify_sms_orders = models.BooleanField(
        default=True,
        help_text="Receive SMS alerts on purchases and shipments"
    )

    notify_sms_bounties = models.BooleanField(
        default=True,
        help_text="Receive SMS alerts on bounty bids and awards"
    )

    notify_sms_chat = models.BooleanField(
        default=True,
        help_text="Receive SMS alerts for unread maker inquiries"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.user.username
