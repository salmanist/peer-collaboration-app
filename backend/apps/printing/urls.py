from django.urls import path

from .views import (
    AcceptPrintRequestView,
    CancelPrintRequestView,
    CompletePrintRequestView,
    MyPrinterProfileView,
    MyPrintRequestsView,
    PrinterListView,
    PrintRequestDetailView,
    PrintRequestListCreateView,
    RatePrintRequestView,
    RejectPrintRequestView,
    ReleasePrintRequestView,
)

urlpatterns = [
    path("", PrintRequestListCreateView.as_view(), name="print-list"),
    path("mine/", MyPrintRequestsView.as_view(), name="print-mine"),
    path("printers/", PrinterListView.as_view(), name="printer-list"),
    path("printers/me/", MyPrinterProfileView.as_view(), name="printer-me"),
    path("<int:pk>/", PrintRequestDetailView.as_view(), name="print-detail"),
    path("<int:pk>/accept/", AcceptPrintRequestView.as_view(), name="print-accept"),
    path("<int:pk>/reject/", RejectPrintRequestView.as_view(), name="print-reject"),
    path("<int:pk>/release/", ReleasePrintRequestView.as_view(), name="print-release"),
    path("<int:pk>/complete/", CompletePrintRequestView.as_view(), name="print-complete"),
    path("<int:pk>/cancel/", CancelPrintRequestView.as_view(), name="print-cancel"),
    path("<int:pk>/rate/", RatePrintRequestView.as_view(), name="print-rate"),
]
