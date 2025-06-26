// This script manually pushes the game schema to the database
// Used as a workaround since we can't modify drizzle.config.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
// Can't import from game-schema directly with ES modules due to TypeScript
// Will use direct SQL instead

async function main() {
  console.log('Pushing game schema to database...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    // Create tables in order
    console.log('Creating game_players table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_players (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        avatar TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        tech_level TEXT DEFAULT 'beginner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `;
    
    console.log('Creating game_scenarios table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_scenarios (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        scores JSONB NOT NULL,
        tech_level TEXT NOT NULL,
        category TEXT NOT NULL,
        explanation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Creating game_play_sessions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_play_sessions (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        total_score INTEGER DEFAULT 0,
        scenarios_played JSONB NOT NULL,
        tech_level TEXT NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        is_completed BOOLEAN DEFAULT FALSE
      )
    `;
    
    console.log('Creating game_player_responses table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_player_responses (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        scenario_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        selected_option INTEGER NOT NULL,
        points_earned INTEGER NOT NULL,
        response_time INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Creating game_leaderboard table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_leaderboard (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL UNIQUE,
        username TEXT NOT NULL,
        avatar TEXT NOT NULL,
        total_points INTEGER NOT NULL,
        tech_level TEXT NOT NULL,
        rank INTEGER NOT NULL,
        games_played INTEGER NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Creating game_system_settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS game_system_settings (
        id SERIAL PRIMARY KEY,
        scenarios_per_game INTEGER NOT NULL DEFAULT 5,
        difficulty_progression BOOLEAN NOT NULL DEFAULT TRUE,
        leaderboard_size INTEGER NOT NULL DEFAULT 100,
        time_limit INTEGER NOT NULL DEFAULT 60,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('Done pushing game schema!');
  } catch (error) {
    console.error('Error pushing game schema:', error);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);