import os
import re
import pickle
import json
import google.generativeai as genai
import pandas as pd
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Watchlist, Review
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from duckduckgo_search import DDGS

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
        client_id = os.environ.get('GOOGLE_CLIENT_ID') or '600603644992-4m1j93of6dekc7j5s7q7jbe8phu0dduh.apps.googleusercontent.com'
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
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
    except ValueError as e:
        print("Google token validation error:", e)
        return Response({'error': f'Invalid Google token: {e}'}, status=401)
    except Exception as e:
        print("Unexpected error in google_login:", e)
        return Response({'error': 'An unexpected error occurred during Google login'}, status=500)

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
# REVIEW ENDPOINTS
# ==========================================

@api_view(['GET', 'POST', 'DELETE'])
def handle_reviews(request, movie_id):
    if request.method == 'GET':
        reviews = Review.objects.filter(movie_id=movie_id).order_by('-created_on')
        # Calculate average rating
        total = sum(r.rating for r in reviews)
        avg = round(total / len(reviews), 1) if reviews else 0
        
        results = [{
            'id': r.id,
            'username': r.user.username,
            'rating': r.rating,
            'comment': r.comment,
            'created_on': r.created_on.strftime('%b %d, %Y')
        } for r in reviews]
        
        return Response({
            'average_rating': avg,
            'total_reviews': len(reviews),
            'reviews': results
        })
        
    # POST and DELETE require authentication
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=401)
        
    user = request.user
    
    if request.method == 'POST':
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        movie_title = request.data.get('movie_title', 'Unknown Movie')
        
        if not rating:
            return Response({'error': 'Rating is required'}, status=400)
            
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError
        except ValueError:
            return Response({'error': 'Rating must be an integer between 1 and 5'}, status=400)
            
        # Create or update review
        review, created = Review.objects.update_or_create(
            user=user,
            movie_id=movie_id,
            defaults={
                'movie_title': movie_title,
                'rating': rating,
                'comment': comment
            }
        )
        return Response({'message': 'Review saved successfully!', 'review_id': review.id})
        
    if request.method == 'DELETE':
        try:
            review = Review.objects.get(user=user, movie_id=movie_id)
            review.delete()
            return Response({'message': 'Review deleted successfully!'})
        except Review.DoesNotExist:
            return Response({'error': 'Review not found'}, status=404)

# ==========================================
# CHATBOT ENDPOINTS
# ==========================================

@api_view(['POST'])
def chat_with_ai(request):
    try:
        user_message = request.data.get('message', '')
        if not user_message:
            return Response({'error': 'Message is required'}, status=400)
            
        gemini_api_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        
        if not gemini_api_key:
            return Response({
                'reply': "Oops! The AI is sleeping right now. Please add your GEMINI_API_KEY to the backend environment variables to wake it up.",
                'movies': []
            })
            
        genai.configure(api_key=gemini_api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        system_prompt = f"""
You are CineSense AI, an enthusiastic, hyper-intelligent global movie recommendation assistant. You know ALL movies ever created (Hollywood, Bollywood, Tollywood, Korean cinema, Anime, South Indian, latest films, etc.).
NEVER say you don't have a movie in your database. Always enthusiastically recommend amazing global movies matching the user's request!
You MUST respond in strict JSON format with exactly two properties:
1. "reply": A friendly, conversational 2-4 sentence response in english/hindi mix (if appropriate) with emojis.
2. "movies": An array of up to 4 recommended movie objects matching the user's request. Each object must have:
   - "title": exact official movie title (e.g. "Raaz" or "Murder 2" or "Pathaan" or "The Conjuring")
   - "year": release year as string (e.g. "2002")
   - "genres": string (e.g. "Horror, Romance")
   - "overview": brief 1-2 sentence plot summary
   - "rating": float between 7.0 and 9.5
   - "movie_id": integer (generate a random 6-digit integer between 100000 and 999999)

User's message: {user_message}
Return ONLY valid JSON without markdown formatting or code backticks! Example format:
{{"reply": "Here are some spooky Bollywood horror movies for you! 👻", "movies": [{{"title": "Raaz", "year": "2002", "genres": "Horror, Romance", "overview": "A couple moves to Ooty...", "rating": 7.5, "movie_id": 847291}}]}}
"""
        response = model.generate_content(system_prompt)
        clean_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        
        try:
            data = json.loads(clean_text)
            return Response({
                'reply': data.get('reply', clean_text),
                'movies': data.get('movies', [])
            })
        except Exception as json_err:
            return Response({
                'reply': clean_text,
                'movies': []
            })
        
    except Exception as e:
        print(f"Chatbot error: {e}")
        return Response({
            'reply': "Sorry, I'm having trouble connecting to my AI brain right now! Please try again later.",
            'movies': []
        })

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
    """Fetches the top YouTube trailer ID using DuckDuckGo."""
    title = request.GET.get('title')
    if not title:
        return Response({'error': 'Title parameter is required'}, status=400)
    
    try:
        search_query = f"{title} official movie trailer youtube"
        results = DDGS().videos(search_query, max_results=1)
        
        if results and len(results) > 0:
            url = results[0].get('content', '')
            # URL is usually like https://www.youtube.com/watch?v=VIDEO_ID
            if 'watch?v=' in url:
                video_id = url.split('watch?v=')[1][:11]
                return Response({'video_id': video_id})
        
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
    query_str = request.GET.get('q', '').strip().lower()
    if not query_str:
        return Response({'error': 'Please provide a search query.'}, status=400)
        
    query_words = query_str.split()
    
    # Common stop words and trivial numbers/hindi filler words that match almost everything
    stop_words = {
        'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
        'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as',
        'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
        'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
        'should', 'now', 'want', 'watch', 'like', 'show', 'movie', 'movies', 'film', 'films', 'feel', 'feeling', 'today', 'good',
        'best', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ki', 'ka', 'ke', 'ko', 'se', 'me', 'mai', 'hai', 'hain', 'ho',
        'hi', 'bhai', 'yaar', 'wal', 'wali', 'wala', 'bollywod', 'bollywood', 'hollywood'
    }
    
    # Filter query words for NLP matching (keep words > 2 chars that are not stop words)
    meaningful_words = [w for w in query_words if w not in stop_words and len(w) > 2]
    
    def score_movie(row):
        score = 0
        movie_title = str(row['title']).lower()
        tags_str = str(row['tags']).lower()
        
        # Exact Title match (Highest Priority)
        if query_str == movie_title:
            score += 100
        elif query_str in movie_title:
            score += 50
        elif any(w == movie_title for w in query_words if len(w) > 2):
            score += 40
            
        # NLP Tags match (Mood) - use whole word boundary matching
        for word in meaningful_words:
            if re.search(r'\b' + re.escape(word) + r'\b', tags_str):
                score += 5
            elif re.search(r'\b' + re.escape(word) + r'\b', movie_title):
                score += 10
                
        return score
        
    movies['mood_score'] = movies.apply(score_movie, axis=1)
    
    # Sort movies by score (descending). Only return movies that got at least 5 points (meaningful match or title match)
    best_matches = movies[movies['mood_score'] >= 5].sort_values(by='mood_score', ascending=False)
    
    results = []
    for _, row in best_matches.head(15).iterrows():
        results.append({
            'movie_id': int(row['movie_id']),
            'title': row['title'],
            'match_score': int(row['mood_score']),
            'overview': str(row.get('overview', '')),
            'genres': str(row.get('genres', '')),
            'rating': float(row.get('vote_average', 7.5)) if 'vote_average' in row else 7.5
        })
        
    # GEMINI AI GLOBAL BOOSTER: If local matches < 8 or if we want dynamic Bollywood/world cinema coverage
    gemini_api_key = os.environ.get('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
    if len(results) < 8 and gemini_api_key:
        try:
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            prompt = f"""
The user searched for movie mood/keyword: "{query_str}".
Return a JSON array of up to 8 real global movie objects (Hollywood, Bollywood, Korean, etc.) matching this query.
Each object must have:
- "title": Exact official movie title (e.g. "Murder 2", "Raaz", "Stree", "Krrish", "Pathaan")
- "match_score": integer (between 85 and 99)
- "overview": brief 1-2 sentence plot
- "genres": string (e.g. "Thriller, Horror")
- "rating": float (e.g. 7.5)
- "movie_id": integer (random 6-digit number between 100000 and 999999)

Return ONLY valid JSON array without markdown formatting or code backticks! Example: [{{"title": "Murder 2", "match_score": 95, "overview": "A former police officer...", "genres": "Thriller, Horror", "rating": 7.2, "movie_id": 841293}}]
"""
            ai_resp = model.generate_content(prompt)
            clean_text = ai_resp.text.strip().replace('```json', '').replace('```', '').strip()
            ai_movies = json.loads(clean_text)
            for m in ai_movies:
                if not any(r['title'].lower() == m['title'].lower() for r in results):
                    results.append({
                        'movie_id': int(m.get('movie_id', 500000)),
                        'title': m['title'],
                        'match_score': int(m.get('match_score', 90)),
                        'overview': m.get('overview', ''),
                        'genres': m.get('genres', 'Feature Film'),
                        'rating': float(m.get('rating', 7.5))
                    })
        except Exception as e:
            print(f"Gemini mood search augmentation error: {e}")
        
    return Response(results)
