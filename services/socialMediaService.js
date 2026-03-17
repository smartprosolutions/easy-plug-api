"use strict";

/**
 * Social Media Service
 *
 * Automatically posts new listings to configured social platforms.
 *
 * Supported platforms:
 *   - Facebook  (Graph API v18 – Page posts / photo posts)
 *   - Instagram (Graph API v18 – Business account media publish)
 *   - Twitter/X (API v2       – OAuth 1.0a tweet)
 *
 * Required environment variables (set the ones you need; unset = platform skipped):
 *
 *   # Public URLs ─────────────────────────────────────────────────────────────
 *   API_BASE_URL        e.g. https://api.easyplug.co.za
 *   CLIENT_BASE_URL     e.g. https://easyplug.co.za
 *
 *   # Facebook / Instagram ───────────────────────────────────────────────────
 *   FACEBOOK_PAGE_ID
 *   FACEBOOK_PAGE_ACCESS_TOKEN        (long-lived page token)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID     (IG user ID linked to the page; optional)
 *
 *   # Twitter / X ────────────────────────────────────────────────────────────
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_TOKEN_SECRET
 */

const https = require("https");
const crypto = require("crypto");

const FB_HOST = "graph.facebook.com";
const TW_HOST = "api.twitter.com";

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function httpsRequest(options, body = "") {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Post text / URL builders ─────────────────────────────────────────────────

function buildPostText(listing, seller, listingUrl) {
  const price = listing.price
    ? `R ${Number(listing.price).toLocaleString()}`
    : "";
  const condition = listing.condition ? ` · ${listing.condition}` : "";
  const category = listing.category
    ? ` #${listing.category.replace(/\s+/g, "")}`
    : "";
  const shortDesc =
    listing.description && listing.description.length > 140
      ? listing.description.substring(0, 140) + "…"
      : listing.description || "";

  return [
    `🛍️ New listing: ${listing.title}`,
    price && `💰 ${price}${condition}`,
    shortDesc,
    listingUrl && `🔗 ${listingUrl}`,
    `#EasyPlug #Marketplace #ForSale${category}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildImageUrl(listing, sellerEmail) {
  const base =
    process.env.API_BASE_URL ||
    `http://localhost:${process.env.PORT || 8000}`;
  if (!listing.images || listing.images.length === 0) return null;
  const folder = listing.isAdvertisement ? "advert" : "standard";
  return `${base}/uploads/listings/${sellerEmail}/images/${folder}/${listing.images[0]}`;
}

function buildListingUrl(listing) {
  const clientBase = process.env.CLIENT_BASE_URL || "";
  if (!clientBase) return null;
  return `${clientBase}/listings/${listing.listingId}`;
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

async function postToFacebook(listing, seller) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { skipped: true };

  const listingUrl = buildListingUrl(listing);
  const message = buildPostText(listing, seller, listingUrl);
  const imageUrl = buildImageUrl(listing, seller?.email);

  // Prefer a photo post when an image is available
  let fbPath;
  let qs;
  if (imageUrl) {
    fbPath = `/v18.0/${pageId}/photos`;
    qs = new URLSearchParams({ caption: message, url: imageUrl, access_token: token });
  } else {
    fbPath = `/v18.0/${pageId}/feed`;
    qs = new URLSearchParams({ message, access_token: token });
    if (listingUrl) qs.append("link", listingUrl);
  }

  const result = await httpsRequest(
    { hostname: FB_HOST, path: `${fbPath}?${qs}`, method: "POST" },
    "",
  );
  if (result.status >= 400) {
    throw new Error(`Facebook: ${JSON.stringify(result.body)}`);
  }
  const postId = result.body.post_id || result.body.id || null;
  return {
    platform: "facebook",
    postId,
    postUrl: postId ? `https://facebook.com/${postId}` : null,
  };
}

// ─── Instagram ────────────────────────────────────────────────────────────────

async function postToInstagram(listing, seller) {
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN; // shared with Facebook
  if (!igUserId || !token) return { skipped: true };

  const imageUrl = buildImageUrl(listing, seller?.email);
  if (!imageUrl) return { skipped: true }; // Instagram requires an image

  const listingUrl = buildListingUrl(listing);
  const caption = buildPostText(listing, seller, listingUrl);

  // Step 1 – create media container
  const containerQs = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: token,
  });
  const container = await httpsRequest(
    {
      hostname: FB_HOST,
      path: `/v18.0/${igUserId}/media?${containerQs}`,
      method: "POST",
    },
    "",
  );
  if (container.status >= 400 || !container.body.id) {
    throw new Error(`Instagram container: ${JSON.stringify(container.body)}`);
  }

  // Step 2 – publish
  const publishQs = new URLSearchParams({
    creation_id: container.body.id,
    access_token: token,
  });
  const publish = await httpsRequest(
    {
      hostname: FB_HOST,
      path: `/v18.0/${igUserId}/media_publish?${publishQs}`,
      method: "POST",
    },
    "",
  );
  if (publish.status >= 400) {
    throw new Error(`Instagram publish: ${JSON.stringify(publish.body)}`);
  }
  const postId = publish.body.id || null;
  return {
    platform: "instagram",
    postId,
    postUrl: postId ? `https://www.instagram.com/p/${postId}` : null,
  };
}

// ─── Twitter / X (OAuth 1.0a) ─────────────────────────────────────────────────

function buildOAuth1Header(method, url) {
  const key = process.env.TWITTER_API_KEY;
  const secret = process.env.TWITTER_API_SECRET;
  const token = process.env.TWITTER_ACCESS_TOKEN;
  const tokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  const params = {
    oauth_consumer_key: key,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: "1.0",
  };

  const sortedEntries = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const base = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedEntries)].join("&");
  const signingKey = `${encodeURIComponent(secret)}&${encodeURIComponent(tokenSecret)}`;
  params.oauth_signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");

  return (
    "OAuth " +
    Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

async function postToTwitter(listing, seller) {
  const configured =
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_TOKEN_SECRET;
  if (!configured) return { skipped: true };

  const listingUrl = buildListingUrl(listing);
  const text = buildPostText(listing, seller, listingUrl);
  const tweetText = text.length > 280 ? text.substring(0, 277) + "…" : text;

  const tweetEndpoint = "https://api.twitter.com/2/tweets";
  const body = JSON.stringify({ text: tweetText });

  const result = await httpsRequest(
    {
      hostname: TW_HOST,
      path: "/2/tweets",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: buildOAuth1Header("POST", tweetEndpoint),
      },
    },
    body,
  );
  if (result.status >= 400) {
    throw new Error(`Twitter: ${JSON.stringify(result.body)}`);
  }
  const tweetId = result.body?.data?.id || null;
  return {
    platform: "twitter",
    postId: tweetId,
    postUrl: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : null,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Post a listing to all configured social platforms.
 *
 * @param {object} listing  - Sequelize Listing instance or plain object
 * @param {object} seller   - User object (needs .email, .firstName, .lastName)
 * @returns {Promise<object>} Map of platform → { postId, postUrl } | { skipped } | { error }
 */
async function postListingToSocialMedia(listing, seller) {
  const platforms = [
    { name: "facebook", fn: () => postToFacebook(listing, seller) },
    { name: "instagram", fn: () => postToInstagram(listing, seller) },
    { name: "twitter", fn: () => postToTwitter(listing, seller) },
  ];

  const settled = await Promise.allSettled(platforms.map(({ fn }) => fn()));

  return platforms.reduce((acc, { name }, i) => {
    const r = settled[i];
    acc[name] =
      r.status === "fulfilled"
        ? r.value
        : { error: r.reason?.message || "Unknown error" };
    return acc;
  }, {});
}

module.exports = { postListingToSocialMedia, buildPostText, buildListingUrl };
