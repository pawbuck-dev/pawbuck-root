# Authentication and State Management Architecture

This document explains the authentication and state management setup in the PawBuck React Native app.

## Overview

The app uses a layered architecture with custom hooks and context providers to manage authentication and user data:

```
┌─────────────────────────────────────────┐
│         App Components                  │
│  (index, login, signup, home, etc.)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         UserContext                     │
│  (Combines auth + pets state)          │
└────────┬───────────────┬────────────────┘
         │               │
┌────────▼────────┐ ┌───▼─────────────────┐
│   useAuth Hook  │ │   usePets Hook      │
│  (Auth state)   │ │  (Pet data)         │
└────────┬────────┘ └───┬─────────────────┘
         │               │
┌────────▼───────────────▼─────────────────┐
│         Supabase Client                  │
│    (Database & Authentication)           │
└──────────────────────────────────────────┘
```

## Custom Hooks

### 1. `useAuth` Hook (`hooks/useAuth.ts`)

Manages all authentication-related state and operations.

**Features:**
- Tracks current authenticated user
- Manages authentication loading and error states
- Provides `signOut` method
- Listens to auth state changes
- Auto-initializes on mount

**Usage:**
```tsx
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { user, loading, isAuthenticated, signOut } = useAuth();
  
  if (loading) return <ActivityIndicator />;
  
  return (
    <View>
      <Text>Welcome {user?.email}</Text>
      <Button onPress={signOut} title="Sign Out" />
    </View>
  );
}
```

### 2. `usePets` Hook (`hooks/usePets.ts`)

Manages all pet-related state and operations.

**Features:**
- Fetches pets for a specific user
- Manages loading and error states
- Provides `refreshPets` and `addPet` methods
- Auto-fetches when userId changes (configurable)
- Clears local state when userId becomes null

**Usage:**
```tsx
import { usePets } from "@/hooks/usePets";

function PetList({ userId }: { userId: string }) {
  const { pets, loading, refreshPets, addPet } = usePets(userId);
  
  if (loading) return <ActivityIndicator />;
  
  return (
    <View>
      {pets.map(pet => (
        <Text key={pet.id}>{pet.name}</Text>
      ))}
      <Button onPress={refreshPets} title="Refresh" />
    </View>
  );
}
```

## Context Providers

### UserContext (`context/userContext.tsx`)

The main context that combines authentication and pet data into a single, easy-to-use API.

**What it provides:**
- `user` - Currently authenticated user
- `pets` - Array of user's pets
- `loading` - Combined loading state (auth + pets)
- `error` - Combined error state
- `isAuthenticated` - Boolean flag for auth status
- `refreshPets()` - Refresh pet data
- `addPet()` - Add a new pet
- `signOut()` - Sign out the current user

**Setup in `app/_layout.tsx`:**
```tsx
export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </UserProvider>
    </ThemeProvider>
  );
}
```

**Usage in Components:**
```tsx
import { useUser } from "@/context/userContext";

function MyComponent() {
  const { user, pets, loading, isAuthenticated, signOut } = useUser();
  
  // Your component logic here
}
```

## Navigation Guards

The app implements authentication-based navigation guards to ensure proper user flow:

### Protected Routes

**Index Page (`app/index.tsx`):**
- Checks if user is authenticated on load
- If authenticated → redirects to `/(tabs)/home`
- If not authenticated → shows welcome screen
- Shows loading spinner during auth check

**Login Page (`app/login.tsx`):**
- Checks if user is authenticated on load
- If authenticated → redirects to `/(tabs)/home`
- If not authenticated → shows login form
- Prevents logged-in users from accessing login

**Signup Page (`app/signup.tsx`):**
- Checks if user is authenticated on load
- If authenticated → redirects to `/(tabs)/home`
- If not authenticated → shows signup form
- Prevents logged-in users from accessing signup

### User Flow

```
┌─────────────┐
│   Index     │
│  (Welcome)  │
└──────┬──────┘
       │
       ├─► Authenticated? ──Yes──► /(tabs)/home
       │
       └─► No
           │
           ├─► "Get Started" ──► Onboarding ──► Signup ──► Home
           │
           └─► "Login" ──► Login ──► Home
```

### Preventing Back Navigation

Once a user is logged in and navigated to the home screen:
1. The welcome, login, and signup screens redirect to home
2. Users cannot navigate back to these screens while authenticated
3. They must sign out to access these screens again
4. Sign out redirects to the index (welcome) page

## Data Flow

### On App Launch

1. `UserProvider` mounts
2. `useAuth` initializes and checks for existing session
3. If session exists:
   - Sets `user` state
   - `usePets` auto-fetches pets for the user
4. If no session:
   - Sets `user` to `null`
   - `usePets` clears any local pet data

### On Login

1. User enters credentials in login/signup screen
2. Supabase authentication is called
3. `useAuth` listener detects auth state change
4. `user` state is updated
5. `usePets` detects `userId` change and fetches pets
6. Navigation guard redirects to home
7. Home screen renders with user and pet data

### On Logout

1. User clicks sign out
2. `signOut()` method is called
3. Supabase signs out the user
4. `useAuth` listener detects sign out event
5. `user` state is set to `null`
6. `usePets` clears local pet data
7. User is redirected to index (welcome) page

### Adding a Pet

1. User completes onboarding or uses add pet feature
2. `addPet()` method is called with pet data
3. Pet is created in Supabase database
4. New pet is added to local `pets` array
5. UI updates immediately to show new pet

## File Structure

```
pawbuck-react-native/
├── hooks/
│   ├── useAuth.ts           # Authentication hook
│   ├── usePets.ts           # Pet management hook
│   ├── usePets.example.tsx  # Usage examples
│   └── index.ts             # Hook exports
├── context/
│   ├── userContext.tsx      # Main user context
│   ├── themeContext.tsx     # Theme context
│   └── onboardingContext.tsx # Onboarding context
├── services/
│   └── pets.ts              # Pet API service
├── app/
│   ├── index.tsx            # Welcome screen (with guard)
│   ├── login.tsx            # Login screen (with guard)
│   ├── signup.tsx           # Signup screen (with guard)
│   ├── _layout.tsx          # Root layout with providers
│   └── (tabs)/
│       └── home.tsx         # Home screen
└── utils/
    └── supabase.ts          # Supabase client
```

## Best Practices

### Using the Context

✅ **Do:**
```tsx
// Use the combined context for convenience
const { user, pets, isAuthenticated, signOut } = useUser();
```

❌ **Don't:**
```tsx
// Don't call Supabase auth directly in components
await supabase.auth.signOut();

// Use the context method instead
await signOut();
```

### Component Patterns

**Loading States:**
```tsx
function MyComponent() {
  const { loading, pets } = useUser();
  
  if (loading) {
    return <ActivityIndicator size="large" color="#5FC4C0" />;
  }
  
  return <PetList pets={pets} />;
}
```

**Authentication Checks:**
```tsx
function MyComponent() {
  const { isAuthenticated, user } = useUser();
  
  if (!isAuthenticated) {
    return <Text>Please log in</Text>;
  }
  
  return <Text>Welcome {user.email}</Text>;
}
```

**Error Handling:**
```tsx
function MyComponent() {
  const { error, refreshPets } = useUser();
  
  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
        <Button onPress={refreshPets} title="Retry" />
      </View>
    );
  }
  
  return <PetList />;
}
```

## Testing Considerations

When testing components that use these hooks:

1. Mock the `useUser` hook to return test data
2. Mock the `useAuth` hook for authentication tests
3. Mock the `usePets` hook for pet data tests
4. Test navigation guards with different auth states

## Future Enhancements

Potential improvements:

- [ ] Add `updatePet()` and `deletePet()` methods
- [ ] Implement optimistic updates for better UX
- [ ] Add caching layer to reduce API calls
- [ ] Implement real-time subscriptions for pet updates
- [ ] Add refresh tokens handling
- [ ] Implement biometric authentication
- [ ] Add offline support with local storage

