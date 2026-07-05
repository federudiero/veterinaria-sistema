# Fix deploy Firestore indexes

Cambios aplicados:

1. Se eliminó el índice compuesto inválido de `tags` con un solo campo `name ASCENDING`. Firestore lo rechaza porque es un índice de campo único y debe gestionarse con single field index controls, no en `firestore.indexes.json`.
2. Se agregó el índice existente del proyecto para `auditLogs`: `searchTokens CONTAINS + createdAt DESCENDING`, para evitar que Firebase vuelva a preguntar si debe eliminarlo.

Comando recomendado:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

El warning `Unused function: hasRole` no bloquea el deploy.
