// Import required dependencies
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { connectToMongo } from "./database/mongo.ts";
import { Match } from "./types.ts";
import * as log from "jsr:@std/log";

// Initialize database connection and get the matches collection
const db = await connectToMongo();
const matches = db.collection<Match>("matches");

// Create a new router instance to handle different endpoints
const router = new Router();

// Configure logging setup with JSON formatter
log.setup({
  handlers: {
    default: new log.ConsoleHandler("DEBUG", {
      formatter: log.formatters.jsonFormatter,
      useColors: false,
    }),
  },
});

/**
 * POST /api/matches
 * Creates a new match with scores
 * Expects a JSON body with match details including home and away scores
 */
router.post("/api/matches", async (ctx) => {
  // Validate if request contains a body
  if (!ctx.request.hasBody) {
    ctx.response.status = 400;
    ctx.response.body = { message: "No data provided" };
    return;
  }

  const body = await ctx.request.body.json();

  // Validate that both home and away scores are provided and are numbers
  if (!body.score || typeof body.score.home !== 'number' || typeof body.score.away !== 'number') {
    ctx.response.status = 400;
    ctx.response.body = { message: "Home and away scores are required and must be numbers" };
    return;
  }

  // Create new match object with provided data
  const match: Match = {
    ...body,
    status: 'FINISHED'  // Set status as FINISHED since scores are provided
  };

  // Insert the match into database and return created match
  await matches.insertOne(match);
  ctx.response.status = 201;
  ctx.response.body = match;
});

/**
 * GET /api/matches
 * Retrieves all matches from the database
 */
router.get("/api/matches", async (ctx) => {
  ctx.response.body = await matches.find({}).toArray();
});

/**
 * GET /api/matches/team/:teamId
 * Retrieves all matches for a specific team (either as home or away team)
 * @param teamId - The ID of the team to find matches for
 */
router.get("/api/matches/team/:teamId", async (ctx) => {
  const teamId = parseInt(ctx.params.teamId);
  // Find matches where the team is either home or away
  const teamMatches = await matches.find({
    $or: [
      { homeTeamId: teamId },
      { awayTeamId: teamId }
    ]
  }).toArray();

  if (teamMatches.length > 0) {
    ctx.response.body = teamMatches;
  } else {
    ctx.response.status = 404;
    ctx.response.body = { message: "No matches found for this team" };
  }
});

// Initialize the Oak application
const app = new Application();

/**
 * Logging Middleware
 * Logs details about each incoming request including:
 * - URL
 * - HTTP Method
 * - Headers
 * - URL Parameters
 */
app.use(async (ctx, next) => {
  log.info(
    `request: `,
    {
      url: ctx.request.url,
      method: ctx.request.method,
      headers: Object.fromEntries(ctx.request.headers.entries()),
      params: ctx.params || ''
     }
  );

  await next();
});

/**
 * CORS Middleware
 * Configures CORS policy for the application
 * Currently set to 'none' to disable CORS
 */
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "none");
  await next();
});

// Apply router middleware
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
