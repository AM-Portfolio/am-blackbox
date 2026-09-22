from django.urls import path

from . import views

urlpatterns = [
    path('', views.incident_list, name='incident_list'),
    path('incidents/<uuid:incident_id>/', views.incident_detail, name='incident_detail'),
    path('health/', views.health, name='health'),
]
