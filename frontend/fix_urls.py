import os
import re

src = 'C:/Users/irfan/.gemini/antigravity/scratch/cinesense/frontend/src'
files = [os.path.join(dp, f) for dp, dn, filenames in os.walk(src) for f in filenames if f.endswith('.jsx')]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace 'http://127.0.0.1:8000/api/chat/' with `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/chat/`
    new_content = re.sub(
        r"'http://127\.0\.0\.1:8000([^']+)'",
        r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}\1`",
        content
    )
    
    # Replace `http://127.0.0.1:8000/api/recommend/?title=${movie.title}` with `${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/recommend/?title=${movie.title}`
    new_content = re.sub(
        r"`http://127\.0\.0\.1:8000([^`]+)`",
        r"`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}\1`",
        new_content
    )
    
    # Fix AuthContext.jsx
    new_content = new_content.replace(
        "config.url.includes('127.0.0.1:8000')",
        "config.url.includes('127.0.0.1:8000') || (import.meta.env.VITE_API_BASE_URL && config.url.includes(import.meta.env.VITE_API_BASE_URL))"
    )
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(new_content)
print("Done refactoring URLs!")
