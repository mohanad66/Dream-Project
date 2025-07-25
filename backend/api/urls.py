from django.urls import path
from .views import *


urlpatterns=[
    path("products/" , get_product , name="get_products"),
    path("categories/" , get_category , name="get_category"),
    path("carousels/" , get_carouselImg , name="get_carouselImg"),
    path("services/" , get_services , name="get_services"),
    path("contact/" , get_contact , name="get_contact"),
]