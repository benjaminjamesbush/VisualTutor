module.exports = {
  proxy: "localhost:3000",  // Proxy your Express server
  port: 3001,               // Browser-sync runs on port 3001
  files: [
    "public/**/*.{html,css,js}",  // Watch all static files
    "views/**/*.{html,ejs}",       // If you have view templates
    "server.js"                    // Watch server file for changes
  ],
  open: false,              // Don't auto-open browser
  notify: false,            // Disable the notification popup
  ui: false,                // Disable the UI (removes port 3002)
  reloadDelay: 500,         // Wait 500ms after file change before reloading
  reloadDebounce: 1000      // Only reload once per second max
};