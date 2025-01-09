// Import required dependencies for the application
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { connectToMongo } from "./database/mongo.ts";
import { Team } from "./types.ts";
import * as log from "jsr:@std/log";

// Initialize database connection and get the teams collection
const db = await connectToMongo();
const teams = db.collection<Team>("teams");

// Create a new router instance to handle different endpoints
const router = new Router();

// Configure logging setup with JSON formatter
// This will format all logs as JSON for better parsing
log.setup({
  handlers: {
    default: new log.ConsoleHandler("DEBUG", {
      formatter: log.formatters.jsonFormatter,
      useColors: false,
    }),
  },
});

/**
 * GET /api/teams
 * Retrieves all teams from the database
 * No parameters required
 */
router.get("/api/teams", async (ctx) => {
  ctx.response.body = await teams.find({}).toArray();
});


/**
 * GET /api/teams/by-ids
 * Retrieves multiple teams by their IDs
 * @param ids - Comma-separated list of team IDs (query parameter)
 * Example: /api/teams/by-ids?ids=1,2,3
 * @returns Array of team objects if found, 404 error if none found
 */
router.get("/api/teams/by-ids", async (ctx) => {
  const ids = ctx.request.url.searchParams.get("ids");

  if (!ids) {
    ctx.response.status = 400;
    ctx.response.body = { message: "No IDs provided" };
    return;
  }

  try {
    // Split the comma-separated IDs and remove whitespace
    const idArray = ids.split(",").map(id => id.trim());
    const teamsList = await teams.find({ _id: { $in: idArray } }).toArray();

    if (teamsList.length > 0) {
      ctx.response.body = teamsList;
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: "No teams found" };
    }
  } catch (e) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Invalid ID format" };
  }
});

/**
 * GET /api/teams/:id
 * Retrieves a single team by its ID
 * @param id - The unique identifier of the team
 * @returns The team object if found, 404 error if not found
 */
router.get("/api/teams/:id", async (ctx) => {
  try {
    const team = await teams.findOne({ _id: ctx.params.id });
    if (team) {
      ctx.response.body = team;
    } else {
      ctx.response.status = 404;
      ctx.response.body = { message: `Team with id ${ctx.params.id} not found` };
    }
  } catch (e) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Invalid ID format" };
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
 * This helps with debugging and monitoring API usage
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
 * Should be configured based on security requirements
 */
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "none");
  await next();
});

// Apply router middleware to handle API routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server on port 8000
console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
