# Fix Firestore INTERNAL ASSERTION FAILED ca9

## Causa

La app todavía usaba listeners `onSnapshot` para colecciones auxiliares como lookups, dashboard, settings y cierres. En Firebase Firestore Web SDK 11.6.1, bajo ciertos cambios rápidos de rutas/filtros/auth, esos listeners pueden disparar el error interno:

```txt
FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)
```

No es un error de datos del usuario ni del documento de perfil. Es un problema del canal realtime/watch del cliente.

## Cambio aplicado

Para esta etapa comercial se eliminaron los listeners realtime de las lecturas generales. `useCollection` ahora usa lecturas one-shot paginadas con `fetchCollectionPage`, y `subscribeCollection` del repositorio Firestore quedó como wrapper compatible sin `onSnapshot`.

Esto reduce:

- listeners abiertos simultáneos;
- costo de lecturas realtime;
- errores internos del watch stream;
- recargas innecesarias en secciones de alto volumen.

## Impacto

Las tablas y lookups siguen funcionando. Después de crear/editar/eliminar, `useCollection` refresca la lectura automáticamente.

Para realtime real en producción, conviene reintroducir listeners solo en módulos que lo necesiten, como cola de espera o agenda del día, y con consultas muy acotadas.
