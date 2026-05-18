# Publishing FluxDesk to the VS Code Marketplace

## One-time setup

1. Create a publisher account at https://marketplace.visualstudio.com/manage
2. Generate a Personal Access Token:
   - Go to https://dev.azure.com → User Settings → Personal Access Tokens
   - New token: name it "vsce", set Expiry to 1 year, Scope → Marketplace → Manage
   - Copy the token (shown only once)
3. Install the packaging tool:
   ```bash
   npm install -g @vscode/vsce
   ```
4. Log in:
   ```bash
   vsce login fluxdesk
   # Paste the token when prompted
   ```

## Local install (no account needed)

```bash
cd promptos-vscode
npm install
npm run package
code --install-extension fluxdesk-*.vsix
```

## Publish to Marketplace

```bash
cd promptos-vscode
npm run package     # produces fluxdesk-0.1.0.vsix
vsce publish        # publishes and bumps patch version
```

Or publish a specific version:
```bash
vsce publish minor  # bumps minor, e.g. 0.1.0 → 0.2.0
vsce publish 1.0.0  # specific version
```

## Update publisher in package.json

Before publishing, set your publisher name in `package.json`:
```json
"publisher": "your-publisher-name"
```
