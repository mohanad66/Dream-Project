from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializer import *


@api_view(["GET"])
def get_carouselImg(request):
    carouselImg = CarouselImg.objects.filter(is_active=True)
    serializerData = CarouselImgSerializer(carouselImg , many=True).data
    return Response(serializerData, status=status.HTTP_200_OK)
@api_view(["GET"])
def get_product(request):
    product = Product.objects.all().order_by("price")
    serializerData = ProductSerializer(product , many=True).data
    return Response(serializerData, status=status.HTTP_200_OK)
@api_view(["GET"])
def get_category(request):
    category = Category.objects.filter(is_active=True)
    serializerData = CategorySerializer(category , many=True).data
    return Response(serializerData, status=status.HTTP_200_OK)
@api_view(["GET"])
def get_services(request):
    service = Service.objects.all().order_by("price")
    serializerData = ServiceSerializer(service , many=True).data
    return Response(serializerData, status=status.HTTP_200_OK)
@api_view(["GET"])
def get_contact(request):
    contact = Contact.objects.all()
    serializerData = ContactSerializer(contact , many=True).data
    return Response(serializerData, status=status.HTTP_200_OK)