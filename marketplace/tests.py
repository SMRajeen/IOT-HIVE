import json
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework import status

from accounts.models import UserProfile
from marketplace.models import (
    Category,
    Project,
    ProjectTier,
    ProjectBOMItem,
    Favorite,
    ProjectRequest,
    Order,
    ProjectReview,
    HardwareBounty,
    BountyProposal,
    ChatMessage,
)


class MarketplaceAPIBaseTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        # Seller
        self.seller = User.objects.create_user(
            username="seller_alice",
            email="alice@example.com",
            password="Password123!",
            first_name="Alice",
            last_name="Seller"
        )
        UserProfile.objects.create(user=self.seller, role="seller")

        # Buyer
        self.buyer = User.objects.create_user(
            username="buyer_bob",
            email="bob@example.com",
            password="Password123!",
            first_name="Bob",
            last_name="Buyer"
        )
        UserProfile.objects.create(user=self.buyer, role="buyer")

        # Admin / Staff User
        self.admin_user = User.objects.create_user(
            username="admin_super",
            email="admin@example.com",
            password="AdminPassword123!",
            is_staff=True,
            is_superuser=True
        )
        UserProfile.objects.create(user=self.admin_user, role="both")

        # Category
        self.category = Category.objects.create(
            name="Smart Home",
            slug="smart-home",
            description="Smart home automation projects"
        )

        # Published Project
        self.project = Project.objects.create(
            seller=self.seller,
            category=self.category,
            title="ESP32 Smart Thermostat",
            slug="esp32-smart-thermostat",
            short_description="WiFi-enabled temperature & humidity control node",
            description="A comprehensive IoT environmental monitor built on ESP32.",
            microcontroller="ESP32",
            difficulty="intermediate",
            status="published",
            price=Decimal("4500.00")
        )

        # Project Tier
        self.tier = ProjectTier.objects.create(
            project=self.project,
            name="Full Assembled Hardware Kit",
            tier_type="assembled",
            price=Decimal("4500.00"),
            description="Includes tested PCB, ESP32, OLED, sensors and acrylic case."
        )


class CategoryAndProjectAPITests(MarketplaceAPIBaseTestCase):
    def test_list_categories(self):
        response = self.client.get("/api/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(any(c["slug"] == "smart-home" for c in data))

    def test_list_published_projects(self):
        response = self.client.get("/api/projects/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(len(data) >= 1)
        self.assertEqual(data[0]["title"], "ESP32 Smart Thermostat")

    def test_filter_projects_by_mcu_and_category(self):
        res = self.client.get("/api/projects/?mcu=ESP32&category=smart-home")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(len(data), 1)

        res_none = self.client.get("/api/projects/?mcu=STM32")
        self.assertEqual(res_none.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_none.json()), 0)

    def test_create_project_authenticated(self):
        self.client.force_login(self.seller)
        payload = {
            "title": "RP2040 Cyber Watch",
            "category": self.category.id,
            "short_description": "Custom hardware wearable with OLED",
            "description": "Wearable smart assistant running on Raspberry Pi Pico.",
            "microcontroller": "RP2040",
            "difficulty": "advanced",
            "price": "8900.00",
            "status": "published",
        }
        response = self.client.post("/api/projects/", data=payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["title"], "RP2040 Cyber Watch")


class ProjectReviewsAPITests(MarketplaceAPIBaseTestCase):
    def test_submit_review(self):
        self.client.force_login(self.buyer)
        payload = {
            "rating": 5,
            "title": "Outstanding build quality",
            "comment": "Schematics and firmware were extremely well documented."
        }
        response = self.client.post(
            f"/api/projects/{self.project.id}/reviews/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["review"]["rating"], 5)
        self.assertEqual(data["review"]["user_username"], self.buyer.username)

        # Verify rating updated on project
        self.project.refresh_from_db()
        self.assertEqual(self.project.average_rating, 5.0)
        self.assertEqual(self.project.review_count, 1)


class FavoritesAndRequestsAPITests(MarketplaceAPIBaseTestCase):
    def test_favorite_toggle(self):
        self.client.force_login(self.buyer)

        # 1. Add to favorite
        res = self.client.post(
            "/api/favorites/toggle/",
            data=json.dumps({"project": self.project.id}),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json()["favorited"])
        self.assertTrue(Favorite.objects.filter(user=self.buyer, project=self.project).exists())

        # 2. Toggle off
        res2 = self.client.post(
            "/api/favorites/toggle/",
            data=json.dumps({"project": self.project.id}),
            content_type="application/json"
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.json()["favorited"])

    def test_project_inquiry_creation(self):
        self.client.force_login(self.buyer)
        payload = {
            "project": self.project.id,
            "message": "Hi, can you provide a waterproof enclosure option?"
        }
        response = self.client.post(
            "/api/requests/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProjectRequest.objects.filter(buyer=self.buyer).count(), 1)


class OrdersAndPaymentsAPITests(MarketplaceAPIBaseTestCase):
    def test_create_order(self):
        self.client.force_login(self.buyer)
        payload = {
            "project": self.project.id,
            "tier": self.tier.id,
            "shipping_full_name": "Bob Buyer",
            "shipping_phone": "+94771234567",
            "shipping_address": "No. 42 Cyber Street",
            "shipping_city": "Colombo",
            "shipping_district": "Colombo",
            "shipping_postal_code": "00500"
        }
        response = self.client.post(
            "/api/orders/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_data = response.json()
        self.assertEqual(order_data["status"], "pending")
        self.assertEqual(order_data["shipping_city"], "Colombo")

    def test_direct_card_charge(self):
        self.client.force_login(self.buyer)
        payload = {
            "project_id": self.project.id,
            "tier_id": self.tier.id,
            "card_number": "4242 4242 4242 4242",
            "exp_date": "12/28",
            "cvc": "123",
            "card_brand": "Visa",
            "shipping_full_name": "Bob Buyer",
            "shipping_phone": "+94771234567",
            "shipping_address": "No. 42 Cyber Street",
            "shipping_city": "Colombo"
        }
        response = self.client.post(
            "/api/payments/card-charge/",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["order"]["status"], "paid")

    def test_admin_update_order_fulfillment(self):
        # Create an order first
        from marketplace.models import Order
        order = Order.objects.create(
            project=self.project,
            buyer=self.buyer,
            seller=self.seller,
            amount=self.tier.price,
            status="paid"
        )
        self.client.force_login(self.admin_user)
        patch_res = self.client.patch(
            f"/api/admin/orders/{order.id}/",
            data=json.dumps({
                "status": "shipped",
                "tracking_courier": "PromptX",
                "tracking_number": "PRX-123456"
            }),
            content_type="application/json"
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        updated_data = patch_res.json()
        self.assertEqual(updated_data["order"]["status"], "shipped")
        self.assertEqual(updated_data["order"]["tracking_courier"], "PromptX")
        self.assertEqual(updated_data["order"]["tracking_number"], "PRX-123456")


class BountiesAndProposalsAPITests(MarketplaceAPIBaseTestCase):
    def test_bounty_creation_and_proposal_flow(self):
        # 1. Buyer creates hardware bounty
        self.client.force_login(self.buyer)
        bounty_res = self.client.post(
            "/api/bounties/",
            data={
                "title": "Custom LoRa Greenhouse Telemetry Node",
                "category": self.category.id,
                "description": "Need a solar-powered LoRaWAN PCB transmitting soil moisture & lux.",
                "budget": "25000.00",
                "currency": "LKR",
                "deadline_days": 21,
                "difficulty": "intermediate"
            }
        )
        self.assertEqual(bounty_res.status_code, status.HTTP_201_CREATED)
        bounty_id = bounty_res.json()["id"]

        # 2. Seller submits proposal
        self.client.force_login(self.seller)
        prop_res = self.client.post(
            f"/api/bounties/{bounty_id}/submit_proposal/",
            data=json.dumps({
                "pitch": "I have designed 10+ agricultural LoRa nodes using SX1262 transceiver.",
                "bid_amount": "24000.00",
                "delivery_days": 18,
                "currency": "LKR"
            }),
            content_type="application/json"
        )
        self.assertEqual(prop_res.status_code, status.HTTP_201_CREATED)
        proposal_id = prop_res.json()["proposal"]["id"]

        # 3. Buyer accepts proposal
        self.client.force_login(self.buyer)
        accept_res = self.client.post(
            f"/api/bounties/{bounty_id}/accept_proposal/",
            data=json.dumps({"proposal_id": proposal_id}),
            content_type="application/json"
        )
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)

        # Verify proposal accepted
        prop = BountyProposal.objects.get(id=proposal_id)
        self.assertEqual(prop.status, "accepted")
        bounty = HardwareBounty.objects.get(id=bounty_id)
        self.assertEqual(bounty.status, "in_progress")


class ChatAndMessagingAPITests(MarketplaceAPIBaseTestCase):
    def test_chat_messaging_and_unread_count(self):
        # 1. Buyer sends message to Seller
        self.client.force_login(self.buyer)
        send_res = self.client.post(
            "/api/chat/send/",
            data=json.dumps({
                "recipient_id": self.seller.id,
                "message": "Hello Alice! Do you have sample telemetry code?",
                "project_id": self.project.id
            }),
            content_type="application/json"
        )
        self.assertEqual(send_res.status_code, status.HTTP_201_CREATED)

        # 2. Check unread count for Seller
        self.client.force_login(self.seller)
        unread_res = self.client.get("/api/chat/unread-count/")
        self.assertEqual(unread_res.status_code, status.HTTP_200_OK)
        self.assertEqual(unread_res.json()["unread_count"], 1)

        # 3. Fetch conversation messages
        messages_res = self.client.get(f"/api/chat/messages/?user_id={self.buyer.id}")
        self.assertEqual(messages_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(messages_res.json()), 1)
        self.assertEqual(messages_res.json()[0]["message"], "Hello Alice! Do you have sample telemetry code?")
