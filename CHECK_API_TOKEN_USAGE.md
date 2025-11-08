# How to Check API Token Usage

This guide shows you how to check usage/quotas for all the APIs used in WanderBeasts.

## 1. Supabase Usage

### Check Database Usage

1. **Go to Supabase Dashboard**
2. **Click "Project Settings"** (gear icon)
3. **Click "Usage"** in left sidebar
4. **View usage metrics**:
   - Database size
   - API requests
   - Storage used
   - Bandwidth

### Check API Requests

1. **Go to Dashboard → Logs → API Logs**
2. **Filter by time range**
3. **See all API requests** made to your database

### Free Tier Limits

- **Database size**: 500 MB
- **Bandwidth**: 5 GB/month
- **API requests**: Unlimited (within bandwidth)
- **PostgreSQL connections**: 60 direct, unlimited via API

## 2. Mapbox Usage

### Check Map Loads

1. **Go to Mapbox Dashboard**: https://account.mapbox.com/
2. **Click "Usage"** in top navigation
3. **View usage metrics**:
   - Map loads (this month)
   - Geocoding requests
   - Directions requests
   - Data transfer

### Free Tier Limits

- **Map loads**: 50,000/month
- **Geocoding**: 100,000 requests/month
- **Directions**: Not included in free tier (but we don't use it)

### Check Token Usage

1. **Go to Account → Access Tokens**
2. **Click on your token**
3. **View usage statistics**
4. **See requests per day/hour**

### Monitor Usage

Mapbox shows:
- Requests per day
- Requests per hour
- Peak usage times
- Usage trends

## 3. Google Gemini API Usage

### Check API Usage

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**
3. **Go to "APIs & Services" → "Dashboard"**
4. **Find "Generative Language API"**
5. **Click on it** to see usage

### Check Quotas

1. **Go to "APIs & Services" → "Quotas"**
2. **Search for "Generative Language API"**
3. **View quota limits**:
   - Requests per day
   - Requests per minute
   - Tokens per day

### Free Tier Limits

- **Requests per day**: 1,500
- **Requests per minute**: 15
- **Tokens per day**: Varies by model

### Monitor Usage

1. **Go to "APIs & Services" → "Dashboard"**
2. **Click "Generative Language API"**
3. **View "Metrics" tab**
4. **See requests over time**

### Check Billing

1. **Go to "Billing" → "Reports"**
2. **Filter by "Generative Language API"**
3. **See usage and costs** (should be $0 if under free tier)

## 4. OpenStreetMap (Overpass API)

### No API Key Required

- OpenStreetMap Overpass API is **completely free**
- **No API key** needed
- **No usage limits** (but be respectful!)
- **No account** required

### Rate Limiting

- Be respectful with requests
- Don't spam the API
- Cache results (which we do - 5 minute cache)
- Use reasonable timeouts

### Check Usage

Since there's no account, you can't check usage directly. But you can:
- Monitor requests in browser DevTools (Network tab)
- Check if requests are being cached
- Look at response times

## Quick Reference: Free Tier Limits

| Service | Free Tier Limit | What We Use |
|---------|----------------|-------------|
| **Supabase** | 500 MB DB, 5 GB bandwidth | Database, Auth, Storage |
| **Mapbox** | 50,000 map loads/month | Maps, Geocoding |
| **Gemini AI** | 1,500 requests/day | AI Recommendations |
| **OpenStreetMap** | Unlimited (free) | Park Detection |

## How to Reduce Usage

### Reduce Mapbox Usage

1. **Cache map tiles** (already done with service worker)
2. **Reduce map updates** (don't update on every movement)
3. **Use lower zoom levels** when possible
4. **Limit geocoding requests** (we cache country codes)

### Reduce Gemini Usage

1. **Cache AI recommendations** (already done - 30 min cache)
2. **Reduce recommendation frequency** (don't update on every movement)
3. **Only generate recommendations** when user requests them
4. **Use simpler prompts** (fewer tokens)

### Reduce Supabase Usage

1. **Optimize queries** (use indexes, limit results)
2. **Cache data** when possible
3. **Batch operations** (insert multiple spawns at once)
4. **Clean up expired data** (already done for spawns)

## Monitoring Usage

### Set Up Alerts

#### Mapbox Alerts

1. **Go to Mapbox Dashboard → Usage**
2. **Click "Set up alerts"**
3. **Set alert at 80% of quota** (40,000 map loads)
4. **Get email notification** when approaching limit

#### Google Cloud Alerts

1. **Go to Google Cloud Console → Monitoring**
2. **Create alert policy**
3. **Set threshold** (e.g., 1,000 requests/day)
4. **Get notification** when threshold is reached

#### Supabase Alerts

1. **Go to Supabase Dashboard → Project Settings → Usage**
2. **Set up usage alerts** (if available)
3. **Monitor database size** and bandwidth

## Cost Estimation

### Current Usage (Estimated)

Assuming moderate usage:
- **Supabase**: $0 (well within free tier)
- **Mapbox**: $0 (assuming < 50,000 loads/month)
- **Gemini**: $0 (assuming < 1,500 requests/day)
- **OpenStreetMap**: $0 (free)

### If You Exceed Free Tier

- **Mapbox**: $5 per 1,000 additional map loads
- **Gemini**: Pay-as-you-go pricing
- **Supabase**: Upgrade to Pro plan ($25/month)

## Best Practices

1. **Monitor usage regularly** - Check once a week
2. **Set up alerts** - Get notified before hitting limits
3. **Cache aggressively** - Reduce API calls
4. **Optimize queries** - Reduce database usage
5. **Use free tiers wisely** - Stay within limits

## Quick Check Commands

### Check Supabase Usage

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check API Calls

- **Supabase**: Dashboard → Logs → API Logs
- **Mapbox**: Dashboard → Usage
- **Gemini**: Cloud Console → APIs & Services → Dashboard

## Troubleshooting

### Issue: "API quota exceeded"

**Solutions**:
1. Check current usage
2. Wait for quota to reset (daily/monthly)
3. Upgrade to paid plan
4. Reduce API calls (add caching)

### Issue: "Rate limit exceeded"

**Solutions**:
1. Reduce request frequency
2. Add rate limiting in your code
3. Implement exponential backoff
4. Cache responses

### Issue: "Token invalid"

**Solutions**:
1. Verify API key is correct
2. Check if key has expired
3. Verify key has correct permissions
4. Regenerate key if needed

## Summary

- **Supabase**: Check in Dashboard → Usage
- **Mapbox**: Check in account.mapbox.com → Usage
- **Gemini**: Check in Google Cloud Console → APIs & Services
- **OpenStreetMap**: Free, no tracking needed

Monitor regularly and set up alerts to avoid surprises! 🎮

