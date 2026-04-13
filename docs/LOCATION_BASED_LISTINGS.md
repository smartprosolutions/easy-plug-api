# 📍 Location-Based Listing Prioritization

## Overview

All main listing endpoints now support **location-based prioritization**. When you provide the user's location (latitude/longitude), listings are automatically sorted by distance (nearest first) and include distance information.

---

## How It Works

### Default Behavior (Without Location)
```bash
GET /api/v1/listings
GET /api/v1/listings/standard
GET /api/v1/listings/ads
```
- Sorted by **newest first** (createdAt DESC)
- No distance information

### With Location (Proximity Sorting)
```bash
GET /api/v1/listings?latitude=-33.9249&longitude=18.4241
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&maxDistance=50
GET /api/v1/listings/ads?latitude=-33.9249&longitude=18.4241
```
- Sorted by **distance** (nearest first)
- Each listing includes `distance` field in km
- Optional: Filter by `maxDistance` in km

---

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `latitude` | number | No | User's latitude | `-33.9249` |
| `longitude` | number | No | User's longitude | `18.4241` |
| `maxDistance` | number | No | Max distance in km (optional) | `50` |
| `page` | number | No | Page number (default: 1) | `1` |

**Note:** Both `latitude` and `longitude` must be provided together for location-based sorting to work.

---

## Endpoints

### 1. **Mixed Listings (Ads + Standard)**

**Endpoint:** `GET /api/v1/listings`

**Default:** 8 ads + 24 standard + 8 ads per page

#### Without Location
```bash
GET /api/v1/listings?page=1
```

#### With Location
```bash
GET /api/v1/listings?latitude=-33.9249&longitude=18.4241&page=1
```

#### With Distance Filter
```bash
GET /api/v1/listings?latitude=-33.9249&longitude=18.4241&maxDistance=30&page=1
```

#### Response Example
```json
{
  "success": true,
  "listings": [
    {
      "listingId": "abc-123",
      "title": "iPhone 15 Pro Max",
      "price": "18999.99",
      "seller": {
        "firstName": "Jane",
        "addresses": [{
          "city": "Cape Town",
          "latitude": -33.9249,
          "longitude": 18.4241
        }]
      },
      "distance": 2.5,  // ✅ Distance in km
      "createdAt": "2024-01-29T10:00:00Z"
    }
  ],
  "page": 1,
  "counts": {
    "adsTotal": 15,
    "standardTotal": 120
  },
  "location": {
    "latitude": -33.9249,
    "longitude": 18.4241,
    "maxDistance": 30,
    "sortedByDistance": true
  }
}
```

---

### 2. **Standard Listings Only**

**Endpoint:** `GET /api/v1/listings/standard`

**Default:** 20 items per page

#### Without Location
```bash
GET /api/v1/listings/standard?page=1
```

#### With Location
```bash
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&page=1
```

#### With Distance Filter (Within 20km)
```bash
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&maxDistance=20&page=1
```

#### Response Example
```json
{
  "success": true,
  "listings": [
    {
      "listingId": "listing-456",
      "title": "Samsung Galaxy S24 Ultra",
      "price": "15999.99",
      "distance": 1.2,  // ✅ Nearest item (1.2 km away)
      "seller": {
        "addresses": [{
          "city": "Cape Town"
        }]
      }
    },
    {
      "listingId": "listing-789",
      "title": "MacBook Pro M3",
      "price": "25999.99",
      "distance": 3.8,  // ✅ 3.8 km away
      "seller": {
        "addresses": [{
          "city": "Cape Town"
        }]
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 45,
  "totalPages": 3,
  "location": {
    "latitude": -33.9249,
    "longitude": 18.4241,
    "maxDistance": 20,
    "sortedByDistance": true
  }
}
```

---

### 3. **Advertisement Listings Only**

**Endpoint:** `GET /api/v1/listings/ads`

**Default:** 8 items per page

#### Without Location
```bash
GET /api/v1/listings/ads?page=1
```

#### With Location
```bash
GET /api/v1/listings/ads?latitude=-33.9249&longitude=18.4241&page=1
```

#### With Distance Filter
```bash
GET /api/v1/listings/ads?latitude=-33.9249&longitude=18.4241&maxDistance=50&page=1
```

---

## How Distance is Calculated

### Haversine Formula
The API uses the **Haversine formula** to calculate accurate distances on Earth's surface:

```javascript
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Result:** Distance in kilometers, rounded to 1 decimal place

---

## Use Cases

### 1. **Show Nearby Items on Home Page**
```bash
# User in Cape Town city center
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&maxDistance=10
```
**Result:** Only items within 10km radius

### 2. **Browse Ads Near Me**
```bash
# Get promoted items nearby
GET /api/v1/listings/ads?latitude=-33.9249&longitude=18.4241
```
**Result:** Ads sorted by distance

### 3. **Mixed Feed with Distance**
```bash
# Show everything nearby, sorted by distance
GET /api/v1/listings?latitude=-33.9249&longitude=18.4241&maxDistance=50
```
**Result:** Ads + Standard items within 50km, nearest first

### 4. **Paginated Nearby Items**
```bash
# Page 2 of nearby items
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&page=2
```

---

## Frontend Integration

### Get User's Location
```javascript
// Get user's current location using browser Geolocation API
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    console.log(`User location: ${latitude}, ${longitude}`);

    // Fetch nearby listings
    fetchNearbyListings(latitude, longitude);
  },
  (error) => {
    console.error('Location error:', error);
    // Fall back to default listings without location
    fetchDefaultListings();
  }
);
```

### Fetch Nearby Listings
```javascript
async function fetchNearbyListings(lat, lon, maxDistance = 50) {
  const response = await fetch(
    `/api/v1/listings/standard?latitude=${lat}&longitude=${lon}&maxDistance=${maxDistance}&page=1`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );

  const data = await response.json();

  if (data.success) {
    console.log(`Found ${data.total} items nearby`);
    data.listings.forEach(listing => {
      console.log(`${listing.title} - ${listing.distance} km away`);
    });
  }
}
```

### Display Distance
```jsx
// React Component
const ListingCard = ({ listing }) => {
  return (
    <div className="listing-card">
      <h3>{listing.title}</h3>
      <p>R{listing.price}</p>
      {listing.distance !== null && (
        <span className="distance">
          📍 {listing.distance} km away
        </span>
      )}
    </div>
  );
};
```

---

## Behavior Details

### When Location is Provided:
1. ✅ All listings are fetched from database
2. ✅ Distance calculated for each listing (using seller's address)
3. ✅ If `maxDistance` specified, filter out items beyond that distance
4. ✅ Sort by distance (nearest first)
5. ✅ Apply pagination in memory
6. ✅ Return listings with `distance` field

### When Location is NOT Provided:
1. ✅ Sort by newest first (createdAt DESC)
2. ✅ Apply pagination in database
3. ✅ No `distance` field in response
4. ✅ No `location` object in response

### Items Without Location Data:
- If seller has no address: `distance` = `null`
- If address has no coordinates: `distance` = `null`
- These items appear last when sorting by distance

---

## Response Fields

### With Location
```json
{
  "success": true,
  "listings": [...],
  "page": 1,
  "pageSize": 20,
  "total": 45,
  "totalPages": 3,
  "location": {              // ✅ Added when location provided
    "latitude": -33.9249,
    "longitude": 18.4241,
    "maxDistance": 50,       // null if not specified
    "sortedByDistance": true
  }
}
```

### Listing Object with Distance
```json
{
  "listingId": "abc-123",
  "title": "iPhone 15",
  "price": "18999.99",
  "distance": 2.5,           // ✅ Distance in km (null if no location data)
  "seller": {
    "addresses": [{
      "latitude": -33.9249,
      "longitude": 18.4241,
      "city": "Cape Town"
    }]
  }
}
```

---

## Performance Considerations

### Without Location (Fast)
- Database-level sorting and pagination
- No additional calculations
- Optimal for large datasets

### With Location (Moderate)
- All matching records fetched from database
- Distance calculated in-memory (Haversine formula)
- Sorting and pagination in-memory
- Acceptable for moderate datasets (<10,000 items)

### Optimization Tips
1. **Use maxDistance:** Reduces dataset size before pagination
2. **Cache User Location:** Don't request location on every page load
3. **Fallback:** If location unavailable, use default sorting
4. **Index Coordinates:** Ensure `latitude` and `longitude` columns are indexed

---

## Testing Examples

### Example 1: Home Page (Nearby Items)
```bash
# User opens app in Cape Town
GET /api/v1/listings/standard?latitude=-33.9249&longitude=18.4241&maxDistance=20&page=1

# Response: 20 items within 20km, sorted by distance
```

### Example 2: Browse All Ads Nearby
```bash
# User wants to see promoted items
GET /api/v1/listings/ads?latitude=-33.9249&longitude=18.4241

# Response: Ads sorted by proximity
```

### Example 3: Mixed Feed with Location
```bash
# Main page with ads + standard items
GET /api/v1/listings?latitude=-33.9249&longitude=18.4241&maxDistance=50&page=1

# Response: 8 ads + 24 standard + 8 ads, all within 50km
```

### Example 4: Fallback (No Location)
```bash
# User denies location permission
GET /api/v1/listings/standard?page=1

# Response: Standard sorting by newest first
```

---

## Postman Examples

### Get Nearby Standard Listings
```
GET {{baseUrl}}/listings/standard?latitude=-33.9249&longitude=18.4241&maxDistance=30&page=1
Headers: Authorization: Bearer {{authToken}}
```

### Get Nearby Ads
```
GET {{baseUrl}}/listings/ads?latitude=-33.9249&longitude=18.4241&page=1
Headers: Authorization: Bearer {{authToken}}
```

### Get Mixed Feed with Location
```
GET {{baseUrl}}/listings?latitude=-33.9249&longitude=18.4241&maxDistance=50&page=1
Headers: Authorization: Bearer {{authToken}}
```

---

## Common Coordinates (For Testing)

| Location | Latitude | Longitude |
|----------|----------|-----------|
| Cape Town City Center | -33.9249 | 18.4241 |
| Johannesburg CBD | -26.2041 | 28.0473 |
| Durban City | -29.8587 | 31.0218 |
| Pretoria | -25.7479 | 28.2293 |
| Port Elizabeth | -33.9608 | 25.6022 |

---

## Error Handling

### Invalid Coordinates
```json
{
  "success": true,
  "listings": [],
  "location": {
    "latitude": "invalid",
    "longitude": "invalid",
    "sortedByDistance": false
  }
}
```
**Behavior:** Falls back to default sorting

### Missing Longitude (Partial Location)
```bash
GET /api/v1/listings?latitude=-33.9249
```
**Behavior:** Ignores latitude, uses default sorting

---

## Summary

✅ **All 3 main listing endpoints support location-based sorting:**
- Mixed listings (ads + standard)
- Standard listings only
- Advertisement listings only

✅ **Features:**
- Haversine distance calculation
- Nearest-first sorting
- Optional distance filtering (`maxDistance`)
- Distance field in response (km)
- Graceful fallback to date-based sorting

✅ **Use Cases:**
- "Items near me" on home page
- "Browse nearby ads"
- "Filter within 20km radius"
- Location-aware pagination

**Perfect for marketplace platforms where proximity matters!** 📍
