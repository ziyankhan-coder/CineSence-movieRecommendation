import os
import pickle
import pandas as pd
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Watchlist
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from youtubesearchpython import VideosSearch

# Load models into memory when the server starts
BASE_DIR = settings.BASE_DIR
try:
    movies_dict = pickle.load(open(os.path.join(BASE_DIR, 'movies_dict.pkl'), 'rb'))
    movies = pd.DataFrame(movies_dict)
    similarity = pickle.load(open(os.path.join(BASE_DIR, 'similarity.pkl'), 'rb'))
    raw_movies = pd.read_csv(os.path.join(BASE_DIR, 'data', 'tmdb_5000_movies.csv'))
    print("AI Models loaded successfully!")
except Exception as e:
    print(f"Error loading ML models: {e}")
    similarity = []
    raw_movies = pd.DataFrame()

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

@api_view(['POST'])
def register(request):
    data = request.data
    try:
        user = User.objects.create(
            username=data['username'],
            email=data['email'],
            password=make_password(data['password'])
        )
        UserProfile.objects.create(user=user)
        return Response({'message': 'User created successfully!'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def login(request):
    data = request.data
    try:
        user = User.objects.get(username=data['username'])
        if user.check_password(data['password']):
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'username': user.username,
                'email': user.email
            })
        else:
            return Response({'error': 'Invalid credentials'}, status=401)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

@api_view(['POST'])
def google_login(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'No token provided'}, status=400)
    
    try:
        # Validate the token with Google
        idinfo = id_token.verify_oauth2_token(token, requests.Request())
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        # We use email as the username for Google logins to ensure uniqueness
        user, created = User.objects.get_or_create(username=email, defaults={'email': email})
        
        if created:
            UserProfile.objects.create(user=user, avatar_url=idinfo.get('picture', ''))
            
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'username': user.username,
            'email': user.email
        })
    except ValueError:
        return Response({'error': 'Invalid Google token'}, status=401)

# ==========================================
# WATCHLIST ENDPOINTS
# ==========================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def handle_watchlist(request):
    user = request.user
    
    if request.method == 'GET':
        watchlist_items = Watchlist.objects.filter(user=user)
        # Format it exactly like our movie cards expect
        results = [{'movie_id': item.movie_id, 'title': item.movie_title} for item in watchlist_items]
        return Response(results)
        
    if request.method == 'POST':
        movie_id = request.data.get('movie_id')
        movie_title = request.data.get('title')
        
        if not movie_id or not movie_title:
            return Response({'error': 'movie_id and title are required'}, status=400)
            
        # Check if already in watchlist
        existing = Watchlist.objects.filter(user=user, movie_id=movie_id).first()
        if existing:
            # If it exists, POST acts as a toggle (remove it)
            existing.delete()
            return Response({'message': 'Removed from watchlist', 'added': False})
        else:
            # Add to watchlist
            Watchlist.objects.create(user=user, movie_id=movie_id, movie_title=movie_title)
            return Response({'message': 'Added to watchlist', 'added': True})

# ==========================================
# MOVIE ENDPOINTS
# ==========================================

@api_view(['GET'])
def get_movies(request):
    """Returns a list of top movies to display on the home page."""
    if movies.empty:
        return Response([])
    
    # Return first 20 movies as 'trending' for the UI
    top_movies = movies.head(20)[['movie_id', 'title']].to_dict('records')
    return Response(top_movies)

@api_view(['GET'])
def get_bollywood(request):
    """Returns top Bollywood (Hindi) movies."""
    if raw_movies.empty:
        return Response([])
    
    hindi_movies = raw_movies[raw_movies['original_language'] == 'hi']
    top_hindi = hindi_movies.head(20)[['id', 'title']].rename(columns={'id': 'movie_id'}).to_dict('records')
    return Response(top_hindi)

@api_view(['GET'])
def get_trailer(request):
    """Fetches the top YouTube trailer ID for a given movie title."""
    title = request.GET.get('title')
    if not title:
        return Response({'error': 'Title parameter is required'}, status=400)
    
    try:
        search_query = f"{title} official movie trailer"
        videos_search = VideosSearch(search_query, limit=1)
        result = videos_search.result()
        
        if result['result']:
            video_id = result['result'][0]['id']
            return Response({'video_id': video_id})
        else:
            return Response({'error': 'No trailer found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_action(request):
    if raw_movies.empty: return Response([])
    action_movies = raw_movies[raw_movies['genres'].str.contains('Action', na=False)]
    return Response(action_movies.head(20)[['id', 'title']].rename(columns={'id': 'movie_id'}).to_dict('records'))

@api_view(['GET'])
def get_scifi(request):
    if raw_movies.empty: return Response([])
    scifi_movies = raw_movies[raw_movies['genres'].str.contains('Science Fiction', na=False)]
    return Response(scifi_movies.head(20)[['id', 'title']].rename(columns={'id': 'movie_id'}).to_dict('records'))

@api_view(['GET'])
def get_comedy(request):
    if raw_movies.empty: return Response([])
    comedy_movies = raw_movies[raw_movies['genres'].str.contains('Comedy', na=False)]
    return Response(comedy_movies.head(20)[['id', 'title']].rename(columns={'id': 'movie_id'}).to_dict('records'))

@api_view(['GET'])
def recommend(request):
    """Recommends 5 movies based on a given movie title using Cosine Similarity."""
    movie_title = request.GET.get('title')
    
    if not movie_title:
        return Response({'error': 'Please provide a movie title.'}, status=400)
    
    try:
        # 1. Find the index of the movie the user clicked on
        movie_index = movies[movies['title'].str.lower() == movie_title.lower()].index[0]
        
        # 2. Get similarity scores for this movie against all other movies
        distances = similarity[movie_index]
        
        # 3. Sort to get top 5 similar movies (excluding the movie itself at index 0)
        movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]
        
        # 4. Prepare the response
        recommended_movies = []
        for i in movies_list:
            recommended_movies.append({
                'movie_id': int(movies.iloc[i[0]].movie_id),  # Cast int64 to native Python int for JSON serialization
                'title': movies.iloc[i[0]].title
            })
            
        return Response(recommended_movies)
    except IndexError:
        return Response({'error': 'Movie not found in our database.'}, status=404)

@api_view(['GET'])
def mood_search(request):
    """
    AI Mood Search: Matches user natural language text (e.g. 'I want to watch action and aliens')
    to the movie tags (genres + keywords + overview) to find relevant movies.
    """
    query = request.GET.get('q', '').lower().split()
    
    if not query:
        return Response({'error': 'Please provide a search query.'}, status=400)
    
    # HYBRID SEARCH: Check for exact/partial Title match first
    # If the user typed a movie name (e.g. "krrish" or "avatar"), it gets a massive bonus score
    def score_movie(row):
        score = 0
        movie_title = str(row['title']).lower()
        query_str = " ".join(query)
        
        # Title match (Highest Priority)
        if query_str == movie_title:
            score += 100
        elif query_str in movie_title:
            score += 50
            
        # NLP Tags match (Mood)
        for word in query:
            if word in str(row['tags']):
                score += 1
                
        return score
        
    movies['mood_score'] = movies.apply(score_movie, axis=1)
    
    # Sort movies by score (descending) and get the ones with a score > 0
    best_matches = movies[movies['mood_score'] > 0].sort_values(by='mood_score', ascending=False)
    
    results = []
    for _, row in best_matches.head(15).iterrows():
        results.append({
            'movie_id': int(row['movie_id']),
            'title': row['title'],
            'match_score': row['mood_score']
        })
        
    return Response(results)
