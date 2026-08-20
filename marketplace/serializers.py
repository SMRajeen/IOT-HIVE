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


class ProjectListSerializer(serializers.ModelSerializer):
    """High-performance lightweight serializer for project listings, search, and home feed."""
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    seller_name = serializers.SerializerMethodField()
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    bom_items_count = serializers.IntegerField(source="bom_items.count", read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

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
            "price",
            "is_free",
            "status",
            "featured",
            "views",
            "microcontroller",
            "connectivity",
            "difficulty",
            "average_rating",
            "review_count",
            "bom_items_count",
            "images",
            "created_at",
        ]

    def get_seller_name(self, obj):
        name = f"{obj.seller.first_name} {obj.seller.last_name}".strip()
        return name if name else obj.seller.username


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

    # Write-only fields for creation & update
    image = serializers.ImageField(write_only=True, required=False)
    video_url = serializers.URLField(write_only=True, required=False)
    model_url = serializers.URLField(write_only=True, required=False)
    bom_data = serializers.CharField(write_only=True, required=False)
    bom_items_data = serializers.JSONField(write_only=True, required=False)
    tiers_data = serializers.CharField(write_only=True, required=False)
    tiers_list = serializers.JSONField(write_only=True, required=False)
    attachment_file = serializers.FileField(write_only=True, required=False)
    attachment_title = serializers.CharField(write_only=True, required=False)
    attachment_type = serializers.CharField(write_only=True, required=False)

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
            "bom_items_data",
            "tiers_data",
            "tiers_list",
            "attachment_file",
            "attachment_title",
            "attachment_type",
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("tiers") or len(data["tiers"]) == 0:
            data["tiers"] = [
                {
                    "id": None,
                    "tier_type": "digital",
                    "name": "Digital Blueprint & Firmware",
                    "price": float(instance.price or 0.0),
                    "currency": "LKR",
                    "description": "Instant access to Gerber PCB files, KiCad schematics, BOM, and firmware.",
                    "requires_shipping": False,
                    "stock_quantity": -1,
                    "is_available": True,
                    "created_at": instance.created_at.isoformat() if instance.created_at else None,
                }
            ]
        return data

    def _process_bom(self, project, bom_input):
        if not bom_input:
            return
        try:
            bom_list = json.loads(bom_input) if isinstance(bom_input, str) else bom_input
            if isinstance(bom_list, list):
                project.bom_items.all().delete()
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
            print(f"Error processing BOM data: {e}")

    def _process_tiers(self, project, tiers_input):
        if not tiers_input:
            return
        try:
            tier_list = json.loads(tiers_input) if isinstance(tiers_input, str) else tiers_input
            if isinstance(tier_list, list) and len(tier_list) > 0:
                project.tiers.all().delete()
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
            print(f"Error processing Tier data: {e}")

    def _process_attachment(self, project, attachment_file, title=None, file_type=None):
        if not attachment_file:
            return
        try:
            # Determine file type from extension if not given
            filename = attachment_file.name.lower()
            if not file_type or file_type == "other":
                if filename.endswith(".zip") or filename.endswith(".rar") or filename.endswith(".7z"):
                    file_type = "zip"
                elif filename.endswith(".pdf"):
                    file_type = "pdf"
                elif filename.endswith(".stl") or filename.endswith(".step") or filename.endswith(".stp"):
                    file_type = "stl"
                elif filename.endswith(".hex"):
                    file_type = "hex"
                elif filename.endswith(".bin"):
                    file_type = "bin"
                elif "gerber" in filename:
                    file_type = "gerber"
                else:
                    file_type = "other"

            # Format file size (e.g. "2.4 MB" or "350 KB")
            size_bytes = attachment_file.size
            if size_bytes > 1024 * 1024:
                formatted_size = f"{size_bytes / (1024 * 1024):.1f} MB"
            elif size_bytes > 1024:
                formatted_size = f"{size_bytes / 1024:.0f} KB"
            else:
                formatted_size = f"{size_bytes} B"

            ProjectAttachment.objects.create(
                project=project,
                title=title or attachment_file.name,
                file=attachment_file,
                file_type=file_type,
                file_size=formatted_size
            )
        except Exception as e:
            print(f"Error processing attachment: {e}")

    def create(self, validated_data):
        request = self.context.get("request")
        initial = getattr(self, "initial_data", {}) or {}

        image = validated_data.pop("image", None) or (request.FILES.get("image") if request else None)
        video_url = validated_data.pop("video_url", None) or initial.get("video_url")
        model_url = validated_data.pop("model_url", None) or initial.get("model_url")
        
        bom_data = (
            validated_data.pop("bom_data", None)
            or validated_data.pop("bom_items_data", None)
            or initial.get("bom_data")
            or initial.get("bom_items")
            or initial.get("bom_items_data")
        )
        tiers_data = (
            validated_data.pop("tiers_data", None)
            or validated_data.pop("tiers_list", None)
            or initial.get("tiers_data")
            or initial.get("tiers")
            or initial.get("tiers_list")
        )
        attachment_file = (
            validated_data.pop("attachment_file", None)
            or initial.get("attachment_file")
            or (request.FILES.get("attachment_file") if request else None)
        )
        attachment_title = (
            validated_data.pop("attachment_title", None)
            or initial.get("attachment_title")
        )
        attachment_type = (
            validated_data.pop("attachment_type", None)
            or initial.get("attachment_type")
        )

        project = Project.objects.create(**validated_data)

        if image:
            ProjectImage.objects.create(project=project, image=image)

        if video_url and str(video_url).strip():
            ProjectVideo.objects.create(project=project, video_url=str(video_url).strip())

        if model_url and str(model_url).strip():
            ProjectModel3D.objects.create(project=project, model_url=str(model_url).strip())

        if attachment_file:
            self._process_attachment(project, attachment_file, attachment_title, attachment_type)

        if bom_data:
            self._process_bom(project, bom_data)

        if tiers_data:
            self._process_tiers(project, tiers_data)
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

    def update(self, instance, validated_data):
        request = self.context.get("request")
        initial = getattr(self, "initial_data", {}) or {}

        image = validated_data.pop("image", None) or (request.FILES.get("image") if request else None)
        video_url = validated_data.pop("video_url", None) or initial.get("video_url")
        model_url = validated_data.pop("model_url", None) or initial.get("model_url")
        
        bom_data = (
            validated_data.pop("bom_data", None)
            or validated_data.pop("bom_items_data", None)
            or initial.get("bom_data")
            or initial.get("bom_items")
            or initial.get("bom_items_data")
        )
        tiers_data = (
            validated_data.pop("tiers_data", None)
            or validated_data.pop("tiers_list", None)
            or initial.get("tiers_data")
            or initial.get("tiers")
            or initial.get("tiers_list")
        )
        attachment_file = (
            validated_data.pop("attachment_file", None)
            or initial.get("attachment_file")
            or (request.FILES.get("attachment_file") if request else None)
        )
        attachment_title = (
            validated_data.pop("attachment_title", None)
            or initial.get("attachment_title")
        )
        attachment_type = (
            validated_data.pop("attachment_type", None)
            or initial.get("attachment_type")
        )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if image:
            ProjectImage.objects.create(project=instance, image=image)

        if video_url is not None:
            if str(video_url).strip():
                ProjectVideo.objects.update_or_create(project=instance, defaults={"video_url": str(video_url).strip()})
            else:
                ProjectVideo.objects.filter(project=instance).delete()

        if model_url is not None:
            if str(model_url).strip():
                ProjectModel3D.objects.update_or_create(project=instance, defaults={"model_url": str(model_url).strip()})
            else:
                ProjectModel3D.objects.filter(project=instance).delete()

        if attachment_file:
            self._process_attachment(instance, attachment_file, attachment_title, attachment_type)

        if bom_data is not None:
            self._process_bom(instance, bom_data)

        if tiers_data is not None:
            self._process_tiers(instance, tiers_data)

        return instance


class FavoriteSerializer(serializers.ModelSerializer):
    project = ProjectListSerializer(read_only=True)
    project_details = ProjectListSerializer(source="project", read_only=True)
    project_id = serializers.IntegerField(source="project.id", read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "project", "project_id", "project_details", "created_at"]



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
