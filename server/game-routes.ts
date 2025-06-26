import { Express, Request, Response } from "express";
import { Server } from "http";
import { gameStorage } from "./game-storage";

export async function registerGameRoutes(app: Express): Promise<void> {
  // Player routes
  app.post("/api/game/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const player = await gameStorage.getPlayerByUsername(username);
      
      if (!player || player.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Update last login time
      await gameStorage.updatePlayer(player.id, {
        lastLogin: new Date()
      });
      
      // Don't send password back to client
      const { password: _, ...playerWithoutPassword } = player;
      
      res.json(playerWithoutPassword);
    } catch (error) {
      console.error("Error in player login:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/game/register", async (req: Request, res: Response) => {
    try {
      const { username, password, avatar, techLevel } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      // Check if username exists
      const existingPlayer = await gameStorage.getPlayerByUsername(username);
      if (existingPlayer) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Create new player
      const player = await gameStorage.createPlayer({
        username,
        password,
        avatar: avatar || "🧑", // Default avatar if none provided
        techLevel: techLevel || "beginner" // Default tech level if none provided
      });
      
      // Update leaderboard
      await gameStorage.updateLeaderboardForPlayer(player.id);
      
      // Don't send password back to client
      const { password: _, ...playerWithoutPassword } = player;
      
      res.status(201).json(playerWithoutPassword);
    } catch (error) {
      console.error("Error in player registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/game/players/top", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboardEntries = await gameStorage.getLeaderboard(limit);
      res.json(leaderboardEntries);
    } catch (error) {
      console.error("Error getting top players:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/game/players/:id", async (req: Request, res: Response) => {
    try {
      const playerId = parseInt(req.params.id);
      const player = await gameStorage.getPlayer(playerId);
      
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Don't send password back to client
      const { password, ...playerWithoutPassword } = player;
      
      res.json(playerWithoutPassword);
    } catch (error) {
      console.error("Error getting player:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.put("/api/game/players/:id", async (req: Request, res: Response) => {
    try {
      const playerId = parseInt(req.params.id);
      const { avatar, techLevel } = req.body;
      
      // Don't allow password updates through this endpoint
      const updateData: Partial<any> = {};
      if (avatar) updateData.avatar = avatar;
      if (techLevel) updateData.techLevel = techLevel;
      
      const updatedPlayer = await gameStorage.updatePlayer(playerId, updateData);
      
      if (!updatedPlayer) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Update leaderboard with new player data
      await gameStorage.updateLeaderboardForPlayer(playerId);
      
      // Don't send password back to client
      const { password, ...playerWithoutPassword } = updatedPlayer;
      
      res.json(playerWithoutPassword);
    } catch (error) {
      console.error("Error updating player:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Scenario routes
  app.get("/api/game/scenarios", async (req: Request, res: Response) => {
    try {
      const techLevel = req.query.techLevel as string;
      
      if (techLevel) {
        const scenarios = await gameStorage.getScenariosByTechLevel(techLevel);
        res.json(scenarios);
      } else {
        const scenarios = await gameStorage.getScenarios();
        res.json(scenarios);
      }
    } catch (error) {
      console.error("Error getting scenarios:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/game/scenarios/:id", async (req: Request, res: Response) => {
    try {
      const scenarioId = parseInt(req.params.id);
      const scenario = await gameStorage.getScenario(scenarioId);
      
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      
      res.json(scenario);
    } catch (error) {
      console.error("Error getting scenario:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/game/scenarios", async (req: Request, res: Response) => {
    try {
      const { question, options, scores, techLevel, category, explanation } = req.body;
      
      if (!question || !options || !scores || !techLevel || !category || !explanation) {
        return res.status(400).json({ error: "All scenario fields are required" });
      }
      
      const newScenario = await gameStorage.createScenario({
        question,
        options: typeof options === 'string' ? options : JSON.stringify(options),
        scores: typeof scores === 'string' ? scores : JSON.stringify(scores),
        techLevel,
        category,
        explanation
      });
      
      res.status(201).json(newScenario);
    } catch (error) {
      console.error("Error creating scenario:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Game session routes
  app.post("/api/game/sessions", async (req: Request, res: Response) => {
    try {
      const { playerId, techLevel, scenariosPlayed } = req.body;
      
      if (!playerId || !techLevel || !scenariosPlayed) {
        return res.status(400).json({ error: "PlayerId, techLevel, and scenariosPlayed are required" });
      }
      
      const newSession = await gameStorage.createGameSession({
        playerId,
        techLevel,
        scenariosPlayed: typeof scenariosPlayed === 'string' ? scenariosPlayed : JSON.stringify(scenariosPlayed),
      });
      
      res.status(201).json(newSession);
    } catch (error) {
      console.error("Error creating game session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/game/sessions/player/:playerId", async (req: Request, res: Response) => {
    try {
      const playerId = parseInt(req.params.playerId);
      const sessions = await gameStorage.getGameSessionsByPlayerId(playerId);
      res.json(sessions);
    } catch (error) {
      console.error("Error getting player game sessions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/game/sessions/:id/complete", async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { totalScore } = req.body;
      
      if (totalScore === undefined) {
        return res.status(400).json({ error: "Total score is required" });
      }
      
      const completedSession = await gameStorage.completeGameSession(sessionId, totalScore);
      
      if (!completedSession) {
        return res.status(404).json({ error: "Game session not found" });
      }
      
      res.json(completedSession);
    } catch (error) {
      console.error("Error completing game session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Player response routes
  app.post("/api/game/responses", async (req: Request, res: Response) => {
    try {
      const { sessionId, scenarioId, playerId, selectedOption, pointsEarned, responseTime } = req.body;
      
      if (!sessionId || !scenarioId || !playerId || selectedOption === undefined || pointsEarned === undefined) {
        return res.status(400).json({ error: "All required response fields must be provided" });
      }
      
      const newResponse = await gameStorage.createPlayerResponse({
        sessionId,
        scenarioId,
        playerId,
        selectedOption,
        pointsEarned,
        responseTime
      });
      
      res.status(201).json(newResponse);
    } catch (error) {
      console.error("Error creating player response:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.get("/api/game/responses/session/:sessionId", async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const responses = await gameStorage.getPlayerResponses(sessionId);
      res.json(responses);
    } catch (error) {
      console.error("Error getting session responses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Leaderboard routes
  app.get("/api/game/leaderboard", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const leaderboardData = await gameStorage.getLeaderboard(limit);
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.post("/api/game/leaderboard/refresh", async (req: Request, res: Response) => {
    try {
      await gameStorage.refreshLeaderboard();
      const leaderboardData = await gameStorage.getLeaderboard();
      res.json(leaderboardData);
    } catch (error) {
      console.error("Error refreshing leaderboard:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Game settings routes
  app.get("/api/game/settings", async (req: Request, res: Response) => {
    try {
      const settings = await gameStorage.getGameSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error getting game settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.put("/api/game/settings", async (req: Request, res: Response) => {
    try {
      const { scenariosPerGame, difficultyProgression, leaderboardSize, timeLimit } = req.body;
      
      const updateData: Record<string, any> = {};
      if (scenariosPerGame !== undefined) updateData.scenariosPerGame = scenariosPerGame;
      if (difficultyProgression !== undefined) updateData.difficultyProgression = difficultyProgression;
      if (leaderboardSize !== undefined) updateData.leaderboardSize = leaderboardSize;
      if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
      
      const updatedSettings = await gameStorage.updateGameSettings(updateData);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating game settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}