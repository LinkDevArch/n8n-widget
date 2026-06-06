# Widget flotante para chatbot de n8n

Widget minimalista en HTML, CSS y JavaScript puro para conectar un sitio web con un webhook de n8n.

## Uso rapido

1. Abre `index.html`.
2. Cambia `webhookUrl` por la URL real de tu webhook:

```html
<script>
  N8NChatWidget.init({
    webhookUrl: "https://TU_DOMINIO_N8N/webhook/TU_WEBHOOK"
  });
</script>
```

## Payload enviado a n8n

El widget hace un `POST` como `application/x-www-form-urlencoded` por defecto. Esto evita el preflight `OPTIONS` que muchos webhooks de n8n, proxies o reglas de Cloudflare responden con `403 Forbidden`.

Campos enviados:

```json
{
  "message": "Mensaje del usuario",
  "chatInput": "Mensaje del usuario",
  "sessionId": "id-de-la-sesion"
}
```

`chatInput` se incluye porque muchos flujos de n8n Chat Trigger usan ese nombre.

En n8n, lee estos valores desde el body del Webhook node o el Chat Trigger.

Si tu servidor maneja correctamente `OPTIONS`, puedes enviar JSON agregando:

```js
N8NChatWidget.init({
  webhookUrl: "https://TU_DOMINIO_N8N/webhook/TU_WEBHOOK",
  requestFormat: "json"
});
```

## Respuesta esperada del webhook

El webhook puede devolver texto plano o JSON. Si es JSON, el widget muestra el primer campo disponible entre:

`output`, `response`, `text`, `message`, `answer`, `reply`, `result`, `json.output`, `json.response`, `json.text`, `json.message`, `data.output`, `data.response`, `data.text`, `data.message`, `data.json.output`, `data.json.response`, `data.json.text`, `data.json.message`.

Ejemplo recomendado desde n8n:

```json
{
  "output": "Hola, esta es la respuesta del asistente."
}
```

## CORS

Si ves `Request Method OPTIONS` con `Status Code 403`, el navegador esta haciendo una peticion de preflight antes del `POST`. El widget usa formulario por defecto para evitar ese preflight.

Si aun falla con `POST`, revisa que la respuesta real del webhook incluya `Access-Control-Allow-Origin: *` o tu dominio exacto. Si n8n esta detras de Cloudflare, tambien revisa reglas WAF/Bot Fight/Access que puedan bloquear webhooks anonimos.

## Personalizacion

```js
N8NChatWidget.init({
  webhookUrl: "https://TU_DOMINIO_N8N/webhook/TU_WEBHOOK",
  title: "Asistente",
  subtitle: "Responde en unos segundos",
  welcomeMessage: "Hola, soy tu asistente. En que puedo ayudarte?",
  placeholder: "Escribe tu mensaje...",
  primaryColor: "#2563eb",
  initialOpen: false,
  requestFormat: "form"
});
```
