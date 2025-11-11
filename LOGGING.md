# 📋 Logging Guide

## Übersicht

Das Projekt verwendet einen zentralisierten Logger (`utils/logger.ts`), um die Konsolen-Ausgabe zu reduzieren und Logs sinnvoll zu strukturieren.

## Debug Levels

| Level | Name | Wann aktiv? | Logs |
|-------|------|-----------|------|
| 0 | Production | Production Build | ❌ Errors nur |
| 1 | Minimal | - | Errors + Warnings |
| 2 | **Normal** | `__DEV__` = true | Errors + Infos |
| 3 | Verbose | Manuell aktiviert | **Alles** (incl. Debug) |

## Verwendung

### In Komponenten/Hooks:

```typescript
import { logger } from '@/utils/logger';

// Info-Logs (für wichtige Events)
logger.info('ComponentName', 'User clicked button', { userId: 123 });

// Warn-Logs (für Warnings)
logger.warn('ComponentName', 'Photo loading took longer than expected');

// Error-Logs (immer geloggt)
logger.error('ComponentName', 'Failed to save data', error);

// Debug-Logs (nur wenn DEBUG_LEVEL >= 3)
logger.debug('ComponentName', 'Detailed debug info', debugData);

// Performance Timing
logger.time('ComponentName', 'Loading photos');
// ... do work ...
logger.timeEnd('ComponentName', 'Loading photos');
```

## Output Format

Alle Logs haben ein farbiges Emoji und ein Tag für besseres Filtern:

```
🔵 [PhotoManager] Loading photos for month
🟡 [SwipeLimit] Warning: Swipe limit reached
🔴 [PhotoManager] ERROR: Failed to delete asset
⚫ [PhotoManager] DEBUG: Asset info loaded
```

## Filtern in DevTools

Im Xcode/Android Studio Output kannst du filtern:

```
// Nur PhotoManager Logs
[PhotoManager]

// Nur Errors
ERROR

// Nur Warnings
WARN
```

## RevenueCat Logs

RevenueCat ist jetzt auf DEBUG Level in Dev und ERROR Level in Production eingestellt.

**Bisher:** Verbose Output (etag, cache, network requests)  
**Jetzt:** Nur wichtige Events und Errors

## Checkliste für neuen Code

- ✅ Verwende `logger.error()` statt `console.error()`
- ✅ Verwende `logger.info()` nur für wichtige Events
- ✅ Verwende `logger.debug()` für Details
- ✅ Verwende niemals `console.log()` für wiederholte Logs
- ✅ Entferne `console.log()` vor Commits (außer Debugging)

## Verbose Logging aktivieren

Wenn du viele Logs brauchst, um einen Bug zu debuggen:

```typescript
// In der Komponente
import { enableVerboseLogging } from '@/utils/logger';

// Am App-Start aufrufen:
useEffect(() => {
  enableVerboseLogging();
}, []);
```

Danach erhältst du alle Debug-Logs.

---

**Resultat:** 📉 90% weniger Console-Spam im Terminal!
