# Supabase Setup Guide

This guide will help you set up Supabase authentication and database for your AI Council app.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and set project details:
   - **Name**: AI Council
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup to complete

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public key** (starts with `eyJ`)
   - **service_role key** (starts with `eyJ`) - Keep this secret!

## 3. Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## 4. Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste into the SQL editor and click **Run**

This will create:
- `users` table with profile information
- `conversations` table to store AI queries and responses
- `feedback` table for user ratings and comments
- Row Level Security (RLS) policies for data protection
- Automatic user profile creation trigger

## 5. Configure Authentication

### Enable Email Authentication
1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, ensure **Email** is enabled
3. Configure **Site URL**: `http://localhost:3000` (for development)
4. Add production URL when deploying: `https://your-app.vercel.app`

### Optional: Configure Email Templates
1. Go to **Authentication** → **Email Templates**
2. Customize signup confirmation and password reset emails

## 6. Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. The app should show a login/signup form
4. Create a test account and verify:
   - User can sign up and receive confirmation email
   - User can sign in after email confirmation
   - Dashboard shows user's conversation history
   - New conversations are saved to database

## 7. Verify Database Tables

In Supabase dashboard, go to **Table Editor** and verify:
- `users` table has your test user
- `conversations` table receives new entries when you run queries
- Row Level Security is working (users only see their own data)

## Database Schema Overview

### Users Table
- `id` (UUID, primary key, linked to auth.users)
- `email` (text)
- `subscription_tier` (enum: free, pro, enterprise)
- `created_at`, `updated_at` (timestamps)

### Conversations Table
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `query` (text, the user's question)
- `responses` (JSONB, stores all model responses and consensus data)
- `created_at`, `updated_at` (timestamps)

### Feedback Table
- `id` (UUID, primary key)
- `conversation_id` (UUID, foreign key to conversations)
- `user_rating` (integer, 1-5 stars)
- `comments` (text, optional)
- `created_at` (timestamp)

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Authentication Required**: API routes check for valid user sessions
- **Secure by Default**: All tables require authentication to access
- **Email Verification**: Users must confirm their email before full access

## Next Steps

1. **Deploy to Production**: Update environment variables in Vercel
2. **Email Configuration**: Set up custom SMTP for production emails
3. **Add Payment Integration**: Implement subscription tiers with Stripe
4. **Analytics**: Add usage tracking and conversation analytics
5. **Export Features**: Allow users to export their conversation history

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check your environment variables match Supabase dashboard
2. **"Not authenticated"**: Ensure user is signed in and session is valid
3. **"Row not found"**: Check RLS policies are configured correctly
4. **Email not sending**: Verify email provider settings in Supabase

### Useful SQL Queries

```sql
-- Check user count
SELECT COUNT(*) FROM auth.users;

-- Check conversation count per user
SELECT user_id, COUNT(*) as conversation_count 
FROM conversations 
GROUP BY user_id;

-- View recent conversations
SELECT users.email, conversations.query, conversations.created_at
FROM conversations 
JOIN users ON conversations.user_id = users.id
ORDER BY conversations.created_at DESC
LIMIT 10;
```

For more help, check the [Supabase documentation](https://supabase.com/docs) or create an issue in this repository.