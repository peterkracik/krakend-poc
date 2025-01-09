import { MongoClient, Database } from "https://deno.land/x/mongo@v0.31.2/mod.ts";

let db: Database;

export async function connectToMongo() {
  const mongoUri = Deno.env.get("MONGO_URI") || "mongodb://localhost:27017";
  const dbName = Deno.env.get("MONGO_DB_NAME") || "football";

  const client = new MongoClient();
  await client.connect(mongoUri);
  db = client.database(dbName);

  return db;
}

export { db };
