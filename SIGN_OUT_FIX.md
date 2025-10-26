# Sign Out Fix - Version 83

## Files Changed

### 1. src/lib/supabase.ts
Replace lines 10-11 with:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase-auth',
    storage: window.localStorage,
  },
});
```

### 2. src/contexts/AuthContext.tsx
Replace the `signOut` function (around line 90-93) with:

```typescript
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    localStorage.removeItem('supabase-auth');
    window.location.href = '/';
  }
}
```

## What This Fixes

1. **Proper Auth Configuration**: Explicitly configures Supabase client with localStorage persistence
2. **Session Clearing**: Properly calls Supabase's signOut() to invalidate the session on the server
3. **Token Removal**: Removes the auth token from localStorage before redirecting
4. **Error Handling**: Added try-catch to handle any sign out errors gracefully

## Deployment Steps

1. Apply the changes above to your local files
2. Run: `npm run build`
3. Copy dist/* to VPS: `scp -r dist/* root@77.37.67.253:/var/www/html/`
4. Restart Nginx: `ssh root@77.37.67.253 "systemctl restart nginx"`
