// Import necessary modules and functions
import { load } from "https://deno.land/std@0.204.0/dotenv/mod.ts";
import { connectToMongo } from "./database/mongo.ts";
import * as log from "jsr:@std/log";
import { GraphQLHTTP } from 'jsr:@deno-libs/gql@3.0.1'
import { makeExecutableSchema } from 'npm:@graphql-tools/schema@10.0.3'
import { gql } from 'https://deno.land/x/graphql_tag@0.1.2/mod.ts'

// Load environment variables from a .env file
await load({ export: true });

// Initialize database connection and get the teams and matches collections
let db = await connectToMongo();

const teams = db.collection<Team>("teams");
const matches = db.collection<Match>("matches");

// Define TypeScript interfaces for Team and Match
interface Team {
  _id: { $oid: string };
  name: string;
}

interface Match {
  _id: { $oid: string };
  homeTeamId: string;
  awayTeamId: string;
  date: Date;
  score: {
    home: number;
    away: number;
  };
}

// Define GraphQL schema using gql template literal
const typeDefs = gql`
  type Team {
    id: ID!
    name: String!
    stadiumName: String!
    matches: [Match!]
  }

  type Match {
    id: ID!
    homeTeam: Team!
    awayTeam: Team!
    date: String
    score: Score
    status: String
  }

  type Score {
    home: Int!
    away: Int!
  }

  type Query {
    teams: [Team!]!
    team(id: ID!): Team
    matches: [Match!]!
    match(id: ID!): Match
  }

  input TeamInput {
    name: String!
    stadiumName: String!
  }

  input ScoreInput {
    home: Int!
    away: Int!
  }

  input MatchInput {
    homeTeamId: ID!
    awayTeamId: ID!
    date: String
    score: ScoreInput
    status: String
  }

  type Mutation {
    createMatch(input: MatchInput!): Match!
    createTeam(input: TeamInput!): Team!
    updateTeam(id: ID!, input: TeamInput!): Team!
    updateMatch(id: ID!, input: MatchInput!): Match!
  }
`;

// Define resolvers for the GraphQL schema
const resolvers = {
  Query: {
    // Resolver for fetching all teams
    teams: async () => {
      log.info("Fetching all teams");
      const result = await teams.find().toArray();
      return result.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    },
    // Resolver for fetching a single team by ID
    team: async (_: unknown, { id }: { id: string }) => {
      log.info("Fetching team with ID:", id);
      const result = await teams.findOne({ _id: id });
      if (!result) return null;
      log.info("Found team:", result);
      return { id: result._id, ...result };
    },
    // Resolver for fetching all matches
    matches: async () => {
      const result = await matches.find().toArray();
      return result.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    },
    // Resolver for fetching a single match by ID
    match: async (_: unknown, { id }: { id: string }) => {
      const result = await matches.findOne({ _id: id });
      if (!result) return null;
      return { id: result._id, ...result };
    },
  },
  Mutation: {
    // Resolver for creating a new match
    createMatch: async (_: unknown, { input }: { input: Omit<Match, "_id"> }) => {
      try {
        const result = await matches.insertOne(input);
        return { id: result.toString(), ...input, status: "FINISHED", date: new Date() };
      } catch (error) {
        throw new Error(`Failed to create match: ${error.message}`);
      }
    },
  },
  Team: {
    // Resolver for fetching matches of a team
    matches: async (parent: { id: string }) => {
      const result = await matches.find({
        $or: [
          { homeTeamId: parent.id },
          { awayTeamId: parent.id },
        ],
      }).toArray();
      return result.map(({ _id, ...rest }) => ({ id: _id, ...rest }));
    },
  },
  Match: {
    // Resolver for fetching the home team of a match
    homeTeam: async (parent: { homeTeamId: string }) => {
      const team = await teams.findOne({ _id: parent.homeTeamId });
      if (!team) return null;
      return { id: team._id, ...team };
    },
    // Resolver for fetching the away team of a match
    awayTeam: async (parent: { awayTeamId: string }) => {
      const team = await teams.findOne({ _id: parent.awayTeamId });
      if (!team) return null;
      return { id: team._id, ...team };
    },
  },
};

// Create an executable schema from type definitions and resolvers
const schema = makeExecutableSchema({ typeDefs, resolvers });


// Middleware to handle GraphQL requests
Deno.serve({
  port: 8000,
  onListen({ hostname, port }) {
    console.log(`☁  Started on http://${hostname}:${port}`)
  },
}, async (req) => {
  const { pathname } = new URL(req.url)
  return pathname === '/graphql'
    ? await GraphQLHTTP<Request>({
      schema,
      graphiql: true,
    })(req)
    : new Response('Not Found', { status: 404 })
})
