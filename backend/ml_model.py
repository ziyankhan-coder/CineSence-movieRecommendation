import pandas as pd
import json
import pickle
import os

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIES_CSV_PATH = os.path.join(BASE_DIR, 'data', 'tmdb_5000_movies.csv')
CREDITS_CSV_PATH = os.path.join(BASE_DIR, 'data', 'tmdb_5000_credits.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'similarity.pkl')
MOVIES_DICT_PATH = os.path.join(BASE_DIR, 'movies_dict.pkl')

def process_data():
    if not os.path.exists(MOVIES_CSV_PATH) or not os.path.exists(CREDITS_CSV_PATH):
        print("Error: CSV files not found in the 'data' directory.")
        print(f"Please ensure {MOVIES_CSV_PATH} exists.")
        return

    print("Loading datasets...")
    movies = pd.read_csv(MOVIES_CSV_PATH)
    credits = pd.read_csv(CREDITS_CSV_PATH)

    print("Merging datasets...")
    movies = movies.merge(credits, on='title')

    # Keep only necessary columns for recommendation
    movies = movies[['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew']]

    # Helper function to extract names from JSON strings
    def convert(text):
        L = []
        try:
            for i in json.loads(text):
                L.append(i['name'])
            return L
        except:
            return L

    # Helper function to extract top 3 cast members
    def convert3(text):
        L = []
        counter = 0
        try:
            for i in json.loads(text):
                if counter < 3:
                    L.append(i['name'])
                    counter += 1
                else:
                    break
            return L
        except:
            return L

    # Helper function to fetch director from crew
    def fetch_director(text):
        L = []
        try:
            for i in json.loads(text):
                if i['job'] == 'Director':
                    L.append(i['name'])
                    break
            return L
        except:
            return L

    print("Processing columns (this may take a minute)...")
    movies.dropna(inplace=True)
    movies['genres'] = movies['genres'].apply(convert)
    movies['keywords'] = movies['keywords'].apply(convert)
    movies['cast'] = movies['cast'].apply(convert3)
    movies['crew'] = movies['crew'].apply(fetch_director)
    movies['overview'] = movies['overview'].apply(lambda x: x.split())

    # Remove spaces from words to make unique tags (e.g., 'Science Fiction' -> 'ScienceFiction')
    movies['genres'] = movies['genres'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['keywords'] = movies['keywords'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['cast'] = movies['cast'].apply(lambda x: [i.replace(" ", "") for i in x])
    movies['crew'] = movies['crew'].apply(lambda x: [i.replace(" ", "") for i in x])

    # Create 'tags' column which combines everything
    movies['tags'] = movies['overview'] + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']

    new_df = movies[['movie_id', 'title', 'tags']]
    new_df.loc[:, 'tags'] = new_df['tags'].apply(lambda x: " ".join(x).lower())

    print("Vectorizing text...")
    from sklearn.feature_extraction.text import CountVectorizer
    cv = CountVectorizer(max_features=5000, stop_words='english')
    vectors = cv.fit_transform(new_df['tags']).toarray()

    print("Calculating cosine similarity...")
    from sklearn.metrics.pairwise import cosine_similarity
    similarity = cosine_similarity(vectors)

    print("Saving models to disk...")
    # Save the dataframe dictionary and similarity matrix
    pickle.dump(new_df.to_dict(), open(MOVIES_DICT_PATH, 'wb'))
    pickle.dump(similarity, open(MODEL_PATH, 'wb'))

    print("Done! ML models generated successfully.")

if __name__ == "__main__":
    process_data()
