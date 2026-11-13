/*
 * The guide's pictures (public/guide/<set>/<topic>.webp) and their size in
 * points — written by scripts/guide-shots.mjs, don't edit by hand. German,
 * English and Arabic have their own, light and dark; every other language
 * shows the English ones. A topic without a picture here shows its drawing
 * (GuideScenes.tsx).
 */
export const GUIDE_SHOT_LANGS = ['de', 'en', 'ar'] as const;

export const GUIDE_SHOTS: Record<string, Record<string, [number, number]>> = {
  "de-light": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      392
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      251
    ],
    "excel": [
      377,
      263
    ],
    "favorites": [
      377,
      300
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      300
    ],
    "lock": [
      377,
      345
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      196
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      392
    ],
    "tax": [
      377,
      400
    ]
  },
  "de-dark": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      392
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      251
    ],
    "excel": [
      377,
      263
    ],
    "favorites": [
      377,
      300
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      300
    ],
    "lock": [
      377,
      345
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      196
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      392
    ],
    "tax": [
      377,
      400
    ]
  },
  "en-light": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      370
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      269
    ],
    "excel": [
      377,
      245
    ],
    "favorites": [
      377,
      275
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      318
    ],
    "lock": [
      377,
      361
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      144
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      392
    ],
    "tax": [
      377,
      400
    ]
  },
  "en-dark": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      370
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      269
    ],
    "excel": [
      377,
      245
    ],
    "favorites": [
      377,
      275
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      318
    ],
    "lock": [
      377,
      361
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      144
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      392
    ],
    "tax": [
      377,
      400
    ]
  },
  "ar-light": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      352
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      269
    ],
    "excel": [
      377,
      245
    ],
    "favorites": [
      377,
      275
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      300
    ],
    "lock": [
      377,
      367
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      196
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      375
    ],
    "tax": [
      377,
      400
    ]
  },
  "ar-dark": {
    "accounts": [
      377,
      380
    ],
    "add": [
      377,
      299
    ],
    "backup": [
      377,
      420
    ],
    "balances": [
      377,
      222
    ],
    "bank": [
      377,
      352
    ],
    "budgets": [
      377,
      420
    ],
    "capture": [
      377,
      420
    ],
    "categories": [
      377,
      420
    ],
    "contracts": [
      377,
      420
    ],
    "debts": [
      377,
      380
    ],
    "due": [
      377,
      269
    ],
    "excel": [
      377,
      245
    ],
    "favorites": [
      377,
      275
    ],
    "goals": [
      377,
      198
    ],
    "invoice": [
      377,
      300
    ],
    "lock": [
      377,
      367
    ],
    "look": [
      377,
      305
    ],
    "monthStart": [
      377,
      440
    ],
    "months": [
      377,
      440
    ],
    "outlook": [
      377,
      440
    ],
    "paid": [
      377,
      330
    ],
    "private": [
      377,
      202
    ],
    "projects": [
      377,
      380
    ],
    "receipts": [
      377,
      196
    ],
    "reconcile": [
      377,
      268
    ],
    "reminders": [
      377,
      420
    ],
    "repeats": [
      377,
      440
    ],
    "reports": [
      377,
      430
    ],
    "search": [
      377,
      430
    ],
    "split": [
      377,
      188
    ],
    "stats": [
      377,
      375
    ],
    "tax": [
      377,
      400
    ]
  }
};
