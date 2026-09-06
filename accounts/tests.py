from django.test import TestCase, Client
from django.contrib.auth.models import User
from rest_framework import status
import json


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.username = "testuser"
        self.email = "testuser@example.com"
        self.password = "Secr3tPass!123"
        self.user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password,
            first_name="Test",
            last_name="User"
        )

    def test_login_with_username_success(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": self.username, "password": self.password}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.json())

    def test_login_with_email_success(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": self.email, "password": self.password}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["user"]["username"], self.username)

    def test_login_with_string_payload_resilience(self):
        """Simulates when client mistakenly sends a raw string instead of a dictionary."""
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps("some_raw_string"),
            content_type="application/json"
        )
        # Should gracefully return 400 Bad Request instead of 500 AttributeError
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_invalid_credentials(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": self.username, "password": "wrongpassword"}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_credentials(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "", "password": ""}),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_flow_success(self):
        from django.core import mail
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        # 1. Request reset
        req_res = self.client.post(
            "/api/auth/password-reset/",
            data=json.dumps({"email": self.email}),
            content_type="application/json"
        )
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertIn("message", req_res.json())
        # Verify email was dispatched
        self.assertTrue(len(mail.outbox) > 0)
        self.assertIn(self.email, mail.outbox[0].to)

        # 2. Confirm reset using user's token
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        new_pass = "NewSecr3tPassword!456"
        conf_res = self.client.post(
            "/api/auth/password-reset-confirm/",
            data=json.dumps({
                "uidb64": uidb64,
                "token": token,
                "new_password": new_pass
            }),
            content_type="application/json"
        )
        self.assertEqual(conf_res.status_code, status.HTTP_200_OK)

        # 3. Verify user can log in with new password
        login_res = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": self.username, "password": new_pass}),
            content_type="application/json"
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_password_reset_invalid_token(self):
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        conf_res = self.client.post(
            "/api/auth/password-reset-confirm/",
            data=json.dumps({
                "uidb64": uidb64,
                "token": "invalid-token-123",
                "new_password": "NewValidPassword!123"
            }),
            content_type="application/json"
        )
        self.assertEqual(conf_res.status_code, status.HTTP_400_BAD_REQUEST)
