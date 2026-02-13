const crypto = require("crypto");
const querystring = require("querystring");
const https = require("https");

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || "";
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || "";
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";
const PAYFAST_SANDBOX = (process.env.PAYFAST_SANDBOX || "true") === "true";

const PAYFAST_PROCESS_URL = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/query/validate"
  : "https://www.payfast.co.za/eng/query/validate";

function generateSignature(data) {
  // data: object of key/values
  // build string of urlencoded key=value pairs sorted by key
  const keys = Object.keys(data).sort();
  const pieces = [];
  for (const k of keys) {
    if (!data[k]) continue; // skip empty
    pieces.push(
      `${k}=${encodeURIComponent(String(data[k]).replace(/\n/g, "\r\n"))}`
    );
  }
  let str = pieces.join("&");
  if (PAYFAST_PASSPHRASE) {
    str = `${str}&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE)}`;
  }
  return crypto.createHash("md5").update(str).digest("hex");
}

function buildPayfastPayload({
  amount,
  item_name,
  m_payment_id,
  email_address,
  return_url,
  cancel_url,
  notify_url
}) {
  const payload = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url,
    cancel_url,
    notify_url,
    m_payment_id,
    amount: parseFloat(amount).toFixed(2),
    item_name,
    email_address
  };
  const signature = generateSignature(payload);
  return { payload, signature, processUrl: PAYFAST_PROCESS_URL };
}

function verifyIPN(body) {
  return new Promise((resolve, reject) => {
    // body is an object; build query string (raw body)
    const dataString = querystring.stringify(body);
    const options = new URL(PAYFAST_VALIDATE_URL);

    const reqOptions = {
      method: "POST",
      hostname: options.hostname,
      path: options.pathname + (options.search || ""),
      port: options.port || 443,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(dataString)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let resp = "";
      res.on("data", (d) => (resp += d.toString()));
      res.on("end", () => {
        // PayFast returns "VALID" or "INVALID"
        resolve(resp.trim());
      });
    });
    req.on("error", (err) => reject(err));
    req.write(dataString);
    req.end();
  });
}

module.exports = { buildPayfastPayload, verifyIPN, PAYFAST_PROCESS_URL };
