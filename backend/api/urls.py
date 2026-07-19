from django.urls import path
from . import views

urlpatterns = [
    path('movies/', views.get_movies, name='get_movies'),
    path('bollywood/', views.get_bollywood, name='get_bollywood'),
    path('recommend/', views.recommend, name='recommend'),
    path('mood-search/', views.mood_search, name='mood_search'),
]
