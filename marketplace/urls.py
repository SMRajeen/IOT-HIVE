from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    ProjectViewSet,
    FavoriteViewSet,
    ProjectRequestViewSet,
    OrderViewSet,
    BountyViewSet,
    chat_conversations_view,
    chat_messages_view,
    chat_send_view,
    chat_unread_count_view,
    notification_test_sms_view,
    notification_logs_view,
    notification_preferences_view,
    payhere_initiate_view,
    payhere_notify_view,
    direct_card_charge_view,
    admin_stats_view,
    admin_users_view,
    admin_projects_view,
    admin_orders_view,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("projects", ProjectViewSet, basename="project")
router.register("favorites", FavoriteViewSet, basename="favorite")
router.register("requests", ProjectRequestViewSet, basename="project-request")
router.register("orders", OrderViewSet, basename="order")
router.register("bounties", BountyViewSet, basename="bounty")

urlpatterns = router.urls + [
    # Phase 4: Phone Number & SMS Notification Endpoints
    path("notifications/test-sms/", notification_test_sms_view, name="notification-test-sms"),
    path("notifications/logs/", notification_logs_view, name="notification-logs"),
    path("notifications/preferences/", notification_preferences_view, name="notification-preferences"),

    # Phase 2 Payment Endpoints
    path("payments/payhere/initiate/", payhere_initiate_view, name="payhere-initiate"),
    path("payments/payhere/notify/", payhere_notify_view, name="payhere-notify"),
    path("payments/card-charge/", direct_card_charge_view, name="direct-card-charge"),

    # Phase 3 Chat & In-App Messaging Endpoints
    path("chat/conversations/", chat_conversations_view, name="chat-conversations"),
    path("chat/messages/", chat_messages_view, name="chat-messages"),
    path("chat/send/", chat_send_view, name="chat-send"),
    path("chat/unread-count/", chat_unread_count_view, name="chat-unread-count"),

    # Admin Panel
    path("admin/stats/", admin_stats_view, name="admin-stats"),
    path("admin/users/", admin_users_view, name="admin-users"),
    path("admin/users/<int:pk>/", admin_users_view, name="admin-user-detail"),
    path("admin/projects/", admin_projects_view, name="admin-projects"),
    path("admin/projects/<int:pk>/", admin_projects_view, name="admin-project-detail"),
    path("admin/orders/", admin_orders_view, name="admin-orders"),
    path("admin/orders/<int:pk>/", admin_orders_view, name="admin-order-detail"),
]
