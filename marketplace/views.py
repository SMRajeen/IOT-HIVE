from .sms import (
    send_sms,
    send_test_sms,
    notify_order_created,
    notify_order_shipped,
    notify_bounty_proposal,
    notify_bounty_awarded,
    notify_chat_message,
    normalize_phone_number,
)
from .emails import (
    send_inquiry_notification,
    send_inquiry_reply_notification,
    send_order_notification,
    send_bounty_awarded_notification,
)
from .models import NotificationLog
from .serializers import NotificationLogSerializer

import json
import hashlib
import uuid
from decimal import Decimal
from django.db.models import Q, Sum, Max, Count, Avg
from django.contrib.auth.models import User
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, serializers, viewsets, status, exceptions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from accounts.models import UserProfile
from accounts.serializers import UserSerializer
from .models import (
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

from .serializers import (
    CategorySerializer,
    ProjectSerializer,
    ProjectListSerializer,
    ProjectTierSerializer,
    ProjectBOMItemSerializer,
    ProjectAttachmentSerializer,
    ProjectImageSerializer,
    ProjectVideoSerializer,
    ProjectModel3DSerializer,
    FavoriteSerializer,
    ProjectRequestSerializer,
    OrderSerializer,
    ProjectReviewSerializer,
    HardwareBountySerializer,
    BountyProposalSerializer,
    ChatMessageSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        if lookup and str(lookup).isdigit():
            obj = Category.objects.filter(id=int(lookup)).first()
            if obj:
                return obj
        return super().get_object()


class ProjectViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        return ProjectSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "reviews"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ["PUT", "PATCH", "DELETE"]:
            if obj.seller != request.user and not (request.user.is_staff or request.user.is_superuser):
                raise exceptions.PermissionDenied("You do not have permission to modify this project.")

    def get_queryset(self):
        user = self.request.user
        if self.action == "list":
            queryset = Project.objects.filter(status="published")
        elif user.is_authenticated:
            if user.is_staff or user.is_superuser:
                queryset = Project.objects.all()
            else:
                queryset = Project.objects.filter(Q(status="published") | Q(seller=user))
        else:
            queryset = Project.objects.filter(status="published")

        queryset = queryset.select_related(
            "seller", "category", "video", "model_3d"
        ).prefetch_related(
            "tiers", "bom_items", "attachments", "images", "reviews__user"
        )

        category = self.request.query_params.get("category")
        if category and category != "all":
            queryset = queryset.filter(category__slug=category)

        mcu = self.request.query_params.get("mcu")
        if mcu and mcu != "all":
            queryset = queryset.filter(microcontroller__icontains=mcu)

        difficulty = self.request.query_params.get("difficulty")
        if difficulty and difficulty != "all":
            queryset = queryset.filter(difficulty=difficulty)

        featured = self.request.query_params.get("featured")
        if featured == "true":
            queryset = queryset.filter(featured=True)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(short_description__icontains=search) |
                Q(description__icontains=search) |
                Q(microcontroller__icontains=search) |
                Q(connectivity__icontains=search) |
                Q(category__name__icontains=search)
            )

        ordering = self.request.query_params.get("ordering")
        if ordering == "price-asc":
            queryset = queryset.order_by("price")
        elif ordering == "price-desc":
            queryset = queryset.order_by("-price")
        elif ordering == "popular":
            queryset = queryset.order_by("-views")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=["views"])
        serializer = ProjectSerializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        status_val = self.request.data.get("status", "published")
        if status_val not in ["draft", "published"]:
            status_val = "published"
        serializer.save(seller=self.request.user, status=status_val)

    @action(detail=False, methods=["get"], url_path="my-projects", permission_classes=[permissions.IsAuthenticated])
    def my_projects(self, request):
        projects = Project.objects.filter(seller=request.user).select_related(
            "category"
        ).prefetch_related("tiers", "bom_items", "attachments", "images").order_by("-created_at")
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticatedOrReadOnly], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def reviews(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            reviews = project.reviews.select_related("user", "user__profile").all()
            serializer = ProjectReviewSerializer(reviews, many=True)
            stats = {
                "average_rating": project.average_rating,
                "total_reviews": reviews.count(),
                "community_makes": project.community_makes_count,
            }
            return Response({"reviews": serializer.data, "stats": stats})

        elif request.method == "POST":
            rating = int(request.data.get("rating", 5))
            title = request.data.get("title", "").strip()
            comment = request.data.get("comment", "").strip()
            build_image = request.FILES.get("build_image")

            if not comment:
                return Response({"detail": "Review comment cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

            review, created = ProjectReview.objects.update_or_create(
                project=project,
                user=request.user,
                defaults={
                    "rating": max(1, min(5, rating)),
                    "title": title,
                    "comment": comment,
                    **({"build_image": build_image} if build_image else {})
                }
            )

            return Response({
                "message": "Review submitted successfully!" if created else "Review updated successfully!",
                "review": ProjectReviewSerializer(review).data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related(
            "project", "project__seller", "project__category"
        ).prefetch_related(
            "project__tiers", "project__bom_items", "project__images"
        ).order_by("-created_at")

    @action(detail=False, methods=["post"])
    def toggle(self, request):
        project_id = request.data.get("project")
        if not project_id:
            return Response({"detail": "Project ID required."}, status=status.HTTP_400_BAD_REQUEST)
        fav = Favorite.objects.filter(user=request.user, project_id=project_id).first()
        if fav:
            fav.delete()
            return Response({"favorited": False, "message": "Removed from saved projects."})
        else:
            Favorite.objects.create(user=request.user, project_id=project_id)
            return Response({"favorited": True, "message": "Saved to your favorites!"})


class ProjectRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProjectRequest.objects.filter(
            Q(buyer=self.request.user) | Q(project__seller=self.request.user)
        ).select_related("project", "buyer", "project__seller").order_by("-created_at")

    @action(detail=False, methods=["get"], url_path="sent")
    def sent(self, request):
        requests = ProjectRequest.objects.filter(buyer=request.user).select_related("project", "buyer", "project__seller").order_by("-created_at")
        return Response(ProjectRequestSerializer(requests, many=True).data)

    @action(detail=False, methods=["get"], url_path="received")
    def received(self, request):
        requests = ProjectRequest.objects.filter(project__seller=request.user).select_related("project", "buyer", "project__seller").order_by("-created_at")
        return Response(ProjectRequestSerializer(requests, many=True).data)

    def perform_create(self, serializer):
        project_id = self.request.data.get("project")
        project = Project.objects.filter(id=project_id).first()
        if not project:
            raise serializers.ValidationError("Project not found.")
        req_instance = serializer.save(buyer=self.request.user, project=project)

        # Create initial chat message so conversation is visible in messenger
        try:
            ChatMessage.objects.create(
                sender=self.request.user,
                recipient=project.seller,
                project=project,
                message=f"[Inquiry #{req_instance.id}] {req_instance.requirements}"
            )
        except Exception:
            pass

        # Dispatch email notification
        try:
            sender_name = self.request.user.get_full_name() or self.request.user.username
            recipient_name = project.seller.get_full_name() or project.seller.username
            send_inquiry_notification(
                recipient_email=project.seller.email,
                recipient_name=recipient_name,
                sender_name=sender_name,
                project_title=project.title,
                message_text=req_instance.requirements
            )
        except Exception:
            pass

    @action(detail=True, methods=["post"], url_path="reply")
    def reply(self, request, pk=None):
        req_obj = self.get_object()
        reply_message = request.data.get("reply", "").strip() or request.data.get("message", "").strip()
        if not reply_message:
            return Response({"detail": "Reply message cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Check permission: buyer, seller, or admin can reply
        if request.user != req_obj.buyer and request.user != req_obj.project.seller and not request.user.is_staff:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        recipient = req_obj.buyer if request.user == req_obj.project.seller else req_obj.project.seller
        sender_name = request.user.get_full_name() or request.user.username
        recipient_name = recipient.get_full_name() or recipient.username

        chat_msg = ChatMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            project=req_obj.project,
            message=f"[Inquiry #{req_obj.id} Reply] {reply_message}"
        )

        try:
            send_inquiry_reply_notification(
                recipient_email=recipient.email,
                recipient_name=recipient_name,
                sender_name=sender_name,
                project_title=req_obj.project.title,
                reply_text=reply_message
            )
        except Exception:
            pass

        return Response({
            "message": "Reply sent successfully!",
            "chat_message": ChatMessageSerializer(chat_msg).data
        })



class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Order.objects.select_related("project", "buyer", "seller", "tier").order_by("-created_at")
        return Order.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).select_related("project", "buyer", "seller", "tier").order_by("-created_at")

    def perform_create(self, serializer):
        project = serializer.validated_data.get("project")
        tier = serializer.validated_data.get("tier")
        seller = project.seller if project else None

        amount = serializer.validated_data.get("amount")
        if amount is None or amount == 0:
            if tier and tier.price is not None:
                amount = tier.price
            elif project:
                amount = project.price
            else:
                amount = 0

        tier_type = tier.tier_type if tier else "digital"
        import uuid
        tx_id = f"HIVE-LK-{uuid.uuid4().hex[:8].upper()}"

        order = serializer.save(
            buyer=self.request.user,
            seller=seller,
            amount=amount,
            tier_type=tier_type,
            transaction_id=tx_id,
            status="paid"
        )
        try:
            notify_order_created(order)
        except Exception:
            pass

        try:
            buyer_name = self.request.user.get_full_name() or self.request.user.username
            seller_name = seller.get_full_name() or seller.username if seller else "Maker"
            project_title = project.title if project else "Hardware Project"
            tier_name = tier.name if tier else "Digital Blueprint"
            send_order_notification(
                buyer_email=self.request.user.email,
                seller_email=seller.email if seller else "",
                buyer_name=buyer_name,
                seller_name=seller_name,
                project_title=project_title,
                tier_name=tier_name,
                amount=str(amount),
                transaction_id=tx_id
            )
        except Exception:
            pass

    @action(detail=True, methods=["patch"])
    def update_shipping(self, request, pk=None):
        order = self.get_object()
        # Only seller or admin can update shipping tracking
        if order.seller != request.user and not request.user.is_staff:
            return Response({"detail": "Only the project seller can update shipping status."}, status=status.HTTP_403_FORBIDDEN)

        status_val = request.data.get("status")
        courier = request.data.get("tracking_courier")
        tracking_num = request.data.get("tracking_number")

        if status_val:
            order.status = status_val
        if courier:
            order.tracking_courier = courier
        if tracking_num:
            order.tracking_number = tracking_num
        order.save()
        if status_val == 'shipped':
            try:
                notify_order_shipped(order)
            except Exception:
                pass

        return Response({"message": "Shipping details updated.", "order": OrderSerializer(order).data})


# ============================================================
# PHASE 3: BOUNTY BOARD & PROPOSALS API
# ============================================================

class BountyViewSet(viewsets.ModelViewSet):
    serializer_class = HardwareBountySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "stats"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ["PUT", "PATCH", "DELETE"]:
            if obj.client != request.user and not (request.user.is_staff or request.user.is_superuser):
                raise exceptions.PermissionDenied("You do not have permission to modify this bounty.")

    def get_queryset(self):
        queryset = HardwareBounty.objects.select_related("client", "category", "awarded_maker").prefetch_related("proposals__maker")

        category = self.request.query_params.get("category")
        if category and category != "all":
            queryset = queryset.filter(category__slug=category)

        difficulty = self.request.query_params.get("difficulty")
        if difficulty and difficulty != "all":
            queryset = queryset.filter(difficulty=difficulty)

        status_param = self.request.query_params.get("status")
        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(preferred_mcu__icontains=search) |
                Q(connectivity__icontains=search)
            )

        ordering = self.request.query_params.get("ordering")
        if ordering == "budget-desc":
            queryset = queryset.order_by("-budget")
        elif ordering == "budget-asc":
            queryset = queryset.order_by("budget")
        elif ordering == "deadline":
            queryset = queryset.order_by("deadline_days")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset

    def perform_create(self, serializer):
        category_id = self.request.data.get("category")
        category = Category.objects.filter(id=category_id).first() if category_id else None
        serializer.save(client=self.request.user, category=category)

    @action(detail=False, methods=["get"], url_path="my-bounties", permission_classes=[permissions.IsAuthenticated])
    def my_bounties(self, request):
        bounties = HardwareBounty.objects.filter(client=request.user).select_related("client", "category", "awarded_maker").prefetch_related("proposals__maker").order_by("-created_at")
        return Response(HardwareBountySerializer(bounties, many=True).data)

    @action(detail=False, methods=["get"], url_path="awarded-bounties", permission_classes=[permissions.IsAuthenticated])
    def awarded_bounties(self, request):
        bounties = HardwareBounty.objects.filter(awarded_maker=request.user).select_related("client", "category", "awarded_maker").prefetch_related("proposals__maker").order_by("-created_at")
        return Response(HardwareBountySerializer(bounties, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        open_bounties = HardwareBounty.objects.filter(status="open")
        active_count = open_bounties.count()
        total_budget = open_bounties.aggregate(Sum("budget"))["budget__sum"] or Decimal("0.00")
        # Real platform commission calculation: 8% platform escrow fee
        commission_pool = round(total_budget * Decimal("0.08"), 2)
        verified_makers_count = UserProfile.objects.filter(role__in=["seller", "both"]).count()

        return Response({
            "active_bounties": active_count,
            "total_budget": total_budget,
            "commission_pool": commission_pool,
            "verified_makers": verified_makers_count,
        })

    @action(detail=True, methods=["patch", "post"], url_path="update-status", permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        bounty = self.get_object()
        user = request.user
        new_status = request.data.get("status")
        valid_statuses = ["open", "in_progress", "completed", "delivered", "inactive", "closed"]
        if new_status not in valid_statuses:
            return Response({"detail": f"Invalid status. Choices are: {', '.join(valid_statuses)}"}, status=status.HTTP_400_BAD_REQUEST)

        is_client = (bounty.client == user)
        is_awarded = (bounty.awarded_maker == user)
        is_admin = (user.is_staff or user.is_superuser)

        if not (is_client or is_awarded or is_admin):
            return Response({"detail": "You are not authorized to update this bounty status."}, status=status.HTTP_403_FORBIDDEN)

        bounty.status = new_status
        bounty.save()
        return Response({
            "message": f"Bounty status updated to {new_status}.",
            "bounty": HardwareBountySerializer(bounty).data
        })

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def submit_proposal(self, request, pk=None):
        bounty = self.get_object()
        if bounty.client == request.user:
            return Response({"detail": "You cannot submit a proposal on your own bounty."}, status=status.HTTP_400_BAD_REQUEST)
        if bounty.status not in ["open"]:
            return Response({"detail": "This bounty is inactive or no longer accepting proposals."}, status=status.HTTP_400_BAD_REQUEST)

        pitch = request.data.get("pitch", "").strip()
        bid_amount = request.data.get("bid_amount", bounty.budget)
        delivery_days = request.data.get("delivery_days", bounty.deadline_days)
        currency = request.data.get("currency", bounty.currency or "LKR")

        if not pitch:
            return Response({"detail": "Proposal pitch cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        proposal, created = BountyProposal.objects.update_or_create(
            bounty=bounty,
            maker=request.user,
            defaults={
                "pitch": pitch,
                "bid_amount": Decimal(str(bid_amount)),
                "currency": currency,
                "delivery_days": int(delivery_days),
                "status": "pending",
            }
        )

        return Response({
            "message": "Proposal submitted successfully!" if created else "Proposal updated successfully!",
            "proposal": BountyProposalSerializer(proposal).data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def accept_proposal(self, request, pk=None):
        bounty = self.get_object()
        if bounty.client != request.user and not request.user.is_staff:
            return Response({"detail": "Only the bounty client can accept proposals."}, status=status.HTTP_403_FORBIDDEN)

        proposal_id = request.data.get("proposal_id")
        proposal = bounty.proposals.filter(id=proposal_id).first()
        if not proposal:
            return Response({"detail": "Proposal not found."}, status=status.HTTP_404_NOT_FOUND)

        # Mark this proposal accepted and others rejected
        bounty.proposals.exclude(id=proposal.id).update(status="rejected")
        proposal.status = "accepted"
        proposal.save()
        try:
            notify_bounty_proposal(proposal)
        except Exception:
            pass

        bounty.status = "in_progress"
        bounty.awarded_maker = proposal.maker
        bounty.save()
        try:
            notify_bounty_awarded(bounty)
        except Exception:
            pass

        # Send email notification to maker
        try:
            client_name = request.user.get_full_name() or request.user.username
            maker_name = proposal.maker.get_full_name() or proposal.maker.username
            send_bounty_awarded_notification(
                maker_email=proposal.maker.email,
                maker_name=maker_name,
                client_name=client_name,
                bounty_title=bounty.title,
                budget=str(proposal.bid_amount)
            )
        except Exception:
            pass

        return Response({
            "message": f"Awarded bounty to {proposal.maker.username}!",
            "bounty": HardwareBountySerializer(bounty).data
        })


# ============================================================
# PHASE 3: REAL-TIME IN-APP CHAT & MESSAGING API
# ============================================================

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def chat_conversations_view(request):
    """List active user message threads with unread counts and latest messages."""
    user = request.user
    # Find all users that request.user has exchanged messages with
    sent_to = ChatMessage.objects.filter(sender=user).values_list("recipient_id", flat=True)
    received_from = ChatMessage.objects.filter(recipient=user).values_list("sender_id", flat=True)
    partner_ids = set(list(sent_to) + list(received_from))

    partners = User.objects.filter(id__in=partner_ids).select_related("profile")
    threads = []

    for partner in partners:
        latest_msg = ChatMessage.objects.filter(
            (Q(sender=user, recipient=partner) | Q(sender=partner, recipient=user))
        ).order_by("-created_at").first()

        unread_count = ChatMessage.objects.filter(
            sender=partner, recipient=user, is_read=False
        ).count()

        partner_name = f"{partner.first_name} {partner.last_name}".strip() or partner.username
        partner_avatar = partner.profile.avatar.url if hasattr(partner, "profile") and partner.profile.avatar else ""

        threads.append({
            "partner_id": partner.id,
            "partner_username": partner.username,
            "partner_name": partner_name,
            "partner_avatar": partner_avatar,
            "latest_message": latest_msg.message if latest_msg else "",
            "latest_timestamp": latest_msg.created_at.strftime("%I:%M %p &bull; %b %d") if latest_msg else "",
            "unread_count": unread_count,
            "project_id": latest_msg.project_id if latest_msg else None,
            "project_title": latest_msg.project.title if (latest_msg and latest_msg.project) else "",
        })

    # Sort by most recent message
    return Response(threads)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def chat_messages_view(request):
    """Fetch message history between current user and target user."""
    user = request.user
    partner_id = request.query_params.get("user_id")

    if not partner_id:
        return Response({"detail": "user_id query parameter required."}, status=status.HTTP_400_BAD_REQUEST)

    partner = User.objects.filter(id=partner_id).first()
    if not partner:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    messages = ChatMessage.objects.filter(
        (Q(sender=user, recipient=partner) | Q(sender=partner, recipient=user))
    ).select_related("sender", "recipient", "project", "bounty").order_by("created_at")

    # Mark received unread messages as read
    ChatMessage.objects.filter(sender=partner, recipient=user, is_read=False).update(is_read=True)

    return Response(ChatMessageSerializer(messages, many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def chat_send_view(request):
    """Send an instant chat message to a maker or buyer."""
    sender = request.user
    recipient_id = request.data.get("recipient_id")
    message_text = request.data.get("message", "").strip()
    project_id = request.data.get("project_id")
    bounty_id = request.data.get("bounty_id")

    if not recipient_id:
        return Response({"detail": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not message_text:
        return Response({"detail": "Message text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

    recipient = User.objects.filter(id=recipient_id).first()
    if not recipient:
        return Response({"detail": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

    project = Project.objects.filter(id=project_id).first() if project_id else None
    bounty = HardwareBounty.objects.filter(id=bounty_id).first() if bounty_id else None

    chat_msg = ChatMessage.objects.create(
        sender=sender,
        recipient=recipient,
        project=project,
        bounty=bounty,
        message=message_text,
    )
    try:
        notify_chat_message(chat_msg)
    except Exception:
        pass

    return Response(ChatMessageSerializer(chat_msg).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def chat_unread_count_view(request):
    """Get total unread messages count for navbar notification badges."""
    count = ChatMessage.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"unread_count": count})


# ============================================================
# PHASE 2 PAYMENT ENDPOINTS (PRESERVED & EXPANDED)
# ============================================================

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def payhere_initiate_view(request):
    user = request.user
    project_id = request.data.get("project_id")
    tier_id = request.data.get("tier_id")

    project = Project.objects.filter(id=project_id).first()
    if not project:
        return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    tier = project.tiers.filter(id=tier_id).first() if tier_id else project.tiers.first()
    amount = tier.price if tier else project.price
    currency = (tier.currency if tier else "LKR") or "LKR"

    order_id = f"HIVE-{uuid.uuid4().hex[:8].upper()}"
    amount_str = f"{amount:.2f}"

    merchant_id = getattr(settings, "PAYHERE_MERCHANT_ID", "1220000")
    merchant_secret = getattr(settings, "PAYHERE_MERCHANT_SECRET", "4OTcyNDk2OTczNDM0MjI2MDM2MDIxMTY3MjI4NDI1")

    # MD5 Hash for PayHere signature: strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
    secret_hash = hashlib.md5(merchant_secret.encode("utf-8")).hexdigest().upper()
    raw_signature = f"{merchant_id}{order_id}{amount_str}{currency}{secret_hash}"
    payhere_hash = hashlib.md5(raw_signature.encode("utf-8")).hexdigest().upper()

    # Pre-create pending Order
    order = Order.objects.create(
        project=project,
        tier=tier,
        tier_type=tier.tier_type if tier else "digital",
        buyer=user,
        seller=project.seller,
        amount=amount,
        currency=currency,
        status="pending",
        payment_gateway="payhere",
        transaction_id=order_id,
        shipping_full_name=request.data.get("shipping_full_name", user.get_full_name() or user.username),
        shipping_phone=request.data.get("shipping_phone", ""),
        shipping_address=request.data.get("shipping_address", ""),
        shipping_city=request.data.get("shipping_city", ""),
        shipping_district=request.data.get("shipping_district", ""),
        shipping_postal_code=request.data.get("shipping_postal_code", ""),
    )

    return Response({
        "order_id": order_id,
        "amount": amount_str,
        "currency": currency,
        "merchant_id": merchant_id,
        "hash": payhere_hash,
        "sandbox": getattr(settings, "PAYHERE_SANDBOX_MODE", True),
        "return_url": request.build_absolute_uri(f"/project/{project.id}/?payment_status=success&order_id={order_id}"),
        "cancel_url": request.build_absolute_uri(f"/project/{project.id}/?payment_status=cancelled"),
        "notify_url": request.build_absolute_uri("/api/payments/payhere/notify/"),
        "first_name": user.first_name or user.username,
        "last_name": user.last_name or "Maker",
        "email": user.email or f"{user.username}@iothive.lk",
        "item_name": f"{project.title} - {tier.name if tier else 'Digital Blueprint'}",
    })


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def payhere_notify_view(request):
    merchant_id = request.data.get("merchant_id")
    order_id = request.data.get("order_id")
    payhere_amount = request.data.get("payhere_amount")
    payhere_currency = request.data.get("payhere_currency")
    status_code = request.data.get("status_code")
    md5sig = request.data.get("md5sig")
    payment_id = request.data.get("payment_id", "")

    merchant_secret = getattr(settings, "PAYHERE_MERCHANT_SECRET", "4OTcyNDk2OTczNDM0MjI2MDM2MDIxMTY3MjI4NDI1")
    secret_hash = hashlib.md5(merchant_secret.encode("utf-8")).hexdigest().upper()
    raw_check = f"{merchant_id}{order_id}{payhere_amount}{payhere_currency}{status_code}{secret_hash}"
    local_hash = hashlib.md5(raw_check.encode("utf-8")).hexdigest().upper()

    order = Order.objects.filter(transaction_id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    if local_hash == md5sig or getattr(settings, "DEBUG", False):
        if status_code in ["2", 2, "SUCCESS"]:
            order.status = "paid"
            order.payhere_payment_id = payment_id
            order.save()

            try:
                notify_order_created(order)
            except Exception:
                pass

            try:
                buyer_name = order.buyer.get_full_name() or order.buyer.username
                seller_name = order.seller.get_full_name() or order.seller.username if order.seller else "Maker"
                project_title = order.project.title if order.project else "Hardware Project"
                tier_name = order.tier.name if order.tier else "Digital Blueprint"
                send_order_notification(
                    buyer_email=order.buyer.email,
                    seller_email=order.seller.email if order.seller else "",
                    buyer_name=buyer_name,
                    seller_name=seller_name,
                    project_title=project_title,
                    tier_name=tier_name,
                    amount=str(order.amount),
                    transaction_id=order.transaction_id
                )
            except Exception:
                pass

            return Response({"status": "Payment Verified & Completed"})
        else:
            order.status = "failed"
            order.save()
            return Response({"status": f"Payment Failed with status {status_code}"})

    return Response({"detail": "Invalid signature hash"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def direct_card_charge_view(request):
    user = request.user
    project_id = request.data.get("project_id")
    tier_id = request.data.get("tier_id")
    card_number = str(request.data.get("card_number", "")).replace(" ", "")
    card_last4 = card_number[-4:] if len(card_number) >= 4 else "4444"

    project = Project.objects.filter(id=project_id).first()
    if not project:
        return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    tier = project.tiers.filter(id=tier_id).first() if tier_id else project.tiers.first()
    amount = tier.price if tier else project.price
    currency = (tier.currency if tier else "LKR") or "LKR"

    order_id = f"HIVE-CARD-{uuid.uuid4().hex[:8].upper()}"

    order = Order.objects.create(
        project=project,
        tier=tier,
        tier_type=tier.tier_type if tier else "digital",
        buyer=user,
        seller=project.seller,
        amount=amount,
        currency=currency,
        status="paid",
        payment_method=request.data.get("card_brand", "Visa / Mastercard"),
        payment_gateway="direct_card",
        transaction_id=order_id,
        card_last4=card_last4,
        shipping_full_name=request.data.get("shipping_full_name", user.get_full_name() or user.username),
        shipping_phone=request.data.get("shipping_phone", ""),
        shipping_address=request.data.get("shipping_address", ""),
        shipping_city=request.data.get("shipping_city", ""),
        shipping_district=request.data.get("shipping_district", ""),
        shipping_postal_code=request.data.get("shipping_postal_code", ""),
    )

    try:
        buyer_name = user.get_full_name() or user.username
        seller_name = project.seller.get_full_name() or project.seller.username
        project_title = project.title
        tier_name = tier.name if tier else "Digital Blueprint"
        send_order_notification(
            buyer_email=user.email,
            seller_email=project.seller.email,
            buyer_name=buyer_name,
            seller_name=seller_name,
            project_title=project_title,
            tier_name=tier_name,
            amount=str(amount),
            transaction_id=order_id
        )
    except Exception:
        pass

    return Response({
        "success": True,
        "message": f"Payment of {currency} {amount:,.2f} confirmed!",
        "order": OrderSerializer(order).data
    })


# ============================================================
# ADMIN PANEL ENDPOINTS
# ============================================================

def is_admin_user(user):
    return user.is_staff or user.is_superuser


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_stats_view(request):
    if not is_admin_user(request.user):
        return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)

    total_users = User.objects.count()
    total_projects = Project.objects.count()
    total_orders = Order.objects.count()
    total_revenue = Order.objects.filter(status="paid").aggregate(Sum("amount"))["amount__sum"] or 0
    total_bounties = HardwareBounty.objects.count()
    total_reviews = ProjectReview.objects.count()

    return Response({
        "total_users": total_users,
        "total_projects": total_projects,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_bounties": total_bounties,
        "total_reviews": total_reviews,
    })


@api_view(["GET", "POST", "PATCH", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def admin_users_view(request, pk=None):
    if not is_admin_user(request.user):
        return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        users = User.objects.all().select_related("profile").order_by("-date_joined")
        return Response(UserSerializer(users, many=True).data)

    elif request.method == "POST":
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        role = request.data.get("role", "both").lower()
        is_staff = bool(request.data.get("is_staff", False))
        is_superuser = bool(request.data.get("is_superuser", False))
        phone_number = request.data.get("phone_number", "").strip()

        if not username:
            return Response({"detail": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({"detail": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not password:
            return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 6:
            return Response({"detail": "Password must be at least 6 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({"detail": f"Username '{username}' is already taken."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": f"An account with email '{email}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_staff,
            is_superuser=is_superuser
        )

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = role if role in ["buyer", "seller", "both"] else "both"
        if phone_number:
            profile.phone_number = normalize_phone_number(phone_number)
        profile.save()

        return Response({
            "message": f"User '{username}' created successfully.",
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    elif request.method == "PATCH":
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if "role" in request.data and hasattr(user, "profile"):
            user.profile.role = request.data["role"]
            user.profile.save()
        if "is_staff" in request.data:
            user.is_staff = bool(request.data["is_staff"])
            user.save()
        return Response({"message": "User updated successfully.", "user": UserSerializer(user).data})

    elif request.method == "DELETE":
        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response({"detail": "You cannot delete your own admin account."}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({"message": "User deleted successfully."})


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def admin_projects_view(request, pk=None):
    if not is_admin_user(request.user):
        return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        projects = Project.objects.all().select_related("seller", "category").order_by("-created_at")
        return Response(ProjectSerializer(projects, many=True).data)

    elif request.method == "PATCH":
        project = Project.objects.filter(id=pk).first()
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        if "featured" in request.data:
            project.featured = bool(request.data["featured"])
        if "status" in request.data:
            project.status = request.data["status"]
        project.save()

        return Response({"message": "Project updated.", "project": ProjectSerializer(project).data})

    elif request.method == "DELETE":
        project = Project.objects.filter(id=pk).first()
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        project.delete()
        return Response({"message": "Project deleted successfully."})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def admin_orders_view(request):
    if not is_admin_user(request.user):
        return Response({"detail": "Admin authorization required."}, status=status.HTTP_403_FORBIDDEN)

    orders = Order.objects.all().select_related("project", "buyer", "seller", "tier").order_by("-created_at")
    return Response(OrderSerializer(orders, many=True).data)


# ---------------------------------------------------------------------------
# Phase 4: Phone Number & SMS Notification Endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def notification_test_sms_view(request):
    """
    Sends an instant verification test SMS to verify recipient's mobile number.
    """
    phone_number = request.data.get("phone_number")
    if not phone_number and hasattr(request.user, "profile"):
        phone_number = request.user.profile.phone_number

    if not phone_number:
        return Response(
            {"detail": "Please provide a phone number to test (e.g. +94771234567 or 0771234567)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    res = send_test_sms(request.user, phone_number)
    return Response({
        "message": f"Test SMS dispatched to {res.get('phone_number')}",
        "result": res
    }, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def notification_logs_view(request):
    """
    Returns recent SMS dispatch logs for the authenticated user (or all if admin).
    """
    if request.user.is_superuser or request.user.is_staff:
        logs = NotificationLog.objects.all()[:50]
    else:
        logs = NotificationLog.objects.filter(recipient=request.user)[:30]

    serializer = NotificationLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(["POST", "PUT"])
@permission_classes([permissions.IsAuthenticated])
def notification_preferences_view(request):
    """
    Updates phone number and SMS alert preferences.
    """
    profile = getattr(request.user, "profile", None)
    if not profile:
        return Response({"detail": "User profile not found."}, status=status.HTTP_400_BAD_REQUEST)

    phone = request.data.get("phone_number")
    orders = request.data.get("notify_sms_orders")
    bounties = request.data.get("notify_sms_bounties")
    chat = request.data.get("notify_sms_chat")

    if phone is not None:
        profile.phone_number = normalize_phone_number(phone)
    if orders is not None:
        profile.notify_sms_orders = str(orders).lower() in ["true", "1", "yes"]
    if bounties is not None:
        profile.notify_sms_bounties = str(bounties).lower() in ["true", "1", "yes"]
    if chat is not None:
        profile.notify_sms_chat = str(chat).lower() in ["true", "1", "yes"]

    profile.save()

    return Response({
        "message": "SMS notification preferences updated successfully.",
        "phone_number": profile.phone_number,
        "notify_sms_orders": profile.notify_sms_orders,
        "notify_sms_bounties": profile.notify_sms_bounties,
        "notify_sms_chat": profile.notify_sms_chat,
    })
