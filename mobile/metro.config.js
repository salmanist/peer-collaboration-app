const http = require("node:http");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const previousMiddleware = config.server.enhanceMiddleware;

// Expo Go can reach Metro even when the separate Django port is inaccessible
// from the phone. Keep development API and media requests on that same origin.
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previousMiddleware ? previousMiddleware(middleware, server) : middleware;
  return (request, response, done) => {
    if (!/^\/(api|media)(\/|\?|$)/.test(request.url || "")) return next(request, response, done);
    const upstream = http.request({
      hostname: "127.0.0.1", port: 8000, method: request.method,
      path: request.url, headers: request.headers,
    }, result => {
      response.writeHead(result.statusCode || 502, result.headers);
      result.pipe(response);
    });
    upstream.setTimeout(45000, () => upstream.destroy(new Error("Backend timed out")));
    upstream.on("error", () => {
      if (response.headersSent) return response.destroy();
      response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ detail: "The campus API is unavailable. Please retry shortly." }));
    });
    response.on("close", () => upstream.destroy());
    request.pipe(upstream);
  };
};

module.exports = config;
