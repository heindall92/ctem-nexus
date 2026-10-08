# Política de seguridad

## Versiones con soporte

Solo la última versión publicada en `main` (y en https://heindall92.github.io/ctem-nexus/) recibe correcciones.

## Cómo informar de una vulnerabilidad

No abras un *issue* público. Escribe a **yoandyramirezdelgado@gmail.com** con el asunto `CTEM-Nexus · seguridad` e incluye:

- la versión (pie de «Acerca de» o `package.json`) y el navegador;
- los pasos para reproducirla y, si se trata de un fichero importado, una muestra **sin datos reales**;
- el impacto que estimas.

Recibirás acuse en un plazo de 7 días. Una vez publicada la corrección, la vulnerabilidad se explica en el [CHANGELOG](CHANGELOG.md), con crédito si lo deseas.

## Modelo de amenazas

CTEM-Nexus trata como **hostil** todo lo que importa: XML de Nmap, JSON de BloodHound, CSV y proyectos JSON.

- **XML** sin DTD ni entidades externas, con límites de tamaño. En el backend, el análisis se hace con `defusedxml`.
- **JSON** analizado con un *reviver* que descarta `__proto__`, `constructor` y `prototype`. Después se validan y recortan todos los campos.
- **CSV exportado** con neutralización de fórmulas: las celdas que empiezan por `=`, `+`, `-`, `@`, tabulador o retorno de carro se prefijan con un apóstrofo.
- **HTML autocontenido** con CSP `default-src 'none'`: scripts y estilos solo por hash SHA-256 y `connect-src` limitado a `localhost` para la API opcional. No hay peticiones a terceros ni telemetría.
- **Datos locales**: el proyecto vive en el `localStorage` de tu navegador. «Borrar todo» en Ajustes lo elimina.

**Fuera de alcance:** CTEM-Nexus no ejecuta escáneres ni se conecta a tus sistemas. Los ficheros que importas los has generado tú con tus herramientas y bajo tu autorización.
