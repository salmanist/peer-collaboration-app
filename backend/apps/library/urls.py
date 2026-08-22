from django.urls import path

from .views import (
    LibraryProjectBookmarkView,
    LibraryProjectDetailView,
    LibraryProjectListCreateView,
    LibraryProjectUpvoteView,
    MyLibraryProjectsView,
)

urlpatterns = [
    path("", LibraryProjectListCreateView.as_view(), name="library-list"),
    path("mine/", MyLibraryProjectsView.as_view(), name="library-mine"),
    path("<int:pk>/", LibraryProjectDetailView.as_view(), name="library-detail"),
    path("<int:pk>/upvote/", LibraryProjectUpvoteView.as_view(), name="library-upvote"),
    path("<int:pk>/bookmark/", LibraryProjectBookmarkView.as_view(), name="library-bookmark"),
]
