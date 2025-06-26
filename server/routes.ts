import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProposalSchema, insertTemplateSchema, insertBackupSchema } from "@shared/schema";
import { z } from "zod";
import schedule from "node-schedule";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup automatic daily backups based on settings
  setupAutomaticBackups();

  // API Routes - Templates
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req: Request, res: Response) => {
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

  app.post("/api/templates", async (req: Request, res: Response) => {
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

  app.put("/api/templates/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/templates/:id", async (req: Request, res: Response) => {
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

  // API Routes - Proposals
  app.get("/api/proposals", async (req: Request, res: Response) => {
    try {
      const proposals = await storage.getProposals();
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", async (req: Request, res: Response) => {
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

  app.post("/api/proposals", async (req: Request, res: Response) => {
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

  app.put("/api/proposals/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/proposals/:id", async (req: Request, res: Response) => {
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

  // API Routes - Backups
  app.get("/api/backups", async (req: Request, res: Response) => {
    try {
      const backups = await storage.getBackups();
      res.json(backups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  app.post("/api/backups", async (req: Request, res: Response) => {
    try {
      // Create a full backup of the current data
      const templates = await storage.getTemplates();
      const proposals = await storage.getProposals();
      
      // Determine backup size (approx)
      const dataStr = JSON.stringify({ templates, proposals });
      const sizeInKB = Math.round((dataStr.length / 1024) * 100) / 100;
      let sizeStr = sizeInKB.toFixed(2) + " KB";
      
      if (sizeInKB > 1024) {
        const sizeInMB = sizeInKB / 1024;
        sizeStr = sizeInMB.toFixed(2) + " MB";
      }
      
      const backupData = {
        name: req.body.name || `Backup ${new Date().toLocaleString()}`,
        type: req.body.type || "manual",
        size: sizeStr,
        data: { templates, proposals }
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

  app.post("/api/backups/:id/restore", async (req: Request, res: Response) => {
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

  app.delete("/api/backups/:id", async (req: Request, res: Response) => {
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

  // API Routes - Settings
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    try {
      const updatedSettings = await storage.updateSettings(req.body);
      
      // Update the backup schedule if backup time changed
      setupAutomaticBackups();
      
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // API Route - Export to PDF (returns PDF data URL)
  app.get("/api/proposals/:id/export", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid proposal ID" });
      }
      
      const proposal = await storage.getProposal(id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      // In a real implementation, we would generate a PDF here
      // For now, we'll just return a success message indicating the PDF would be generated
      res.json({ message: "PDF export endpoint reached successfully", proposal });
    } catch (error) {
      res.status(500).json({ error: "Failed to export proposal to PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;

  // Helper function to schedule backups
  function setupAutomaticBackups() {
    // Cancel any existing scheduled jobs
    const jobs = schedule.scheduledJobs;
    Object.keys(jobs).forEach(key => {
      if (key === 'autoBackup') {
        jobs[key].cancel();
      }
    });

    // Schedule new backup job based on settings
    storage.getSettings().then(settings => {
      if (settings.backupEnabled) {
        const [hour, minute] = settings.backupTime.split(':');
        
        schedule.scheduleJob('autoBackup', `${minute} ${hour} * * *`, async function() {
          try {
            // Create automatic backup
            const templates = await storage.getTemplates();
            const proposals = await storage.getProposals();
            
            // Determine backup size
            const dataStr = JSON.stringify({ templates, proposals });
            const sizeInKB = Math.round((dataStr.length / 1024) * 100) / 100;
            let sizeStr = sizeInKB.toFixed(2) + " KB";
            
            if (sizeInKB > 1024) {
              const sizeInMB = sizeInKB / 1024;
              sizeStr = sizeInMB.toFixed(2) + " MB";
            }
            
            const now = new Date();
            const formattedDate = now.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric'
            });
            
            const formattedTime = now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            const backupData = {
              name: `${formattedDate} - ${formattedTime}`,
              type: "automatic",
              size: sizeStr,
              data: { templates, proposals }
            };
            
            await storage.createBackup(backupData);
            console.log(`Automatic backup created at ${now.toISOString()}`);
          } catch (error) {
            console.error("Failed to create automatic backup:", error);
          }
        });
        
        console.log(`Automatic backup scheduled for ${settings.backupTime} daily`);
      }
    });
  }
}
