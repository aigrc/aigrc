#!/usr/bin/env node

import { program } from "commander";
import { scanCommand } from "../commands/scan.js";
import { initCommand } from "../commands/init.js";
import { registerCommand } from "../commands/register.js";
import { validateCommand } from "../commands/validate.js";
import { statusCommand } from "../commands/status.js";
// Multi-jurisdiction compliance commands
import { complianceCommand } from "../commands/compliance.js";
import { classifyCommand } from "../commands/classify.js";
import { checkCommand } from "../commands/check.js";
import { generateCommand } from "../commands/generate.js";
import { reportCommand } from "../commands/report.js";

program
  .name("aigrc")
  .description("AI Governance, Risk, Compliance - CLI Tool")
  .version("0.1.0");

// Core commands
program.addCommand(scanCommand);
program.addCommand(initCommand);
program.addCommand(registerCommand);
program.addCommand(validateCommand);
program.addCommand(statusCommand);

// Multi-jurisdiction compliance commands
program.addCommand(complianceCommand);
program.addCommand(classifyCommand);
program.addCommand(checkCommand);
program.addCommand(generateCommand);
program.addCommand(reportCommand);

program.parse();
