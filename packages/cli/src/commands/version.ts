import { Command } from "commander";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ─────────────────────────────────────────────────────────────────
// VERSION COMMAND (AIG-101)
// Enhanced version output with package details
// ─────────────────────────────────────────────────────────────────

interface VersionCommandOptions {
  json?: boolean;
}

interface VersionInfo {
  cli: string;
  core: string;
  node: string;
  platform: string;
  arch: string;
}

export const versionCommand = new Command("version")
  .description("Show version information for AIGRC CLI and packages")
  .option("--json", "Output version information as JSON")
  .action(async (options: VersionCommandOptions) => {
    await runVersion(options);
  });

async function runVersion(options: VersionCommandOptions): Promise<void> {
  const versionInfo = await getVersionInfo();

  if (options.json) {
    console.log(JSON.stringify(versionInfo, null, 2));
  } else {
    printVersionText(versionInfo);
  }
}

async function getVersionInfo(): Promise<VersionInfo> {
  // Get CLI version
  const cliVersion = await getPackageVersion("@aigrc/cli");

  // Get core version
  const coreVersion = await getPackageVersion("@aigrc/core");

  // Get Node.js version
  const nodeVersion = process.version.replace("v", "");

  // Get platform info
  const platform = process.platform;
  const arch = process.arch;

  return {
    cli: cliVersion,
    core: coreVersion,
    node: nodeVersion,
    platform,
    arch,
  };
}

async function getPackageVersion(packageName: string): Promise<string> {
  try {
    // Try to load package.json from the package
    const pkgPath = require.resolve(`${packageName}/package.json`);
    const pkgContent = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    return pkg.version || "unknown";
  } catch {
    // If not found, try to get from current package
    try {
      const currentPkgPath = path.join(process.cwd(), "package.json");
      const pkgContent = await fs.readFile(currentPkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);
      if (pkg.name === packageName) {
        return pkg.version || "unknown";
      }
      // Check dependencies
      if (pkg.dependencies?.[packageName]) {
        return pkg.dependencies[packageName].replace("^", "").replace("~", "");
      }
      if (pkg.devDependencies?.[packageName]) {
        return pkg.devDependencies[packageName].replace("^", "").replace("~", "");
      }
    } catch {
      // Ignore
    }
    return "unknown";
  }
}

function printVersionText(info: VersionInfo): void {
  console.log();
  console.log(chalk.cyan.bold("AIGRC Version Information"));
  console.log(chalk.dim("─".repeat(50)));
  console.log();
  console.log(`${chalk.dim("aigrc CLI:")} ${chalk.bold(info.cli)}`);
  console.log(`${chalk.dim("@aigrc/core:")} ${chalk.bold(info.core)}`);
  console.log(`${chalk.dim("Node.js:")} ${chalk.bold("v" + info.node)}`);
  console.log(`${chalk.dim("Platform:")} ${chalk.bold(info.platform + " " + info.arch)}`);
  console.log();
}
