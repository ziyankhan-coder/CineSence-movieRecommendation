from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(max_length=500, blank=True)
    avatar_url = models.URLField(max_length=200, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"

class Watchlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    movie_id = models.IntegerField()
    movie_title = models.CharField(max_length=255)
    added_on = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'movie_id')
        
    def __str__(self):
        return f"{self.user.username} - {self.movie_title}"

class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    movie_id = models.IntegerField()
    movie_title = models.CharField(max_length=255)
    rating = models.IntegerField() # 1 to 5
    comment = models.TextField(blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'movie_id')
        ordering = ['-created_on']
        
    def __str__(self):
        return f"{self.user.username} - {self.movie_title} - {self.rating} stars"
