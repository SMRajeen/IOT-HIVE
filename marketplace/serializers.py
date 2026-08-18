import json
from rest_framework import serializers
from django.contrib.auth.models import User

from .models import (
    NotificationLog,
    Category,
    Project,
    ProjectTier,
    ProjectBOMItem,
    ProjectAttachment,
    ProjectImage,
    ProjectVideo,
    ProjectModel3D,
    Favorite,
    ProjectRequest,
    Order,
    ProjectReview,
    HardwareBounty,
    BountyProposal,
    ChatMessage,
)


class CategorySerializer(serializers.ModelSerializer):
    project_count = serializers.IntegerField(
        source="projects.count",
        read_only=True
    )

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "project_count",
        ]


class ProjectTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTier
        fields = [
            "id",
            "tier_type",
            "name",
            "price",
            "currency",
            "description",
            "requires_shipping",
            "stock_quantity",
            "is_available",
            "created_at",
        ]


class ProjectBOMItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectBOMItem
        fields = [
            "id",
            "name",
            "part_number",
            "quantity",
            "estimated_cost",
            "supplier_url",
            "is_optional",
            "created_at",
        ]


class ProjectAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = [
            "id",
            "title",
            "file",
            "file_url",
            "file_type",
            "file_size",
            "created_at",
        ]

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return ""


class ProjectImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = [
            "id",
            "image",
            "caption",
            "created_at",
        ]


class ProjectVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectVideo
        fields = [
            "id",
            "video_url",
            "title",
        ]


class ProjectModel3DSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectModel3D
        fields = [
            "id",
            "model_url",
            "title",
        ]


class ProjectReviewSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    build_image_url = serializers.SerializerMethodField()
    created_formatted = serializers.SerializerMethodField()

    class Meta:
        model = ProjectReview
        fields = [
            "id",
            "project",
            "user",
            "user_username",
            "user_name",
            "user_avatar",
            "rating",
            "title",
            "comment",
            "build_image",
            "build_image_url",
            "is_verified_buyer",
            "created_at",
            "created_formatted",
        ]
        read_only_fields = ["id", "user", "is_verified_buyer", "created_at"]

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name if name else obj.user.username

    def get_user_avatar(self, obj):
        if hasattr(obj.user, "profile") and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return ""

    def get_build_image_url(self, obj):
        if obj.build_image:
            return obj.build_image.url
        return ""

    def get_created_formatted(self, obj):
        return obj.created_at.strftime("%b %d, %Y")


class ProjectSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(
        source="seller.username",
        read_only=True
    )
    seller_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )
    category_slug = serializers.CharField(
        source="category.slug",
        read_only=True
    )

    tiers = ProjectTierSerializer(many=True, read_only=True)
    bom_items = ProjectBOMItemSerializer(many=True, read_only=True)
    attachments = ProjectAttachmentSerializer(many=True, read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    video = ProjectVideoSerializer(read_only=True)
    model_3d = ProjectModel3DSerializer(read_only=True)
    reviews = ProjectReviewSerializer(many=True, read_only=True)

    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    community_makes_count = serializers.IntegerField(read_only=True)

    # Write-only fields for creation
    image = serializers.ImageField(write_only=True, required=False)
    video_url = serializers.URLField(write_only=True, required=False)
    model_url = serializers.URLField(write_only=True, required=False)
    bom_data = serializers.CharField(write_only=True, required=False)
    tiers_data = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "slug",
            "seller",
            "seller_username",
            "seller_name",
            "category",
            "category_name",
            "category_slug",
            "short_description",
            "description",
            "price",
            "is_free",
            "status",
            "featured",
            "views",
            "microcontroller",
            "connectivity",
            "difficulty",
            "estimated_build_time",
            "source_code",
            "source_code_language",
            "average_rating",
            "review_count",
            "community_makes_count",
            "tiers",
            "bom_items",
            "attachments",
            "images",
            "video",
            "model_3d",
            "reviews",
            "created_at",
            "updated_at",
            "image",
            "video_url",
            "model_url",
            "bom_data",
            "tiers_data",
        ]
        read_only_fields = [
            "id",
            "slug",
            "seller",
            "views",
            "created_at",
            "updated_at",
        ]

    def get_seller_name(self, obj):
        name = f"{obj.seller.first_name} {obj.seller.last_name}".strip()
        return name if name else obj.seller.username

    def create(self, validated_data):
        image = validated_data.pop("image", None)
        video_url = validated_data.pop("video_url", None)
        model_url = validated_data.pop("model_url", None)
        bom_data = validated_data.pop("bom_data", None)
        tiers_data = validated_data.pop("tiers_data", None)

        project = Project.objects.create(**validated_data)

        if image:
            ProjectImage.objects.create(project=project, image=image)

        if video_url:
            ProjectVideo.objects.create(project=project, video_url=video_url)

        if model_url:
            ProjectModel3D.objects.create(project=project, model_url=model_url)

        # Parse BOM Items
        if bom_data:
            try:
                bom_list = json.loads(bom_data) if isinstance(bom_data, str) else bom_data
                for item in bom_list:
                    if item.get("name"):
                        ProjectBOMItem.objects.create(
                            project=project,
                            name=item.get("name", "").strip(),
                            part_number=item.get("part_number", "").strip(),
                            quantity=max(1, int(item.get("quantity", 1))),
                            estimated_cost=max(0.0, float(item.get("estimated_cost", 0.0))),
                            supplier_url=item.get("supplier_url", "").strip(),
                            is_optional=bool(item.get("is_optional", False))
                        )
            except Exception as e:
                print(f"Error parsing BOM data on create: {e}")

        # Parse Multi-Tier Commercial Options
        if tiers_data:
            try:
                tier_list = json.loads(tiers_data) if isinstance(tiers_data, str) else tiers_data
                for t in tier_list:
                    if t.get("name"):
                        ProjectTier.objects.create(
                            project=project,
                            tier_type=t.get("tier_type", "digital"),
                            name=t.get("name", "").strip(),
                            price=max(0.0, float(t.get("price", 0.0))),
                            currency=t.get("currency", "LKR"),
                            description=t.get("description", "").strip(),
                            requires_shipping=bool(t.get("requires_shipping", False)),
                            stock_quantity=int(t.get("stock_quantity", -1)),
                            is_available=bool(t.get("is_available", True))
                        )
            except Exception as e:
                print(f"Error parsing Tier data on create: {e}")
        else:
            # Create default digital tier
            ProjectTier.objects.create(
                project=project,
                tier_type="digital",
                name="Digital Blueprint & Code",
                price=project.price,
                currency="LKR",
                description="Instant access to KiCad schematics, Gerber PCB archives, BOM, and firmware.",
                requires_shipping=False
            )

        return project


class FavoriteSerializer(serializers.ModelSerializer):
    project = ProjectSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "project", "created_at"]


class ProjectRequestSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(
        source="buyer.username",
        read_only=True
    )
    project_title = serializers.CharField(
        source="project.title",
        read_only=True
    )
    seller_username = serializers.CharField(
        source="project.seller.username",
        read_only=True
    )

    class Meta:
        model = ProjectRequest
        fields = [
            "id",
            "project",
            "project_title",
            "buyer",
            "buyer_username",
            "seller_username",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "buyer",
            "created_at",
            "updated_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    buyer_username = serializers.CharField(
        source="buyer.username",
        read_only=True
    )
    seller_username = serializers.CharField(
        source="seller.username",
        read_only=True
    )
    project_title = serializers.CharField(
        source="project.title",
        read_only=True
    )
    tier_name = serializers.CharField(
        source="tier.name",
        read_only=True,
        default="Digital Blueprint"
    )
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "project",
            "project_title",
            "tier",
            "tier_name",
            "tier_type",
            "buyer",
            "buyer_username",
            "seller",
            "seller_username",
            "request",
            "amount",
            "currency",
            "status",
            "payment_method",
            "payment_gateway",
            "payhere_payment_id",
            "transaction_id",
            "card_last4",
            "shipping_full_name",
            "shipping_phone",
            "shipping_address",
            "shipping_city",
            "shipping_district",
            "shipping_postal_code",
            "tracking_number",
            "tracking_courier",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "buyer",
            "seller",
            "transaction_id",
            "created_at",
            "updated_at",
        ]


# ============================================================
# PHASE 3 SERIALIZERS: BOUNTIES, PROPOSALS & LIVE CHAT
# ============================================================

class BountyProposalSerializer(serializers.ModelSerializer):
    maker_username = serializers.CharField(source="maker.username", read_only=True)
    maker_name = serializers.SerializerMethodField()
    maker_avatar = serializers.SerializerMethodField()
    created_formatted = serializers.SerializerMethodField()

    class Meta:
        model = BountyProposal
        fields = [
            "id",
            "bounty",
            "maker",
            "maker_username",
            "maker_name",
            "maker_avatar",
            "pitch",
            "bid_amount",
            "currency",
            "delivery_days",
            "status",
            "created_at",
            "created_formatted",
        ]
        read_only_fields = ["id", "maker", "created_at", "updated_at"]

    def get_maker_name(self, obj):
        name = f"{obj.maker.first_name} {obj.maker.last_name}".strip()
        return name if name else obj.maker.username

    def get_maker_avatar(self, obj):
        if hasattr(obj.maker, "profile") and obj.maker.profile.avatar:
            return obj.maker.profile.avatar.url
        return ""

    def get_created_formatted(self, obj):
        return obj.created_at.strftime("%b %d, %Y")


class HardwareBountySerializer(serializers.ModelSerializer):
    client_username = serializers.CharField(source="client.username", read_only=True)
    client_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    proposals_count = serializers.IntegerField(source="proposals.count", read_only=True)
    awarded_maker_username = serializers.CharField(source="awarded_maker.username", read_only=True, default="")
    proposals = BountyProposalSerializer(many=True, read_only=True)
    created_formatted = serializers.SerializerMethodField()

    class Meta:
        model = HardwareBounty
        fields = [
            "id",
            "client",
            "client_username",
            "client_name",
            "title",
            "slug",
            "category",
            "category_name",
            "budget",
            "currency",
            "deadline_days",
            "difficulty",
            "preferred_mcu",
            "connectivity",
            "description",
            "deliverables_needed",
            "status",
            "awarded_maker",
            "awarded_maker_username",
            "proposals_count",
            "proposals",
            "created_at",
            "created_formatted",
        ]
        read_only_fields = ["id", "slug", "client", "created_at", "updated_at"]

    def get_client_name(self, obj):
        name = f"{obj.client.first_name} {obj.client.last_name}".strip()
        return name if name else obj.client.username

    def get_created_formatted(self, obj):
        return obj.created_at.strftime("%b %d, %Y")


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    sender_name = serializers.SerializerMethodField()
    sender_avatar = serializers.SerializerMethodField()
    recipient_username = serializers.CharField(source="recipient.username", read_only=True)
    attachment_url = serializers.SerializerMethodField()
    project_title = serializers.CharField(source="project.title", read_only=True, default="")
    bounty_title = serializers.CharField(source="bounty.title", read_only=True, default="")
    time_formatted = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "sender_username",
            "sender_name",
            "sender_avatar",
            "recipient",
            "recipient_username",
            "project",
            "project_title",
            "bounty",
            "bounty_title",
            "message",
            "attachment",
            "attachment_url",
            "is_read",
            "created_at",
            "time_formatted",
        ]
        read_only_fields = ["id", "sender", "created_at"]

    def get_sender_name(self, obj):
        name = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return name if name else obj.sender.username

    def get_sender_avatar(self, obj):
        if hasattr(obj.sender, "profile") and obj.sender.profile.avatar:
            return obj.sender.profile.avatar.url
        return ""

    def get_attachment_url(self, obj):
        if obj.attachment:
            return obj.attachment.url
        return ""

    def get_time_formatted(self, obj):
        return obj.created_at.strftime("%I:%M %p")


class NotificationLogSerializer(serializers.ModelSerializer):
    event_label = serializers.CharField(source="get_event_type_display", read_only=True)
    created_formatted = serializers.SerializerMethodField()

    class Meta:
        model = NotificationLog
        fields = [
            "id",
            "recipient",
            "phone_number",
            "event_type",
            "event_label",
            "message",
            "gateway",
            "status",
            "created_at",
            "created_formatted",
        ]
        read_only_fields = fields

    def get_created_formatted(self, obj):
        return obj.created_at.strftime("%b %d, %Y %I:%M %p")
