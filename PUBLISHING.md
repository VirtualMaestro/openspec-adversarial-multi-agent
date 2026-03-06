# Publishing to NPM

## Prerequisites

1. NPM account (create at https://www.npmjs.com/signup)
2. Verify email address
3. Login via CLI: `npm login`

## Publishing Steps

### 1. Verify Package

```bash
# Check package contents
npm pack --dry-run

# Test installation locally
npm link
openspec-adversarial-multi-agent
```

### 2. Publish to NPM

```bash
# First time publish
npm publish

# For updates (after changing version in package.json)
npm version patch  # or minor, or major
npm publish
```

### 3. Verify Published Package

```bash
# Test with npx (wait a few minutes for npm registry to update)
npx openspec-adversarial-multi-agent

# Check package page
# https://www.npmjs.com/package/openspec-adversarial-multi-agent
```

## Version Management

Follow semantic versioning:
- **Patch** (1.0.1): Bug fixes, no breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
npm publish
```

## Troubleshooting

### "Package name already taken"
- Choose a different name in package.json
- Or use scoped package: `@yourusername/openspec-adversarial-multi-agent`

### "You must be logged in"
```bash
npm login
# Enter username, password, email
```

### "403 Forbidden"
- Verify email address on npmjs.com
- Check if package name is available
- Ensure you have publish permissions

## Post-Publish

1. Update README.md with npm badge:
   ```markdown
   ![npm version](https://img.shields.io/npm/v/openspec-adversarial-multi-agent)
   ```

2. Test installation on clean system:
   ```bash
   npx openspec-adversarial-multi-agent
   ```

3. Monitor downloads and issues:
   - https://www.npmjs.com/package/openspec-adversarial-multi-agent
