# 🏸 Badminton 8somes

A React TypeScript web application for organizing badminton doubles tournaments with automatic match scheduling and payment calculation.

## Features

- **8-Player Round-Robin Tournament**: Automatically generates 7 rounds where each player partners with every other player exactly once
- **Interactive Match Tracking**: Click to select winners for each game
- **Payment Calculator**: Automatically calculates who owes what based on wins/losses and wager amount
- **Responsive Design**: Works on desktop and mobile devices
- **Clean UI**: Modern, intuitive interface for easy tournament management

## How It Works

### Tournament Structure
- Enter 8 player names
- Set a wager amount per game
- The app generates 7 rounds with 2 games per round (14 total games)
- Each player plays 7 games total, partnering with each other player once

### Match Play
- Navigate through rounds
- Click on the winning team for each game
- Track progress as games are completed

### Results & Payouts
- View player statistics (wins, losses, win rate)
- See payment calculations based on wins/losses
- Winners receive money, losers pay money
- The payment system is balanced (total paid = total received)

## Local Development

### Prerequisites
- Node.js (version 20.19+ or 22.12+ recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/badminton-8somes.git
cd badminton-8somes

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Steps

1. **Create a GitHub repository** named `badminton-8somes`

2. **Initialize git and push** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/badminton-8somes.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Under "Build and deployment", select "GitHub Actions" as the source

4. **Configure the base path** (if your repo name is different):
   - Edit `vite.config.ts` and update the `base` field to match your repository name:
     ```typescript
     base: '/YOUR_REPO_NAME/',
     ```

5. **Push changes** and the GitHub Action will automatically build and deploy your app

Your app will be available at: `https://YOUR_USERNAME.github.io/badminton-8somes/`

### Manual Deployment

You can also deploy manually using gh-pages:

```bash
npm run deploy
```

This will build the app and push it to the `gh-pages` branch.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **CSS3** - Styling
- **GitHub Pages** - Hosting
- **GitHub Actions** - CI/CD

## Project Structure

```
badminton-8somes/
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.css           # Application styles
│   ├── index.css         # Global styles
│   └── utils/
│       └── scheduler.ts  # Tournament scheduling logic
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions deployment workflow
├── public/               # Static assets
├── dist/                 # Production build output
└── package.json          # Dependencies and scripts
```

## Payment Calculation

The payment system is straightforward:
- Each player pays the wager amount for each game they lose
- Each player receives the wager amount for each game they win
- Net payment = (Wins - Losses) × Wager Amount

Example with $10 wager:
- Player with 5 wins and 2 losses: +$30 (receives)
- Player with 3 wins and 4 losses: -$10 (pays)

## License

MIT License - feel free to use this for your badminton group!

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Support

If you encounter any issues or have suggestions, please open an issue on GitHub.
