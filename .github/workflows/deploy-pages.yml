name: Deploy ComponentCounter to GitHub Pages

# Trigger this workflow on pushes to the 'main' branch
on:
  push:
    branches:
      - main

permissions:
  contents: read     # Required to fetch code
  pages: write       # Required to create/update Pages deployment
  id-token: write    # Required for the deploy-pages action

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Step 1: Check out the repository
      - uses: actions/checkout@v3

      # Step 2: Set up Node.js (v16 LTS recommended; adjust if needed)
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'

      # Step 3: Install dependencies (using package.json)
      - name: Install dependencies
        run: npm install

      # Step 4: Build (invokes 'npm run build' to emit static assets)
      - name: Build app
        run: npm run build

      # Step 5: Upload the generated 'dist' folder as a Pages artifact
      - name: Upload artifact for GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      # Step 6: Deploy the uploaded artifact to GitHub Pages
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
