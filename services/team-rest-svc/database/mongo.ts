import { MongoClient, Database } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { Team } from "../types.ts";

let db: Database;

export async function connectToMongo() {
  const mongoUri = Deno.env.get("MONGO_URI") || "mongodb://localhost:27017";
  const dbName = Deno.env.get("MONGO_DB_NAME") || "football";

  const client = new MongoClient();
  await client.connect(mongoUri);
  db = client.database(dbName);

  // Seed initial data if collection is empty
  const teams = db.collection<Team>("teams");
  if (await teams.countDocuments() === 0) {
    const initialData = JSON.parse(await Deno.readTextFile("./seed/db.json"));
    await teams.insertMany(initialData.teams);
  }

  return db;
}

export { db };
