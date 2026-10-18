/* Guías de remediación paso a paso por tipo de hallazgo (sin DOM). La clave es Finding.remediation. */
import { GUIDES_EN } from './remediation-en';

export interface RemediationGuide {
  key: string;
  title: string;
  owner: string;
  steps: string[];
  verify: string;
  reference?: string;
}

const G = (g: RemediationGuide) => g;

export const GUIDES: Record<string, RemediationGuide> = {
  log4shell: G({
    key: 'log4shell', title: 'Eliminar Log4Shell (Log4j 2)', owner: 'Equipo de desarrollo de la aplicación',
    steps: [
      'Inventariar todas las dependencias log4j-core (también las transitivas y los JAR sombreados).',
      'Actualizar log4j-core a 2.17.1 o superior y reconstruir el artefacto.',
      'Como contención inmediata, eliminar la clase JndiLookup del JAR o bloquear en el WAF los patrones ${jndi:.',
      'Restringir la salida a Internet (LDAP/RMI/DNS) desde el servidor de aplicaciones.',
      'Revisar los registros desde la fecha de exposición en busca de cadenas ${jndi: y conexiones salientes anómalas.',
    ],
    verify: 'find / -name "log4j-core-*.jar" 2>/dev/null | xargs -I{} unzip -l {} | grep -c JndiLookup.class',
    reference: 'https://logging.apache.org/log4j/2.x/security.html',
  }),
  proxyshell: G({
    key: 'proxyshell', title: 'Corregir ProxyShell y reducir los permisos de Exchange en AD', owner: 'Sistemas / Mensajería',
    steps: [
      'Instalar la última actualización acumulativa (CU) y de seguridad (SU) de Exchange.',
      'Ejecutar el Exchange Health Checker y el script de detección de IoC de Microsoft.',
      'Buscar web shells en las carpetas de IIS y en los directorios virtuales de OWA/ECP.',
      'Aplicar el modo de permisos divididos (Split Permissions) para retirar WriteDACL sobre el dominio.',
      'Publicar OWA solo a través de un proxy inverso con autenticación previa.',
    ],
    verify: 'Get-ExchangeServer | Format-List Name,AdminDisplayVersion   # comparar con la última SU publicada',
    reference: 'https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34473',
  }),
  citrix_bleed: G({
    key: 'citrix_bleed', title: 'Actualizar NetScaler y revocar las sesiones activas', owner: 'Redes / Perímetro',
    steps: [
      'Actualizar NetScaler ADC/Gateway a la versión corregida indicada por el fabricante.',
      'Tras actualizar, terminar todas las sesiones: kill aaa session -all, kill icaconnection -all, kill pcoipConnection -all.',
      'Rotar las credenciales de los usuarios que iniciaron sesión durante la ventana de exposición.',
      'Revisar los registros del appliance en busca de reutilización de sesiones desde IP inusuales.',
    ],
    verify: 'show ns version   # en la CLI del appliance; comprobar que la compilación es la corregida',
    reference: 'https://support.citrix.com/article/CTX579459',
  }),
  kerberoast: G({
    key: 'kerberoast', title: 'Proteger cuentas de servicio frente a Kerberoasting', owner: 'Identidad / Directorio Activo',
    steps: [
      'Sustituir la cuenta por una gMSA o, si no es posible, establecer una contraseña aleatoria de 30+ caracteres.',
      'Deshabilitar RC4 para la cuenta (msDS-SupportedEncryptionTypes = AES128/AES256).',
      'Retirar los privilegios innecesarios y la pertenencia a grupos con acceso a datos críticos.',
      'Crear una alerta para solicitudes TGS con cifrado RC4 (evento 4769, tipo 0x17).',
    ],
    verify: 'Get-ADUser -Filter {ServicePrincipalName -like "*"} -Properties PasswordLastSet,msDS-SupportedEncryptionTypes | ft Name,PasswordLastSet,msDS-SupportedEncryptionTypes',
  }),
  unconstrained_delegation: G({
    key: 'unconstrained_delegation', title: 'Eliminar la delegación sin restricciones', owner: 'Identidad / Directorio Activo',
    steps: [
      'Sustituir la delegación sin restricciones por delegación restringida o basada en recursos.',
      'Marcar las cuentas privilegiadas como «La cuenta es importante y no se puede delegar» y añadirlas a Protected Users.',
      'Deshabilitar el servicio de cola de impresión en los controladores de dominio para evitar la coerción.',
    ],
    verify: 'Get-ADComputer -Filter {TrustedForDelegation -eq $true -and PrimaryGroupID -ne 516} | Select Name',
  }),
  adcs_esc1: G({
    key: 'adcs_esc1', title: 'Corregir plantillas y servicios vulnerables de ADCS', owner: 'Identidad / PKI',
    steps: [
      'Desactivar «El solicitante proporciona el sujeto» (CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT) en la plantilla.',
      'Exigir aprobación del administrador de la CA o firmas autorizadas para plantillas con EKU de autenticación.',
      'Limitar los permisos de inscripción a los grupos estrictamente necesarios.',
      'Deshabilitar la inscripción web por HTTP o exigir HTTPS con EPA.',
      'Revisar los certificados emitidos desde la plantilla y revocar los sospechosos.',
    ],
    verify: 'certipy find -u auditor@dominio.local -p *** -dc-ip 10.10.10.5 -vulnerable -stdout',
    reference: 'https://posts.specterops.io/certified-pre-owned-d95910965cd2',
  }),
  smb_signing: G({
    key: 'smb_signing', title: 'Exigir firma SMB', owner: 'Sistemas',
    steps: [
      'Habilitar por GPO «Servidor de red Microsoft: firmar digitalmente las comunicaciones (siempre)».',
      'Aplicar la misma política en clientes y comprobar la compatibilidad de equipos heredados.',
      'Deshabilitar SMBv1 en todo el parque.',
    ],
    verify: 'nxc smb 10.10.20.0/24 --gen-relay-list sin_firma.txt   # la lista debe quedar vacía',
  }),
  laps: G({
    key: 'laps', title: 'Desplegar Windows LAPS', owner: 'Puesto de trabajo',
    steps: [
      'Desplegar Windows LAPS por GPO o Intune en todos los equipos.',
      'Rotar inmediatamente la contraseña de administrador local en todo el parque.',
      'Denegar el inicio de sesión de red a cuentas locales (S-1-5-114) mediante GPO.',
    ],
    verify: 'Get-LapsADPassword -Identity PC-0001 -AsPlainText | Select ComputerName,ExpirationTimestamp',
  }),
  weak_credentials: G({
    key: 'weak_credentials', title: 'Eliminar credenciales débiles o por defecto', owner: 'Responsable del servicio',
    steps: [
      'Deshabilitar la cuenta por defecto o renombrarla y asignar una contraseña robusta guardada en el gestor de secretos.',
      'Usar autenticación integrada o cuentas nominativas con privilegio mínimo.',
      'Restringir por firewall qué hosts pueden conectar con el servicio.',
    ],
    verify: 'nxc mssql 10.10.30.12 -u sa -p diccionario.txt --local-auth   # no debe autenticar',
  }),
  llmnr: G({
    key: 'llmnr', title: 'Deshabilitar LLMNR y NBT-NS', owner: 'Puesto de trabajo',
    steps: [
      'GPO: Configuración del equipo › Plantillas administrativas › Red › Cliente DNS › Desactivar resolución de nombres de multidifusión.',
      'Deshabilitar NetBIOS sobre TCP/IP por DHCP o script en todas las interfaces.',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name EnableMulticast',
  }),
  print_spooler: G({
    key: 'print_spooler', title: 'Deshabilitar la cola de impresión en servidores críticos', owner: 'Identidad / Directorio Activo',
    steps: ['Detener y deshabilitar el servicio Spooler en controladores de dominio y servidores sin impresión.', 'Aplicarlo por GPO para que no vuelva a activarse.'],
    verify: 'Get-Service -ComputerName DC01 -Name Spooler | Select Status,StartType',
  }),
  asrep_roast: G({
    key: 'asrep_roast', title: 'Exigir preautenticación Kerberos', owner: 'Identidad / Directorio Activo',
    steps: ['Quitar el indicador DONT_REQ_PREAUTH de las cuentas afectadas.', 'Rotar sus contraseñas con una longitud mínima de 20 caracteres.'],
    verify: 'Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} | Select SamAccountName',
  }),
  tls_hardening: G({
    key: 'tls_hardening', title: 'Endurecer la configuración TLS', owner: 'Equipo Web',
    steps: ['Deshabilitar TLS 1.0 y 1.1.', 'Limitar los cifrados a suites AEAD con secreto perfecto hacia adelante.', 'Activar HSTS.'],
    verify: 'nmap --script ssl-enum-ciphers -p 443 203.0.113.10',
  }),
  patch_cve: G({
    key: 'patch_cve', title: 'Aplicar el parche del fabricante', owner: 'Responsable del activo',
    steps: [
      'Identificar la versión corregida en el aviso del fabricante.',
      'Aplicar la actualización (o la mitigación temporal publicada) en una ventana de cambio.',
      'Reiniciar el servicio si es necesario y confirmar que la versión expuesta es la corregida.',
    ],
    verify: 'Repetir el escaneo autenticado del activo y confirmar que el CVE ya no aparece.',
  }),
  weak_config: G({
    key: 'weak_config', title: 'Corregir la configuración insegura', owner: 'Responsable del activo',
    steps: ['Aplicar la línea base de bastionado (CIS / guías CCN-STIC) correspondiente.', 'Documentar la excepción si no puede corregirse y añadir un control compensatorio.'],
    verify: 'Repetir la comprobación de configuración y adjuntar la evidencia al ticket.',
  }),
  web_injection: G({
    key: 'web_injection', title: 'Cerrar la inyección en la aplicación web', owner: 'Equipo de desarrollo de la aplicación',
    steps: [
      'Reproducir el hallazgo en preproducción con la petición del escáner (sin datos reales).',
      'Usar consultas parametrizadas u ORM; nunca concatenar entrada del usuario en SQL, comandos, plantillas ni rutas.',
      'Validar la entrada en el servidor con listas de permitidos y tipos estrictos.',
      'Ejecutar la aplicación y su cuenta de base de datos con el mínimo privilegio.',
      'Como contención mientras se corrige, regla específica en el WAF para el parámetro afectado.',
      'Añadir una prueba automática (SAST o DAST en la CI) que falle si vuelve a aparecer.',
    ],
    verify: 'Repetir el escaneo activo de ZAP o Burp sobre la URL y el parámetro afectados y adjuntar el resultado sin alertas.',
    reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html',
  }),
  web_xss: G({
    key: 'web_xss', title: 'Corregir el cross-site scripting', owner: 'Equipo de desarrollo de la aplicación',
    steps: [
      'Codificar la salida según el contexto (HTML, atributo, JavaScript, URL) con la función del framework.',
      'Evitar insertar HTML sin sanear (innerHTML, dangerouslySetInnerHTML, |safe); si es imprescindible, sanear con una librería mantenida.',
      'Publicar una Content-Security-Policy sin unsafe-inline y con nonces o hashes.',
      'Marcar las cookies de sesión como HttpOnly, Secure y SameSite.',
    ],
    verify: 'Repetir el escaneo de ZAP o Burp sobre la URL afectada y comprobar la cabecera Content-Security-Policy en la respuesta.',
    reference: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
  }),
  web_hardening: G({
    key: 'web_hardening', title: 'Bastionar la aplicación web', owner: 'Equipo de desarrollo / Sistemas',
    steps: [
      'Añadir las cabeceras de seguridad que falten (Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, frame-ancestors).',
      'Configurar las cookies con HttpOnly, Secure y SameSite.',
      'Retirar banners de versión, páginas de error detalladas y ficheros de ejemplo o copias de seguridad publicados.',
      'Revisar la configuración TLS y redirigir todo el tráfico a HTTPS.',
    ],
    verify: 'curl -sI https://app.example | grep -iE "strict-transport|content-security|x-content-type|set-cookie"',
    reference: 'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
  }),
  ad_hygiene: G({
    key: 'ad_hygiene', title: 'Corregir la regla de higiene del directorio activo', owner: 'Identidad / Directorio Activo',
    steps: [
      'Leer el detalle de la regla en el informe de PingCastle y el objeto afectado.',
      'Aplicar la corrección recomendada en un entorno de pruebas y después en producción, dentro del proceso de cambios.',
      'Documentar la excepción si la regla no puede corregirse y añadir supervisión.',
    ],
    verify: 'PingCastle.exe --healthcheck --server corp.example   # la regla ya no aparece y la puntuación baja',
    reference: 'https://www.pingcastle.com/documentation/',
  }),
  mcp_supply_chain: G({
    key: 'mcp_supply_chain', title: 'Fijar los servidores MCP a una versión y un digest revisados', owner: 'Puesto de trabajo / Desarrollo',
    steps: [
      'Sustituir npx -y, uvx o pnpm dlx sin versión por el paquete con la versión exacta que se ha revisado (paquete@1.2.3).',
      'Fijar las imágenes de contenedor por digest (imagen@sha256:…) y no usar --pull always.',
      'Preferir paquetes con scope verificable del publicador oficial y registrar cada servidor en el inventario de software (SBOM).',
      'Revisar los cambios de versión antes de actualizar, como cualquier dependencia de terceros.',
    ],
    verify: 'Revisar de nuevo el mcp.json en MCP-Shield: MCPS-SC-001, SC-002 y SC-004 ya no aparecen.',
    reference: 'https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices',
  }),
  mcp_secrets: G({
    key: 'mcp_secrets', title: 'Sacar los secretos del mcp.json y rotarlos', owner: 'Puesto de trabajo / Identidad',
    steps: [
      'Rotar ya el token o la clave expuestos en el fichero: puede estar en copias, sincronizaciones o capturas.',
      'Pasarlos por referencia (${VAR}, ${env:VAR} en Cursor, ${input:id} o envFile en VS Code) desde el gestor de secretos o el llavero del sistema.',
      'Dar al token el mínimo alcance y una caducidad corta.',
    ],
    verify: 'Revisar de nuevo el mcp.json en MCP-Shield: MCPS-SEC-001 y SEC-002 ya no aparecen, y el token antiguo está revocado.',
  }),
  mcp_filesystem: G({
    key: 'mcp_filesystem', title: 'Limitar lo que el servidor MCP puede leer y escribir', owner: 'Puesto de trabajo / Desarrollo',
    steps: [
      'Dar al servidor de ficheros solo el directorio del proyecto, nunca la raíz, el perfil de usuario ni ~/.ssh.',
      'Ejecutarlo en un contenedor sin red, de solo lectura, sin capacidades y con el proyecto montado en modo lectura.',
      'Actualizar mcp-server-git a 2025.12.18 o posterior (CVE-2025-68144).',
    ],
    verify: 'Revisar de nuevo el mcp.json en MCP-Shield: MCPS-FS-001, FS-002 y FS-003 ya no aparecen.',
  }),
  mcp_transport: G({
    key: 'mcp_transport', title: 'Llevar el servidor MCP remoto a HTTPS', owner: 'Puesto de trabajo / Seguridad',
    steps: [
      'Cambiar la URL del servidor MCP de http:// a https:// y validar el certificado.',
      'Autenticar con OAuth 2.1 y no enviar tokens ni cabeceras de autorización por HTTP.',
      'Si el servidor no ofrece TLS, retirarlo o ponerlo detrás de un proxy inverso con TLS.',
    ],
    verify: 'Revisar de nuevo el mcp.json en MCP-Shield: MCPS-SC-003 ya no aparece.',
  }),
  mcp_tool_poisoning: G({
    key: 'mcp_tool_poisoning', title: 'Retirar la herramienta MCP con instrucciones ocultas', owner: 'Puesto de trabajo / Seguridad',
    steps: [
      'Desactivar el servidor: sus descripciones dan órdenes al modelo (leer ficheros, ocultar acciones o suplantar otra herramienta).',
      'Revisar el historial del asistente desde que se instaló y rotar las credenciales que haya podido ver.',
      'Aprobar solo inventarios tools/list revisados y vigilar los cambios con el monitor de integridad de MCP-Shield.',
    ],
    verify: 'Revisar de nuevo con el tools/list importado: MCPS-TP-001, TP-002 y TP-003 ya no aparecen.',
  }),
  identity_generic: G({
    key: 'identity_generic', title: 'Corregir el problema de identidad', owner: 'Identidad / Directorio Activo',
    steps: ['Aplicar el principio de privilegio mínimo a la cuenta o grupo afectado.', 'Rotar las credenciales expuestas.', 'Añadir supervisión de su uso.'],
    verify: 'Revisar de nuevo la ruta con BloodHound o PingCastle y confirmar que ha desaparecido.',
  }),
};

export const GUIDE_KEYS = Object.keys(GUIDES);

export function guideFor(key: string | undefined, kind: 'cve' | 'configuracion' | 'identidad' = 'cve'): RemediationGuide {
  if (key && GUIDES[key]) return GUIDES[key];
  return kind === 'identidad' ? GUIDES.identity_generic : kind === 'configuracion' ? GUIDES.weak_config : GUIDES.patch_cve;
}

/** Guía en el idioma pedido: los textos en inglés salen de remediation-en.ts; la referencia es la misma. */
export function guideIn(lang: 'es' | 'en', key: string | undefined, kind: 'cve' | 'configuracion' | 'identidad' = 'cve'): RemediationGuide {
  const g = guideFor(key, kind);
  return lang === 'en' && GUIDES_EN[g.key] ? { ...g, ...GUIDES_EN[g.key] } : g;
}
