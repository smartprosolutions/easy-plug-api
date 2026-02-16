# 🔔 Automatic Notification Triggers

## Overview

The EasyPlug API now **automatically triggers notifications** for all important marketplace events. Users receive real-time notifications for messages, transactions, ratings, price drops, and more.

---

## 📬 All Notification Triggers

### 1. **💬 New Message Notification**

**Triggered When:** Someone sends a chat message

**Recipient:** Message receiver

**Implementation:** [controllers/chatMessagesController.js](../controllers/chatMessagesController.js)

**Details:**
```javascript
// When: User sends a message
// Action: POST /api/v1/chat-messages

Notification Created:
{
  type: 'message',
  title: 'New Message',
  message: 'John Doe sent you a message about "iPhone 15 Pro Max"',
  actionUrl: '/chats/{chatId}',
  metadata: {
    chatId,
    senderId,
    senderName: 'John Doe',
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    messagePreview: 'Hi, is this still available?...'
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "message": {
    "messageId": "msg-123",
    "chatId": "chat-456",
    "message": "Hi, is this still available?"
  }
}
```

---

### 2. **⭐ New Rating Notification**

**Triggered When:** Seller receives a rating

**Recipient:** Seller

**Implementation:** [controllers/ratingsController.js](../controllers/ratingsController.js)

**Details:**
```javascript
// When: User rates a seller
// Action: POST /api/v1/ratings

Notification Created:
{
  type: 'account',
  title: 'New Rating Received',
  message: 'Jane Smith rated you ⭐⭐⭐⭐⭐ (5/5): "Great seller!..."',
  actionUrl: '/ratings',
  metadata: {
    ratingId,
    rating: 5,
    comment: 'Great seller! Fast delivery',
    raterName: 'Jane Smith'
  }
}
```

**Example:**
```bash
POST /api/v1/ratings
{
  "sellerId": "seller-123",
  "rating": 5,
  "comment": "Excellent seller! Very responsive"
}

# ✅ Seller receives notification with star rating
```

---

### 3. **💰 Price Drop Alert**

**Triggered When:** Price is reduced on a wishlisted item

**Recipient:** All users who wishlisted the item

**Implementation:** [controllers/listingsController.js](../controllers/listingsController.js) - `updateListing()`

**Details:**
```javascript
// When: Seller updates listing price (lower than before)
// Action: PUT /api/v1/listings/{id}

Notification Created (for each wishlister):
{
  type: 'listing',
  title: 'Price Drop Alert! 💰',
  message: '"iPhone 15 Pro Max" price dropped from R18999.99 to R16999.99 (-11%)',
  actionUrl: '/listings/{listingId}',
  metadata: {
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    oldPrice: 18999.99,
    newPrice: 16999.99,
    priceDrop: 2000,
    percentageDrop: '11'
  }
}
```

**Example:**
```bash
# User A wishlists "iPhone 15 Pro Max" at R18,999
# Seller updates price to R16,999

PUT /api/v1/listings/abc-123
{
  "price": 16999.99
}

# ✅ User A receives: "Price Drop Alert! -11%"
```

---

### 4. **🎉 View Milestone Notifications**

**Triggered When:** Listing reaches view milestones

**Recipient:** Seller (listing owner)

**Milestones:** 100, 500, 1000, 5000, 10000 views

**Implementation:** [controllers/listingsController.js](../controllers/listingsController.js) - `getListing()`

**Details:**
```javascript
// When: Listing view count crosses a milestone
// Action: GET /api/v1/listings/{id}

Notification Created:
{
  type: 'listing',
  title: 'View Milestone Reached! 🎉',
  message: 'Your listing "iPhone 15 Pro Max" has reached 500 views!',
  actionUrl: '/listings/{listingId}',
  metadata: {
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    views: 500,
    milestone: 500
  }
}
```

**Example:**
```bash
# Seller's listing has 499 views
# Buyer views the listing

GET /api/v1/listings/abc-123

# ✅ Seller receives: "View Milestone Reached! 🎉 500 views"
```

**Milestones:**
- 100 views
- 500 views
- 1,000 views
- 5,000 views
- 10,000 views

---

### 5. **❤️ Wishlist Add Notification**

**Triggered When:** Someone adds item to wishlist

**Recipient:** Seller (item owner)

**Implementation:** [controllers/wishlistController.js](../controllers/wishlistController.js)

**Details:**
```javascript
// When: User adds item to wishlist
// Action: POST /api/v1/wishlist

Notification Created:
{
  type: 'listing',
  title: 'Item Added to Wishlist! ❤️',
  message: 'John Doe added "iPhone 15 Pro Max" to their wishlist',
  actionUrl: '/listings/{listingId}',
  metadata: {
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    userId,
    userName: 'John Doe'
  }
}
```

**Example:**
```bash
POST /api/v1/wishlist
{
  "listingId": "abc-123"
}

# ✅ Seller receives: "Item Added to Wishlist! ❤️"
```

---

### 6. **💳 Transaction Created**

**Triggered When:** New transaction is initiated

**Recipients:** Both buyer AND seller

**Implementation:** [controllers/transactionsController.js](../controllers/transactionsController.js)

**Details:**
```javascript
// When: Buyer creates a transaction
// Action: POST /api/v1/transactions

Seller Notification:
{
  type: 'transaction',
  title: 'New Transaction! 💰',
  message: 'Jane Smith initiated a purchase for "iPhone 15 Pro Max" (R18999.99)',
  actionUrl: '/transactions/{transactionId}',
  metadata: {
    transactionId,
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    amount: 18999.99,
    buyerName: 'Jane Smith'
  }
}

Buyer Notification:
{
  type: 'transaction',
  title: 'Transaction Created',
  message: 'Your purchase request for "iPhone 15 Pro Max" has been created',
  actionUrl: '/transactions/{transactionId}',
  metadata: {
    transactionId,
    listingId,
    listingTitle: 'iPhone 15 Pro Max',
    amount: 18999.99
  }
}
```

**Example:**
```bash
POST /api/v1/transactions
{
  "listingId": "abc-123",
  "sellerId": "seller-456",
  "amount": 18999.99
}

# ✅ Seller receives: "New Transaction! 💰"
# ✅ Buyer receives: "Transaction Created"
```

---

### 7. **✅ Transaction Status Update**

**Triggered When:** Transaction status changes

**Recipients:** Both buyer AND seller

**Implementation:** [controllers/transactionsController.js](../controllers/transactionsController.js)

**Details:**
```javascript
// When: Transaction status is updated
// Action: PUT /api/v1/transactions/{id}/status

Status: "completed"
{
  type: 'transaction',
  title: 'Transaction Completed! ✅',
  message: 'Your transaction for "iPhone 15 Pro Max" has been completed',
  actionUrl: '/transactions/{transactionId}'
}

Status: "cancelled"
{
  type: 'transaction',
  title: 'Transaction Cancelled',
  message: 'Transaction for "iPhone 15 Pro Max" has been cancelled',
  actionUrl: '/transactions/{transactionId}'
}

Status: "processing"
{
  type: 'transaction',
  title: 'Transaction Processing',
  message: 'Transaction for "iPhone 15 Pro Max" is being processed',
  actionUrl: '/transactions/{transactionId}'
}
```

**Example:**
```bash
PUT /api/v1/transactions/txn-123/status
{
  "status": "completed"
}

# ✅ Buyer & Seller receive: "Transaction Completed! ✅"
```

---

## 📊 Notification Types

| Type | Used For |
|------|----------|
| `message` | Chat messages |
| `transaction` | Purchases, payments, status changes |
| `listing` | Price drops, wishlist adds, view milestones |
| `account` | Ratings, profile updates, security |
| `system` | Platform announcements, updates |

---

## 🎯 Notification Flow Example

### Scenario: User Buys an iPhone

```
1. Buyer views listing
   → Seller may receive "View Milestone Reached!" (if milestone)

2. Buyer adds to wishlist
   → Seller receives "Item Added to Wishlist! ❤️"

3. Buyer sends message
   → Seller receives "New Message"

4. Seller replies
   → Buyer receives "New Message"

5. Seller drops price
   → Buyer receives "Price Drop Alert! 💰"

6. Buyer creates transaction
   → Seller receives "New Transaction! 💰"
   → Buyer receives "Transaction Created"

7. Seller marks as processing
   → Buyer receives "Transaction Processing"
   → Seller receives "Transaction Processing"

8. Transaction completes
   → Buyer receives "Transaction Completed! ✅"
   → Seller receives "Transaction Completed! ✅"

9. Buyer rates seller
   → Seller receives "New Rating Received ⭐⭐⭐⭐⭐"
```

**Total Notifications:** ~10 notifications across the purchase journey

---

## 🔧 How Notifications Work

### 1. **Event Occurs**
```javascript
// User sends a message
POST /api/v1/chat-messages
```

### 2. **Notification Created Automatically**
```javascript
await createNotification(
  receiverId,
  'message',
  'New Message',
  'John Doe sent you a message about "iPhone 15"',
  '/chats/123',
  { chatId: '123', senderId: 'abc' }
);
```

### 3. **User Receives Notification**
```bash
GET /api/v1/notifications

Response:
{
  "success": true,
  "notifications": [
    {
      "notificationId": "notif-789",
      "type": "message",
      "title": "New Message",
      "message": "John Doe sent you a message...",
      "actionUrl": "/chats/123",
      "isRead": false,
      "createdAt": "2024-01-29T14:30:00Z"
    }
  ]
}
```

### 4. **User Clicks Notification**
```bash
# Mark as read
PUT /api/v1/notifications/notif-789/read

# User navigates to actionUrl
GET /api/v1/chats/123
```

---

## 📱 Frontend Integration

### Real-time Notification Check
```javascript
// Poll for new notifications every 30 seconds
setInterval(async () => {
  const response = await fetch('/api/v1/notifications/unread-count', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();

  if (data.unreadCount > 0) {
    updateNotificationBadge(data.unreadCount);
  }
}, 30000);
```

### Display Notification Badge
```jsx
<NotificationBell>
  {unreadCount > 0 && (
    <Badge>{unreadCount}</Badge>
  )}
</NotificationBell>
```

### Handle Notification Click
```javascript
function handleNotificationClick(notification) {
  // Mark as read
  await markNotificationAsRead(notification.notificationId);

  // Navigate to action URL
  router.push(notification.actionUrl);
}
```

---

## 🎨 Notification Templates

### Message Template
```
Title: New Message
Message: {senderName} sent you a message about "{listingTitle}"
ActionUrl: /chats/{chatId}
Icon: 💬
```

### Price Drop Template
```
Title: Price Drop Alert! 💰
Message: "{listingTitle}" price dropped from R{oldPrice} to R{newPrice} (-{percentage}%)
ActionUrl: /listings/{listingId}
Icon: 💰
```

### Rating Template
```
Title: New Rating Received
Message: {raterName} rated you {stars} ({rating}/5): "{comment}"
ActionUrl: /ratings
Icon: ⭐
```

### Transaction Template
```
Title: New Transaction! 💰
Message: {buyerName} initiated a purchase for "{listingTitle}" (R{amount})
ActionUrl: /transactions/{transactionId}
Icon: 💳
```

---

## 🚀 Testing Notification Triggers

### Test 1: Message Notification
```bash
# 1. Login as Buyer
POST /api/v1/auth/login
{ "email": "buyer@test.com", "password": "..." }

# 2. Create chat
POST /api/v1/chats
{ "listingId": "abc-123", "sellerId": "seller-456" }

# 3. Send message
POST /api/v1/chat-messages
{
  "chatId": "chat-789",
  "receiverId": "seller-456",
  "message": "Hi, is this available?"
}

# 4. Login as Seller
POST /api/v1/auth/login
{ "email": "seller@test.com", "password": "..." }

# 5. Check notifications
GET /api/v1/notifications

# ✅ Should see: "New Message" notification
```

### Test 2: Price Drop Notification
```bash
# 1. Login as Buyer
POST /api/v1/auth/login

# 2. Add item to wishlist
POST /api/v1/wishlist
{ "listingId": "abc-123" }

# 3. Login as Seller
POST /api/v1/auth/login

# 4. Update listing price (lower)
PUT /api/v1/listings/abc-123
{ "price": 15999.99 }

# 5. Login as Buyer again
POST /api/v1/auth/login

# 6. Check notifications
GET /api/v1/notifications

# ✅ Should see: "Price Drop Alert!" notification
```

### Test 3: View Milestone
```bash
# 1. Create listing (as seller)
POST /api/v1/listings

# 2. View listing 100 times (simulate)
for i in {1..100}; do
  GET /api/v1/listings/abc-123
done

# 3. Check seller notifications
GET /api/v1/notifications

# ✅ Should see: "View Milestone Reached! 🎉 100 views"
```

---

## ⚙️ Configuration

### Disable Notifications (Optional)
```javascript
// In controller, add check
if (userSettings.notificationsEnabled) {
  await createNotification(...);
}
```

### Notification Preferences (Future Enhancement)
```javascript
// Users can control what notifications they receive
{
  messages: true,
  transactions: true,
  priceDrops: true,
  ratings: true,
  viewMilestones: false,
  wishlistAdds: false
}
```

---

## 📈 Notification Statistics

### Average Notifications Per User Journey

**Buyer Journey:**
- Wishlist add: 1 notification (to seller)
- Messages: 2-5 notifications (both users)
- Transaction: 3-4 notifications (status updates)
- Rating: 1 notification (to seller)

**Total:** ~7-11 notifications per purchase

**Seller Journey:**
- View milestones: 0-5 notifications
- Wishlist adds: Variable
- Messages: 2-5 notifications
- Transactions: 3-4 notifications
- Ratings: 1 notification per buyer

---

## 🎯 Summary

**7 Automatic Notification Triggers:**

1. ✅ **New Messages** - Instant chat notifications
2. ✅ **New Ratings** - Seller feedback alerts
3. ✅ **Price Drops** - Wishlist price alerts
4. ✅ **View Milestones** - Engagement tracking (100, 500, 1K, 5K, 10K)
5. ✅ **Wishlist Adds** - Seller interest alerts
6. ✅ **Transaction Created** - Purchase notifications
7. ✅ **Transaction Status** - Status update alerts (completed, cancelled, processing)

**All notifications include:**
- ✅ Relevant metadata
- ✅ Deep links (actionUrl)
- ✅ Read/unread tracking
- ✅ Timestamps

**Users stay informed about:**
- 💬 New messages
- 💰 Price changes
- 🎉 Listing engagement
- 💳 Transactions
- ⭐ Ratings
- ❤️ Wishlist activity

**Your marketplace now has a complete, automated notification system!** 🔔
