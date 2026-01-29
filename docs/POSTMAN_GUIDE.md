# 📮 Postman Collection Guide

## Quick Start

### 1. Import the Collection & Environment

**Option A: Import from Files**
1. Open Postman
2. Click **Import** button
3. Select these files:
   - `docs/postman_collection.json`
   - `docs/postman_environment.json`
4. Click **Import**

**Option B: Import via URL** *(if hosted on GitHub)*
```
https://raw.githubusercontent.com/YOUR_REPO/easy-plug-api/main/docs/postman_collection.json
```

### 2. Select Environment
- Click the environment dropdown (top right)
- Select **"EasyPlug - Development"**

### 3. Start Testing!
Follow the **Testing Flow** section below.

---

## 🎯 Automatic Features

### Auto-Saved Variables
The collection automatically saves these variables from responses:

| Variable | Saved From | Used In |
|----------|------------|---------|
| `authToken` | Login, Register | All authenticated requests |
| `userId` | Register, Login | User operations |
| `sellerId` | Register Seller, Get Listing | Chat, Ratings, Transactions |
| `listingId` | Create Listing | Wishlist, Chat, Get Detail |
| `chatId` | Create Chat | Send Message |
| `notificationId` | Get Notifications | Mark Read, Delete |
| `transactionId` | Create Transaction | Payments |
| `verificationToken` | Send Code | Verify Code |
| `resetToken` | Forgot Password | Reset Password |

### Auto-Included Headers
All authenticated requests automatically include:
```
Authorization: Bearer {{authToken}}
```

### Auto-Tests
Every request includes automatic tests:
- ✅ Response time < 2000ms
- ✅ Valid JSON response
- ✅ Specific tests per endpoint

---

## 🔄 Testing Flow

### **Flow 1: Complete Buyer Journey**

```
1. Register Buyer
   ↓ (authToken & userId saved automatically)
2. Get Current User
   ↓
3. List Standard Listings
   ↓ (listingId saved from first item)
4. Get Listing Detail (Enhanced)
   ↓ (see views, ratings, related items)
5. Add to Wishlist
   ↓
6. Get My Wishlist
   ↓
7. Create/Get Chat
   ↓ (chatId saved)
8. Send Message
   ↓
9. Create Rating
   ↓
10. Create Transaction
```

### **Flow 2: Seller Journey**

```
1. Register Seller
   ↓ (authToken & sellerId saved)
2. Create Listing
   ↓ (listingId saved)
3. Get My Listings (Seller)
   ↓
4. Update Listing (Change Price)
   ↓ (price history tracked automatically)
5. List My Chats
   ↓
6. Get Notifications
```

### **Flow 3: Testing New Features**

```
1. Login (to get fresh token)
   ↓
2. Create Listing with Key Features
   {
     "keyFeatures": ["Feature 1", "Feature 2", ...]
   }
   ↓
3. Get Listing Detail - Verify Enhanced Response:
   - ✅ views count
   - ✅ sellerRating (average + total)
   - ✅ sellerJoinDate
   - ✅ relatedListings (4 items)
   - ✅ priceHistory (last 10 changes)
   - ✅ inWishlist (true/false)
   ↓
4. Update Listing Price
   ↓
5. Get Listing Detail Again
   ↓ (verify price history updated)
6. Add to Wishlist
   ↓
7. Check if in Wishlist
   ↓
8. Get My Notifications
```

---

## 📝 Sample Test Data

### Register Buyer
```json
{
  "email": "buyer@test.com",
  "password": "Test123!",
  "confirmPassword": "Test123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1995-05-15",
  "phone": "+27821234567",
  "title": "Mr"
}
```

### Register Seller
```json
{
  "email": "seller@test.com",
  "password": "Test123!",
  "confirmPassword": "Test123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "dateOfBirth": "1990-08-20",
  "phone": "+27829876543",
  "title": "Ms",
  "businessName": "Jane's Electronics",
  "businessEmail": "business@janestore.com"
}
```

### Create Listing (Complete)
```json
{
  "title": "iPhone 15 Pro Max 256GB",
  "description": "Brand new iPhone 15 Pro Max in Titanium Blue. Never used, still sealed in original packaging. Comes with 1 year Apple warranty.",
  "price": 18999.99,
  "category": "electronics",
  "type": "sale",
  "condition": "new",
  "keyFeatures": [
    "256GB Storage",
    "A17 Pro Chip",
    "Titanium Design",
    "48MP Camera",
    "USB-C Port",
    "Action Button"
  ],
  "status": "active",
  "isAdvertisement": false
}
```

### More Sample Listings
```json
{
  "title": "Samsung Galaxy S24 Ultra",
  "description": "Excellent condition, 6 months old. Includes original box and charger.",
  "price": 15999.99,
  "category": "electronics",
  "condition": "used",
  "keyFeatures": [
    "512GB Storage",
    "S Pen Included",
    "200MP Camera",
    "5000mAh Battery"
  ],
  "status": "active",
  "isAdvertisement": false
}
```

### Rate a Seller
```json
{
  "sellerId": "{{sellerId}}",
  "rating": 5,
  "comment": "Excellent seller! Very responsive and item was exactly as described. Fast delivery too!"
}
```

### Send Message
```json
{
  "chatId": "{{chatId}}",
  "receiverId": "{{sellerId}}",
  "message": "Hi, is this item still available? Can we negotiate the price?"
}
```

---

## 🎨 Collection Organization

### Folders

#### 🔐 Authentication
- Register Buyer *(with DOB & confirmPassword)*
- Register Seller *(with business info)*
- Login *(auto-saves token)*
- Send Verification Code
- Verify Code
- Get Current User
- Forgot Password
- Reset Password

#### 📦 Listings
- Create Listing *(with keyFeatures)*
- List All Listings (Mixed)
- List Standard Listings *(20/page)*
- List Ad Listings *(8/page)*
- Get Listing Detail *(ENHANCED)*
- Update Listing *(tracks price)*
- Delete Listing
- Get My Listings (Seller)

#### ❤️ Wishlist
- Add to Wishlist
- Get My Wishlist *(20/page)*
- Check if in Wishlist
- Remove from Wishlist

#### 🔔 Notifications
- Get My Notifications
- Get Unread Notifications Only
- Get Unread Count
- Mark Notification as Read
- Mark All as Read
- Delete Notification

#### 💬 Chats & Messages
- Create or Get Chat *(per listing)*
- List My Chats
- Get Chat with Messages
- Send Message

#### ⭐ Ratings & Reviews
- Create Rating
- List All Ratings

#### 💳 Transactions & Payments
- Create Transaction
- List My Transactions

#### 👤 Users & Profile
- List All Users
- Get User by ID
- Update My Profile

#### 📍 Addresses
- Create Address
- List My Addresses

#### 📊 Subscriptions
- List Subscription Plans
- Create Subscription Plan

---

## 🧪 Testing Tips

### 1. Check the Console
After each request, open Postman Console to see:
- ✅ Saved variables with values
- 🔍 Request details
- 📊 Test results

### 2. Use Collection Runner
1. Click **Run** on collection
2. Select folder (e.g., "Authentication")
3. Click **Run EasyPlug API**
4. Watch automated tests execute

### 3. Monitor Variables
- Click **Variables** tab in collection
- See all auto-saved values in real-time

### 4. Environment Variables
Switch between environments:
- Development (localhost:8000)
- Staging (your-staging-url.com)
- Production (your-prod-url.com)

---

## 🔧 Customization

### Change Base URL
```json
{
  "baseUrl": "https://your-api.com/api/v1"
}
```

### Add Custom Tests
Edit request → **Tests** tab:
```javascript
pm.test("Custom test", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.customField).to.exist;
});
```

### Add Pre-request Scripts
Edit request → **Pre-request Script** tab:
```javascript
// Log request details
console.log('Making request to:', pm.request.url);
```

---

## 📊 Response Examples

### Enhanced Listing Detail Response
```json
{
  "success": true,
  "listing": {
    "listingId": "abc-123",
    "title": "iPhone 15 Pro Max 256GB",
    "price": "18999.99",
    "views": 145,
    "keyFeatures": ["256GB Storage", "A17 Pro Chip", ...],
    "images": ["image1.jpg", "image2.jpg"],
    "sellerRating": {
      "averageRating": "4.5",
      "totalRatings": 28
    },
    "seller": {
      "userId": "seller-123",
      "firstName": "Jane",
      "lastName": "Smith",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "sellerJoinDate": "2024-01-15T10:30:00Z",
    "relatedListings": [
      {...}, {...}, {...}, {...}
    ],
    "priceHistory": [
      {
        "oldPrice": "19999.99",
        "newPrice": "18999.99",
        "createdAt": "2024-01-20T14:00:00Z"
      },
      ...
    ],
    "inWishlist": false
  }
}
```

### Wishlist Response
```json
{
  "success": true,
  "wishlist": [
    {
      "wishlistId": "wish-123",
      "listingId": "abc-123",
      "listing": {
        "title": "iPhone 15 Pro Max",
        "price": "18999.99",
        "images": ["..."],
        "seller": {...}
      },
      "createdAt": "2024-01-29T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 5,
  "totalPages": 1
}
```

### Notification Response
```json
{
  "success": true,
  "notifications": [
    {
      "notificationId": "notif-123",
      "type": "message",
      "title": "New Message",
      "message": "You have a new message from John Doe",
      "actionUrl": "/chats/chat-456",
      "isRead": false,
      "createdAt": "2024-01-29T09:30:00Z"
    }
  ],
  "total": 12,
  "unreadCount": 5
}
```

---

## 🚨 Troubleshooting

### "User not authorized" Error
**Solution:**
1. Check if `authToken` is set: Console → Variables → `authToken`
2. If empty, run **Login** or **Register** request first
3. Token is auto-saved and used in subsequent requests

### Variables Not Saving
**Solution:**
1. Check **Tests** tab of request
2. Ensure test script exists (should be there by default)
3. Check Console for errors

### 404 Not Found
**Solution:**
1. Verify server is running: `npm run dev`
2. Check `baseUrl` in environment variables
3. Ensure endpoint path is correct

### Invalid Listing ID
**Solution:**
1. Run **Create Listing** first
2. Check `listingId` variable is set
3. Or manually set: Variables → `listingId` → paste value

---

## 📈 Advanced Usage

### Bulk Testing with Collection Runner
1. Create CSV file with test data:
```csv
email,password,firstName,lastName
user1@test.com,Pass123!,John,Doe
user2@test.com,Pass123!,Jane,Smith
```

2. Import to Collection Runner
3. Map columns to variables
4. Run all requests with different data

### Automated Testing (CI/CD)
```bash
newman run postman_collection.json \
  -e postman_environment.json \
  --reporters cli,json
```

### Export Variables
```bash
# Export current environment
Postman → Environment → ... → Export
```

---

## 🎉 Happy Testing!

**Collection includes:**
- ✅ 50+ pre-configured requests
- ✅ Automatic token management
- ✅ Auto-save IDs for seamless testing
- ✅ Complete test data examples
- ✅ Global pre-request & test scripts
- ✅ Organized by feature folders

**Questions?** Check the [API Documentation](../IMPLEMENTATION_SUMMARY.md)

**Found a bug?** Open an issue on GitHub

---

## 📚 Related Documentation
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [README](../README.md)
- [ERD Diagram](erd.md)
