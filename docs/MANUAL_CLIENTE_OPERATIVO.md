# Manual operativo para cliente

## Ingreso

1. Entrar al dominio del sistema.
2. Escribir email y contraseña.
3. Si aparece usuario pendiente, solicitar activación al administrador.

## Flujo diario sugerido

1. Recepción carga clientes, pacientes y turnos.
2. Veterinario registra historia clínica, vacunas y recetas.
3. Caja carga ventas, pagos y cuentas corrientes.
4. Stock registra compras y controla productos.
5. Al final del día se realiza cierre de caja.
6. El administrador revisa reportes y auditoría.

## Clientes y pacientes

- Cliente: responsable o tutor del animal.
- Paciente: animal atendido.
- Cada paciente debe quedar vinculado a un cliente para que PDF y documentos salgan completos.

## Ventas y caja

- Una venta pagada genera caja automáticamente.
- Una venta pendiente genera cuenta corriente.
- No se recomienda borrar ventas; se deben anular con motivo.
- El cierre de caja deja el día cerrado y no debería modificarse.

## Documentos

Desde **Documentos** se pueden generar:

- historia clínica;
- carnet sanitario;
- receta;
- recibo;
- resumen de cuenta corriente;
- cierre de caja;
- constancia de turno.

## Respaldo

La sección **Respaldo** permite exportar información operativa en JSON.
No reemplaza backups administrados de Firebase, pero sirve como respaldo manual comercial.

Solo usuarios administradores o usuarios con permiso explícito `backup.write` deben generar respaldos, porque el archivo incluye datos operativos sensibles del tenant.
