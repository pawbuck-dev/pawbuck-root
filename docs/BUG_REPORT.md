# Pawbuck Codebase Bug Report

**Generated:** January 2025  
**Scan Type:** Comprehensive codebase analysis  
**Status:** Ready for Review

---

## 🔴 CRITICAL BUGS

### 1. Missing Theme Import in `app/transfer-pet/step3.tsx`
**File:** `app/transfer-pet/step3.tsx`  
**Lines:** 22, 23, 29, 38  
**Severity:** CRITICAL - Will cause runtime error

**Issue:**
The component uses `theme`, `mode`, and `isDarkMode` but they are not imported or defined.

**Current Code:**
```typescript
return (
  <View className="flex-1" style={{ backgroundColor: theme.background }}>
    <StatusBar style={mode === "dark" ? "light" : "dark"} />
    // ... uses isDarkMode on line 38
```

**Fix:**
```typescript
import { useTheme } from "@/context/themeContext";

export default function TransferPetStep3() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const { transferCode } = useLocalSearchParams<{ transferCode: string }>();
  // ... rest of code
```

---

### 2. Hardcoded Dark Theme Colors in `app/join-household/step3.tsx`
**File:** `app/join-household/step3.tsx`  
**Lines:** 23, 24, 30, 39, 76, 84, 98  
**Severity:** MEDIUM - UI inconsistency, doesn't respect theme

**Issue:**
Component uses hardcoded dark theme colors instead of theme context.

**Current Code:**
```typescript
<View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
  <StatusBar style="light" />
  <Text style={{ color: "#FFFFFF" }}>
  <Text style={{ color: "#9CA3AF" }}>
  style={{ backgroundColor: "#1F1F1F" }}
  style={{ backgroundColor: "#5FC4C0" }}
```

**Fix:**
```typescript
import { useTheme } from "@/context/themeContext";

export default function JoinHouseholdStep3() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  // ... then use theme.background, theme.foreground, etc.
```

---

## 🟡 MEDIUM PRIORITY BUGS

### 3. Potential Race Condition in Chat Context
**File:** `context/chatContext.tsx`  
**Line:** 138  
**Severity:** MEDIUM - Could cause stale closure issues

**Issue:**
`sendMessage` callback includes `messages` in dependency array, which could cause stale closures or infinite loops if messages change frequently.

**Current Code:**
```typescript
}, [messages, selectedPet]);
```

**Fix:**
Use functional state updates to avoid dependency on `messages`:
```typescript
setMessages((prev) => {
  const history = [...prev, userMessage].slice(-10).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
  // ... rest of logic
});
// Then dependency array becomes:
}, [selectedPet]);
```

---

### 4. Missing Null Check in Home Screen
**File:** `app/(home)/home.tsx`  
**Line:** 115  
**Severity:** MEDIUM - Potential runtime error if vet_information_id is null

**Issue:**
Non-null assertion (`!`) used without proper null check, even though `enabled` checks for it.

**Current Code:**
```typescript
queryFn: () => getVetInformation(selectedPet!.vet_information_id!),
enabled: !!selectedPet?.vet_information_id,
```

**Fix:**
```typescript
queryFn: () => {
  if (!selectedPet?.vet_information_id) {
    throw new Error("No vet information ID");
  }
  return getVetInformation(selectedPet.vet_information_id);
},
```

---

### 5. Potential Memory Leak in Notification Handler
**File:** `hooks/useNotificationHandler.ts`  
**Lines:** 10-17, 19-29  
**Severity:** LOW-MEDIUM - Async operations not cleaned up

**Issue:**
Async operations in `useEffect` don't have cleanup or cancellation. If component unmounts during async operation, state updates could occur on unmounted component.

**Current Code:**
```typescript
useEffect(() => {
  const registerForPushToken = async () => {
    const token = await registerForPush();
    setPushToken(token);
  };
  registerForPushToken();
}, []);
```

**Fix:**
```typescript
useEffect(() => {
  let isMounted = true;
  const registerForPushToken = async () => {
    const token = await registerForPush();
    if (isMounted) {
      setPushToken(token);
    }
  };
  registerForPushToken();
  return () => {
    isMounted = false;
  };
}, []);
```

---

### 6. Incomplete Rollback in Pet Transfer
**File:** `services/petTransfers.ts`  
**Lines:** 213-223  
**Severity:** MEDIUM - Partial rollback could leave data inconsistent

**Issue:**
If rollback fails, the transfer could be left in an inconsistent state (marked as used but pet not transferred).

**Current Code:**
```typescript
if (petUpdateError) {
  // Rollback: reactivate the transfer
  await supabase
    .from("pet_transfers")
    .update({
      used_at: null,
      to_user_id: null,
      is_active: true,
    })
    .eq("id", transfer.id);
  throw petUpdateError;
}
```

**Fix:**
```typescript
if (petUpdateError) {
  // Rollback: reactivate the transfer
  const { error: rollbackError } = await supabase
    .from("pet_transfers")
    .update({
      used_at: null,
      to_user_id: null,
      is_active: true,
    })
    .eq("id", transfer.id);
  
  if (rollbackError) {
    console.error("Critical: Failed to rollback transfer", rollbackError);
    // Log to error tracking service
  }
  
  throw petUpdateError;
}
```

---

### 7. Similar Rollback Issue in Household Invites
**File:** `services/householdInvites.ts`  
**Lines:** 203-213  
**Severity:** MEDIUM - Same issue as pet transfer

**Issue:**
Rollback doesn't check for errors, could leave inconsistent state.

**Fix:**
Same as bug #6 - add error checking for rollback operation.

---

## 🟢 LOW PRIORITY / CODE QUALITY ISSUES

### 8. Unused Import in `app/join-household/step3.tsx`
**File:** `app/join-household/step3.tsx`  
**Line:** 3  
**Severity:** LOW - Code quality

**Issue:**
`useEffect` is imported but never used.

**Fix:**
Remove unused import.

---

### 9. Unused Variable in `app/transfer-pet/step3.tsx`
**File:** `app/transfer-pet/step3.tsx`  
**Line:** 13  
**Severity:** LOW - Code quality

**Issue:**
`transferCode` is extracted from params but never used.

**Fix:**
Remove if not needed, or use it for display/logging.

---

### 10. Non-null Assertions Without Checks
**File:** `app/(home)/home.tsx`  
**Lines:** 101, 108, 115, 122, 130, 143, 154  
**Severity:** LOW - Code quality, potential runtime errors

**Issue:**
Multiple uses of non-null assertion operator (`!`) without explicit null checks, even though `enabled` flags provide some protection.

**Examples:**
```typescript
queryFn: () => getVaccinationsByPetId(selectedPetId!),
queryFn: () => fetchMedicines(selectedPetId!),
queryFn: () => getCareTeamMembersForPet(selectedPetId!),
```

**Recommendation:**
Add explicit null checks in queryFn or use optional chaining with fallbacks.

---

### 11. Potential Stale Data in Messages Screen
**File:** `app/(home)/messages.tsx`  
**Lines:** 66-73  
**Severity:** LOW - Edge case

**Issue:**
Route params are cleared immediately, but if user navigates back quickly, the email param might be lost.

**Current Code:**
```typescript
React.useEffect(() => {
  if (params.email) {
    setInitialRecipientEmail(params.email);
    setShowNewMessageModal(true);
    router.setParams({ email: undefined });
  }
}, [params.email]);
```

**Recommendation:**
Consider using a ref or state to track if modal was already opened to prevent re-opening.

---

### 12. Missing Error Handling in Async Operations
**File:** Multiple files  
**Severity:** LOW - Code quality

**Issue:**
Several async operations don't have comprehensive error handling or user feedback.

**Examples:**
- `app/(home)/home.tsx` - Refresh operations
- Various mutation error handlers could be more specific

**Recommendation:**
Add user-friendly error messages and logging for all async operations.

---

## 📊 Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Needs immediate fix |
| 🟡 Medium | 5 | Should be fixed soon |
| 🟢 Low | 6 | Code quality improvements |

**Total Issues Found:** 12

---

## 🔧 Recommended Fix Order

1. **Fix Bug #1** (Critical) - Missing theme import in transfer-pet/step3.tsx
2. **Fix Bug #2** (Medium) - Theme consistency in join-household/step3.tsx
3. **Fix Bug #6 & #7** (Medium) - Improve rollback error handling
4. **Fix Bug #3** (Medium) - Chat context race condition
5. **Fix Bug #4** (Medium) - Null checks in home screen
6. **Fix Bug #5** (Medium) - Memory leak prevention
7. **Fix remaining low priority issues** - Code quality improvements

---

## ✅ Verification Checklist

After fixing bugs, verify:
- [ ] All theme-related components work in both light and dark mode
- [ ] Pet transfer flow works correctly with error handling
- [ ] Household invite flow works correctly with error handling
- [ ] Chat functionality doesn't have stale closure issues
- [ ] No memory leaks in notification handlers
- [ ] All null checks are properly implemented
- [ ] Error messages are user-friendly
- [ ] No console errors in development

---

## 📝 Notes

- Most bugs are related to:
  - Missing imports/dependencies
  - Theme consistency
  - Error handling improvements
  - Memory leak prevention
  - Code quality

- No security vulnerabilities found in this scan
- No critical data loss risks identified
- All bugs are fixable without major refactoring

---

**Next Steps:**
1. Review this bug list
2. Prioritize fixes based on your needs
3. Create tickets/issues for tracking
4. Test fixes thoroughly before deployment

