# Guía de Integración de Solar Project Manager en Wix

Esta guía te mostrará cómo embeber el Solar Project Manager en tu sitio web de Wix.

## 📋 Requisitos Previos

- Sitio web en Wix (cualquier plan)
- Aplicación desplegada en Railway
- URL de producción de Railway (ejemplo: `https://solar-project-manager-production.up.railway.app`)

## 🚀 Método 1: Usando HTML Embed (Recomendado)

### Paso 1: Preparar el Código HTML

1. Abre el archivo `wix-embed.html` que se encuentra en la raíz del proyecto
2. **IMPORTANTE**: Reemplaza la URL del iframe con tu URL de Railway:

```html
<!-- Busca esta línea en wix-embed.html -->
<iframe 
  id="solar-manager-iframe"
  src="https://solar-project-manager-production.up.railway.app"
  ...
>
```

Cámbiala por tu URL de Railway:

```html
<iframe 
  id="solar-manager-iframe"
  src="https://TU-URL-DE-RAILWAY.up.railway.app"
  ...
>
```

3. También actualiza la verificación de origen en el script:

```javascript
// Busca esta línea
if (event.origin !== 'https://solar-project-manager-production.up.railway.app') {
  return;
}

// Cámbiala por tu URL
if (event.origin !== 'https://TU-URL-DE-RAILWAY.up.railway.app') {
  return;
}
```

### Paso 2: Agregar el Código a Wix

1. **Abre tu sitio en el Editor de Wix**
   - Ve a [Wix.com](https://www.wix.com/)
   - Abre tu sitio en el editor

2. **Crea una nueva página** (o usa una existente)
   - Click en "Páginas" en el menú izquierdo
   - Click en "+ Agregar Página"
   - Nombre sugerido: "Gestor de Proyectos" o "Solar Manager"

3. **Agregar elemento HTML**
   - Click en el botón "+" en el menú izquierdo
   - Busca "Embed" o "HTML"
   - Selecciona "HTML iframe"
   - Arrastra el elemento a la página

4. **Configurar el iframe**
   - Click en "Configuración" del elemento HTML
   - Selecciona "Código"
   - Pega **TODO** el contenido del archivo `wix-embed.html`
   - Click en "Actualizar"

5. **Ajustar tamaño**
   - Arrastra el elemento para que ocupe toda la página
   - Recomendado: Ancho 100%, Alto: Al menos 800px
   - Para pantalla completa: Usa "Stretch" en las opciones de diseño

6. **Guardar y publicar**
   - Click en "Guardar" en la esquina superior derecha
   - Click en "Publicar"

## 🎨 Método 2: Iframe Simple (Alternativa)

Si prefieres un código más simple, puedes usar solo el iframe:

### Código Simplificado:

```html
<iframe 
  src="https://TU-URL-DE-RAILWAY.up.railway.app"
  width="100%" 
  height="800px"
  frameborder="0"
  style="border: none; min-height: 800px;"
  allow="clipboard-write; clipboard-read"
  title="Solar Project Manager"
></iframe>
```

### Pasos en Wix:

1. Agrega un elemento "HTML iframe" a tu página
2. Pega el código anterior (con tu URL de Railway)
3. Ajusta el tamaño según necesites
4. Guarda y publica

## ⚙️ Configuración Adicional

### Configurar CORS en Railway (Si es necesario)

Si el iframe no carga correctamente, puede ser un problema de CORS. Para solucionarlo:

1. **Agregar variable de entorno en Railway:**

```
ALLOWED_ORIGINS=https://tu-sitio.wixsite.com,https://www.tu-dominio.com
```

2. **Verificar configuración de Auth0** (si usas Railway con Auth0):
   - Ve a Auth0 Dashboard
   - Settings → Allowed Web Origins
   - Agrega: `https://tu-sitio.wixsite.com`

### Hacer el Iframe Responsive

El código en `wix-embed.html` ya incluye ajustes responsive, pero puedes personalizarlo:

```css
/* En el <style> del HTML */
@media (max-width: 768px) {
  #solar-manager-iframe {
    height: 100vh; /* Altura completa en móviles */
  }
}
```

## 🔒 Seguridad

### Consideraciones Importantes:

1. **HTTPS Obligatorio**: Wix requiere que el iframe use HTTPS (Railway ya lo proporciona)

2. **Autenticación**: Los usuarios deberán iniciar sesión dentro del iframe

3. **Cookies**: Asegúrate de que las cookies estén configuradas correctamente:
   - En Railway, verifica que `SameSite=None; Secure` esté configurado para cookies de sesión

4. **Privacidad**: Informa a tus usuarios que están accediendo a una aplicación externa

## 🎯 Opciones de Diseño en Wix

### Página de Pantalla Completa:

1. Click derecho en la página → "Configuración de página"
2. Diseño → Selecciona "Pantalla completa"
3. Esto eliminará el header/footer de Wix en esa página

### Agregar Botón de Acceso:

Puedes crear un botón en tu home que lleve a la página del manager:

1. Agrega un botón en tu página principal
2. Texto: "Acceder al Gestor de Proyectos"
3. Enlace → Página → Selecciona la página del manager

## 🐛 Troubleshooting

### El iframe no carga

**Problema**: Pantalla en blanco o error de carga

**Soluciones**:
1. Verifica que la URL de Railway sea correcta
2. Asegúrate de que la app esté desplegada en Railway
3. Revisa la consola del navegador (F12) para errores
4. Verifica configuración de CORS

### El iframe se ve cortado

**Problema**: No se ve completo el contenido

**Soluciones**:
1. Aumenta la altura del iframe (mínimo 800px)
2. Usa `height: 100vh` para altura completa
3. En Wix, usa "Stretch" para expandir el elemento

### Problemas de autenticación

**Problema**: No se puede iniciar sesión

**Soluciones**:
1. Verifica que las cookies de terceros estén habilitadas
2. Configura `SameSite=None; Secure` en las cookies
3. Agrega el dominio de Wix a Allowed Origins en Auth0

### El loading spinner no desaparece

**Problema**: El spinner sigue girando

**Soluciones**:
1. Verifica que el evento `onload` del iframe esté funcionando
2. Revisa la consola para errores de JavaScript
3. Asegúrate de que la URL del iframe sea correcta

## 📱 Optimización Móvil

El código incluye optimizaciones para móviles:

- Ajuste automático de altura
- Responsive design
- Touch events habilitados

Para mejorar la experiencia móvil en Wix:

1. Ve a "Vista móvil" en el editor
2. Ajusta el tamaño del iframe para móviles
3. Considera ocultar elementos de Wix que no sean necesarios

## 🔄 Actualización de la URL

Si cambias la URL de Railway:

1. Actualiza la URL en el código HTML del iframe
2. Actualiza la verificación de origen en el script
3. Guarda y vuelve a publicar en Wix

## 📊 Monitoreo

Para monitorear el uso del iframe:

1. Revisa los logs de Railway para ver las peticiones
2. Usa Google Analytics en tu sitio de Wix
3. Revisa las métricas de Railway para tráfico

## ✅ Checklist de Integración

- [ ] URL de Railway actualizada en `wix-embed.html`
- [ ] Verificación de origen actualizada en el script
- [ ] Elemento HTML iframe agregado en Wix
- [ ] Código pegado y configurado
- [ ] Tamaño del iframe ajustado (mínimo 800px de alto)
- [ ] Página guardada y publicada
- [ ] Prueba de carga exitosa
- [ ] Prueba de autenticación exitosa
- [ ] Prueba en dispositivos móviles
- [ ] CORS configurado si es necesario
- [ ] Allowed Origins actualizado en Auth0 si es necesario

## 🎓 Recursos Adicionales

- [Documentación de Wix sobre HTML Embed](https://support.wix.com/en/article/embedding-custom-code-to-your-site)
- [Documentación de Railway](https://docs.railway.app/)
- [Configuración de CORS](https://developer.mozilla.org/es/docs/Web/HTTP/CORS)

## 💡 Consejos Finales

1. **Prueba primero en preview**: Antes de publicar, usa el preview de Wix para probar
2. **Comunica a los usuarios**: Informa que se abrirá una aplicación integrada
3. **Mantén actualizado**: Cuando actualices la app en Railway, el iframe se actualizará automáticamente
4. **Considera un dominio personalizado**: En lugar de usar `*.wixsite.com`, usa tu propio dominio para mayor profesionalismo

---

¿Necesitas ayuda? Revisa los logs de Railway y la consola del navegador para identificar problemas específicos.
