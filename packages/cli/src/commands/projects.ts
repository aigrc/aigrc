// ─────────────────────────────────────────────────────────────────
// PROJECTS COMMAND - Manage projects in Control Plane
// ─────────────────────────────────────────────────────────────────

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  printHeader,
  printSubheader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
} from "../utils/output.js";
import { exit, ExitCode } from "../utils/exit-codes.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived" | "on_hold";
  department: string | null;
  team: string | null;
  risk_summary: {
    total_assets: number;
    by_risk_level: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
}

interface ProjectsListOptions {
  organization?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  status?: string;
  department?: string;
  json?: boolean;
}

interface ProjectsCreateOptions {
  organization?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  description?: string;
  department?: string;
  team?: string;
  json?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const DEFAULT_SUPABASE_URL = "https://wfsxgrxkdmpcaakntfjy.supabase.co";
const DEFAULT_ORG_ID = "11111111-1111-1111-1111-111111111111";

// ─────────────────────────────────────────────────────────────────
// COMMAND DEFINITION
// ─────────────────────────────────────────────────────────────────

export const projectsCommand = new Command("projects")
  .description("Manage projects in Control Plane");

// ─────────────────────────────────────────────────────────────────
// LIST SUBCOMMAND
// ─────────────────────────────────────────────────────────────────

projectsCommand
  .command("list")
  .alias("ls")
  .description("List all projects")
  .option(
    "--organization <id>",
    "Organization ID (or set AIGRC_ORG_ID env var)"
  )
  .option(
    "--supabase-url <url>",
    "Supabase URL (or set SUPABASE_URL env var)"
  )
  .option(
    "--supabase-key <key>",
    "Supabase anon key (or set SUPABASE_ANON_KEY env var)"
  )
  .option("--status <status>", "Filter by status (active, archived, on_hold)")
  .option("--department <department>", "Filter by department")
  .option("--json", "Output as JSON")
  .action(async (options: ProjectsListOptions) => {
    await runProjectsList(options);
  });

// ─────────────────────────────────────────────────────────────────
// CREATE SUBCOMMAND
// ─────────────────────────────────────────────────────────────────

projectsCommand
  .command("create")
  .description("Create a new project")
  .argument("<name>", "Project name")
  .option(
    "--organization <id>",
    "Organization ID (or set AIGRC_ORG_ID env var)"
  )
  .option(
    "--supabase-url <url>",
    "Supabase URL (or set SUPABASE_URL env var)"
  )
  .option(
    "--supabase-key <key>",
    "Supabase anon key (or set SUPABASE_ANON_KEY env var)"
  )
  .option("-d, --description <description>", "Project description")
  .option("--department <department>", "Department name")
  .option("--team <team>", "Team name")
  .option("--json", "Output as JSON")
  .action(async (name: string, options: ProjectsCreateOptions) => {
    await runProjectsCreate(name, options);
  });

// ─────────────────────────────────────────────────────────────────
// LIST FUNCTION
// ─────────────────────────────────────────────────────────────────

async function runProjectsList(options: ProjectsListOptions): Promise<void> {
  const supabaseUrl =
    options.supabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    options.supabaseKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const organizationId =
    options.organization ||
    process.env.AIGRC_ORG_ID ||
    process.env.AIGOS_ORG_ID ||
    DEFAULT_ORG_ID;

  if (!supabaseKey) {
    printError("Supabase anon key is required.");
    printInfo("Set SUPABASE_ANON_KEY environment variable or use --supabase-key option.");
    exit(ExitCode.INVALID_ARGS);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!options.json) {
    printHeader();
    console.log(chalk.cyan("Projects List\n"));
  }

  const spinner = !options.json ? ora("Fetching projects...").start() : null;

  try {
    let query = supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (options.status) {
      query = query.eq("status", options.status);
    }
    if (options.department) {
      query = query.eq("department", options.department);
    }

    const { data: projects, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    spinner?.succeed(`Found ${projects?.length || 0} project(s)`);

    if (!projects || projects.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ projects: [] }, null, 2));
      } else {
        console.log();
        printWarning("No projects found.");
        printInfo("Create a project with: aigrc projects create <name>");
      }
      return;
    }

    if (options.json) {
      console.log(JSON.stringify({ projects }, null, 2));
      return;
    }

    console.log();
    printSubheader("Projects");

    for (const project of projects as Project[]) {
      const statusColor =
        project.status === "active"
          ? chalk.green
          : project.status === "archived"
          ? chalk.gray
          : chalk.yellow;

      console.log(`  ${chalk.cyan("●")} ${chalk.bold(project.name)}`);
      console.log(`    ID: ${chalk.dim(project.id)}`);
      console.log(`    Status: ${statusColor(project.status)}`);
      if (project.department) {
        console.log(`    Department: ${chalk.dim(project.department)}`);
      }
      if (project.team) {
        console.log(`    Team: ${chalk.dim(project.team)}`);
      }
      console.log(
        `    Assets: ${chalk.bold(project.risk_summary?.total_assets || 0)}`
      );
      console.log();
    }

    console.log(chalk.dim(`Use: aigrc push --project <name> to assign assets to a project`));
  } catch (error) {
    spinner?.fail("Failed to fetch projects");
    printError(error instanceof Error ? error.message : String(error));
    exit(ExitCode.RUNTIME_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────
// CREATE FUNCTION
// ─────────────────────────────────────────────────────────────────

async function runProjectsCreate(
  name: string,
  options: ProjectsCreateOptions
): Promise<void> {
  const supabaseUrl =
    options.supabaseUrl ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseKey =
    options.supabaseKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  const organizationId =
    options.organization ||
    process.env.AIGRC_ORG_ID ||
    process.env.AIGOS_ORG_ID ||
    DEFAULT_ORG_ID;

  if (!supabaseKey) {
    printError("Supabase anon key is required.");
    printInfo("Set SUPABASE_ANON_KEY environment variable or use --supabase-key option.");
    exit(ExitCode.INVALID_ARGS);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!options.json) {
    printHeader();
    console.log(chalk.cyan("Create Project\n"));
  }

  const spinner = !options.json ? ora(`Creating project: ${name}...`).start() : null;

  try {
    // Check if project with same name already exists
    const { data: existing, error: checkError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("organization_id", organizationId)
      .ilike("name", name)
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check existing project: ${checkError.message}`);
    }

    if (existing && existing.length > 0) {
      spinner?.fail("Project already exists");
      if (options.json) {
        console.log(
          JSON.stringify(
            { error: "Project with this name already exists", existing: existing[0] },
            null,
            2
          )
        );
      } else {
        printWarning(`A project named "${name}" already exists.`);
        printInfo(`ID: ${existing[0].id}`);
      }
      exit(ExitCode.VALIDATION_ERRORS);
    }

    // Create the project
    const projectData = {
      organization_id: organizationId,
      name,
      description: options.description || null,
      department: options.department || null,
      team: options.team || null,
      status: "active",
      risk_summary: {
        total_assets: 0,
        by_risk_level: {
          minimal: 0,
          limited: 0,
          high: 0,
          unacceptable: 0,
          unknown: 0,
        },
      },
    };

    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create project: ${createError.message}`);
    }

    spinner?.succeed("Project created successfully");

    if (options.json) {
      console.log(JSON.stringify({ project }, null, 2));
      return;
    }

    console.log();
    printSubheader("Project Created");
    console.log(`  ${chalk.bold("Name:")} ${project.name}`);
    console.log(`  ${chalk.bold("ID:")} ${chalk.dim(project.id)}`);
    if (project.description) {
      console.log(`  ${chalk.bold("Description:")} ${project.description}`);
    }
    if (project.department) {
      console.log(`  ${chalk.bold("Department:")} ${project.department}`);
    }
    if (project.team) {
      console.log(`  ${chalk.bold("Team:")} ${project.team}`);
    }
    console.log();
    printSuccess("Use this command to assign assets to this project:");
    console.log(chalk.cyan(`  aigrc push --project "${name}"`));
    console.log();
    printInfo("Or set it as default in .aigrc.yaml:");
    console.log(chalk.dim(`  defaultProject: ${project.id}`));
  } catch (error) {
    spinner?.fail("Failed to create project");
    if (options.json) {
      console.log(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
      );
    } else {
      printError(error instanceof Error ? error.message : String(error));
    }
    exit(ExitCode.RUNTIME_ERROR);
  }
}
