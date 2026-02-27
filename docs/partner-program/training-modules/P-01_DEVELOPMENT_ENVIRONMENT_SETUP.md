# Module P-01: Development Environment Setup

## Complete Guide to Preparing Your Environment for AIGOS/AIGRC

**Module ID:** P-01
**Tier:** Prerequisites
**Duration:** 3-4 hours
**Difficulty:** Beginner
**Last Updated:** 2026-02-16

---

## 1. Module Overview

### 1.1 Purpose & Business Value

Before you can install, configure, or operate any AIGOS/AIGRC component, you need a properly configured development environment. This module ensures you have:

- All required software installed and configured
- A consistent, reproducible setup across your team
- The ability to troubleshoot common environment issues
- Understanding of how components interact at the system level

**Why This Matters for Partners:**
- Inconsistent environments cause 40% of implementation delays
- Proper setup prevents security misconfigurations
- Troubleshooting skills reduce support escalations
- Consistent team environments improve collaboration

### 1.2 Target Audience

| Role | Relevance | Expected Outcome |
|------|-----------|------------------|
| Technical Consultant | Required | Full environment setup |
| GRC Consultant | Recommended | Basic CLI environment |
| Project Manager | Optional | Conceptual understanding |

### 1.3 Prerequisites

**No prior AIGOS/AIGRC knowledge required.**

You should have:
- Administrative access to your computer
- Stable internet connection
- 10GB free disk space
- Basic command-line familiarity (we'll teach what you need)

### 1.4 Learning Outcomes

By the end of this module, you will be able to:

1. ✓ Install and verify Node.js and npm
2. ✓ Install and configure Git
3. ✓ Install and verify the AIGRC CLI
4. ✓ Configure your terminal/shell environment
5. ✓ Set up VS Code with required extensions
6. ✓ Verify your complete environment is working
7. ✓ Troubleshoot common setup issues

---

## 2. Conceptual Foundation

### 2.1 Understanding the Technology Stack

AIGOS/AIGRC is built on modern web technologies. Here's what you need and why:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AIGOS/AIGRC TECHNOLOGY STACK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR MACHINE                          WHAT IT PROVIDES                     │
│  ═════════════                         ════════════════                     │
│                                                                             │
│  ┌─────────────────┐                                                       │
│  │    Node.js      │ ──────────▶ JavaScript runtime                        │
│  │    (v18+)       │            Executes AIGRC code                        │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│  ┌────────┴────────┐                                                       │
│  │      npm        │ ──────────▶ Package manager                           │
│  │   (included)    │            Installs AIGRC packages                    │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│  ┌────────┴────────┐                                                       │
│  │    AIGRC CLI    │ ──────────▶ Command-line interface                    │
│  │   (@aigrc/cli)  │            Your main interaction tool                 │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│  ┌────────┴────────┐                                                       │
│  │      Git        │ ──────────▶ Version control                           │
│  │                 │            Tracks code changes                        │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│  ┌────────┴────────┐                                                       │
│  │    VS Code      │ ──────────▶ Code editor                               │
│  │  + Extensions   │            Visual development environment             │
│  └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 How Components Connect

```
Developer's Machine                    Customer/Cloud Environment
═══════════════════                    ══════════════════════════

┌──────────────┐                       ┌──────────────────────┐
│   VS Code    │                       │   AIGOS Control      │
│  (editing)   │                       │   Plane (Dashboard)  │
└──────┬───────┘                       └──────────┬───────────┘
       │                                          │
       │ saves                                    │ displays
       ▼                                          │
┌──────────────┐     ┌──────────────┐            │
│  Local Files │────▶│  AIGRC CLI   │────────────┘
│ (asset cards,│     │  (scanning,  │     sends data
│  policies)   │     │  checking)   │
└──────────────┘     └──────┬───────┘
                            │
                            │ commits
                            ▼
                     ┌──────────────┐
                     │     Git      │
                     │ (repository) │
                     └──────┬───────┘
                            │
                            │ pushes
                            ▼
                     ┌──────────────┐
                     │   GitHub     │
                     │  (remote)    │
                     └──────────────┘
```

### 2.3 Key Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Node.js** | JavaScript runtime that executes code outside a browser | Runs the AIGRC CLI |
| **npm** | Node Package Manager - installs JavaScript packages | `npm install -g @aigrc/cli` |
| **CLI** | Command Line Interface - text-based program interaction | `aigrc scan` |
| **PATH** | System variable listing directories where programs are found | Adding Node.js to PATH |
| **Repository** | A folder tracked by Git containing project files | Your customer's AI codebase |
| **Terminal** | Application for running command-line programs | PowerShell, Terminal, iTerm |

---

## 3. Installation & Setup

### 3.1 System Requirements

#### Minimum Requirements

| Component | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| OS Version | Windows 10 (1903+) | macOS 10.15+ | Ubuntu 20.04+ |
| RAM | 8 GB | 8 GB | 8 GB |
| Disk Space | 10 GB | 10 GB | 10 GB |
| CPU | 64-bit processor | 64-bit processor | 64-bit processor |

#### Recommended Requirements

| Component | Specification |
|-----------|---------------|
| RAM | 16 GB |
| Disk Space | 20 GB SSD |
| Display | 1920x1080 or higher |
| Network | Stable broadband |

### 3.2 Installing Node.js

Node.js is the foundation. Without it, nothing else works.

---

#### WINDOWS INSTALLATION

**Step 1: Download Node.js**

1. Open your web browser
2. Navigate to: `https://nodejs.org/`
3. You will see two download options:
   - **LTS (Long Term Support)** - Choose this one
   - Current - More features but less stable

4. Click the **LTS** button (should show version 20.x.x or higher)
5. Save the installer file (e.g., `node-v20.11.0-x64.msi`)

**Step 2: Run the Installer**

1. Locate the downloaded file (usually in Downloads folder)
2. Double-click to run
3. If Windows asks "Do you want to allow this app to make changes?", click **Yes**

4. The Node.js Setup Wizard appears:
   - Click **Next**

5. Read and accept the license agreement:
   - Check "I accept the terms in the License Agreement"
   - Click **Next**

6. Choose installation location:
   - **Recommended:** Keep the default (`C:\Program Files\nodejs\`)
   - Click **Next**

7. Custom Setup screen:
   - **Important:** Ensure "Add to PATH" is selected (it should be by default)
   - Click **Next**

8. Tools for Native Modules:
   - Check the box for "Automatically install the necessary tools..."
   - Click **Next**

9. Click **Install**
   - Wait for installation to complete (1-3 minutes)

10. Click **Finish**

**Step 3: Verify Installation**

1. Open **PowerShell** (search "PowerShell" in Start menu)
2. Type the following command and press Enter:

```powershell
node --version
```

**Expected output:**
```
v20.11.0
```
(Your version number may be slightly different - that's OK as long as it starts with v18 or higher)

3. Verify npm is also installed:

```powershell
npm --version
```

**Expected output:**
```
10.2.4
```
(Again, exact version may vary)

**✓ CHECKPOINT:** If both commands show version numbers, Node.js is installed correctly.

**⚠ TROUBLESHOOTING:**

| Problem | Solution |
|---------|----------|
| `'node' is not recognized` | Close and reopen PowerShell. If still failing, Node.js wasn't added to PATH. Reinstall and ensure "Add to PATH" is checked. |
| Permission denied | Run PowerShell as Administrator (right-click → "Run as administrator") |
| Old version showing | You may have an old installation. Uninstall via Control Panel, then reinstall. |

---

#### MACOS INSTALLATION

**Step 1: Download Node.js**

1. Open Safari or your preferred browser
2. Navigate to: `https://nodejs.org/`
3. Click the **LTS** download button for macOS
4. Save the installer file (e.g., `node-v20.11.0.pkg`)

**Step 2: Run the Installer**

1. Open Finder and navigate to Downloads
2. Double-click the `.pkg` file
3. The installer will open:
   - Click **Continue** on the Introduction screen
   - Click **Continue** on the License screen
   - Click **Agree** to accept the license
   - Click **Install**
   - Enter your macOS password when prompted
   - Click **Install Software**

4. Wait for installation (1-2 minutes)
5. Click **Close**

**Step 3: Verify Installation**

1. Open **Terminal** (Applications → Utilities → Terminal, or Cmd+Space and type "Terminal")

2. Type the following command and press Enter:

```bash
node --version
```

**Expected output:**
```
v20.11.0
```

3. Verify npm:

```bash
npm --version
```

**Expected output:**
```
10.2.4
```

**✓ CHECKPOINT:** Both commands show version numbers.

**Alternative: Using Homebrew (Recommended for Developers)**

If you have Homebrew installed:

```bash
# Install Node.js via Homebrew
brew install node

# Verify
node --version
npm --version
```

---

#### LINUX INSTALLATION (Ubuntu/Debian)

**Step 1: Update Package Lists**

Open Terminal and run:

```bash
sudo apt update
```

Enter your password when prompted.

**Step 2: Install Node.js via NodeSource**

```bash
# Download and run NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs
```

**Step 3: Verify Installation**

```bash
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

**✓ CHECKPOINT:** Both commands show version numbers.

---

### 3.3 Installing Git

Git is essential for:
- Tracking changes to AI governance configurations
- Collaborating with customer teams
- Integrating with CI/CD pipelines

---

#### WINDOWS GIT INSTALLATION

**Step 1: Download Git**

1. Navigate to: `https://git-scm.com/download/win`
2. The download should start automatically
3. Save the installer file (e.g., `Git-2.43.0-64-bit.exe`)

**Step 2: Run the Installer**

1. Double-click the downloaded file
2. Click **Yes** if Windows asks for permission

3. **Select Components** screen:
   - Keep all defaults checked
   - **Important:** Ensure "Git Bash Here" is checked
   - Click **Next**

4. **Choosing the default editor**:
   - For beginners: Select "Use Visual Studio Code as Git's default editor"
   - Click **Next**

5. **Adjusting the name of the initial branch**:
   - Select "Override the default branch name for new repositories"
   - Enter: `main`
   - Click **Next**

6. **Adjusting your PATH environment**:
   - Select "Git from the command line and also from 3rd-party software" (middle option)
   - Click **Next**

7. **Choosing HTTPS transport backend**:
   - Select "Use the OpenSSL library"
   - Click **Next**

8. **Configuring line ending conversions**:
   - Select "Checkout Windows-style, commit Unix-style line endings"
   - Click **Next**

9. **Configuring the terminal emulator**:
   - Select "Use Windows' default console window"
   - Click **Next**

10. **Default behavior of `git pull`**:
    - Select "Default (fast-forward or merge)"
    - Click **Next**

11. **Choose a credential helper**:
    - Select "Git Credential Manager"
    - Click **Next**

12. **Configuring extra options**:
    - Check "Enable file system caching"
    - Click **Next**

13. Click **Install** and wait for completion

14. Click **Finish**

**Step 3: Configure Git Identity**

Open PowerShell and run:

```powershell
# Set your name (use your real name)
git config --global user.name "Your Full Name"

# Set your email (use your work email)
git config --global user.email "your.email@company.com"

# Verify configuration
git config --list
```

**Expected output includes:**
```
user.name=Your Full Name
user.email=your.email@company.com
```

**Step 4: Verify Git Installation**

```powershell
git --version
```

**Expected output:**
```
git version 2.43.0.windows.1
```

**✓ CHECKPOINT:** Git version displays and config shows your name/email.

---

#### MACOS GIT INSTALLATION

Git may already be installed. Let's check:

```bash
git --version
```

If you see a version number, skip to Step 3 (Configure Git Identity).

If you see "xcode-select: note: no developer tools were found", proceed:

**Step 1: Install via Xcode Command Line Tools**

```bash
xcode-select --install
```

A popup will appear. Click **Install** and wait (5-10 minutes).

**Step 2: Verify Installation**

```bash
git --version
```

**Expected output:**
```
git version 2.39.0
```

**Step 3: Configure Git Identity**

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@company.com"
git config --list
```

**✓ CHECKPOINT:** Git version displays and config shows your name/email.

---

#### LINUX GIT INSTALLATION

```bash
# Install Git
sudo apt install -y git

# Configure identity
git config --global user.name "Your Full Name"
git config --global user.email "your.email@company.com"

# Verify
git --version
git config --list
```

**✓ CHECKPOINT:** Git version displays and config shows your name/email.

---

### 3.4 Installing AIGRC CLI

Now we install the actual AIGRC command-line tool.

---

#### ALL PLATFORMS

**Step 1: Install AIGRC CLI Globally**

Open your terminal (PowerShell on Windows, Terminal on macOS/Linux):

```bash
npm install -g @aigrc/cli
```

**Understanding this command:**
- `npm` - Node Package Manager
- `install` - Install a package
- `-g` - Install globally (available from any directory)
- `@aigrc/cli` - The AIGRC CLI package

**Expected output:**
```
added 127 packages in 15s
```

**Step 2: Verify Installation**

```bash
aigrc --version
```

**Expected output:**
```
@aigrc/cli version 0.2.0
```

**Step 3: Verify All Commands Are Available**

```bash
aigrc --help
```

**Expected output:**
```
Usage: aigrc [options] [command]

AIGRC - AI Governance, Risk and Compliance CLI

Options:
  -V, --version              output the version number
  -h, --help                 display help for command

Commands:
  init [options]             Initialize AIGRC in current directory
  scan [options] [path]      Scan for AI components
  detect [options] [path]    Detect AI assets with custom rules
  classify [options]         Classify AI assets by risk level
  check [options] [path]     Run compliance checks
  asset-card <command>       Manage asset cards
  policy <command>           Manage policies
  report [options] <type>    Generate reports
  audit [options]            Generate audit trail
  certify [options] [path]   Run CGA certification
  lock [options]             Manage governance locks
  help [command]             display help for command
```

**✓ CHECKPOINT:** All 13 commands are listed.

---

**⚠ TROUBLESHOOTING: AIGRC CLI Installation**

| Problem | Cause | Solution |
|---------|-------|----------|
| `npm: command not found` | Node.js not installed or not in PATH | Go back to Section 3.2 |
| `EACCES: permission denied` | npm doesn't have write permission | **macOS/Linux:** Use `sudo npm install -g @aigrc/cli` **Windows:** Run PowerShell as Administrator |
| `ENOENT: no such file or directory` | npm cache corrupted | Run `npm cache clean --force` then retry |
| `network error` | Firewall or proxy blocking npm | Check with your IT team about npm registry access |
| `'aigrc' is not recognized` | CLI not in PATH | **Windows:** Close and reopen PowerShell. **macOS/Linux:** Run `source ~/.bashrc` or `source ~/.zshrc` |

---

### 3.5 Installing VS Code

Visual Studio Code is our recommended editor for AIGOS/AIGRC work.

---

#### ALL PLATFORMS

**Step 1: Download VS Code**

1. Navigate to: `https://code.visualstudio.com/`
2. Click the download button for your platform
3. Save and run the installer
4. Follow the installation wizard (keep all defaults)

**Step 2: Launch VS Code**

- **Windows:** Search "Visual Studio Code" in Start menu
- **macOS:** Open from Applications folder or Launchpad
- **Linux:** Run `code` in terminal or find in applications menu

**Step 3: Install Required Extensions**

1. Click the **Extensions** icon in the left sidebar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)

2. Search for and install these extensions:

| Extension | Publisher | Purpose |
|-----------|-----------|---------|
| **YAML** | Red Hat | YAML syntax highlighting for asset cards |
| **ESLint** | Microsoft | JavaScript/TypeScript linting |
| **GitLens** | GitKraken | Enhanced Git integration |
| **AIGRC** | AIGRC | AIGRC governance extension (if available) |

For each extension:
- Type the name in the search box
- Click the extension in results
- Click **Install**

**Step 4: Configure VS Code for AIGRC**

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "yaml"
3. Find "Yaml: Schemas"
4. Click "Edit in settings.json"
5. Add this configuration:

```json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/aigrc/aigrc/main/schemas/asset-card.json": "*.asset-card.yaml",
    "https://raw.githubusercontent.com/aigrc/aigrc/main/schemas/policy.json": "*.policy.yaml"
  },
  "files.associations": {
    "*.asset-card.yaml": "yaml",
    "*.policy.yaml": "yaml"
  },
  "editor.formatOnSave": true,
  "editor.tabSize": 2
}
```

6. Save the file (`Ctrl+S` / `Cmd+S`)

**✓ CHECKPOINT:** VS Code is installed with YAML extension active.

---

### 3.6 Setting Up Your Terminal Environment

A properly configured terminal makes your work faster and less error-prone.

---

#### WINDOWS: POWERSHELL CONFIGURATION

**Step 1: Enable Script Execution**

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Type `Y` and press Enter when prompted.

**Step 2: Create PowerShell Profile**

```powershell
# Check if profile exists
Test-Path $PROFILE

# If False, create it
if (!(Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -Type File -Force
}

# Open profile in Notepad
notepad $PROFILE
```

**Step 3: Add AIGRC Aliases**

Add these lines to your profile:

```powershell
# AIGRC Aliases
Set-Alias -Name ac -Value aigrc

# Quick commands
function aigrc-scan { aigrc scan $args }
function aigrc-check { aigrc check $args }
function aigrc-report { aigrc report $args }

# Show current directory in prompt
function prompt {
    $currentDir = Split-Path -Leaf (Get-Location)
    "[$currentDir] > "
}

# Startup message
Write-Host "AIGRC Environment Ready" -ForegroundColor Green
```

Save and close Notepad, then reload:

```powershell
. $PROFILE
```

---

#### MACOS/LINUX: SHELL CONFIGURATION

**Step 1: Identify Your Shell**

```bash
echo $SHELL
```

- If `/bin/zsh` → Edit `~/.zshrc`
- If `/bin/bash` → Edit `~/.bashrc`

**Step 2: Add AIGRC Configuration**

```bash
# Open your shell configuration file
# For zsh:
nano ~/.zshrc

# For bash:
nano ~/.bashrc
```

**Step 3: Add These Lines**

```bash
# AIGRC Configuration
# ===================

# Aliases
alias ac='aigrc'
alias ac-scan='aigrc scan'
alias ac-check='aigrc check'
alias ac-report='aigrc report'

# Environment variables
export AIGRC_LOG_LEVEL=info

# Helpful prompt showing git branch
parse_git_branch() {
    git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}

# Custom prompt with directory and git branch
export PS1="\[\033[32m\]\w\[\033[33m\]\$(parse_git_branch)\[\033[00m\] $ "

# Startup message
echo "AIGRC Environment Ready"
```

**Step 4: Save and Reload**

Press `Ctrl+X`, then `Y`, then Enter to save.

Reload configuration:

```bash
source ~/.zshrc  # or ~/.bashrc
```

**✓ CHECKPOINT:** Terminal shows "AIGRC Environment Ready" on startup.

---

## 4. Complete Environment Verification

Now let's verify your entire environment is working correctly.

### 4.1 Verification Script

Create a file called `verify-environment.sh` (or `verify-environment.ps1` on Windows):

---

#### WINDOWS (PowerShell)

```powershell
# verify-environment.ps1
# AIGRC Environment Verification Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AIGRC Environment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    if ($nodeVersion -match "^v(1[8-9]|[2-9][0-9])") {
        Write-Host " PASS ($nodeVersion)" -ForegroundColor Green
    } else {
        Write-Host " WARN ($nodeVersion - should be v18+)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAIL (not installed)" -ForegroundColor Red
    $allPassed = $false
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version
    Write-Host " PASS (v$npmVersion)" -ForegroundColor Green
} catch {
    Write-Host " FAIL (not installed)" -ForegroundColor Red
    $allPassed = $false
}

# Check Git
Write-Host "Checking Git..." -NoNewline
try {
    $gitVersion = git --version
    Write-Host " PASS ($gitVersion)" -ForegroundColor Green
} catch {
    Write-Host " FAIL (not installed)" -ForegroundColor Red
    $allPassed = $false
}

# Check Git configuration
Write-Host "Checking Git config..." -NoNewline
$gitUser = git config user.name
$gitEmail = git config user.email
if ($gitUser -and $gitEmail) {
    Write-Host " PASS ($gitUser <$gitEmail>)" -ForegroundColor Green
} else {
    Write-Host " WARN (name/email not set)" -ForegroundColor Yellow
}

# Check AIGRC CLI
Write-Host "Checking AIGRC CLI..." -NoNewline
try {
    $aigrcVersion = aigrc --version
    Write-Host " PASS ($aigrcVersion)" -ForegroundColor Green
} catch {
    Write-Host " FAIL (not installed)" -ForegroundColor Red
    $allPassed = $false
}

# Check VS Code
Write-Host "Checking VS Code..." -NoNewline
try {
    $codeVersion = code --version | Select-Object -First 1
    Write-Host " PASS (v$codeVersion)" -ForegroundColor Green
} catch {
    Write-Host " WARN (not in PATH - may still be installed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "  All required components installed!" -ForegroundColor Green
    Write-Host "  You're ready to proceed." -ForegroundColor Green
} else {
    Write-Host "  Some components missing!" -ForegroundColor Red
    Write-Host "  Please review errors above." -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
```

Run with:
```powershell
.\verify-environment.ps1
```

---

#### MACOS/LINUX (Bash)

```bash
#!/bin/bash
# verify-environment.sh
# AIGRC Environment Verification Script

echo "========================================"
echo "  AIGRC Environment Verification"
echo "========================================"
echo ""

ALL_PASSED=true

# Check Node.js
printf "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e " \033[32mPASS ($NODE_VERSION)\033[0m"
else
    echo -e " \033[31mFAIL (not installed)\033[0m"
    ALL_PASSED=false
fi

# Check npm
printf "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e " \033[32mPASS (v$NPM_VERSION)\033[0m"
else
    echo -e " \033[31mFAIL (not installed)\033[0m"
    ALL_PASSED=false
fi

# Check Git
printf "Checking Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo -e " \033[32mPASS ($GIT_VERSION)\033[0m"
else
    echo -e " \033[31mFAIL (not installed)\033[0m"
    ALL_PASSED=false
fi

# Check Git configuration
printf "Checking Git config..."
GIT_USER=$(git config user.name)
GIT_EMAIL=$(git config user.email)
if [ -n "$GIT_USER" ] && [ -n "$GIT_EMAIL" ]; then
    echo -e " \033[32mPASS ($GIT_USER <$GIT_EMAIL>)\033[0m"
else
    echo -e " \033[33mWARN (name/email not set)\033[0m"
fi

# Check AIGRC CLI
printf "Checking AIGRC CLI..."
if command -v aigrc &> /dev/null; then
    AIGRC_VERSION=$(aigrc --version)
    echo -e " \033[32mPASS ($AIGRC_VERSION)\033[0m"
else
    echo -e " \033[31mFAIL (not installed)\033[0m"
    ALL_PASSED=false
fi

# Check VS Code
printf "Checking VS Code..."
if command -v code &> /dev/null; then
    CODE_VERSION=$(code --version | head -1)
    echo -e " \033[32mPASS (v$CODE_VERSION)\033[0m"
else
    echo -e " \033[33mWARN (not in PATH)\033[0m"
fi

echo ""
echo "========================================"
if [ "$ALL_PASSED" = true ]; then
    echo -e "  \033[32mAll required components installed!\033[0m"
    echo -e "  \033[32mYou're ready to proceed.\033[0m"
else
    echo -e "  \033[31mSome components missing!\033[0m"
    echo -e "  \033[31mPlease review errors above.\033[0m"
fi
echo "========================================"
```

Make executable and run:
```bash
chmod +x verify-environment.sh
./verify-environment.sh
```

---

### 4.2 Expected Verification Output

```
========================================
  AIGRC Environment Verification
========================================

Checking Node.js... PASS (v20.11.0)
Checking npm... PASS (v10.2.4)
Checking Git... PASS (git version 2.43.0)
Checking Git config... PASS (Your Name <your.email@company.com>)
Checking AIGRC CLI... PASS (@aigrc/cli version 0.2.0)
Checking VS Code... PASS (v1.85.1)

========================================
  All required components installed!
  You're ready to proceed.
========================================
```

---

## 5. First Operations Test

Let's verify everything works together with a real test.

### 5.1 Create a Test Project

```bash
# Create and enter a test directory
mkdir aigrc-test
cd aigrc-test

# Initialize a Git repository
git init

# Initialize AIGRC
aigrc init
```

**Expected output:**
```
Initialized empty Git repository in /path/to/aigrc-test/.git/
✓ Created .aigrc.yaml configuration file
✓ Created .aigrc/ directory
✓ AIGRC initialized successfully
```

### 5.2 View the Configuration

```bash
# List created files
ls -la

# View the configuration
cat .aigrc.yaml
```

**Expected output:**
```yaml
apiVersion: aigrc.io/v1
kind: Config
metadata:
  name: aigrc-test
spec:
  scan:
    include:
      - "**/*"
    exclude:
      - "node_modules/**"
      - ".git/**"
  policies:
    default: warn
```

### 5.3 Run Your First Scan

```bash
aigrc scan
```

**Expected output:**
```
Scanning aigrc-test...

AI Asset Discovery Report
═══════════════════════════════════════════════════
Total Assets Found: 0
No AI assets detected in this directory.

Tip: This is expected for an empty project.
     Add AI/ML code to see detection results.
```

**✓ CHECKPOINT:** AIGRC scan completes without errors.

### 5.4 Clean Up Test Project

```bash
cd ..
rm -rf aigrc-test
```

---

## 6. Troubleshooting Guide

### 6.1 Common Issues and Solutions

#### Node.js Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `node: command not found` | Not in PATH | Reinstall Node.js ensuring PATH option is checked |
| `node: permission denied` | File permissions | **Linux/macOS:** Use `sudo` or fix npm permissions |
| Multiple Node versions | Multiple installations | Use nvm (Node Version Manager) to manage versions |
| Old Node version | Outdated installation | Download and install latest LTS from nodejs.org |

#### npm Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `EACCES` permission errors | Global install permissions | **macOS/Linux:** Configure npm to use a different directory or use sudo |
| `ENOENT` errors | Corrupted cache | Run `npm cache clean --force` |
| Proxy/network errors | Corporate firewall | Configure npm proxy: `npm config set proxy http://proxy:port` |
| Package not found | Registry access | Check `npm config get registry` returns `https://registry.npmjs.org/` |

#### Git Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `git: command not found` | Not installed or not in PATH | Reinstall Git |
| SSL certificate errors | Corporate proxy/firewall | `git config --global http.sslVerify false` (temporary) |
| Permission denied (publickey) | SSH not configured | Use HTTPS URLs or configure SSH keys |

#### AIGRC CLI Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `aigrc: command not found` | Not in PATH | Close and reopen terminal, or check npm global path |
| `Cannot find module` | Incomplete installation | Uninstall (`npm uninstall -g @aigrc/cli`) and reinstall |
| Scan finds nothing | Wrong directory | Ensure you're in a directory with AI/ML code |

### 6.2 Getting Help

If you can't resolve an issue:

1. **Check the FAQ:** Partner Portal → Support → FAQ
2. **Search Slack:** `#partner-support` channel archives
3. **Open a ticket:** Partner Portal → Support → New Ticket
4. **Office hours:** Wednesdays 2pm ET

When reporting issues, include:
- Operating system and version
- Output of verification script
- Exact error message
- Steps to reproduce

---

## 7. Hands-On Exercise

### Exercise P-01: Environment Setup Verification

**Objective:** Confirm your complete environment is ready for AIGRC training.

**Time:** 30 minutes

**Instructions:**

1. Run the verification script from Section 4.1
2. Screenshot the results
3. If any component fails:
   - Follow the troubleshooting guide
   - Re-run verification
   - Screenshot successful verification

4. Create a test project:
   ```bash
   mkdir partner-exercise-p01
   cd partner-exercise-p01
   git init
   aigrc init
   aigrc scan
   ```

5. Screenshot the scan output

6. Clean up:
   ```bash
   cd ..
   rm -rf partner-exercise-p01
   ```

**Submission:**
Upload screenshots to Partner Portal → Training → Module P-01

**Success Criteria:**
- [ ] All verification checks pass (or WARN with explanation)
- [ ] AIGRC scan completes successfully
- [ ] Screenshots uploaded

---

## 8. Knowledge Check

### Quiz: Module P-01

1. What command verifies Node.js is installed?
   - A) `node -v`
   - B) `node --version`
   - C) Both A and B
   - D) `npm node version`

2. Why do we install AIGRC CLI with the `-g` flag?
   - A) It's faster
   - B) It installs globally, available from any directory
   - C) It installs the GUI version
   - D) It's required for licensing

3. What file does `aigrc init` create?
   - A) `package.json`
   - B) `.aigrc.yaml`
   - C) `config.json`
   - D) `.gitignore`

4. If `aigrc: command not found` appears after installation, what should you try first?
   - A) Reinstall Node.js
   - B) Close and reopen your terminal
   - C) Restart your computer
   - D) Contact support

5. What is the minimum Node.js version required for AIGRC?
   - A) v14
   - B) v16
   - C) v18
   - D) v20

**Answers:** 1-C, 2-B, 3-B, 4-B, 5-C

---

## 9. Next Steps

**Congratulations!** Your development environment is ready.

**Continue to:**
- **Module P-02:** Understanding the AIGOS Ecosystem
- **Module P-03:** GRC Fundamentals for AI Systems

**Or jump to:**
- **Module C-01:** AIGRC CLI - Complete Guide (if you're eager to start using the CLI)

---

## 10. Reference

### Command Quick Reference

| Command | Purpose |
|---------|---------|
| `node --version` | Check Node.js version |
| `npm --version` | Check npm version |
| `git --version` | Check Git version |
| `aigrc --version` | Check AIGRC CLI version |
| `aigrc --help` | Show all AIGRC commands |
| `aigrc init` | Initialize AIGRC in current directory |
| `aigrc scan` | Scan for AI assets |

### File Locations

| File | Purpose | Location |
|------|---------|----------|
| Node.js | Runtime | Windows: `C:\Program Files\nodejs\` |
| npm cache | Package cache | `~/.npm/` or `%AppData%\npm-cache\` |
| Git config | User settings | `~/.gitconfig` |
| AIGRC CLI | Executable | npm global directory |
| PowerShell profile | Shell config | `$HOME\Documents\PowerShell\Microsoft.PowerShell_profile.ps1` |
| Bash profile | Shell config | `~/.bashrc` or `~/.zshrc` |

### Useful Links

- Node.js: https://nodejs.org/
- Git: https://git-scm.com/
- VS Code: https://code.visualstudio.com/
- AIGRC Documentation: https://docs.aigos.io/
- Partner Portal: https://partners.aigos.io/

---

*Module P-01 Complete. Proceed to Module P-02.*
