import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
import os
from django.core.files.storage import default_storage

try:
    if os.getenv("CLOUDINARY_CLOUD_NAME"):
        from cloudinary_storage.storage import RawMediaCloudinaryStorage
        raw_storage = RawMediaCloudinaryStorage()
    else:
        raw_storage = default_storage
except Exception:
    raw_storage = default_storage


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Project(models.Model):

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("sold", "Sold"),
        ("archived", "Archived"),
    ]

    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
        ("expert", "Expert"),
    ]

    CODE_LANG_CHOICES = [
        ("cpp", "C / C++ (Arduino)"),
        ("python", "Python / MicroPython"),
        ("rust", "Rust"),
        ("c", "Pure C"),
        ("json", "JSON / Config"),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)

    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="projects"
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="projects"
    )

    short_description = models.CharField(max_length=300)
    description = models.TextField()

    # Base price (Default Digital Tier in LKR / USD)
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    is_free = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        db_index=True
    )

    featured = models.BooleanField(default=False, db_index=True)
    views = models.PositiveIntegerField(default=0)

    # Maker & Hardware Specs
    microcontroller = models.CharField(max_length=100, blank=True, default="")
    connectivity = models.CharField(max_length=200, blank=True, default="")
    difficulty = models.CharField(max_length=30, choices=DIFFICULTY_CHOICES, default="intermediate")
    estimated_build_time = models.CharField(max_length=100, blank=True, default="1-2 Hours")

    # Embedded Code / Firmware Snippet
    source_code = models.TextField(blank=True, default="")
    source_code_language = models.CharField(max_length=30, choices=CODE_LANG_CHOICES, default="cpp")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["featured", "status"]),
        ]

    @property
    def average_rating(self):
        if hasattr(self, '_avg_rating'):
            return round(self._avg_rating, 1) if self._avg_rating is not None else None
        reviews = self.reviews.all()
        if not reviews.exists():
            return None
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    @property
    def review_count(self):
        if hasattr(self, '_review_count'):
            return self._review_count
        return self.reviews.count()

    @property
    def community_makes_count(self):
        if hasattr(self, '_makes_count'):
            return self._makes_count
        return self.reviews.exclude(build_image="").exclude(build_image__isnull=True).count()

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title) or "project"
            slug = base_slug
            counter = 1
            while Project.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        if self.is_free:
            self.price = 0

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ProjectTier(models.Model):
    TIER_TYPE_CHOICES = [
        ("digital", "Digital Blueprint & Firmware"),
        ("kit", "DIY Electronic Parts Kit"),
        ("assembled", "Assembled & Tested Hardware Unit"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="tiers"
    )
    tier_type = models.CharField(max_length=20, choices=TIER_TYPE_CHOICES, default="digital")
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="LKR")
    description = models.TextField(blank=True, default="")
    requires_shipping = models.BooleanField(default=False)
    stock_quantity = models.IntegerField(default=-1) # -1 = unlimited
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["price", "created_at"]

    def __str__(self):
        return f"{self.project.title} - {self.name} ({self.currency} {self.price})"


class ProjectBOMItem(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="bom_items"
    )
    name = models.CharField(max_length=200)
    part_number = models.CharField(max_length=150, blank=True, default="")
    quantity = models.PositiveIntegerField(default=1)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    supplier_url = models.URLField(blank=True, default="")
    is_optional = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} (x{self.quantity}) - {self.project.title}"


class ProjectAttachment(models.Model):
    FILE_TYPE_CHOICES = [
        ("zip", "ZIP Archive"),
        ("pdf", "PDF Document"),
        ("stl", "3D STL Model"),
        ("hex", "HEX / Firmware"),
        ("bin", "Binary Firmware"),
        ("gerber", "Gerber PCB Archive"),
        ("schematic", "Circuit Schematic"),
        ("datasheet", "PDF Datasheet"),
        ("other", "Other Asset"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="attachments"
    )
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to="projects/attachments/", storage=raw_storage)
    file_type = models.CharField(max_length=30, choices=FILE_TYPE_CHOICES, default="other")
    file_size = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.title} ({self.project.title})"


class ProjectImage(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(upload_to="projects/images/")
    caption = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.project.title} - Image"


class ProjectVideo(models.Model):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="video"
    )
    video_url = models.URLField()
    title = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.project.title} - Video"


class ProjectModel3D(models.Model):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="model_3d"
    )
    model_url = models.URLField()
    title = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.project.title} - 3D Model"


class Favorite(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorites"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "project"],
                name="unique_user_project_favorite"
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.project.title}"


class ProjectRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("completed", "Completed"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="requests"
    )
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="project_requests"
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.buyer.username} - {self.project.title}"


class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ("pending", "Payment Pending"),
        ("paid", "Paid & Processing"),
        ("shipped", "Shipped with Courier"),
        ("delivered", "Delivered / Completed"),
        ("cancelled", "Cancelled / Refunded"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    tier = models.ForeignKey(
        ProjectTier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )
    tier_type = models.CharField(max_length=20, default="digital")
    buyer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="purchases"
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sales"
    )
    request = models.ForeignKey(
        ProjectRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders"
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="LKR")
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default="paid")
    payment_method = models.CharField(max_length=50, default="Visa / Mastercard")
    payment_gateway = models.CharField(max_length=50, default="payhere")
    payhere_payment_id = models.CharField(max_length=100, blank=True, default="")
    transaction_id = models.CharField(max_length=100, unique=True, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)

    # Sri Lanka / Global Delivery Logistics
    shipping_full_name = models.CharField(max_length=150, blank=True, default="")
    shipping_phone = models.CharField(max_length=50, blank=True, default="")
    shipping_address = models.TextField(blank=True, default="")
    shipping_city = models.CharField(max_length=100, blank=True, default="")
    shipping_district = models.CharField(max_length=100, blank=True, default="")
    shipping_postal_code = models.CharField(max_length=20, blank=True, default="")
    
    # Courier Tracking
    tracking_number = models.CharField(max_length=100, blank=True, default="")
    tracking_courier = models.CharField(max_length=100, blank=True, default="") # PromptX, Domex, SpeedPost, PickMe

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["buyer", "-created_at"]),
            models.Index(fields=["seller", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["transaction_id"]),
        ]

    def save(self, *args, **kwargs):
        if not self.transaction_id:
            self.transaction_id = f"HIVE-LK-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_id} - {self.currency} {self.amount} ({self.status})"


# ============================================================
# PHASE 3: TRUST, CUSTOM BOUNTIES & COMMUNITY
# ============================================================

class ProjectReview(models.Model):
    """Verified reviews & community user makes gallery for hardware projects."""
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(default=5) # 1 - 5 stars
    title = models.CharField(max_length=200, blank=True, default="")
    comment = models.TextField()
    build_image = models.ImageField(upload_to="projects/makes/", blank=True, null=True)
    is_verified_buyer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "user"],
                name="unique_project_user_review"
            )
        ]

    def save(self, *args, **kwargs):
        # Auto verify if user has an order for this project
        if Order.objects.filter(project=self.project, buyer=self.user, status__in=["paid", "shipped", "delivered"]).exists():
            self.is_verified_buyer = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.title} - {self.rating}★ by {self.user.username}"


class HardwareBounty(models.Model):
    """Custom Hardware Commission / Maker Bounty Board."""
    STATUS_CHOICES = [
        ("open", "Open for Bids"),
        ("in_progress", "In Progress / Awarded"),
        ("completed", "Completed"),
        ("delivered", "Delivered"),
        ("inactive", "Inactive"),
        ("closed", "Closed / Cancelled"),
    ]

    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
        ("expert", "Expert"),
    ]

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posted_bounties"
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bounties"
    )
    budget = models.DecimalField(max_digits=12, decimal_places=2, db_index=True)
    currency = models.CharField(max_length=10, default="LKR")
    deadline_days = models.PositiveIntegerField(default=14)
    difficulty = models.CharField(max_length=30, choices=DIFFICULTY_CHOICES, default="intermediate")
    
    preferred_mcu = models.CharField(max_length=150, blank=True, default="")
    connectivity = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField()
    deliverables_needed = models.TextField(blank=True, default="")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open", db_index=True)
    awarded_maker = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="awarded_bounties"
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["client", "-created_at"]),
            models.Index(fields=["awarded_maker", "-created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title) or "bounty"
            slug = base_slug
            counter = 1
            while HardwareBounty.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.currency} {self.budget})"


class BountyProposal(models.Model):
    """Bids & Proposals submitted by makers on bounties."""
    STATUS_CHOICES = [
        ("pending", "Under Review"),
        ("accepted", "Accepted / Awarded"),
        ("rejected", "Rejected"),
        ("withdrawn", "Withdrawn"),
    ]

    bounty = models.ForeignKey(
        HardwareBounty,
        on_delete=models.CASCADE,
        related_name="proposals"
    )
    maker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bounty_proposals"
    )
    pitch = models.TextField()
    bid_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="LKR")
    delivery_days = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["bounty", "maker"],
                name="unique_bounty_maker_proposal"
            )
        ]
        indexes = [
            models.Index(fields=["bounty", "status"]),
            models.Index(fields=["maker", "-created_at"]),
        ]

    def __str__(self):
        return f"Proposal for {self.bounty.title} by {self.maker.username} ({self.currency} {self.bid_amount})"


class ChatMessage(models.Model):
    """Real-Time Maker-to-Buyer In-App Messaging."""
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_messages"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages"
    )
    bounty = models.ForeignKey(
        HardwareBounty,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages"
    )
    message = models.TextField()
    attachment = models.FileField(upload_to="chat/attachments/", blank=True, null=True, storage=raw_storage)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["sender", "recipient", "-created_at"]),
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        return f"Chat: {self.sender.username} -> {self.recipient.username} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"


class NotificationLog(models.Model):
    """
    Phase 4: Real Phone Number SMS & Event Notification Audit Log
    Tracks all SMS dispatches, delivery statuses, and provider responses.
    """
    EVENT_CHOICES = [
        ("order_created", "Order Placed & Confirmed"),
        ("order_shipped", "Order Shipped / Courier In-Transit"),
        ("order_delivered", "Order Delivered"),
        ("bounty_proposal", "New Maker Proposal / Bid"),
        ("bounty_awarded", "Bounty Proposal Awarded"),
        ("chat_message", "Live Chat Inquiry / Direct Ping"),
        ("test_sms", "Test Verification SMS"),
    ]

    STATUS_CHOICES = [
        ("sent", "Sent / Delivered"),
        ("mock_delivered", "Mock Delivered (Console)"),
        ("failed", "Failed"),
        ("queued", "Queued"),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_logs"
    )
    phone_number = models.CharField(max_length=35)
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES)
    message = models.TextField()
    gateway = models.CharField(max_length=50, default="twilio")
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default="sent")
    gateway_response = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.event_type}] {self.phone_number} -> {self.status}"
