import os
import pickle
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings

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
    movies = pd.DataFrame()
    similarity = []
    raw_movies = pd.DataFrame()

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
