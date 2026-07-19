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
    
    # We will score each movie based on how many words from the user query appear in its tags
    def score_movie(tags):
        score = 0
        for word in query:
            if word in tags:
                score += 1
        return score
        
    movies['mood_score'] = movies['tags'].apply(score_movie)
    
    # Sort movies by score (descending) and get the ones with a score > 0
    best_matches = movies[movies['mood_score'] > 0].sort_values(by='mood_score', ascending=False)
    
    results = []
    for _, row in best_matches.head(10).iterrows():
        results.append({
            'movie_id': int(row['movie_id']),
            'title': row['title'],
            'match_score': row['mood_score']
        })
        
    return Response(results)
