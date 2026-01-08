#!/bin/bash
# Cache cleanup script for development caches
# Run with: bash scripts/cleanup-caches.sh

set -e

echo "=== Cache Cleanup Analysis ==="
echo ""

# Function to show size and ask for confirmation
clean_dir() {
    local dir=$1
    local desc=$2
    local size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "0")
    
    if [ -d "$dir" ] && [ "$size" != "0" ]; then
        echo "  $desc: $size"
        return 0
    fi
    return 1
}

echo "Current disk space:"
df -h / | tail -1
echo ""

echo "=== Caches Found ==="
echo ""

# Safe to clean (can be regenerated)
echo "SAFE TO CLEAN (can be regenerated):"
clean_dir "$HOME/.bun" "Bun package cache" && BUN_SIZE=$(du -sh "$HOME/.bun" 2>/dev/null | cut -f1)
clean_dir "$HOME/.npm" "NPM package cache" && NPM_SIZE=$(du -sh "$HOME/.npm" 2>/dev/null | cut -f1)
clean_dir "$HOME/.cache/whisper" "Whisper AI models" && WHISPER_SIZE=$(du -sh "$HOME/.cache/whisper" 2>/dev/null | cut -f1)
clean_dir "$HOME/.cache/node" "Node.js cache" && NODE_CACHE_SIZE=$(du -sh "$HOME/.cache/node" 2>/dev/null | cut -f1)
clean_dir "$HOME/.cache/prisma" "Prisma cache" && PRISMA_SIZE=$(du -sh "$HOME/.cache/prisma" 2>/dev/null | cut -f1)
clean_dir "$HOME/Library/Caches/bun" "Bun system cache" && BUN_SYS_SIZE=$(du -sh "$HOME/Library/Caches/bun" 2>/dev/null | cut -f1)
clean_dir "$HOME/Library/Caches/Homebrew" "Homebrew cache" && BREW_SIZE=$(du -sh "$HOME/Library/Caches/Homebrew" 2>/dev/null | cut -f1)

echo ""
echo "⚠️  DO NOT CLEAN (contains required config):"
echo "  OpenCode storage: REQUIRED - contains provider configs"
echo ""
echo "Safe to clean:"
clean_dir "$HOME/.cache/opencode" "OpenCode cache (node_modules only)" && OPENCODE_CACHE_SIZE=$(du -sh "$HOME/.cache/opencode" 2>/dev/null | cut -f1)
clean_dir "$HOME/.local/share/opentui" "OpenTUI tree-sitter cache" && OPENTUI_SIZE=$(du -sh "$HOME/.local/share/opentui" 2>/dev/null | cut -f1)

echo ""
echo "=== Cleanup Options ==="
echo ""
echo "1. Clean all safe caches (~4-5GB)"
echo "2. Clean OpenCode caches only (~400MB)"
echo "3. Clean package manager caches only (~3.8GB)"
echo "4. Clean Whisper models only (~800MB)"
echo "5. Custom selection"
echo "6. Exit"
echo ""
read -p "Choose option (1-6): " choice

case $choice in
    1)
        echo "Cleaning all safe caches..."
        [ -d "$HOME/.bun" ] && rm -rf "$HOME/.bun" && echo "  ✓ Cleaned Bun cache"
        [ -d "$HOME/.npm" ] && rm -rf "$HOME/.npm" && echo "  ✓ Cleaned NPM cache"
        [ -d "$HOME/.cache/whisper" ] && rm -rf "$HOME/.cache/whisper" && echo "  ✓ Cleaned Whisper models"
        [ -d "$HOME/.cache/node" ] && rm -rf "$HOME/.cache/node" && echo "  ✓ Cleaned Node cache"
        [ -d "$HOME/.cache/prisma" ] && rm -rf "$HOME/.cache/prisma" && echo "  ✓ Cleaned Prisma cache"
        [ -d "$HOME/Library/Caches/bun" ] && rm -rf "$HOME/Library/Caches/bun" && echo "  ✓ Cleaned Bun system cache"
        [ -d "$HOME/Library/Caches/Homebrew" ] && rm -rf "$HOME/Library/Caches/Homebrew" && echo "  ✓ Cleaned Homebrew cache"
        ;;
    2)
        echo "Cleaning OpenCode caches (preserving storage)..."
        [ -d "$HOME/.cache/opencode" ] && rm -rf "$HOME/.cache/opencode" && echo "  ✓ Cleaned OpenCode cache"
        [ -d "$HOME/.local/share/opentui" ] && rm -rf "$HOME/.local/share/opentui" && echo "  ✓ Cleaned OpenTUI cache"
        echo "  ⚠️  Skipped OpenCode storage (required for provider configs)"
        ;;
    3)
        echo "Cleaning package manager caches..."
        [ -d "$HOME/.bun" ] && rm -rf "$HOME/.bun" && echo "  ✓ Cleaned Bun cache"
        [ -d "$HOME/.npm" ] && rm -rf "$HOME/.npm" && echo "  ✓ Cleaned NPM cache"
        [ -d "$HOME/Library/Caches/bun" ] && rm -rf "$HOME/Library/Caches/bun" && echo "  ✓ Cleaned Bun system cache"
        ;;
    4)
        echo "Cleaning Whisper models..."
        [ -d "$HOME/.cache/whisper" ] && rm -rf "$HOME/.cache/whisper" && echo "  ✓ Cleaned Whisper models"
        ;;
    5)
        echo "Custom cleanup (select directories to clean):"
        [ -d "$HOME/.bun" ] && read -p "Clean Bun cache? (y/n): " ans && [ "$ans" = "y" ] && rm -rf "$HOME/.bun" && echo "  ✓ Cleaned"
        [ -d "$HOME/.npm" ] && read -p "Clean NPM cache? (y/n): " ans && [ "$ans" = "y" ] && rm -rf "$HOME/.npm" && echo "  ✓ Cleaned"
        [ -d "$HOME/.cache/whisper" ] && read -p "Clean Whisper models? (y/n): " ans && [ "$ans" = "y" ] && rm -rf "$HOME/.cache/whisper" && echo "  ✓ Cleaned"
        [ -d "$HOME/.cache/opencode" ] && read -p "Clean OpenCode cache? (y/n): " ans && [ "$ans" = "y" ] && rm -rf "$HOME/.cache/opencode" && echo "  ✓ Cleaned"
        echo "  ⚠️  OpenCode storage NOT included (required for provider configs)"
        [ -d "$HOME/.local/share/opentui" ] && read -p "Clean OpenTUI cache? (y/n): " ans && [ "$ans" = "y" ] && rm -rf "$HOME/.local/share/opentui" && echo "  ✓ Cleaned"
        ;;
    6)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "=== Cleanup Complete ==="
echo "New disk space:"
df -h / | tail -1

