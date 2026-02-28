import { program } from "commander";
import { scanCommand } from "../commands/scan.js";
import { initCommand } from "../commands/init.js";
import { registerCommand } from "../commands/register.js";
import { validateCommand } from "../commands/validate.js";
import { statusCommand } from "../commands/status.js";
import { hashCommand } from "../commands/hash.js";
import { versionCommand } from "../commands/version.js";
// Control Plane sync commands
import { pushCommand } from "../commands/push.js";
import { projectsCommand } from "../commands/projects.js";
// Multi-jurisdiction compliance commands
import { complianceCommand } from "../commands/compliance.js";
import { classifyCommand } from "../commands/classify.js";
import { checkCommand } from "../commands/check.js";
import { generateCommand } from "../commands/generate.js";
import { reportCommand } from "../commands/report.js";
// I2E Policy Bridge commands
import { policyCommand } from "../commands/policy.js";
// CGA certification commands
import { certifyCommand } from "../commands/certify.js";
// Governance Event commands
import { eventsCommand } from "../commands/events.js";
import { pullCommand } from "../commands/pull.js";

program
  .name("aigrc")
  .description("AI Governance, Risk, Compliance - CLI Tool")
  .version("0.2.0");

// Core commands
program.addCommand(scanCommand);
program.addCommand(initCommand);
program.addCommand(registerCommand);
program.addCommand(validateCommand);
program.addCommand(statusCommand);
program.addCommand(hashCommand);
program.addCommand(versionCommand);

// Control Plane sync commands
program.addCommand(pushCommand);
program.addCommand(projectsCommand);

// Multi-jurisdiction compliance commands
program.addCommand(complianceCommand);
program.addCommand(classifyCommand);
program.addCommand(checkCommand);
program.addCommand(generateCommand);
program.addCommand(reportCommand);

// I2E Policy Bridge commands
program.addCommand(policyCommand);

// CGA certification commands
program.addCommand(certifyCommand);

// Governance Event commands
program.addCommand(eventsCommand);
program.addCommand(pullCommand);

program.parse();
