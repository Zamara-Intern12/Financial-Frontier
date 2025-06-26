var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import dotenv from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  backups: () => backups,
  gameSessions: () => gameSessions,
  insertBackupSchema: () => insertBackupSchema,
  insertGameSessionSchema: () => insertGameSessionSchema,
  insertPlayerResponseSchema: () => insertPlayerResponseSchema,
  insertProposalSchema: () => insertProposalSchema,
  insertScenarioSchema: () => insertScenarioSchema,
  insertSettingsSchema: () => insertSettingsSchema,
  insertTemplateSchema: () => insertTemplateSchema,
  insertUserSchema: () => insertUserSchema,
  playerResponses: () => playerResponses,
  proposals: () => proposals,
  scenarios: () => scenarios,
  settings: () => settings,
  templates: () => templates,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar"),
  // Avatar emoji for the player
  totalPoints: integer("total_points").default(0),
  // Total accumulated points
  techLevel: text("tech_level").default("beginner"),
  // Technicality level: beginner, intermediate, advanced
  createdAt: timestamp("created_at").defaultNow(),
  // When the user was created
  lastLogin: timestamp("last_login")
  // Last login timestamp
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatar: true
});
var scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  // Scenario description
  options: jsonb("options").notNull(),
  // Array of possible options
  scores: jsonb("scores").notNull(),
  // Corresponding points for each option
  techLevel: text("tech_level").notNull(),
  // Difficulty level: beginner, intermediate, advanced
  category: text("category").notNull(),
  // Financial category: investment, risk, compliance, etc.
  createdAt: timestamp("created_at").defaultNow()
});
var insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
  createdAt: true
});
var gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // User who played the game
  totalScore: integer("total_score").notNull(),
  // Total score for this session
  scenariosPlayed: jsonb("scenarios_played").notNull(),
  // Array of scenario IDs played
  techLevel: text("tech_level").notNull(),
  // Difficulty level played
  startTime: timestamp("start_time").notNull(),
  // When the session started
  endTime: timestamp("end_time"),
  // When the session ended
  isCompleted: boolean("is_completed").default(false)
  // Whether the session was completed
});
var insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  endTime: true,
  isCompleted: true
});
var playerResponses = pgTable("player_responses", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  // Game session ID
  scenarioId: integer("scenario_id").notNull(),
  // Scenario ID
  userId: integer("user_id").notNull(),
  // User who responded
  selectedOption: integer("selected_option").notNull(),
  // Index of the selected option (0-based)
  pointsEarned: integer("points_earned").notNull(),
  // Points earned for this response
  responseTime: integer("response_time"),
  // Time taken to respond in seconds
  timestamp: timestamp("timestamp").defaultNow()
  // When the response was recorded
});
var insertPlayerResponseSchema = createInsertSchema(playerResponses).omit({
  id: true,
  timestamp: true
});
var templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  content: jsonb("content").notNull(),
  // Structure for the template content
  icon: text("icon").notNull(),
  // Icon class name
  color: text("color").notNull(),
  // Color theme for template
  createdAt: timestamp("created_at").defaultNow()
});
var insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true
});
var proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  clientName: text("client_name").notNull(),
  status: text("status").notNull(),
  // "draft", "sent", "approved", "rejected"
  templateId: integer("template_id").notNull(),
  content: jsonb("content").notNull(),
  // The actual proposal content
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // "automatic" or "manual"
  size: text("size").notNull(),
  // Size of the backup in a readable format
  data: jsonb("data").notNull(),
  // Backup data (all proposals and templates)
  createdAt: timestamp("created_at").defaultNow()
});
var insertBackupSchema = createInsertSchema(backups).omit({
  id: true,
  createdAt: true
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  backupTime: text("backup_time").notNull().default("23:00"),
  // Time for daily backups
  backupEnabled: boolean("backup_enabled").notNull().default(true),
  maxBackups: integer("max_backups").notNull().default(30),
  // Maximum number of backups to keep
  companyName: text("company_name").notNull().default("Your Company"),
  companyLogo: text("company_logo"),
  companyAddress: text("company_address"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone")
});
var insertSettingsSchema = createInsertSchema(settings).omit({
  id: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql } from "drizzle-orm";
var DatabaseStorage = class {
  constructor() {
    this.initializeDefaults();
  }
  // Initialize the database with default data
  async initializeDefaults() {
    try {
      const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
      if (!userCount || userCount.count === 0) {
        await db.insert(users).values({
          username: "admin",
          password: "admin"
          // In real app, this would be hashed
        });
      }
      const [templateCount] = await db.select({ count: sql`count(*)` }).from(templates);
      if (!templateCount || templateCount.count === 0) {
        await this.initializeDefaultTemplates();
      }
      const [settingsCount] = await db.select({ count: sql`count(*)` }).from(settings);
      if (!settingsCount || settingsCount.count === 0) {
        await db.insert(settings).values({
          backupTime: "23:00",
          backupEnabled: true,
          maxBackups: 30,
          companyName: "Your Company",
          companyLogo: "",
          companyAddress: "",
          companyEmail: "",
          companyPhone: ""
        });
      }
      const [proposalCount] = await db.select({ count: sql`count(*)` }).from(proposals);
      if (!proposalCount || proposalCount.count === 0) {
        await this.createSampleProposals();
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }
  // Initialize default templates
  async initializeDefaultTemplates() {
    const defaultTemplates = [
      {
        name: "Executive Proposal",
        description: "Professional template for executive-level business proposals.",
        icon: "file-contract",
        color: "primary",
        content: {
          sections: [
            {
              title: "Executive Summary",
              content: "Outline the main points of your proposal here."
            },
            {
              title: "Project Overview",
              content: "Describe the project in detail."
            },
            {
              title: "Timeline",
              content: "Define the project timeline."
            },
            {
              title: "Budget",
              content: "Outline the budget details."
            },
            {
              title: "Team",
              content: "Introduce the team members."
            }
          ]
        }
      },
      {
        name: "HR Service Agreement",
        description: "Detailed template for HR service and outsourcing agreements.",
        icon: "handshake",
        color: "secondary",
        content: {
          sections: [
            {
              title: "Service Overview",
              content: "Describe the HR services to be provided."
            },
            {
              title: "Scope of Work",
              content: "Define the scope of the HR services."
            },
            {
              title: "Deliverables",
              content: "List all deliverables."
            },
            {
              title: "Timeline",
              content: "Define the service timeline."
            },
            {
              title: "Costs & Payment Terms",
              content: "Outline the cost and payment structure."
            }
          ]
        }
      },
      {
        name: "Recruitment Proposal",
        description: "Specialized template for recruitment and talent acquisition proposals.",
        icon: "users",
        color: "accent",
        content: {
          sections: [
            {
              title: "Recruitment Strategy",
              content: "Outline the recruitment strategy."
            },
            {
              title: "Candidate Profile",
              content: "Define the ideal candidate profile."
            },
            {
              title: "Selection Process",
              content: "Describe the selection process."
            },
            {
              title: "Timeline",
              content: "Define the recruitment timeline."
            },
            {
              title: "Fees & Terms",
              content: "Outline the fees and terms of service."
            }
          ]
        }
      },
      {
        name: "Training Program",
        description: "Comprehensive template for training and development program proposals.",
        icon: "graduation-cap",
        color: "neutral-300",
        content: {
          sections: [
            {
              title: "Training Needs Analysis",
              content: "Describe the identified training needs."
            },
            {
              title: "Program Structure",
              content: "Outline the training program structure."
            },
            {
              title: "Learning Objectives",
              content: "Define the learning objectives."
            },
            {
              title: "Delivery Method",
              content: "Describe how the training will be delivered."
            },
            {
              title: "Evaluation Method",
              content: "Outline how the training will be evaluated."
            }
          ]
        }
      }
    ];
    for (const template of defaultTemplates) {
      await db.insert(templates).values({
        ...template,
        createdAt: /* @__PURE__ */ new Date()
      });
    }
  }
  // Create sample proposals
  async createSampleProposals() {
    try {
      const templatesList = await db.select({ id: templates.id }).from(templates).limit(4);
      if (templatesList.length === 0) return;
      const sampleProposals = [
        {
          title: "Executive Recruitment Plan",
          clientName: "Acme Corporation",
          status: "approved",
          templateId: templatesList[0]?.id || 1,
          content: {
            sections: [
              {
                title: "Executive Summary",
                content: "This proposal outlines our executive recruitment strategy for Acme Corporation's leadership positions."
              },
              {
                title: "Project Overview",
                content: "We will recruit for 3 executive positions: CTO, CFO, and CMO."
              }
            ],
            clientDetails: {
              name: "Acme Corporation",
              contactPerson: "John Smith",
              email: "john@acme.com",
              phone: "123-456-7890"
            }
          }
        },
        {
          title: "HR Software Implementation",
          clientName: "Tech Innovators Inc.",
          status: "sent",
          templateId: templatesList[1]?.id || 1,
          content: {
            sections: [
              {
                title: "Service Overview",
                content: "Implementation of comprehensive HR management software."
              },
              {
                title: "Scope of Work",
                content: "Software setup, data migration, and staff training."
              }
            ],
            clientDetails: {
              name: "Tech Innovators Inc.",
              contactPerson: "Lisa Johnson",
              email: "lisa@techinnovators.com",
              phone: "987-654-3210"
            }
          }
        },
        {
          title: "Leadership Training Program",
          clientName: "Global Enterprises Ltd.",
          status: "draft",
          templateId: templatesList[3]?.id || 1,
          content: {
            sections: [
              {
                title: "Training Needs Analysis",
                content: "Based on our assessment, mid-level managers need leadership development."
              },
              {
                title: "Program Structure",
                content: "12-week program with weekly sessions and practical assignments."
              }
            ],
            clientDetails: {
              name: "Global Enterprises Ltd.",
              contactPerson: "Robert Chen",
              email: "robert@globalenterprises.com",
              phone: "555-123-4567"
            }
          }
        },
        {
          title: "Onboarding System Redesign",
          clientName: "NextGen Startups",
          status: "rejected",
          templateId: templatesList[1]?.id || 1,
          content: {
            sections: [
              {
                title: "Service Overview",
                content: "Complete redesign of employee onboarding process and systems."
              },
              {
                title: "Scope of Work",
                content: "Process mapping, technology evaluation, and implementation."
              }
            ],
            clientDetails: {
              name: "NextGen Startups",
              contactPerson: "Sarah Miller",
              email: "sarah@nextgenstartups.com",
              phone: "333-444-5555"
            }
          }
        }
      ];
      const now = /* @__PURE__ */ new Date();
      for (const proposal of sampleProposals) {
        await db.insert(proposals).values({
          ...proposal,
          createdAt: now,
          updatedAt: now
        });
      }
    } catch (error) {
      console.error("Error creating sample proposals:", error);
    }
  }
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Template operations
  async getTemplates() {
    return db.select().from(templates);
  }
  async getTemplate(id) {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }
  async createTemplate(insertTemplate) {
    const now = /* @__PURE__ */ new Date();
    const [template] = await db.insert(templates).values({
      ...insertTemplate,
      createdAt: now
    }).returning();
    return template;
  }
  async updateTemplate(id, template) {
    const [updatedTemplate] = await db.update(templates).set(template).where(eq(templates.id, id)).returning();
    return updatedTemplate;
  }
  async deleteTemplate(id) {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return !!result;
  }
  // Proposal operations
  async getProposals() {
    return db.select().from(proposals).orderBy(desc(proposals.createdAt));
  }
  async getProposal(id) {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }
  async createProposal(insertProposal) {
    const now = /* @__PURE__ */ new Date();
    const [proposal] = await db.insert(proposals).values({
      ...insertProposal,
      createdAt: now,
      updatedAt: now
    }).returning();
    return proposal;
  }
  async updateProposal(id, proposal) {
    const now = /* @__PURE__ */ new Date();
    const [updatedProposal] = await db.update(proposals).set({
      ...proposal,
      updatedAt: now
    }).where(eq(proposals.id, id)).returning();
    return updatedProposal;
  }
  async deleteProposal(id) {
    const result = await db.delete(proposals).where(eq(proposals.id, id));
    return !!result;
  }
  // Backup operations
  async getBackups() {
    return db.select().from(backups).orderBy(desc(backups.createdAt));
  }
  async getBackup(id) {
    const [backup] = await db.select().from(backups).where(eq(backups.id, id));
    return backup;
  }
  async createBackup(insertBackup) {
    const templatesList = await this.getTemplates();
    const proposalsList = await this.getProposals();
    const backupData = {
      templates: templatesList,
      proposals: proposalsList
    };
    const dataString = JSON.stringify(backupData);
    const sizeInBytes = Buffer.byteLength(dataString, "utf8");
    const sizeFormatted = this.formatSize(sizeInBytes);
    const [backup] = await db.insert(backups).values({
      ...insertBackup,
      size: sizeFormatted,
      data: backupData,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    await this.enforceBackupRetention();
    return backup;
  }
  formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(2) + " KB";
    const mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(2) + " MB";
    const gb = mb / 1024;
    return gb.toFixed(2) + " GB";
  }
  async enforceBackupRetention() {
    try {
      const currentSettings = await this.getSettings();
      const backupsList = await this.getBackups();
      if (backupsList.length > currentSettings.maxBackups) {
        const sortedBackups = backupsList.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
        const backupsToDelete = sortedBackups.slice(0, backupsList.length - currentSettings.maxBackups);
        for (const backupToDelete of backupsToDelete) {
          await this.deleteBackup(backupToDelete.id);
        }
      }
    } catch (error) {
      console.error("Error enforcing backup retention policy:", error);
    }
  }
  async deleteBackup(id) {
    const result = await db.delete(backups).where(eq(backups.id, id));
    return !!result;
  }
  async restoreBackup(id) {
    try {
      const backup = await this.getBackup(id);
      if (!backup || !backup.data) {
        return false;
      }
      const backupData = typeof backup.data === "string" ? JSON.parse(backup.data) : backup.data;
      return await db.transaction(async (tx) => {
        if (backupData.templates && Array.isArray(backupData.templates)) {
          await tx.delete(templates);
          for (const template of backupData.templates) {
            const { id: id2, ...templateData } = template;
            await tx.insert(templates).values({
              ...templateData,
              id: id2
              // Keep the original ID for integrity
            });
          }
        }
        if (backupData.proposals && Array.isArray(backupData.proposals)) {
          await tx.delete(proposals);
          for (const proposal of backupData.proposals) {
            const { id: id2, ...proposalData } = proposal;
            await tx.insert(proposals).values({
              ...proposalData,
              id: id2
              // Keep the original ID for integrity
            });
          }
        }
        return true;
      });
    } catch (error) {
      console.error("Error restoring from backup:", error);
      return false;
    }
  }
  // Settings operations
  async getSettings() {
    const [settingsData] = await db.select().from(settings).limit(1);
    if (!settingsData) {
      const defaultSettings = {
        backupTime: "23:00",
        backupEnabled: true,
        maxBackups: 30,
        companyName: "Your Company",
        companyLogo: "",
        companyAddress: "",
        companyEmail: "",
        companyPhone: ""
      };
      const [newSettings] = await db.insert(settings).values(defaultSettings).returning();
      return newSettings;
    }
    return settingsData;
  }
  async updateSettings(settingsUpdate) {
    const currentSettings = await this.getSettings();
    const [updatedSettings] = await db.update(settings).set(settingsUpdate).where(eq(settings.id, currentSettings.id)).returning();
    return updatedSettings;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";
import schedule from "node-schedule";
async function registerRoutes(app2) {
  setupAutomaticBackups();
  app2.get("/api/templates", async (req, res) => {
    try {
      const templates2 = await storage.getTemplates();
      res.json(templates2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });
  app2.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });
  app2.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const newTemplate = await storage.createTemplate(validatedData);
      res.status(201).json(newTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create template" });
    }
  });
  app2.put("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const validatedData = insertTemplateSchema.partial().parse(req.body);
      const updatedTemplate = await storage.updateTemplate(id, validatedData);
      if (!updatedTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update template" });
    }
  });
  app2.delete("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      const success = await storage.deleteTemplate(id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  app2.get("/api/proposals", async (req, res) => {
    try {
      const proposals2 = await storage.getProposals();
      res.json(proposals2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });
  app2.get("/api/proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }
      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proposal" });
    }
  });
  app2.post("/api/proposals", async (req, res) => {
    try {
      const validatedData = insertProposalSchema.parse(req.body);
      const newProposal = await storage.createProposal(validatedData);
      res.status(201).json(newProposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create proposal" });
    }
  });
  app2.put("/api/proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }
      const validatedData = insertProposalSchema.partial().parse(req.body);
      const updatedProposal = await storage.updateProposal(id, validatedData);
      if (!updatedProposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      res.json(updatedProposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update proposal" });
    }
  });
  app2.delete("/api/proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }
      const success = await storage.deleteProposal(id);
      if (!success) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete proposal" });
    }
  });
  app2.get("/api/backups", async (req, res) => {
    try {
      const backups2 = await storage.getBackups();
      res.json(backups2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });
  app2.post("/api/backups", async (req, res) => {
    try {
      const templates2 = await storage.getTemplates();
      const proposals2 = await storage.getProposals();
      const dataStr = JSON.stringify({ templates: templates2, proposals: proposals2 });
      const sizeInKB = Math.round(dataStr.length / 1024 * 100) / 100;
      let sizeStr = sizeInKB.toFixed(2) + " KB";
      if (sizeInKB > 1024) {
        const sizeInMB = sizeInKB / 1024;
        sizeStr = sizeInMB.toFixed(2) + " MB";
      }
      const backupData = {
        name: req.body.name || `Backup ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
        type: req.body.type || "manual",
        size: sizeStr,
        data: { templates: templates2, proposals: proposals2 }
      };
      const validatedData = insertBackupSchema.parse(backupData);
      const newBackup = await storage.createBackup(validatedData);
      res.status(201).json(newBackup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create backup" });
    }
  });
  app2.post("/api/backups/:id/restore", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid backup ID" });
      }
      const backup = await storage.getBackup(id);
      if (!backup) {
        return res.status(404).json({ error: "Backup not found" });
      }
      const success = await storage.restoreBackup(id);
      if (!success) {
        return res.status(500).json({ error: "Failed to restore backup" });
      }
      res.json({ message: "Backup restored successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });
  app2.delete("/api/backups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid backup ID" });
      }
      const success = await storage.deleteBackup(id);
      if (!success) {
        return res.status(404).json({ error: "Backup not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });
  app2.get("/api/settings", async (req, res) => {
    try {
      const settings2 = await storage.getSettings();
      res.json(settings2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });
  app2.put("/api/settings", async (req, res) => {
    try {
      const updatedSettings = await storage.updateSettings(req.body);
      setupAutomaticBackups();
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/proposals/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }
      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      res.json({ message: "PDF export endpoint reached successfully", proposal });
    } catch (error) {
      res.status(500).json({ error: "Failed to export proposal to PDF" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
  function setupAutomaticBackups() {
    const jobs = schedule.scheduledJobs;
    Object.keys(jobs).forEach((key) => {
      if (key === "autoBackup") {
        jobs[key].cancel();
      }
    });
    storage.getSettings().then((settings2) => {
      if (settings2.backupEnabled) {
        const [hour, minute] = settings2.backupTime.split(":");
        schedule.scheduleJob("autoBackup", `${minute} ${hour} * * *`, async function() {
          try {
            const templates2 = await storage.getTemplates();
            const proposals2 = await storage.getProposals();
            const dataStr = JSON.stringify({ templates: templates2, proposals: proposals2 });
            const sizeInKB = Math.round(dataStr.length / 1024 * 100) / 100;
            let sizeStr = sizeInKB.toFixed(2) + " KB";
            if (sizeInKB > 1024) {
              const sizeInMB = sizeInKB / 1024;
              sizeStr = sizeInMB.toFixed(2) + " MB";
            }
            const now = /* @__PURE__ */ new Date();
            const formattedDate = now.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            });
            const formattedTime = now.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            });
            const backupData = {
              name: `${formattedDate} - ${formattedTime}`,
              type: "automatic",
              size: sizeStr,
              data: { templates: templates2, proposals: proposals2 }
            };
            await storage.createBackup(backupData);
            console.log(`Automatic backup created at ${now.toISOString()}`);
          } catch (error) {
            console.error("Failed to create automatic backup:", error);
          }
        });
        console.log(`Automatic backup scheduled for ${settings2.backupTime} daily`);
      }
    });
  }
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id.split("node_modules/")[1].split("/")[0];
          }
        }
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen(port, () => {
    log(`serving on http://localhost:${port}`);
  });
})();
