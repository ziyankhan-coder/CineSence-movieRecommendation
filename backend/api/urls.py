from django.urls import path
from . import views

urlpatterns = [
    path('movies/', views.get_movies, name='get_movies'),
    path('bollywood/', views.get_bollywood, name='get_bollywood'),
    path('action/', views.get_action, name='get_action'),
    path('scifi/', views.get_scifi, name='get_scifi'),
    path('comedy/', views.get_comedy, name='get_comedy'),
    path('recommend/', views.recommend, name='recommend'),
    path('mood-search/', views.mood_search, name='mood_search'),
    path('trailer/', views.get_trailer, name='get_trailer'),
    
    # Auth endpoints
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('google-login/', views.google_login, name='google_login'),
    
    # Protected endpoints
    path('watchlist/', views.handle_watchlist, name='watchlist'),
    path('reviews/<int:movie_id>/', views.handle_reviews, name='handle_reviews'),
    
    # AI Chatbot endpoint
    path('chat/', views.chat_with_ai, name='chat_with_ai'),
]
