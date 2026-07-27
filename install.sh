#!/bin/bash

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print a full screen width divider
print_divider() {
    local width=$(tput cols)
    [ -z "$width" ] && width=80
    printf "${CYAN}"
    printf '%.0s' $(seq 1 "$width")
    printf "${NC}\n"
}

# Function to print centered text across the full screen width
print_center() {
    local text="$1"
    local color="$2"
    local width=$(tput cols)
    [ -z "$width" ] && width=80
    local padding=$(( (width - ${#text}) / 2 ))
    if [ $padding -lt 0 ]; then padding=0; fi
    printf "${color}"
    printf '%.0s' $(seq 1 "$padding")
    printf "%s\n" "$text"
    printf "${NC}"
}

# Clear terminal screen for a fresh full-screen look
clear

print_divider
print_center "ARMS Project Setup Script" "${CYAN}${BOLD}"
print_divider
echo ""

# ENVIRONMENT DETECTION ENGINE
IS_TERMUX=false
IS_PROOT=false
SHELL_RC="$HOME/.bashrc"

# 1. Detect if Native Termux
if [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    print_center "[!] Environment Detected: Native Termux" "${CYAN}"
fi

# 2. Detect if PRoot Distro
if [ -f "/usr/bin/proot-distro" ] || [ -d "/usr/share/proot-distro" ] || grep -q "proot" /proc/1/environ 2>/dev/null || [ "$PREFIX" = "" -a -d "/usr/share" -a ! -d "/data/data/com.termux" ]; then
    # Double check if we are inside the guest container
    if [ -f /etc/os-release ] && grep -qi "kali" /etc/os-release; then
        IS_PROOT=true
        print_center "[!] Environment Detected: PRoot Distro (Kali Linux)" "${CYAN}"
    fi
fi

# 3. Detect Shell Type (Bash vs Zsh)
if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
    print_center "[*] Shell Target: Zsh ($SHELL_RC)" "${CYAN}"
else
    print_center "[*] Shell Target: Bash ($SHELL_RC)" "${CYAN}"
fi
echo ""

# NODE.JS & NPM INSTALLATION LOGIC
print_center "[...] Checking for Node.js..." "${YELLOW}"

if ! command -v node &> /dev/null; then
    print_center "[!] Node.js is not installed." "${RED}"
    
    if [ "$IS_TERMUX" = true ]; then
        # Termux Native Deployment
        print_center "[...] Installing Node.js via pkg (Termux)..." "${YELLOW}"
        echo ""
        pkg update -y && pkg install nodejs -y
        
    elif [ "$IS_PROOT" = true ]; then
        # PRoot Distro Deployment via NVM to avoid broken APT modules
        print_center "[...] PRoot environment detected. Deploying NVM..." "${YELLOW}"
        echo ""
        
        # Ensure curl is present
        if ! command -v curl &> /dev/null; then
            apt update && apt install curl -y
        fi
        
        # Install NVM
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        
        # Manually export paths for the current execution block
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Write to the correct RC file (Bash or Zsh)
        if ! grep -q "NVM_DIR" "$SHELL_RC"; then
            echo 'export NVM_DIR="$HOME/.nvm"' >> "$SHELL_RC"
            echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$SHELL_RC"
            echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> "$SHELL_RC"
        fi
        
        # Install Node v24 using NVM
        nvm install 24
        nvm use 24
    else
        # Standard Debian/Ubuntu Linux fallback
        print_center "[...] Installing Node.js via apt..." "${YELLOW}"
        echo ""
        apt update && apt install nodejs npm -y
    fi

    # Verify if installation succeeded
    if command -v node &> /dev/null; then
        echo ""
        print_center "[✓] Node.js successfully installed! ($(node -v))" "${GREEN}${BOLD}"
    else
        echo ""
        print_divider
        print_center "[X] AUTOMATED INSTALLATION FAILED" "${RED}${BOLD}"
        print_center "Please source your config or restart the terminal, then run manually." "${YELLOW}"
        print_divider
        exit 1
    fi
else
    print_center "[✓] Node.js is already installed ($(node -v))" "${GREEN}${BOLD}"
fi

echo ""

# PROJECT DEPENDENCIES INSTALLATION
if [ -f "package.json" ]; then
    print_center "[...] Installing project dependencies (generating node_modules)..." "${YELLOW}"
    echo ""
    
    # Run npm install (NVM context or global context)
    npm install
    
    if [ $? -eq 0 ]; then
        echo ""
        print_divider
        print_center "[✓] Setup complete! All dependencies installed." "${GREEN}${BOLD}"
        print_center "👉 To start your app, run: npm run dev" "${YELLOW}${BOLD}"
        print_divider
    else
        echo ""
        print_center "[X] Error occurred during npm install." "${RED}${BOLD}"
        exit 1
    fi
else
    echo ""
    print_center "[X] Error: package.json not found in this directory!" "${RED}${BOLD}"
    exit 1
fi
