from django.contrib import admin

from .models import (
    Category,
    Project,
    ProjectImage,
    ProjectVideo,
    ProjectModel3D,
    Favorite,
    ProjectRequest,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "seller",
        "category",
        "price",
        "status",
        "featured",
        "views",
        "created_at",
    )

    list_filter = (
        "status",
        "featured",
        "category",
        "is_free",
    )

    search_fields = (
        "title",
        "description",
        "seller__username",
    )

    prepopulated_fields = {
        "slug": ("title",)
    }


@admin.register(ProjectImage)
class ProjectImageAdmin(admin.ModelAdmin):
    list_display = ("project", "caption", "created_at")
    search_fields = ("project__title",)


@admin.register(ProjectVideo)
class ProjectVideoAdmin(admin.ModelAdmin):
    list_display = ("project", "title")


@admin.register(ProjectModel3D)
class ProjectModel3DAdmin(admin.ModelAdmin):
    list_display = ("project", "title")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "project", "created_at")
    search_fields = (
        "user__username",
        "project__title",
    )


@admin.register(ProjectRequest)
class ProjectRequestAdmin(admin.ModelAdmin):
    list_display = (
        "project",
        "buyer",
        "status",
        "created_at",
    )

    list_filter = ("status",)

    search_fields = (
        "project__title",
        "buyer__username",
    )