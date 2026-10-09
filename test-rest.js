const https = require("https");

const data = JSON.stringify({
  fields: {
    message: { stringValue: "تجربة الاتصال عبر واجهة REST المباشرة" },
    date: { stringValue: new Date().toISOString() }
  }
});

const options = {
  hostname: "firestore.googleapis.com",
  port: 443,
  path: "/v1/projects/mrkz-hussein-alasde/databases/(default)/documents/test_rest",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

console.log("Sending REST request to Firestore API...");
const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", body);
  });
});

req.on("error", (e) => {
  console.error("HTTP ERROR:", e);
});

req.write(data);
req.end();
