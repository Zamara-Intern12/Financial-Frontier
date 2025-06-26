import {
  GamePlayer,
  InsertGamePlayer,
  GameScenario,
  InsertGameScenario,
  GamePlaySession,
  InsertGamePlaySession,
  GamePlayerResponse,
  InsertGamePlayerResponse,
  GameLeaderboard,
  InsertGameLeaderboard,
  GameSystemSettings,
  InsertGameSystemSettings,
  gamePlayers,
  gameScenarios,
  gamePlaySessions,
  gamePlayerResponses,
  gameLeaderboard,
  gameSystemSettings
} from "@shared/game-schema";
import { gameDb } from "./game-db";
import { eq, desc, asc, and, sql } from "drizzle-orm";

// Game Storage interface
export interface IGameStorage {
  // Player operations
  getPlayer(id: number): Promise<GamePlayer | undefined>;
  getPlayerByUsername(username: string): Promise<GamePlayer | undefined>;
  createPlayer(player: InsertGamePlayer): Promise<GamePlayer>;
  updatePlayer(id: number, player: Partial<GamePlayer>): Promise<GamePlayer | undefined>;
  getPlayersByTechLevel(techLevel: string): Promise<GamePlayer[]>;
  
  // Scenario operations
  getScenarios(): Promise<GameScenario[]>;
  getScenariosByTechLevel(techLevel: string): Promise<GameScenario[]>;
  getScenario(id: number): Promise<GameScenario | undefined>;
  createScenario(scenario: InsertGameScenario): Promise<GameScenario>;
  updateScenario(id: number, scenario: Partial<InsertGameScenario>): Promise<GameScenario | undefined>;
  deleteScenario(id: number): Promise<boolean>;
  
  // GameSession operations
  getGameSessions(): Promise<GamePlaySession[]>;
  getGameSessionsByPlayerId(playerId: number): Promise<GamePlaySession[]>;
  getGameSession(id: number): Promise<GamePlaySession | undefined>;
  createGameSession(session: InsertGamePlaySession): Promise<GamePlaySession>;
  updateGameSession(id: number, session: Partial<GamePlaySession>): Promise<GamePlaySession | undefined>;
  completeGameSession(id: number, totalScore: number): Promise<GamePlaySession | undefined>;
  
  // PlayerResponse operations
  getPlayerResponses(sessionId: number): Promise<GamePlayerResponse[]>;
  getPlayerResponse(id: number): Promise<GamePlayerResponse | undefined>;
  createPlayerResponse(response: InsertGamePlayerResponse): Promise<GamePlayerResponse>;
  
  // Leaderboard operations
  getLeaderboard(limit?: number): Promise<GameLeaderboard[]>;
  updateLeaderboardForPlayer(playerId: number): Promise<GameLeaderboard | undefined>;
  refreshLeaderboard(): Promise<void>;
  
  // Game settings operations
  getGameSettings(): Promise<GameSystemSettings>;
  updateGameSettings(settings: Partial<InsertGameSystemSettings>): Promise<GameSystemSettings>;
  
  // Initialize default data
  initializeDefaultData(): Promise<void>;
}

// Implementation with PostgreSQL database
export class GameStorage implements IGameStorage {
  constructor() {
    // Initialize default data on startup
    this.initializeDefaultData();
  }
  
  // Player operations
  async getPlayer(id: number): Promise<GamePlayer | undefined> {
    const [player] = await gameDb.select().from(gamePlayers).where(eq(gamePlayers.id, id));
    return player;
  }
  
  async getPlayerByUsername(username: string): Promise<GamePlayer | undefined> {
    const [player] = await gameDb.select().from(gamePlayers).where(eq(gamePlayers.username, username));
    return player;
  }
  
  async createPlayer(insertPlayer: InsertGamePlayer): Promise<GamePlayer> {
    const [player] = await gameDb.insert(gamePlayers).values(insertPlayer).returning();
    return player;
  }
  
  async updatePlayer(id: number, playerUpdate: Partial<GamePlayer>): Promise<GamePlayer | undefined> {
    const [updatedPlayer] = await gameDb
      .update(gamePlayers)
      .set(playerUpdate)
      .where(eq(gamePlayers.id, id))
      .returning();
    return updatedPlayer;
  }
  
  async getPlayersByTechLevel(techLevel: string): Promise<GamePlayer[]> {
    return gameDb.select().from(gamePlayers).where(eq(gamePlayers.techLevel, techLevel));
  }
  
  // Scenario operations
  async getScenarios(): Promise<GameScenario[]> {
    return gameDb.select().from(gameScenarios);
  }
  
  async getScenariosByTechLevel(techLevel: string): Promise<GameScenario[]> {
    return gameDb.select().from(gameScenarios).where(eq(gameScenarios.techLevel, techLevel));
  }
  
  async getScenario(id: number): Promise<GameScenario | undefined> {
    const [scenario] = await gameDb.select().from(gameScenarios).where(eq(gameScenarios.id, id));
    return scenario;
  }
  
  async createScenario(insertScenario: InsertGameScenario): Promise<GameScenario> {
    const [scenario] = await gameDb.insert(gameScenarios).values(insertScenario).returning();
    return scenario;
  }
  
  async updateScenario(id: number, scenarioUpdate: Partial<InsertGameScenario>): Promise<GameScenario | undefined> {
    const [updatedScenario] = await gameDb
      .update(gameScenarios)
      .set(scenarioUpdate)
      .where(eq(gameScenarios.id, id))
      .returning();
    return updatedScenario;
  }
  
  async deleteScenario(id: number): Promise<boolean> {
    const [deleted] = await gameDb.delete(gameScenarios).where(eq(gameScenarios.id, id)).returning();
    return !!deleted;
  }
  
  // GameSession operations
  async getGameSessions(): Promise<GamePlaySession[]> {
    return gameDb.select().from(gamePlaySessions);
  }
  
  async getGameSessionsByPlayerId(playerId: number): Promise<GamePlaySession[]> {
    return gameDb
      .select()
      .from(gamePlaySessions)
      .where(eq(gamePlaySessions.playerId, playerId))
      .orderBy(desc(gamePlaySessions.startTime));
  }
  
  async getGameSession(id: number): Promise<GamePlaySession | undefined> {
    const [session] = await gameDb.select().from(gamePlaySessions).where(eq(gamePlaySessions.id, id));
    return session;
  }
  
  async createGameSession(insertSession: InsertGamePlaySession): Promise<GamePlaySession> {
    const [session] = await gameDb.insert(gamePlaySessions).values(insertSession).returning();
    return session;
  }
  
  async updateGameSession(id: number, sessionUpdate: Partial<GamePlaySession>): Promise<GamePlaySession | undefined> {
    const [updatedSession] = await gameDb
      .update(gamePlaySessions)
      .set(sessionUpdate)
      .where(eq(gamePlaySessions.id, id))
      .returning();
    return updatedSession;
  }
  
  async completeGameSession(id: number, totalScore: number): Promise<GamePlaySession | undefined> {
    const [completedSession] = await gameDb
      .update(gamePlaySessions)
      .set({
        isCompleted: true,
        endTime: new Date(),
        totalScore
      })
      .where(eq(gamePlaySessions.id, id))
      .returning();
    
    if (completedSession) {
      // Update player's total points
      await gameDb.execute(sql`
        UPDATE game_players
        SET total_points = total_points + ${totalScore}
        WHERE id = ${completedSession.playerId}
      `);
      
      // Update leaderboard
      await this.updateLeaderboardForPlayer(completedSession.playerId);
    }
    
    return completedSession;
  }
  
  // PlayerResponse operations
  async getPlayerResponses(sessionId: number): Promise<GamePlayerResponse[]> {
    return gameDb
      .select()
      .from(gamePlayerResponses)
      .where(eq(gamePlayerResponses.sessionId, sessionId))
      .orderBy(asc(gamePlayerResponses.timestamp));
  }
  
  async getPlayerResponse(id: number): Promise<GamePlayerResponse | undefined> {
    const [response] = await gameDb.select().from(gamePlayerResponses).where(eq(gamePlayerResponses.id, id));
    return response;
  }
  
  async createPlayerResponse(insertResponse: InsertGamePlayerResponse): Promise<GamePlayerResponse> {
    const [response] = await gameDb.insert(gamePlayerResponses).values(insertResponse).returning();
    return response;
  }
  
  // Leaderboard operations
  async getLeaderboard(limit: number = 100): Promise<GameLeaderboard[]> {
    return gameDb
      .select()
      .from(gameLeaderboard)
      .orderBy(asc(gameLeaderboard.rank))
      .limit(limit);
  }
  
  async updateLeaderboardForPlayer(playerId: number): Promise<GameLeaderboard | undefined> {
    // Get the player
    const [player] = await gameDb.select().from(gamePlayers).where(eq(gamePlayers.id, playerId));
    if (!player) return undefined;
    
    // Count games played
    const [gamesResult] = await gameDb
      .select({ count: sql<number>`count(*)` })
      .from(gamePlaySessions)
      .where(and(
        eq(gamePlaySessions.playerId, playerId),
        eq(gamePlaySessions.isCompleted, true)
      ));
    
    const gamesPlayed = gamesResult?.count || 0;
    
    // Check if player already exists in leaderboard
    const [existingEntry] = await gameDb
      .select()
      .from(gameLeaderboard)
      .where(eq(gameLeaderboard.playerId, playerId));
    
    if (existingEntry) {
      // Update existing entry
      const [updated] = await gameDb
        .update(gameLeaderboard)
        .set({
          totalPoints: player.totalPoints,
          techLevel: player.techLevel,
          gamesPlayed,
          lastUpdated: new Date()
        })
        .where(eq(gameLeaderboard.playerId, playerId))
        .returning();
      
      // Refresh ranks
      await this.recalculateRanks();
      
      // Get updated entry with new rank
      const [refreshed] = await gameDb
        .select()
        .from(gameLeaderboard)
        .where(eq(gameLeaderboard.playerId, playerId));
      
      return refreshed;
    } else {
      // Create new entry
      const [newEntry] = await gameDb
        .insert(gameLeaderboard)
        .values({
          playerId: player.id,
          username: player.username,
          avatar: player.avatar,
          totalPoints: player.totalPoints,
          techLevel: player.techLevel,
          rank: 999, // Temporary rank, will be updated by recalculateRanks
          gamesPlayed,
          lastUpdated: new Date()
        })
        .returning();
      
      // Refresh ranks
      await this.recalculateRanks();
      
      // Get updated entry with new rank
      const [refreshed] = await gameDb
        .select()
        .from(gameLeaderboard)
        .where(eq(gameLeaderboard.playerId, playerId));
      
      return refreshed;
    }
  }
  
  async refreshLeaderboard(): Promise<void> {
    // Clear the leaderboard
    await gameDb.delete(gameLeaderboard);
    
    // Get all players
    const allPlayers = await gameDb.select().from(gamePlayers);
    
    // Create leaderboard entries for all players
    for (const player of allPlayers) {
      // Count games played
      const [gamesResult] = await gameDb
        .select({ count: sql<number>`count(*)` })
        .from(gamePlaySessions)
        .where(and(
          eq(gamePlaySessions.playerId, player.id),
          eq(gamePlaySessions.isCompleted, true)
        ));
      
      const gamesPlayed = gamesResult?.count || 0;
      
      // Insert new leaderboard entry
      await gameDb
        .insert(gameLeaderboard)
        .values({
          playerId: player.id,
          username: player.username,
          avatar: player.avatar,
          totalPoints: player.totalPoints,
          techLevel: player.techLevel,
          rank: 999, // Temporary rank, will be updated by recalculateRanks
          gamesPlayed,
          lastUpdated: new Date()
        });
    }
    
    // Recalculate ranks
    await this.recalculateRanks();
  }
  
  private async recalculateRanks(): Promise<void> {
    // Get all leaderboard entries sorted by total points
    const entries = await gameDb
      .select()
      .from(gameLeaderboard)
      .orderBy(desc(gameLeaderboard.totalPoints));
    
    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      await gameDb
        .update(gameLeaderboard)
        .set({ rank: i + 1 })
        .where(eq(gameLeaderboard.id, entries[i].id));
    }
  }
  
  // Game settings operations
  async getGameSettings(): Promise<GameSystemSettings> {
    const [settings] = await gameDb.select().from(gameSystemSettings);
    
    if (settings) {
      return settings;
    } else {
      // Create default settings
      const defaultSettings: InsertGameSystemSettings = {
        scenariosPerGame: 5,
        difficultyProgression: true,
        leaderboardSize: 100,
        timeLimit: 60
      };
      
      const [newSettings] = await gameDb
        .insert(gameSystemSettings)
        .values(defaultSettings)
        .returning();
      
      return newSettings;
    }
  }
  
  async updateGameSettings(settingsUpdate: Partial<InsertGameSystemSettings>): Promise<GameSystemSettings> {
    // Get existing settings or create default
    const currentSettings = await this.getGameSettings();
    
    const [updatedSettings] = await gameDb
      .update(gameSystemSettings)
      .set({
        ...settingsUpdate,
        lastUpdated: new Date()
      })
      .where(eq(gameSystemSettings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }
  
  // Initialize default data
  async initializeDefaultData(): Promise<void> {
    try {
      // Create default settings if they don't exist
      await this.getGameSettings();
      
      // Create default scenarios if none exist
      const existingScenarios = await this.getScenarios();
      if (existingScenarios.length === 0) {
        await this.createDefaultScenarios();
      }
      
      // Create default admin player if none exists
      const adminPlayer = await this.getPlayerByUsername("admin");
      if (!adminPlayer) {
        await this.createPlayer({
          username: "admin",
          password: "admin123", // This should be properly hashed in production
          avatar: "🎩",
          techLevel: "advanced"
        });
      }
      
      // Refresh the leaderboard
      const leaderboardEntries = await this.getLeaderboard();
      if (leaderboardEntries.length === 0) {
        await this.refreshLeaderboard();
      }
      
      console.log("Game data initialized successfully");
    } catch (error) {
      console.error("Error initializing game data:", error);
    }
  }
  
  // Create default scenarios
  private async createDefaultScenarios(): Promise<void> {
    // Default scenarios for Asset Boardroom League
    const defaultScenarios: InsertGameScenario[] = [
      {
        question: "A client's liability profile has shifted due to macroeconomic disruptions. You're leading the actuarial consulting review. What's the best action?",
        options: JSON.stringify([
          "Perform a complete asset-liability modeling simulation with Monte Carlo stress paths.",
          "Freeze liability assumptions for this quarter and focus on peer benchmarking.",
          "Use a proxy model while awaiting market stabilization."
        ]),
        scores: JSON.stringify([5, 0, 2]),
        techLevel: "advanced",
        category: "risk",
        explanation: "A complete asset-liability modeling simulation provides the most comprehensive risk assessment during macroeconomic disruptions, allowing for better decision-making despite the complexity and resources required."
      },
      {
        question: "Your company is considering expanding its investment portfolio to include cryptocurrency assets. As the financial advisor, what would you recommend?",
        options: JSON.stringify([
          "Allocate a conservative 5% of the portfolio to diversified cryptocurrency assets with strict risk management protocols.",
          "Avoid cryptocurrency entirely due to regulatory uncertainty and volatility risks.",
          "Invest 20% of the portfolio in leading cryptocurrencies to maximize potential returns."
        ]),
        scores: JSON.stringify([5, 2, 0]),
        techLevel: "intermediate",
        category: "investment",
        explanation: "A small allocation (5%) to cryptocurrency provides exposure to potential growth while minimizing risk. Complete avoidance misses diversification benefits, while a 20% allocation represents excessive concentration risk."
      },
      {
        question: "Your firm needs to value a complex derivative instrument for quarterly reporting. What approach should you take?",
        options: JSON.stringify([
          "Use a third-party valuation service and validate key assumptions internally.",
          "Develop a proprietary model regardless of time constraints to maintain full control.",
          "Apply the valuation from the counterparty to save resources."
        ]),
        scores: JSON.stringify([5, 2, 0]),
        techLevel: "advanced",
        category: "compliance",
        explanation: "Using a specialized third-party service with internal validation combines efficiency with appropriate oversight. Developing proprietary models is ideal but impractical under time constraints, while relying solely on counterparty valuations creates conflicts of interest."
      },
      {
        question: "A major client's long-term investment goals are at risk due to recent market volatility. What action should you take?",
        options: JSON.stringify([
          "Conduct a comprehensive risk assessment and present multiple adjustment scenarios with probability analyses.",
          "Recommend temporarily moving to cash positions until market stabilizes.",
          "Stay the course with the original investment strategy to avoid locking in losses."
        ]),
        scores: JSON.stringify([5, 0, 2]),
        techLevel: "intermediate",
        category: "investment",
        explanation: "Presenting multiple scenarios with probability analyses provides the client with informed choices. Moving to cash might miss recovery opportunities, while staying the course without reassessment ignores changed circumstances."
      },
      {
        question: "Your company faces a liquidity constraint in the next quarter. As CFO, what would you prioritize?",
        options: JSON.stringify([
          "Implement a detailed cash flow forecasting system with daily monitoring and scenario planning.",
          "Immediately secure additional debt financing regardless of terms.",
          "Delay capital expenditures and vendor payments without strategic prioritization."
        ]),
        scores: JSON.stringify([5, 0, 2]),
        techLevel: "beginner",
        category: "liquidity",
        explanation: "Detailed cash flow forecasting with monitoring gives visibility and control. Rushing into debt without analysis may worsen financial position, while blanket delays without strategic assessment can damage relationships and operations."
      }
    ];
    
    // Create each scenario
    for (const scenario of defaultScenarios) {
      await this.createScenario(scenario);
    }
    
    console.log(`Created ${defaultScenarios.length} default scenarios`);
  }
}

// Export singleton instance
export const gameStorage = new GameStorage();