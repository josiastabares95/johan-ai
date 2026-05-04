# Johan AI

Base web financiera con chat, memoria persistente, decisiones, alertas, aprendizaje, misiones y simulacion.

## Ejecutar

```bash
npm install
npm run server
npm start
```

Backend: `http://localhost:3000`

Frontend: `http://localhost:5173`

## Endpoints de estabilidad

- `POST /auth/register`: crea usuario y devuelve token.
- `POST /auth/login`: inicia sesion y devuelve token.
- `GET /health`: confirma que el backend esta vivo.
- `GET /export-data`: exporta todo el estado financiero persistente.
- `POST /reset-demo-data` con `{ "confirm": true }`: resetea datos demo financieros y conserva memoria, perfil, prioridades, aprendizaje y modo.

Antes de guardar `data/financial-state.json`, el backend crea backups automaticos en `data/backups` y mantiene solo los ultimos 10.
Con usuarios activos, cada cuenta guarda su estado privado en `data/user-data/{userId}.json` y sus backups en `data/user-data/backups/{userId}`.

## Pruebas manuales

1. Ingreso

   Escribir en el chat:

   ```text
   me entraron 100
   ```

   Esperado: sube balance, suben ingresos del dia, se registra transaccion y aparece asignacion automatica.

2. Gasto

   ```text
   pague comida 20
   ```

   Esperado: baja balance, suben gastos del dia y aparece transaccion.

3. Gasto bloqueado

   Cambiar a modo extremo y escribir:

   ```text
   quiero comprar zapatos 80
   ```

   Esperado: Johan AI evalua la decision. Si es opcional o excede reglas, muestra bloque rojo y no registra gasto.

4. Estrategia con dinero extra

   ```text
   me encontre 100 que hacemos
   ```

   Esperado: no registra ingreso automaticamente. Muestra tres opciones con boton Aplicar.

5. Memoria universal

   ```text
   recuerda que mi esposa espera que mande dinero a Colombia
   ```

   Luego:

   ```text
   me encontre 100 que hacemos
   ```

   Esperado: la respuesta usa ese contexto como compromiso familiar/financiero.

6. Modo extremo

   Usar el boton Extremo del sidebar.

   Esperado: cambia el modo activo sin agregar mensajes al chat.

7. Mision diaria

   Abrir el panel derecho.

   Esperado: aparece Mision de hoy con titulo, descripcion y estado.

8. Accion pendiente

   ```text
   pague comida
   ```

   o:

   ```text
   tengo 20 y 30
   ```

   Esperado: no registra dinero automaticamente. Muestra Confirmar/Cancelar.

## Build

```bash
npm run build
```
