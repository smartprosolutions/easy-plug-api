# 🔍 Comprehensive Search API

## Overview

The EasyPlug Search API provides extensive filtering and sorting capabilities for marketplace listings. It includes text search, price ranges, location-based filtering, seller ratings, and more.

---

## Endpoints

### 1. **Search Listings** (Main Search)

**Endpoint:** `GET /api/v1/search`

**Authentication:** Required

**Description:** Search and filter listings with extensive options

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Text search (title, description, key features) | `iPhone 15` |
| `category` | string | Filter by category | `electronics` |
| `minPrice` | number | Minimum price | `5000` |
| `maxPrice` | number | Maximum price | `20000` |
| `condition` | string | Filter by condition | `new`, `used`, `refurbished` |
| `type` | string | Filter by type | `sale`, `rent` |
| `status` | string | Filter by status (default: `active`) | `active`, `sold`, `inactive` |
| `minRating` | number | Minimum seller rating (1-5) | `4.0` |
| `latitude` | number | User's latitude for distance search | `-33.9249` |
| `longitude` | number | User's longitude for distance search | `18.4241` |
| `maxDistance` | number | Maximum distance in km | `50` |
| `postedSince` | number | Days ago (7, 30, etc.) | `7` |
| `dateFrom` | date | Filter from date (YYYY-MM-DD) | `2024-01-01` |
| `dateTo` | date | Filter to date (YYYY-MM-DD) | `2024-12-31` |
| `isAdvertisement` | boolean | Filter ads | `true`, `false` |
| `sortBy` | string | Sort option | See [Sort Options](#sort-options) |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Results per page (default: 20, max: 100) | `20` |

#### Sort Options

| Value | Description |
|-------|-------------|
| `date_desc` | Newest first (default) |
| `date_asc` | Oldest first |
| `price_asc` | Price: Low to High |
| `price_desc` | Price: High to Low |
| `views` | Most viewed first |
| `title` | Alphabetical (A-Z) |
| `distance` | Nearest first (requires location) |

#### Example Requests

##### Basic Text Search
```bash
GET /api/v1/search?q=iPhone
```

##### Search with Price Range
```bash
GET /api/v1/search?q=laptop&minPrice=5000&maxPrice=15000
```

##### Search by Category and Condition
```bash
GET /api/v1/search?category=electronics&condition=new
```

##### Location-Based Search (within 50km)
```bash
GET /api/v1/search?latitude=-33.9249&longitude=18.4241&maxDistance=50&sortBy=distance
```

##### Search with Seller Rating Filter
```bash
GET /api/v1/search?minRating=4.5&sortBy=rating
```

##### Recent Listings (Last 7 Days)
```bash
GET /api/v1/search?postedSince=7&sortBy=date_desc
```

##### Advanced Combined Search
```bash
GET /api/v1/search?q=Samsung%20Galaxy&category=electronics&minPrice=10000&maxPrice=20000&condition=new&minRating=4.0&postedSince=30&sortBy=price_asc&page=1&limit=20
```

#### Response Example

```json
{
  "success": true,
  "listings": [
    {
      "listingId": "abc-123",
      "title": "iPhone 15 Pro Max 256GB",
      "description": "Brand new...",
      "price": "18999.99",
      "category": "electronics",
      "condition": "new",
      "type": "sale",
      "views": 145,
      "keyFeatures": ["256GB Storage", "A17 Pro Chip"],
      "images": ["image1.jpg"],
      "seller": {
        "userId": "seller-123",
        "firstName": "Jane",
        "lastName": "Smith",
        "addresses": [
          {
            "city": "Cape Town",
            "province": "Western Cape",
            "latitude": -33.9249,
            "longitude": 18.4241
          }
        ]
      },
      "sellerAvgRating": 4.5,
      "distance": 12.3,
      "createdAt": "2024-01-29T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  },
  "filters": {
    "q": "iPhone",
    "category": "electronics",
    "minPrice": "5000",
    "maxPrice": "20000",
    "condition": "new",
    "minRating": "4.0",
    "location": {
      "latitude": "-33.9249",
      "longitude": "18.4241",
      "maxDistance": "50"
    },
    "sortBy": "price_asc"
  }
}
```

---

### 2. **Get Search Filters**

**Endpoint:** `GET /api/v1/search/filters`

**Authentication:** Not required

**Description:** Get all available filter options with counts

#### Response Example

```json
{
  "success": true,
  "filters": {
    "categories": [
      { "value": "electronics", "label": "electronics", "count": 1250 },
      { "value": "clothing", "label": "clothing", "count": 890 },
      { "value": "home", "label": "home", "count": 654 }
    ],
    "conditions": [
      { "value": "new", "label": "new", "count": 1500 },
      { "value": "used", "label": "used", "count": 800 },
      { "value": "refurbished", "label": "refurbished", "count": 200 }
    ],
    "types": [
      { "value": "sale", "label": "sale", "count": 2000 },
      { "value": "rent", "label": "rent", "count": 500 }
    ],
    "priceRange": {
      "min": 50,
      "max": 150000
    },
    "sortOptions": [
      { "value": "date_desc", "label": "Newest First" },
      { "value": "date_asc", "label": "Oldest First" },
      { "value": "price_asc", "label": "Price: Low to High" },
      { "value": "price_desc", "label": "Price: High to Low" },
      { "value": "views", "label": "Most Viewed" },
      { "value": "title", "label": "Title (A-Z)" },
      { "value": "distance", "label": "Distance (Nearest)" }
    ],
    "dateFilters": [
      { "value": "1", "label": "Last 24 hours" },
      { "value": "7", "label": "Last 7 days" },
      { "value": "30", "label": "Last 30 days" },
      { "value": "90", "label": "Last 3 months" }
    ]
  }
}
```

**Use Case:** Load filter options on page load to populate dropdowns, sliders, etc.

---

### 3. **Get Search Suggestions (Autocomplete)**

**Endpoint:** `GET /api/v1/search/suggestions`

**Authentication:** Not required

**Description:** Get search suggestions based on partial query

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 characters) |

#### Example Request

```bash
GET /api/v1/search/suggestions?q=iph
```

#### Response Example

```json
{
  "success": true,
  "suggestions": [
    {
      "id": "listing-123",
      "title": "iPhone 15 Pro Max 256GB",
      "price": "18999.99",
      "category": "electronics"
    },
    {
      "id": "listing-456",
      "title": "iPhone 14 Pro 128GB",
      "price": "14999.99",
      "category": "electronics"
    },
    {
      "id": "listing-789",
      "title": "iPhone 13 256GB",
      "price": "10999.99",
      "category": "electronics"
    }
  ]
}
```

**Use Case:** Real-time search suggestions as user types

---

## Common Search Scenarios

### 1. **"Find me cheap electronics nearby"**
```bash
GET /api/v1/search?category=electronics&maxPrice=5000&latitude=-33.9249&longitude=18.4241&maxDistance=20&sortBy=price_asc
```

### 2. **"Show me new listings from top-rated sellers"**
```bash
GET /api/v1/search?condition=new&minRating=4.5&postedSince=7&sortBy=date_desc
```

### 3. **"Latest iPhone deals"**
```bash
GET /api/v1/search?q=iPhone&condition=new&sortBy=price_asc&postedSince=30
```

### 4. **"Highly viewed items in my area"**
```bash
GET /api/v1/search?latitude=-33.9249&longitude=18.4241&maxDistance=50&sortBy=views
```

### 5. **"Luxury items from premium sellers"**
```bash
GET /api/v1/search?minPrice=50000&minRating=4.8&sortBy=price_desc
```

### 6. **"Rentals near me"**
```bash
GET /api/v1/search?type=rent&latitude=-33.9249&longitude=18.4241&maxDistance=30&sortBy=distance
```

---

## Search Features

### ✅ Text Search
- Searches in **title**, **description**, and **key features**
- Case-insensitive
- Partial matching (e.g., "iph" matches "iPhone")

### ✅ Price Filtering
- Minimum price (`minPrice`)
- Maximum price (`maxPrice`)
- Both can be used together for range

### ✅ Category & Condition
- Filter by product category
- Filter by condition (new, used, refurbished)

### ✅ Location-Based Search
- Find items within X kilometers
- Requires user's coordinates
- Calculates distance using Haversine formula
- Can sort by distance (nearest first)
- Returns distance in km for each result

### ✅ Seller Rating Filter
- Filter by minimum seller rating (1-5 stars)
- Uses average rating from all seller reviews
- Automatically calculated and attached to results

### ✅ Date Filtering
- **Quick filters:** Last 1, 7, 30, 90 days (`postedSince`)
- **Custom range:** Specify exact date range (`dateFrom`, `dateTo`)

### ✅ Advertisement Filtering
- Show only ads: `isAdvertisement=true`
- Exclude ads: `isAdvertisement=false`
- Show both: omit parameter

### ✅ Sorting Options
- Date (newest/oldest)
- Price (low-high/high-low)
- Views (most viewed)
- Title (alphabetical)
- Distance (nearest first - requires location)
- Rating (highest rated sellers - requires minRating)

### ✅ Pagination
- Customizable page size (1-100 items)
- Total count and pages included
- `hasMore` flag for infinite scroll

### ✅ Activity Logging
- All searches are automatically logged
- Tracks search terms, filters used, and results count
- Useful for analytics and improving search

---

## Frontend Integration Examples

### React Example with Filters

```javascript
const SearchPage = () => {
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
    minRating: '',
    sortBy: 'date_desc',
    page: 1
  });

  const searchListings = async () => {
    const queryParams = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v !== '')
    ).toString();

    const response = await fetch(
      `/api/v1/search?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const data = await response.json();
    return data;
  };

  return (
    <div>
      <input
        placeholder="Search..."
        value={filters.q}
        onChange={(e) => setFilters({...filters, q: e.target.value})}
      />
      <select onChange={(e) => setFilters({...filters, category: e.target.value})}>
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
      {/* More filters... */}
    </div>
  );
};
```

### Autocomplete Example

```javascript
const SearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (value) => {
    setQuery(value);

    if (value.length >= 2) {
      const response = await fetch(
        `/api/v1/search/suggestions?q=${encodeURIComponent(value)}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Start typing..."
      />
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map(s => (
            <li key={s.id}>{s.title} - R{s.price}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## Performance Considerations

1. **Text Search:** Uses PostgreSQL `ILIKE` for case-insensitive search
2. **Indexed Fields:** Ensure indexes on frequently filtered fields:
   - `category`
   - `price`
   - `condition`
   - `status`
   - `createdAt`
3. **Location Search:** Haversine calculation done in memory after DB query
4. **Rating Filter:** Separate query for ratings, then filtered in memory
5. **Pagination:** Always use pagination for large result sets
6. **Caching:** Consider caching filter options (`GET /search/filters`)

---

## Error Handling

### Invalid Parameters
```json
{
  "success": false,
  "message": "Invalid price range"
}
```

### No Results
```json
{
  "success": true,
  "listings": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasMore": false
  }
}
```

---

## Testing with Postman

Import the updated collection and use these search requests:

### Basic Search
```
GET {{baseUrl}}/search?q=iPhone
Headers: Authorization: Bearer {{authToken}}
```

### Advanced Search
```
GET {{baseUrl}}/search?q=Samsung&category=electronics&minPrice=5000&maxPrice=15000&minRating=4.0&sortBy=price_asc&page=1&limit=20
Headers: Authorization: Bearer {{authToken}}
```

### Get Filters
```
GET {{baseUrl}}/search/filters
```

### Get Suggestions
```
GET {{baseUrl}}/search/suggestions?q=iph
```

---

## Future Enhancements

- 🔮 Elasticsearch integration for faster text search
- 🔮 Fuzzy matching for typo tolerance
- 🔮 Search history and saved searches
- 🔮 AI-powered recommendations
- 🔮 Image-based search
- 🔮 Voice search support

---

## Related Documentation

- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [Postman Guide](POSTMAN_GUIDE.md)
- [API Documentation](../README.md)
