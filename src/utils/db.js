import fs from "fs";

const DB_FILE = "db.json";

export function readDB() {
  const data = fs.readFileSync(DB_FILE);
  return JSON.parse(data);
}

export function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
