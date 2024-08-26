// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database file will be created in the root directory
const dbPath = path.join(__dirname, "app.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Create a table if it doesn't exist
db.serialize(() => {
  db.run(
    `
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT
    )
  `,
    (err) => {
      if (err) {
        console.error("Error creating table", err.message);
      } else {
        console.log("Table created or already exists.");
      }
    }
  );
});

module.exports = db;
