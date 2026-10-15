from django.urls import path

from .views import (
    LibraryProjectBookmarkView,
    LibraryProjectDetailView,
    LibraryProjectListCreateView,
    LibraryProjectUpvoteView,
    MyLibraryProjectsView,
    MyNotesView,
    NoteBookmarkView,
    NoteDetailView,
    NoteListCreateView,
    NoteUpvoteView,
)

urlpatterns = [
    path("", LibraryProjectListCreateView.as_view(), name="library-list"),
    path("mine/", MyLibraryProjectsView.as_view(), name="library-mine"),
    path("<int:pk>/", LibraryProjectDetailView.as_view(), name="library-detail"),
    path("<int:pk>/upvote/", LibraryProjectUpvoteView.as_view(), name="library-upvote"),
    path("<int:pk>/bookmark/", LibraryProjectBookmarkView.as_view(), name="library-bookmark"),
    path("notes/", NoteListCreateView.as_view(), name="note-list"),
    path("notes/mine/", MyNotesView.as_view(), name="note-mine"),
    path("notes/<int:pk>/", NoteDetailView.as_view(), name="note-detail"),
    path("notes/<int:pk>/upvote/", NoteUpvoteView.as_view(), name="note-upvote"),
    path("notes/<int:pk>/bookmark/", NoteBookmarkView.as_view(), name="note-bookmark"),
]
