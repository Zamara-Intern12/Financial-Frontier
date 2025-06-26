import { 
  users, type User, type InsertUser,
  templates, type Template, type InsertTemplate,
  proposals, type Proposal, type InsertProposal,
  backups, type Backup, type InsertBackup,
  settings, type Settings, type InsertSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations (existing)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsersByTechLevel(techLevel: string): Promise<User[]>;
  getTopUsers(limit: number): Promise<User[]>;
  
  // Scenario operations
  getScenarios(): Promise<Scenario[]>;
  getScenariosByTechLevel(techLevel: string): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: number, scenario: Partial<InsertScenario>): Promise<Scenario | undefined>;
  deleteScenario(id: number): Promise<boolean>;
  
  // GameSession operations
  getGameSessions(): Promise<GameSession[]>;
  getGameSessionsByUserId(userId: number): Promise<GameSession[]>;
  getGameSession(id: number): Promise<GameSession | undefined>;
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  updateGameSession(id: number, session: Partial<GameSession>): Promise<GameSession | undefined>;
  completeGameSession(id: number): Promise<GameSession | undefined>;
  
  // PlayerResponse operations
  getPlayerResponses(sessionId: number): Promise<PlayerResponse[]>;
  getPlayerResponse(id: number): Promise<PlayerResponse | undefined>;
  createPlayerResponse(response: InsertPlayerResponse): Promise<PlayerResponse>;
  
  // Template operations (existing)
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  
  // Proposal operations (existing)
  getProposals(): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: number): Promise<boolean>;
  
  // Backup operations (existing)
  getBackups(): Promise<Backup[]>;
  getBackup(id: number): Promise<Backup | undefined>;
  createBackup(backup: InsertBackup): Promise<Backup>;
  deleteBackup(id: number): Promise<boolean>;
  restoreBackup(id: number): Promise<boolean>;
  
  // Settings operations (existing)
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;
}

// Implementation with PostgreSQL database
export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize default data if needed
    this.initializeDefaults();
  }

  // Initialize the database with default data
  private async initializeDefaults() {
    try {
      // Check if users table has any records
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      
      // No users, create default admin user
      if (!userCount || userCount.count === 0) {
        await db.insert(users).values({
          username: "admin",
          password: "admin", // In real app, this would be hashed
        });
      }
      
      // Check if templates table has any records
      const [templateCount] = await db.select({ count: sql<number>`count(*)` }).from(templates);
      
      // No templates, create default templates
      if (!templateCount || templateCount.count === 0) {
        await this.initializeDefaultTemplates();
      }
      
      // Check if settings table has any records
      const [settingsCount] = await db.select({ count: sql<number>`count(*)` }).from(settings);
      
      // No settings, create default settings
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
      
      // Check if proposals table has any records
      const [proposalCount] = await db.select({ count: sql<number>`count(*)` }).from(proposals);
      
      // No proposals, create sample proposals
      if (!proposalCount || proposalCount.count === 0) {
        await this.createSampleProposals();
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // Initialize default templates
  private async initializeDefaultTemplates() {
    const defaultTemplates: InsertTemplate[] = [
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
        createdAt: new Date()
      });
    }
  }

  // Create sample proposals
  private async createSampleProposals() {
    try {
      // Get template IDs from the database
      const templatesList = await db.select({ id: templates.id }).from(templates).limit(4);
      
      if (templatesList.length === 0) return;
      
      const sampleProposals: InsertProposal[] = [
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

      const now = new Date();
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
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Template operations
  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const now = new Date();
    const [template] = await db.insert(templates).values({
      ...insertTemplate,
      createdAt: now
    }).returning();
    return template;
  }

  async updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [updatedTemplate] = await db.update(templates)
      .set(template)
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return !!result;
  }

  // Proposal operations
  async getProposals(): Promise<Proposal[]> {
    return db.select().from(proposals).orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const now = new Date();
    const [proposal] = await db.insert(proposals).values({
      ...insertProposal,
      createdAt: now,
      updatedAt: now
    }).returning();
    return proposal;
  }

  async updateProposal(id: number, proposal: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const now = new Date();
    const [updatedProposal] = await db.update(proposals)
      .set({
        ...proposal,
        updatedAt: now
      })
      .where(eq(proposals.id, id))
      .returning();
    return updatedProposal;
  }

  async deleteProposal(id: number): Promise<boolean> {
    const result = await db.delete(proposals).where(eq(proposals.id, id));
    return !!result;
  }

  // Backup operations
  async getBackups(): Promise<Backup[]> {
    return db.select().from(backups).orderBy(desc(backups.createdAt));
  }

  async getBackup(id: number): Promise<Backup | undefined> {
    const [backup] = await db.select().from(backups).where(eq(backups.id, id));
    return backup;
  }

  async createBackup(insertBackup: InsertBackup): Promise<Backup> {
    // Get current data to back up
    const templatesList = await this.getTemplates();
    const proposalsList = await this.getProposals();
    
    // Create backup data object
    const backupData = {
      templates: templatesList,
      proposals: proposalsList
    };
    
    // Convert to string to get size
    const dataString = JSON.stringify(backupData);
    const sizeInBytes = Buffer.byteLength(dataString, 'utf8');
    
    // Format size for display (KB, MB, etc.)
    const sizeFormatted = this.formatSize(sizeInBytes);
    
    // Create the backup in the database
    const [backup] = await db.insert(backups).values({
      ...insertBackup,
      size: sizeFormatted,
      data: backupData,
      createdAt: new Date()
    }).returning();
    
    // Enforce backup retention policy
    await this.enforceBackupRetention();
    
    return backup;
  }
  
  private formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(2) + ' KB';
    const mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(2) + ' MB';
    const gb = mb / 1024;
    return gb.toFixed(2) + ' GB';
  }
  
  private async enforceBackupRetention() {
    try {
      // Get current settings
      const currentSettings = await this.getSettings();
      
      // Get all backups
      const backupsList = await this.getBackups();
      
      // If we have more backups than the max allowed, delete oldest ones
      if (backupsList.length > currentSettings.maxBackups) {
        // Sort by creation date (ascending) so oldest are first
        const sortedBackups = backupsList.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
        
        // Get the ones to delete
        const backupsToDelete = sortedBackups.slice(0, backupsList.length - currentSettings.maxBackups);
        
        // Delete each excess backup
        for (const backupToDelete of backupsToDelete) {
          await this.deleteBackup(backupToDelete.id);
        }
      }
    } catch (error) {
      console.error("Error enforcing backup retention policy:", error);
    }
  }

  async deleteBackup(id: number): Promise<boolean> {
    const result = await db.delete(backups).where(eq(backups.id, id));
    return !!result;
  }

  async restoreBackup(id: number): Promise<boolean> {
    try {
      // Get the backup to restore
      const backup = await this.getBackup(id);
      
      if (!backup || !backup.data) {
        return false;
      }
      
      // Parse the data if it's a string
      const backupData = typeof backup.data === 'string' 
        ? JSON.parse(backup.data) 
        : backup.data;
      
      // Begin transaction for atomicity
      return await db.transaction(async (tx) => {
        // Restore templates
        if (backupData.templates && Array.isArray(backupData.templates)) {
          // Delete all current templates
          await tx.delete(templates);
          
          // Insert backup templates
          for (const template of backupData.templates) {
            const { id, ...templateData } = template;
            await tx.insert(templates).values({
              ...templateData,
              id // Keep the original ID for integrity
            });
          }
        }
        
        // Restore proposals
        if (backupData.proposals && Array.isArray(backupData.proposals)) {
          // Delete all current proposals
          await tx.delete(proposals);
          
          // Insert backup proposals
          for (const proposal of backupData.proposals) {
            const { id, ...proposalData } = proposal;
            await tx.insert(proposals).values({
              ...proposalData,
              id // Keep the original ID for integrity
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
  async getSettings(): Promise<Settings> {
    // Get settings from database, create default if none exist
    const [settingsData] = await db.select().from(settings).limit(1);
    
    if (!settingsData) {
      // Create default settings
      const defaultSettings: InsertSettings = {
        backupTime: "23:00",
        backupEnabled: true,
        maxBackups: 30,
        companyName: "Your Company",
        companyLogo: "",
        companyAddress: "",
        companyEmail: "",
        companyPhone: ""
      };
      
      const [newSettings] = await db.insert(settings)
        .values(defaultSettings)
        .returning();
      
      return newSettings;
    }
    
    return settingsData;
  }

  async updateSettings(settingsUpdate: Partial<InsertSettings>): Promise<Settings> {
    // Get current settings
    const currentSettings = await this.getSettings();
    
    // Update settings
    const [updatedSettings] = await db.update(settings)
      .set(settingsUpdate)
      .where(eq(settings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }
}

// Export an instance of the storage implementation
export const storage = new DatabaseStorage();