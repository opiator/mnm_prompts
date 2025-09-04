# MNM Prompts

A simplified LLM prompt management and testing platform built with Next.js, inspired by Opik but focused on core features: prompts, datasets, and playground testing.

## Features

### ✨ Core Features
- **Prompts Management**: Create, version, and organize your LLM prompt templates
- **Datasets**: Store test data with variables for prompt testing  
- **Playground**: Interactive testing environment with multiple LLM providers
- **Provider Support**: OpenAI and Anthropic integration
- **Password Protection**: Simple password-based access control

### 🚀 Key Capabilities
- **Variable Substitution**: Use `{{variable_name}}` syntax in prompts
- **Version Control**: Track prompt changes with commit-like versioning
- **Dataset Integration**: Automatically populate variables from datasets
- **Model Comparison**: Test with different models and providers
- **Real-time Testing**: Execute prompts and see results instantly

## Quick Start

### 1. Getting Started

The development server should already be running. If not:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 2. Configure Providers

1. Go to **Settings** page at [http://localhost:3000/settings](http://localhost:3000/settings)
2. Add your API keys for OpenAI or Anthropic
3. Test the configuration in the Playground

### 3. Create Your First Prompt

1. Go to **Prompts** page at [http://localhost:3000/prompts](http://localhost:3000/prompts)
2. Click "New Prompt"
3. Create a template with variables like: `You are a helpful assistant. Help with: {{question}}`
4. Add tags and description
5. Save the prompt

### 4. Create Test Data

1. Go to **Datasets** page at [http://localhost:3000/datasets](http://localhost:3000/datasets)
2. Click "New Dataset"
3. Add items with data that matches your prompt variables
4. For example: `{"question": "What is machine learning?"}`

### 5. Test in Playground

1. Go to **Playground** at [http://localhost:3000/playground](http://localhost:3000/playground)
2. Select or paste a prompt template
3. Choose a dataset to populate variables
4. Select provider and model
5. Click "Execute" to test

## Password Protection Setup

The application includes basic password protection to restrict access. To set it up:

### 1. Generate a Secure Token
Run this command to generate a secure token:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Create Environment Variables
Create a `.env.local` file in your project root with:
```bash
# The password users will enter to access your site
SITE_PASSWORD=your-chosen-password-here

# The secure token (generated from step 1)
AUTH_SECRET=your-generated-secret-here
```

### 3. How It Works
- Users visiting any page will be redirected to `/login`
- They must enter the password you set in `SITE_PASSWORD`
- Upon successful authentication, they get a secure cookie
- The cookie expires after 24 hours
- Users can logout using the button in the navigation

### 4. Security Notes
- Never commit `.env.local` to version control
- Use different passwords/tokens for development and production
- The `AUTH_SECRET` should be at least 32 characters long
- Consider rotating tokens periodically in production

## Technologies Used

- **Framework**: Next.js 14+ with App Router
- **Database**: SQLite with Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand + TanStack Query
- **LLM Integration**: OpenAI SDK, Anthropic SDK
- **Forms**: React Hook Form + Zod validation

## Current Status

✅ **Completed Implementation:**
- [x] Next.js project with TypeScript
- [x] SQLite database with Prisma
- [x] Complete API routes for prompts, datasets, providers
- [x] Beautiful UI with shadcn/ui components
- [x] Prompt management with versioning
- [x] Dataset management
- [x] Settings page for provider configuration
- [x] Full playground interface with LLM integration
- [x] Variable substitution system
- [x] OpenAI and Anthropic provider support

🎯 **Ready to Use:**
The application is fully functional! Visit [http://localhost:3000](http://localhost:3000) to start using it.

## Database Operations

```bash
# Apply schema changes (already done)
npx prisma db push

# Generate client (already done)
npx prisma generate

# Open database GUI
npx prisma studio
```

## Next Steps

You can now:
1. **Add your API keys** in the Settings page
2. **Create prompts** with variable templates
3. **Build datasets** for testing different scenarios
4. **Test in the playground** with real LLM providers

The simplified architecture makes it easy to extend with additional features as needed!
