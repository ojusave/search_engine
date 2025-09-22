"""
Render Key Value connection
Connects to Render's managed Key Value service (Valkey 8.1)

Note: We use the 'redis' Python library because Render Key Value
is Redis-compatible, but this connects to RENDER'S service,
not an external Redis instance.
"""
import redis
from .settings import settings

# Connect to Render Key Value using the provided REDIS_URL
# This is Render's managed service, NOT external Redis
try:
    keyvalue_client = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True  # Return strings instead of bytes
    )
    # Test connection
    keyvalue_client.ping()
except (redis.ConnectionError, redis.RedisError):
    # Fallback to in-memory storage for local development
    print("WARNING: Redis not available, using in-memory storage for development")
    keyvalue_client = None

# In-memory fallback for development
_memory_cache = {}
_memory_counters = {}

def cache_get(key: str):
    """Get value from Render Key Value or memory fallback"""
    if keyvalue_client:
        return keyvalue_client.get(key)
    return _memory_cache.get(key)

def cache_set(key: str, value: str, expiry_seconds: int = 3600):
    """Set value in Render Key Value with expiration or memory fallback"""
    if keyvalue_client:
        return keyvalue_client.setex(key, expiry_seconds, value)
    _memory_cache[key] = value
    return True

def cache_delete(key: str):
    """Delete key from Render Key Value or memory fallback"""
    if keyvalue_client:
        return keyvalue_client.delete(key)
    return _memory_cache.pop(key, None)

def increment_counter(key: str, expiry_seconds: int = 3600):
    """
    Increment counter in Render Key Value (for rate limiting)
    Returns current count and sets expiry on first increment
    """
    if keyvalue_client:
        count = keyvalue_client.incr(key)
        if count == 1:  # First increment, set expiry
            keyvalue_client.expire(key, expiry_seconds)
        return count
    else:
        # Memory fallback
        _memory_counters[key] = _memory_counters.get(key, 0) + 1
        return _memory_counters[key]

