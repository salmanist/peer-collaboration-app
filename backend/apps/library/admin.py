from django.contrib import admin

from .models import LibraryProject, LibraryProjectFile, Note, NoteFile


class LibraryProjectFileInline(admin.TabularInline):
    model = LibraryProjectFile
    extra = 0
    readonly_fields = ["uploaded_at"]


@admin.register(LibraryProject)
class LibraryProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "department", "level", "status", "created_at"]
    list_filter = ["status", "department", "level"]
    search_fields = ["title", "abstract", "author__email"]
    actions = ["approve_selected", "reject_selected"]
    inlines = [LibraryProjectFileInline]

    @admin.action(description="Approve selected projects")
    def approve_selected(self, request, queryset):
        queryset.update(status=LibraryProject.Status.APPROVED)

    @admin.action(description="Reject selected projects")
    def reject_selected(self, request, queryset):
        queryset.update(status=LibraryProject.Status.REJECTED)


class NoteFileInline(admin.TabularInline):
    model = NoteFile
    extra = 0
    readonly_fields = ["uploaded_at"]


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    # No approve/reject actions - notes carry no moderation status.
    list_display = ["title", "author", "course", "semester", "created_at"]
    list_filter = ["semester"]
    search_fields = ["title", "description", "author__email", "course__code", "course__title"]
    inlines = [NoteFileInline]
