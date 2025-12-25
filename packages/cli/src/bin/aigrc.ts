#!/usr/bin/env node

import { program } from "commander";
import { scanCommand } from "../commands/scan.js";
import { initCommand } from "../commands/init.js";
import { registerCommand } from "../commands/register.js";
import { validateCommand } from "../commands/validate.js";
import { statusCommand } from "../commands/status.js";

program
  .name("aigrc")
  .description("AI Governance, Risk, Compliance - CLI Tool")
  .version("0.1.0");

// Register commands
program.addCommand(scanCommand);
program.addCommand(initCommand);
program.addCommand(registerCommand);
program.addCommand(validateCommand);
program.addCommand(statusCommand);

program.parse();
