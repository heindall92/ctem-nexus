import{At as e,Bt as t,Dt as n,Mt as r,Ot as ee,Ut as i,Vt as a,_ as o,b as s,ht as c,jt as l,k as u,kt as d,m as f,pt as p,s as m,ut as h,v as g,zt as _}from"./ui-Dr8sMhX9.js";import{t as v}from"./external-link-C9C1rHLE.js";import{t as y}from"./shield-check-wnn1JlLs.js";import{A as b,O as x,o as S}from"./index-D4N1kWZA.js";var C={name:`book-open`,size:24,node:[[`path`,{d:`M12 5v16`,key:`1f6ucr`}],[`path`,{d:`M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z`,key:`1fyvmf`}]]};C.node;var w=e(C),T={name:`bug`,size:24,node:[[`path`,{d:`M12 20v-9`,key:`1qisl0`}],[`path`,{d:`M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z`,key:`uouzyp`}],[`path`,{d:`M14.12 3.88 16 2`,key:`qol33r`}],[`path`,{d:`M21 21a4 4 0 0 0-3.81-4`,key:`1b0z45`}],[`path`,{d:`M21 5a4 4 0 0 1-3.55 3.97`,key:`5cxbf6`}],[`path`,{d:`M22 13h-4`,key:`1jl80f`}],[`path`,{d:`M3 21a4 4 0 0 1 3.81-4`,key:`1fjd4g`}],[`path`,{d:`M3 5a4 4 0 0 0 3.55 3.97`,key:`1d7oge`}],[`path`,{d:`M6 13H2`,key:`82j7cp`}],[`path`,{d:`m8 2 1.88 1.88`,key:`fmnt4t`}],[`path`,{d:`M9 7.13V6a3 3 0 1 1 6 0v1.13`,key:`1vgav8`}]]};T.node;var te=e(T),E={name:`calculator`,size:24,node:[[`rect`,{width:`16`,height:`20`,x:`4`,y:`2`,rx:`2`,key:`1nb95v`}],[`line`,{x1:`8`,x2:`16`,y1:`6`,y2:`6`,key:`x4nwl0`}],[`line`,{x1:`16`,x2:`16`,y1:`14`,y2:`18`,key:`wjye3r`}],[`path`,{d:`M16 10h.01`,key:`1m94wz`}],[`path`,{d:`M12 10h.01`,key:`1nrarc`}],[`path`,{d:`M8 10h.01`,key:`19clt8`}],[`path`,{d:`M12 14h.01`,key:`1etili`}],[`path`,{d:`M8 14h.01`,key:`6423bh`}],[`path`,{d:`M12 18h.01`,key:`mhygvu`}],[`path`,{d:`M8 18h.01`,key:`lrp35t`}]]};E.node;var D=e(E),O={name:`folder-git-2`,size:24,node:[[`path`,{d:`M18 19a5 5 0 0 1-5-5v8`,key:`sz5oeg`}],[`path`,{d:`M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5`,key:`1w6njk`}],[`circle`,{cx:`13`,cy:`12`,r:`2`,key:`1j92g6`}],[`circle`,{cx:`20`,cy:`19`,r:`2`,key:`1obnsp`}]]};O.node;var k=e(O),A={name:`keyboard`,size:24,node:[[`path`,{d:`M10 8h.01`,key:`1r9ogq`}],[`path`,{d:`M12 12h.01`,key:`1mp3jc`}],[`path`,{d:`M14 8h.01`,key:`1primd`}],[`path`,{d:`M16 12h.01`,key:`1l6xoz`}],[`path`,{d:`M18 8h.01`,key:`emo2bl`}],[`path`,{d:`M6 8h.01`,key:`x9i8wu`}],[`path`,{d:`M7 16h10`,key:`wp8him`}],[`path`,{d:`M8 12h.01`,key:`czm47f`}],[`rect`,{width:`20`,height:`16`,x:`2`,y:`4`,rx:`2`,key:`18n3k1`}]]};A.node;var j=e(A),M={name:`mail`,size:24,node:[[`path`,{d:`m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7`,key:`132q7q`}],[`rect`,{x:`2`,y:`4`,width:`20`,height:`16`,rx:`2`,key:`izxlao`}]]};M.node;var N=e(M),P={name:`terminal`,size:24,node:[[`path`,{d:`M12 19h8`,key:`baeox8`}],[`path`,{d:`m4 17 6-6-6-6`,key:`1yngyt`}]]};P.node;var F=e(P),I=i(a(),1),L=t(),R=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE nmaprun>
<?xml-stylesheet href="file:///usr/bin/../share/nmap/nmap.xsl" type="text/xsl"?>
<!-- Escaneo FICTICIO para probar CTEM-Nexus. Direcciones de documentación (RFC 5737) y privadas (RFC 1918). -->
<nmaprun scanner="nmap" args="nmap -sV -sC -oX nmap-ejemplo.xml 198.51.100.0/24 10.20.0.0/24" start="1791446400" version="7.95" xmloutputversion="1.05">
  <host>
    <status state="up" reason="syn-ack"/>
    <address addr="198.51.100.25" addrtype="ipv4"/>
    <hostnames><hostname name="vpn.ejemplo-ficticio.test" type="PTR"/></hostnames>
    <ports>
      <port protocol="tcp" portid="443"><state state="open"/><service name="https" product="Citrix Gateway"/>
        <script id="vulners" output="CVE-2023-4966 9.4 https://vulners.com/cve/CVE-2023-4966"/></port>
    </ports>
  </host>
  <host>
    <status state="up" reason="syn-ack"/>
    <address addr="10.20.0.10" addrtype="ipv4"/>
    <hostnames><hostname name="dc01.ejemplo-ficticio.test" type="PTR"/></hostnames>
    <ports>
      <port protocol="tcp" portid="88"><state state="open"/><service name="kerberos-sec"/></port>
      <port protocol="tcp" portid="389"><state state="open"/><service name="ldap"/></port>
      <port protocol="tcp" portid="445"><state state="open"/><service name="microsoft-ds"/></port>
    </ports>
  </host>
  <host>
    <status state="up" reason="syn-ack"/>
    <address addr="10.20.0.30" addrtype="ipv4"/>
    <hostnames><hostname name="sql01.ejemplo-ficticio.test" type="PTR"/></hostnames>
    <ports>
      <port protocol="tcp" portid="1433"><state state="open"/><service name="ms-sql-s" product="Microsoft SQL Server 2019"/></port>
      <port protocol="tcp" portid="23"><state state="open"/><service name="telnet"/></port>
    </ports>
  </host>
  <host>
    <status state="down" reason="no-response"/>
    <address addr="10.20.0.99" addrtype="ipv4"/>
  </host>
</nmaprun>
`,z=`{
  "_aviso": "Exportación FICTICIA de SharpHound para probar CTEM-Nexus. Dominio y SID inventados.",
  "data": [
    { "ObjectIdentifier": "S-1-5-21-1111111111-2222222222-3333333333-1001", "Properties": { "name": "DC01.EJEMPLO-FICTICIO.TEST", "operatingsystem": "Windows Server 2022 Datacenter", "highvalue": true, "PrimaryGroupSID": "S-1-5-21-1111111111-2222222222-3333333333-516" } },
    { "ObjectIdentifier": "S-1-5-21-1111111111-2222222222-3333333333-1002", "Properties": { "name": "APP02.EJEMPLO-FICTICIO.TEST", "operatingsystem": "Windows Server 2019 Standard", "unconstraineddelegation": true } },
    { "ObjectIdentifier": "S-1-5-21-1111111111-2222222222-3333333333-1003", "Properties": { "name": "PC-CONTA-07.EJEMPLO-FICTICIO.TEST", "operatingsystem": "Windows 11 Enterprise" } },
    { "ObjectIdentifier": "S-1-5-21-1111111111-2222222222-3333333333-1100", "Properties": { "name": "SVC_BACKUP@EJEMPLO-FICTICIO.TEST", "hasspn": true, "enabled": true } },
    { "ObjectIdentifier": "S-1-5-21-1111111111-2222222222-3333333333-1101", "Properties": { "name": "BECARIO.RRHH@EJEMPLO-FICTICIO.TEST", "dontreqpreauth": true, "enabled": true } }
  ],
  "meta": { "type": "computers_and_users", "count": 5, "version": 5 }
}
`,B=`<?xml version="1.0" ?>
<!-- Ejemplo FICTICIO de CTEM-Nexus: estructura NessusClientData_v2 con direcciones de documentación (RFC 5737) y redes privadas. -->
<NessusClientData_v2>
  <Policy><policyName>Auditoría trimestral · ejemplo</policyName></Policy>
  <Report name="Meridiano · perímetro e interna">
    <ReportHost name="203.0.113.10">
      <HostProperties>
        <tag name="host-ip">203.0.113.10</tag>
        <tag name="host-fqdn">portal.meridiano.example</tag>
        <tag name="operating-system">Linux Kernel 5.15</tag>
      </HostProperties>
      <ReportItem port="443" svc_name="www" protocol="tcp" severity="4" pluginID="156032" pluginName="Apache Log4j 2.x &lt; 2.16.0 RCE (Log4Shell)" pluginFamily="Misc.">
        <cve>CVE-2021-44228</cve>
        <cve>CVE-2021-45046</cve>
        <cvss3_base_score>10.0</cvss3_base_score>
        <exploit_available>true</exploit_available>
        <cisa-known-exploited>2021/12/24</cisa-known-exploited>
        <synopsis>El servidor web usa una versión de Log4j vulnerable a ejecución remota de código.</synopsis>
      </ReportItem>
      <ReportItem port="443" svc_name="www" protocol="tcp" severity="2" pluginID="51192" pluginName="SSL Certificate Cannot Be Trusted" pluginFamily="General">
        <cvss3_base_score>6.5</cvss3_base_score>
        <synopsis>La cadena del certificado no termina en una CA de confianza.</synopsis>
      </ReportItem>
      <ReportItem port="0" svc_name="general" protocol="tcp" severity="0" pluginID="19506" pluginName="Nessus Scan Information" pluginFamily="Settings">
        <synopsis>Información del escaneo (informativo, se omite).</synopsis>
      </ReportItem>
    </ReportHost>
    <ReportHost name="10.10.20.15">
      <HostProperties>
        <tag name="host-ip">10.10.20.15</tag>
        <tag name="netbios-name">APP01</tag>
        <tag name="operating-system">Microsoft Windows Server 2019 Standard</tag>
      </HostProperties>
      <ReportItem port="445" svc_name="cifs" protocol="tcp" severity="2" pluginID="57608" pluginName="SMB Signing not required" pluginFamily="Misc.">
        <cvss3_base_score>5.3</cvss3_base_score>
        <synopsis>No se exige la firma en el servidor SMB remoto.</synopsis>
      </ReportItem>
      <ReportItem port="139" svc_name="smb" protocol="tcp" severity="2" pluginID="57608" pluginName="SMB Signing not required" pluginFamily="Misc.">
        <cvss3_base_score>5.3</cvss3_base_score>
        <synopsis>No se exige la firma en el servidor SMB remoto.</synopsis>
      </ReportItem>
    </ReportHost>
    <ReportHost name="10.10.40.20">
      <HostProperties>
        <tag name="host-ip">10.10.40.20</tag>
        <tag name="host-fqdn">fs01.meridiano.example</tag>
        <tag name="operating-system">Microsoft Windows Server 2008 R2</tag>
      </HostProperties>
      <ReportItem port="445" svc_name="cifs" protocol="tcp" severity="4" pluginID="97833" pluginName="MS17-010: Security Update for Microsoft Windows SMB Server (EternalBlue)" pluginFamily="Windows">
        <cve>CVE-2017-0144</cve>
        <cve>CVE-2017-0143</cve>
        <cvss3_base_score>8.1</cvss3_base_score>
        <exploit_available>true</exploit_available>
        <exploitability_ease>Exploits are available</exploitability_ease>
        <synopsis>El servidor SMB remoto tiene vulnerabilidades de ejecución remota de código.</synopsis>
      </ReportItem>
    </ReportHost>
  </Report>
</NessusClientData_v2>
`,V=`<?xml version="1.0" encoding="UTF-8"?>
<!-- Ejemplo FICTICIO de CTEM-Nexus: informe XML de Greenbone/OpenVAS (respuesta GMP con <report> anidado). -->
<get_reports_response status="200" status_text="OK">
  <report id="7f3c-ejemplo" format_id="a994b278-1f62-11e1-96ac-406186ea4fc5">
    <name>Meridiano · servidores</name>
    <report id="7f3c-ejemplo">
      <results start="1" max="100">
        <result id="r-001">
          <name>Microsoft Exchange Server ProxyShell (RCE)</name>
          <host>203.0.113.20<asset asset_id="h-1"/><hostname>owa.meridiano.example</hostname></host>
          <port>443/tcp</port>
          <nvt oid="1.3.6.1.4.1.25623.1.0.000001">
            <type>nvt</type>
            <name>Microsoft Exchange Server ProxyShell (RCE)</name>
            <cvss_base>9.8</cvss_base>
            <tags>summary=Cadena de vulnerabilidades que permite ejecutar código sin autenticar.|insight=Exploit publicly available.|solution_type=VendorFix</tags>
            <refs><ref type="cve" id="CVE-2021-34473"/><ref type="cve" id="CVE-2021-34523"/><ref type="url" id="https://msrc.microsoft.com/"/></refs>
          </nvt>
          <threat>High</threat>
          <severity>9.8</severity>
          <qod><value>95</value></qod>
        </result>
        <result id="r-002">
          <name>Microsoft SQL Server End of Life Detection</name>
          <host>10.10.30.12<asset asset_id="h-2"/><hostname>erp-db</hostname></host>
          <port>1433/tcp</port>
          <nvt oid="1.3.6.1.4.1.25623.1.0.000002">
            <name>Microsoft SQL Server End of Life Detection</name>
            <cvss_base>10.0</cvss_base>
            <tags>summary=La versión de SQL Server instalada ya no recibe parches de seguridad.</tags>
            <refs/>
          </nvt>
          <threat>High</threat>
          <severity>10.0</severity>
          <qod><value>80</value></qod>
        </result>
        <result id="r-003">
          <name>OS Detection Consolidation and Reporting</name>
          <host>10.10.30.12</host>
          <port>general/tcp</port>
          <nvt oid="1.3.6.1.4.1.25623.1.0.105937"><name>OS Detection Consolidation and Reporting</name><cvss_base>0.0</cvss_base></nvt>
          <threat>Log</threat>
          <severity>0.0</severity>
        </result>
      </results>
    </report>
    <results>
      <result id="r-001">
        <name>Microsoft Exchange Server ProxyShell (RCE)</name>
        <host>203.0.113.20</host>
        <port>443/tcp</port>
        <nvt oid="1.3.6.1.4.1.25623.1.0.000001"><name>Microsoft Exchange Server ProxyShell (RCE)</name><cvss_base>9.8</cvss_base><refs><ref type="cve" id="CVE-2021-34473"/></refs></nvt>
        <threat>High</threat>
        <severity>9.8</severity>
      </result>
    </results>
  </report>
</get_reports_response>
`,ne=`{"template-id":"CVE-2021-44228","info":{"name":"Apache Log4j2 - Remote Code Injection (Log4Shell)","severity":"critical","tags":["cve","cve2021","rce","oast","log4j","kev"],"classification":{"cve-id":["cve-2021-44228"],"cvss-score":10,"epss-score":0.94358}},"type":"http","host":"https://portal.meridiano.example","matched-at":"https://portal.meridiano.example/login","ip":"203.0.113.10","timestamp":"2026-10-07T09:12:44Z"}
{"template-id":"CVE-2023-4966","info":{"name":"Citrix NetScaler - Information Disclosure (Citrix Bleed)","severity":"high","tags":"cve,cve2023,citrix,kev","classification":{"cve-id":["CVE-2023-4966"],"cvss-score":9.4}},"type":"http","host":"https://vpn.meridiano.example","matched-at":"https://vpn.meridiano.example/oauth/idp/.well-known/openid-configuration","ip":"203.0.113.30","timestamp":"2026-10-07T09:13:02Z"}
{"template-id":"git-config","info":{"name":"Git Configuration - Detect","severity":"medium","tags":["config","git","exposure"],"description":"Se publica /.git/config: puede exponer el código fuente."},"type":"http","host":"https://portal.meridiano.example","matched-at":"https://portal.meridiano.example/.git/config","ip":"203.0.113.10","timestamp":"2026-10-07T09:13:30Z"}
{"template-id":"tech-detect","info":{"name":"Wappalyzer Technology Detection","severity":"info","tags":["tech"]},"type":"http","host":"https://portal.meridiano.example","matched-at":"https://portal.meridiano.example","ip":"203.0.113.10","timestamp":"2026-10-07T09:11:00Z"}
`,H=`{
  "SchemaVersion": 2,
  "ArtifactName": "registry.meridiano.example/portal:2.4.1",
  "ArtifactType": "container_image",
  "Metadata": { "OS": { "Family": "debian", "Name": "12.5" } },
  "Results": [
    {
      "Target": "app/lib/log4j-core-2.14.1.jar",
      "Class": "lang-pkgs",
      "Type": "jar",
      "Vulnerabilities": [
        { "VulnerabilityID": "CVE-2021-44228", "PkgName": "org.apache.logging.log4j:log4j-core", "InstalledVersion": "2.14.1", "FixedVersion": "2.15.0", "Severity": "CRITICAL", "Title": "log4j-core: Remote code execution in Log4j 2.x", "CVSS": { "nvd": { "V3Score": 10 }, "ghsa": { "V3Score": 10 } } }
      ]
    },
    {
      "Target": "app/lib/legacy/log4j-core-2.14.1.jar",
      "Class": "lang-pkgs",
      "Type": "jar",
      "Vulnerabilities": [
        { "VulnerabilityID": "CVE-2021-44228", "PkgName": "org.apache.logging.log4j:log4j-core", "InstalledVersion": "2.14.1", "FixedVersion": "2.15.0", "Severity": "CRITICAL", "Title": "log4j-core: Remote code execution in Log4j 2.x", "CVSS": { "nvd": { "V3Score": 10 } } }
      ]
    },
    {
      "Target": "registry.meridiano.example/portal:2.4.1 (debian 12.5)",
      "Class": "os-pkgs",
      "Type": "debian",
      "Vulnerabilities": [
        { "VulnerabilityID": "CVE-2024-2961", "PkgName": "libc6", "InstalledVersion": "2.36-9+deb12u4", "FixedVersion": "2.36-9+deb12u7", "Severity": "HIGH", "Title": "glibc: Out of bounds write in iconv", "CVSS": { "nvd": { "V3Score": 7.3 } } },
        { "VulnerabilityID": "CVE-2023-0000", "PkgName": "zlib1g", "InstalledVersion": "1:1.2.13", "Severity": "UNKNOWN", "Title": "Sin clasificar (se omite)" }
      ]
    },
    {
      "Target": "Dockerfile",
      "Class": "config",
      "Type": "dockerfile",
      "Misconfigurations": [
        { "Type": "Dockerfile Security Check", "ID": "DS002", "AVDID": "AVD-DS-0002", "Title": "Image user should not be 'root'", "Description": "El contenedor se ejecuta como root.", "Resolution": "Añade USER con un usuario sin privilegios", "Severity": "HIGH", "Status": "FAIL" },
        { "Type": "Dockerfile Security Check", "ID": "DS005", "AVDID": "AVD-DS-0005", "Title": "ADD instead of COPY", "Severity": "LOW", "Status": "PASS" }
      ]
    },
    {
      "Target": "app/config/application.properties",
      "Class": "secret",
      "Secrets": [
        { "RuleID": "aws-access-key-id", "Category": "AWS", "Severity": "CRITICAL", "Title": "AWS Access Key ID", "StartLine": 12, "EndLine": 12, "Match": "aws_access_key_id=EJEMPLO-NO-REAL-0000" }
      ]
    }
  ]
}
`,U=`{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Semgrep OSS",
          "version": "1.90.0",
          "rules": [
            { "id": "java.lang.security.audit.sqli.jdbc-sqli", "shortDescription": { "text": "Inyección SQL: consulta construida con concatenación" }, "properties": { "security-severity": "8.8", "tags": ["security", "CWE-89"] } },
            { "id": "generic.secrets.hardcoded-password", "shortDescription": { "text": "Contraseña escrita en el código" }, "properties": { "security-severity": "7.5" } },
            { "id": "java.lang.style.unused-import", "shortDescription": { "text": "Importación sin uso" }, "defaultConfiguration": { "level": "none" } }
          ]
        }
      },
      "versionControlProvenance": [ { "repositoryUri": "https://git.meridiano.example/web/portal.git", "revisionId": "4b1e0c2" } ],
      "results": [
        { "ruleId": "java.lang.security.audit.sqli.jdbc-sqli", "level": "error", "message": { "text": "Parámetro «id» concatenado en la consulta de clientes." }, "locations": [ { "physicalLocation": { "artifactLocation": { "uri": "src/main/java/es/meridiano/ClientesDao.java" }, "region": { "startLine": 88 } } } ] },
        { "ruleId": "java.lang.security.audit.sqli.jdbc-sqli", "level": "error", "message": { "text": "Parámetro «nif» concatenado en la búsqueda." }, "locations": [ { "physicalLocation": { "artifactLocation": { "uri": "src/main/java/es/meridiano/BusquedaDao.java" }, "region": { "startLine": 41 } } } ] },
        { "ruleId": "generic.secrets.hardcoded-password", "level": "warning", "message": { "text": "Contraseña de la base de datos en claro." }, "locations": [ { "physicalLocation": { "artifactLocation": { "uri": "src/main/resources/db.properties" }, "region": { "startLine": 3 } } } ] },
        { "ruleId": "java.lang.style.unused-import", "level": "none", "message": { "text": "Importación sin uso." } }
      ]
    }
  ]
}
`,W=`{
  "title": "CISA Catalog of Known Exploited Vulnerabilities (EXTRACTO DE EJEMPLO para CTEM-Nexus: no es el catálogo completo)",
  "catalogVersion": "2026.10.07",
  "dateReleased": "2026-10-07T17:00:00.000Z",
  "count": 9,
  "vulnerabilities": [
    { "cveID": "CVE-2021-44228", "vendorProject": "Apache", "product": "Log4j2", "vulnerabilityName": "Apache Log4j2 Remote Code Execution Vulnerability", "dateAdded": "2021-12-10", "requiredAction": "Apply updates per vendor instructions.", "dueDate": "2021-12-24", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2021-34473", "vendorProject": "Microsoft", "product": "Exchange Server", "vulnerabilityName": "Microsoft Exchange Server Remote Code Execution Vulnerability", "dateAdded": "2021-11-03", "requiredAction": "Apply updates per vendor instructions.", "dueDate": "2021-11-17", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2021-34523", "vendorProject": "Microsoft", "product": "Exchange Server", "vulnerabilityName": "Microsoft Exchange Server Privilege Escalation Vulnerability", "dateAdded": "2021-11-03", "requiredAction": "Apply updates per vendor instructions.", "dueDate": "2021-11-17", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2023-4966", "vendorProject": "Citrix", "product": "NetScaler ADC and NetScaler Gateway", "vulnerabilityName": "Citrix NetScaler ADC and NetScaler Gateway Buffer Overflow Vulnerability", "dateAdded": "2023-10-18", "requiredAction": "Apply mitigations per vendor instructions.", "dueDate": "2023-11-08", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2023-3519", "vendorProject": "Citrix", "product": "NetScaler ADC and NetScaler Gateway", "vulnerabilityName": "Citrix NetScaler ADC and NetScaler Gateway Code Injection Vulnerability", "dateAdded": "2023-07-19", "requiredAction": "Apply mitigations per vendor instructions.", "dueDate": "2023-08-09", "knownRansomwareCampaignUse": "Unknown" },
    { "cveID": "CVE-2024-21410", "vendorProject": "Microsoft", "product": "Exchange Server", "vulnerabilityName": "Microsoft Exchange Server Privilege Escalation Vulnerability", "dateAdded": "2024-02-15", "requiredAction": "Apply mitigations per vendor instructions.", "dueDate": "2024-03-07", "knownRansomwareCampaignUse": "Unknown" },
    { "cveID": "CVE-2023-46604", "vendorProject": "Apache", "product": "ActiveMQ", "vulnerabilityName": "Apache ActiveMQ Deserialization of Untrusted Data Vulnerability", "dateAdded": "2023-11-02", "requiredAction": "Apply mitigations per vendor instructions.", "dueDate": "2023-11-23", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2023-36884", "vendorProject": "Microsoft", "product": "Office and Windows", "vulnerabilityName": "Microsoft Office and Windows HTML Remote Code Execution Vulnerability", "dateAdded": "2023-07-17", "requiredAction": "Apply mitigations per vendor instructions.", "dueDate": "2023-08-07", "knownRansomwareCampaignUse": "Known" },
    { "cveID": "CVE-2017-0144", "vendorProject": "Microsoft", "product": "SMBv1", "vulnerabilityName": "Microsoft SMBv1 Remote Code Execution Vulnerability", "dateAdded": "2022-02-10", "requiredAction": "Apply updates per vendor instructions.", "dueDate": "2022-08-10", "knownRansomwareCampaignUse": "Known" }
  ]
}
`,G=`#model_version:v2025.03.14,score_date:2026-10-07T00:00:00+0000
cve,epss,percentile
CVE-2017-0144,0.94412,0.99961
CVE-2017-0143,0.94301,0.99932
CVE-2021-44228,0.94358,0.99950
CVE-2021-34473,0.94270,0.99920
CVE-2023-4966,0.94104,0.99880
CVE-2023-3519,0.91280,0.99640
CVE-2024-21410,0.33014,0.97010
CVE-2023-46604,0.94190,0.99900
CVE-2023-36884,0.70211,0.98420
CVE-2024-6387,0.06110,0.90210
CVE-2024-2961,0.12530,0.94100
`,K=`{
  "@programName": "ZAP",
  "@version": "2.15.0",
  "@generated": "Wed, 16 Sep 2026 09:00:00",
  "site": [
    {
      "@name": "https://portal.meridiano.example",
      "@host": "portal.meridiano.example",
      "@port": "443",
      "@ssl": "true",
      "alerts": [
        {
          "pluginid": "40018", "alertRef": "40018", "alert": "SQL Injection", "name": "SQL Injection",
          "riskcode": "3", "confidence": "2", "riskdesc": "High (Medium)",
          "desc": "<p>SQL injection may be possible.</p>",
          "instances": [ { "uri": "https://portal.meridiano.example/pedidos?id=7", "method": "GET", "param": "id", "attack": "7' AND '1'='1", "evidence": "" } ],
          "count": "1", "solution": "<p>Use prepared statements.</p>", "reference": "<p>https://cheatsheetseries.owasp.org/</p>",
          "cweid": "89", "wascid": "19", "sourceid": "1"
        },
        {
          "pluginid": "40012", "alertRef": "40012", "alert": "Cross Site Scripting (Reflected)", "name": "Cross Site Scripting (Reflected)",
          "riskcode": "3", "confidence": "2", "riskdesc": "High (Medium)",
          "desc": "<p>Cross-site Scripting (XSS) is an attack technique that involves echoing attacker-supplied code into a user's browser instance.</p>",
          "instances": [ { "uri": "https://portal.meridiano.example/buscar?q=test", "method": "GET", "param": "q", "attack": "<scrIpt>alert(1);<\/scRipt>", "evidence": "<scrIpt>alert(1);<\/scRipt>" } ],
          "count": "1", "solution": "<p>Encode output.</p>", "reference": "", "cweid": "79", "wascid": "8", "sourceid": "1"
        },
        {
          "pluginid": "10038", "alertRef": "10038-1", "alert": "Content Security Policy (CSP) Header Not Set", "name": "Content Security Policy (CSP) Header Not Set",
          "riskcode": "2", "confidence": "3", "riskdesc": "Medium (High)",
          "desc": "<p>Content Security Policy (CSP) is an added layer of security.</p>",
          "instances": [ { "uri": "https://portal.meridiano.example/", "method": "GET", "param": "", "attack": "", "evidence": "" }, { "uri": "https://portal.meridiano.example/login", "method": "GET", "param": "", "attack": "", "evidence": "" } ],
          "count": "2", "solution": "", "reference": "", "cweid": "693", "wascid": "15", "sourceid": "3"
        },
        {
          "pluginid": "10036", "alertRef": "10036", "alert": "Server Leaks Version Information via \\"Server\\" HTTP Response Header Field", "name": "Server Leaks Version Information",
          "riskcode": "0", "confidence": "3", "riskdesc": "Informational (High)", "desc": "", "instances": [], "count": "1", "solution": "", "reference": "", "cweid": "200", "wascid": "13", "sourceid": "3"
        },
        {
          "pluginid": "10202", "alertRef": "10202", "alert": "Absence of Anti-CSRF Tokens", "name": "Absence of Anti-CSRF Tokens",
          "riskcode": "2", "confidence": "0", "riskdesc": "Medium (False Positive)", "desc": "", "instances": [], "count": "1", "solution": "", "reference": "", "cweid": "352", "wascid": "9", "sourceid": "3"
        }
      ]
    }
  ]
}
`,q=`<?xml version="1.0"?>
<!DOCTYPE issues [
<!ELEMENT issues (issue*)>
<!ATTLIST issues burpVersion CDATA "">
<!ATTLIST issues exportTime CDATA "">
<!ELEMENT issue (serialNumber, type, name, host, path, location, severity, confidence, issueBackground?, remediationBackground?, references?, vulnerabilityClassifications?, issueDetail?, issueDetailItems?, remediationDetail?, requestresponse*, collaboratorEvent*, infiltratorEvent*, staticAnalysis*, dynamicAnalysis*, prototypePollution*)>
<!ELEMENT serialNumber (#PCDATA)>
<!ELEMENT type (#PCDATA)>
<!ELEMENT name (#PCDATA)>
<!ELEMENT host (#PCDATA)>
<!ATTLIST host ip CDATA "">
]>
<issues burpVersion="2026.8" exportTime="Wed Sep 16 09:00:00 CEST 2026">
  <issue>
    <serialNumber>1001</serialNumber>
    <type>1049088</type>
    <name>SQL injection</name>
    <host ip="203.0.113.10">https://portal.meridiano.example</host>
    <path><![CDATA[/pedidos]]></path>
    <location><![CDATA[/pedidos [id URL parameter]]]></location>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <issueBackground><![CDATA[<p>SQL injection vulnerabilities arise when user-controllable data is incorporated into database SQL queries in an unsafe manner.</p>]]></issueBackground>
    <vulnerabilityClassifications><![CDATA[<ul><li><a href="https://cwe.mitre.org/data/definitions/89.html">CWE-89: Improper Neutralization of Special Elements used in an SQL Command</a></li></ul>]]></vulnerabilityClassifications>
    <issueDetail><![CDATA[The <b>id</b> URL parameter appears to be vulnerable to SQL injection attacks.]]></issueDetail>
    <requestresponse>
      <request method="GET" base64="true"><![CDATA[R0VUIC9wZWRpZG9zP2lkPTcnIEhUVFAvMS4xDQpDb29raWU6IHNlc3Npb249U0VDUkVUTyENCg0K]]></request>
      <response base64="true"><![CDATA[SFRUUC8xLjEgNTAwIEVycm9yDQoNCg==]]></response>
    </requestresponse>
  </issue>
  <issue>
    <serialNumber>1002</serialNumber>
    <type>5245344</type>
    <name>Cookie without HttpOnly flag set</name>
    <host ip="203.0.113.10">https://portal.meridiano.example</host>
    <path><![CDATA[/login]]></path>
    <location><![CDATA[/login]]></location>
    <severity>Low</severity>
    <confidence>Firm</confidence>
    <issueDetail><![CDATA[The following cookie was issued by the application and does not have the HttpOnly flag set: <b>session</b>]]></issueDetail>
  </issue>
  <issue>
    <serialNumber>1003</serialNumber>
    <type>8389632</type>
    <name>Strict transport security not enforced</name>
    <host ip="203.0.113.10">https://portal.meridiano.example</host>
    <path><![CDATA[/]]></path>
    <location><![CDATA[/]]></location>
    <severity>Information</severity>
    <confidence>Certain</confidence>
  </issue>
</issues>
`,J=`<?xml version="1.0" encoding="utf-8"?>
<HealthcheckData xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <EngineVersion>3.3.0.1</EngineVersion>
  <GenerationDate>2026-09-16T09:00:00</GenerationDate>
  <DomainFQDN>meridiano.local</DomainFQDN>
  <GlobalScore>70</GlobalScore>
  <RiskRules>
    <HealthcheckRiskRule>
      <Points>30</Points><Category>PrivilegedAccounts</Category><Model>AccountTakeOver</Model><RiskId>P-Kerberoasting</RiskId>
      <Rationale>Presence of Admin accounts which have a Service Principal Name (SPN): 1</Rationale>
      <Details><string>Account: svc_sql</string></Details>
    </HealthcheckRiskRule>
    <HealthcheckRiskRule>
      <Points>20</Points><Category>Anomalies</Category><Model>PassTheCredential</Model><RiskId>A-LAPS-Not-Installed</RiskId>
      <Rationale>LAPS doesn't seem to be installed</Rationale>
    </HealthcheckRiskRule>
    <HealthcheckRiskRule>
      <Points>10</Points><Category>Anomalies</Category><Model>Reconnaissance</Model><RiskId>A-DC-Spooler</RiskId>
      <Rationale>The spooler service is remotely accessible from 1 DC</Rationale>
      <Details><string>DC: DC01</string></Details>
    </HealthcheckRiskRule>
    <HealthcheckRiskRule>
      <Points>15</Points><Category>StaleObjects</Category><Model>ObjectConfig</Model><RiskId>S-SMB-v1</RiskId>
      <Rationale>At least one DC supports SMB v1</Rationale>
    </HealthcheckRiskRule>
    <HealthcheckRiskRule>
      <Points>5</Points><Category>Anomalies</Category><Model>Audit</Model><RiskId>A-AuditDC</RiskId>
      <Rationale>Number of DC with audit policy not correctly configured: 1</Rationale>
    </HealthcheckRiskRule>
    <HealthcheckRiskRule>
      <Points>0</Points><Category>Trusts</Category><Model>OldTrustProtocol</Model><RiskId>T-Downlevel</RiskId>
      <Rationale>No problem detected</Rationale>
    </HealthcheckRiskRule>
  </RiskRules>
</HealthcheckData>
`,Y=`{
  "Certificate Authorities": {
    "0": {
      "CA Name": "meridiano-PKI-CA01",
      "DNS Name": "pki-ca01.meridiano.local",
      "Certificate Subject": "CN=meridiano-PKI-CA01, DC=meridiano, DC=local",
      "Web Enrollment": "Enabled",
      "User Specified SAN": "Disabled",
      "[!] Vulnerabilities": {
        "ESC8": "Web Enrollment is enabled and Request Disposition is set to Issue"
      }
    }
  },
  "Certificate Templates": {
    "0": {
      "Template Name": "UserAuth",
      "Display Name": "User Authentication",
      "Certificate Authorities": ["meridiano-PKI-CA01"],
      "Enabled": true,
      "Client Authentication": true,
      "Enrollee Supplies Subject": true,
      "Permissions": { "Enrollment Permissions": { "Enrollment Rights": ["MERIDIANO.LOCAL\\\\Domain Users", "MERIDIANO.LOCAL\\\\Domain Admins"] } },
      "[!] Vulnerabilities": {
        "ESC1": "'MERIDIANO.LOCAL\\\\\\\\Domain Users' can enroll, enrollee supplies subject and template allows client authentication"
      }
    },
    "1": {
      "Template Name": "WebServer",
      "Display Name": "Web Server",
      "Certificate Authorities": ["meridiano-PKI-CA01"],
      "Enabled": true,
      "Client Authentication": false,
      "Enrollee Supplies Subject": true
    }
  }
}
`,X=`{
 "version": 1,
 "caseId": "meridiano",
 "meta": {
  "nombre": "Industrias Meridiano · BIA 2026",
  "organizacion": "Industrias Meridiano S.A. (ficticia)",
  "sistema": "Sistemas corporativos y comercio electrónico",
  "categoria": "MEDIA",
  "responsable": "Responsable de continuidad",
  "alcance": "Ventas en línea, facturación, correo y acceso remoto desde el CPD de Zaragoza. Ejemplo para la integración con CTEM-Nexus."
 },
 "funciones": [
  {
   "id": "F-01",
   "nombre": "Ventas en línea y atención a clientes",
   "descripcion": "Pedidos y seguimiento de entregas desde el portal web.",
   "responsable": "Directora Comercial",
   "rto": 4,
   "rpo": 1,
   "mtpd": 24,
   "costeHora": 9000,
   "impacto": {
    "h1": {
     "op": 1,
     "le": 1,
     "re": 1,
     "pe": 0
    },
    "h4": {
     "op": 3,
     "le": 2,
     "re": 3,
     "pe": 0
    },
    "h24": {
     "op": 4,
     "le": 3,
     "re": 4,
     "pe": 1
    },
    "h72": {
     "op": 4,
     "le": 4,
     "re": 4,
     "pe": 1
    },
    "d7": {
     "op": 4,
     "le": 4,
     "re": 4,
     "pe": 2
    }
   },
   "alternativa": "Pedidos por teléfono y correo con el equipo comercial.",
   "dependencias": {
    "activos": [
     "A-01"
    ],
    "funciones": [
     "F-02"
    ],
    "proveedores": []
   }
  },
  {
   "id": "F-02",
   "nombre": "Facturación y tesorería",
   "descripcion": "Emisión de facturas, cobros y pagos a proveedores.",
   "responsable": "Director Financiero",
   "rto": 8,
   "rpo": 0,
   "mtpd": 48,
   "costeHora": 4000,
   "impacto": {
    "h1": {
     "op": 1,
     "le": 0,
     "re": 0,
     "pe": 0
    },
    "h4": {
     "op": 2,
     "le": 1,
     "re": 1,
     "pe": 0
    },
    "h24": {
     "op": 3,
     "le": 3,
     "re": 2,
     "pe": 0
    },
    "h72": {
     "op": 4,
     "le": 4,
     "re": 3,
     "pe": 1
    },
    "d7": {
     "op": 4,
     "le": 4,
     "re": 4,
     "pe": 1
    }
   },
   "alternativa": "Facturas en plantilla y pagos manuales por banca electrónica.",
   "dependencias": {
    "activos": [
     "A-05"
    ],
    "funciones": [],
    "proveedores": []
   }
  },
  {
   "id": "F-03",
   "nombre": "Correo corporativo",
   "descripcion": "Correo interno y con clientes y proveedores.",
   "responsable": "Responsable de Sistemas",
   "rto": 24,
   "rpo": 24,
   "mtpd": 72,
   "costeHora": 600,
   "impacto": {
    "h1": {
     "op": 0,
     "le": 0,
     "re": 0,
     "pe": 0
    },
    "h4": {
     "op": 1,
     "le": 0,
     "re": 1,
     "pe": 0
    },
    "h24": {
     "op": 2,
     "le": 1,
     "re": 2,
     "pe": 0
    },
    "h72": {
     "op": 3,
     "le": 2,
     "re": 2,
     "pe": 0
    },
    "d7": {
     "op": 3,
     "le": 2,
     "re": 3,
     "pe": 0
    }
   },
   "alternativa": "Telefonía y mensajería del comité de crisis.",
   "dependencias": {
    "activos": [
     "A-02"
    ],
    "funciones": [],
    "proveedores": []
   }
  },
  {
   "id": "F-04",
   "nombre": "Acceso remoto de técnicos y proveedores",
   "descripcion": "Teletrabajo y mantenimiento remoto de planta.",
   "responsable": "Responsable de Redes",
   "rto": 24,
   "rpo": 24,
   "mtpd": 72,
   "costeHora": 500,
   "impacto": {
    "h1": {
     "op": 0,
     "le": 0,
     "re": 0,
     "pe": 0
    },
    "h4": {
     "op": 1,
     "le": 0,
     "re": 0,
     "pe": 0
    },
    "h24": {
     "op": 2,
     "le": 1,
     "re": 1,
     "pe": 0
    },
    "h72": {
     "op": 3,
     "le": 2,
     "re": 1,
     "pe": 0
    },
    "d7": {
     "op": 3,
     "le": 2,
     "re": 2,
     "pe": 0
    }
   },
   "alternativa": "Intervención presencial en planta.",
   "dependencias": {
    "activos": [
     "A-03"
    ],
    "funciones": [],
    "proveedores": []
   }
  }
 ],
 "activos": [
  {
   "id": "A-01",
   "datos": false,
   "nombre": "Portal web de clientes",
   "tipo": "Aplicación",
   "estrategia": "warm",
   "tiempoRecuperacion": 2,
   "dependeDe": [
    "A-04",
    "A-06"
   ],
   "ubicacion": "DMZ, CPD de Zaragoza",
   "responsable": "Equipo Web",
   "procedimiento": {
    "pasos": "1. Levantar la réplica.\\n2. Cambiar el DNS público.",
    "exito": "Un pedido de prueba se completa.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Imagen",
    "frecuenciaHoras": 24,
    "retencionDias": 14,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-02",
   "datos": false,
   "nombre": "Exchange OWA (correo)",
   "tipo": "Servidor",
   "estrategia": "cold",
   "tiempoRecuperacion": 12,
   "dependeDe": [
    "A-06"
   ],
   "ubicacion": "DMZ",
   "responsable": "Sistemas",
   "procedimiento": {
    "pasos": "1. Restaurar la base de datos de buzones.",
    "exito": "Envío y recepción externos correctos.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Base de datos",
    "frecuenciaHoras": 24,
    "retencionDias": 30,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-03",
   "datos": false,
   "nombre": "Citrix NetScaler Gateway",
   "tipo": "Red",
   "estrategia": "warm",
   "tiempoRecuperacion": 4,
   "dependeDe": [
    "A-06"
   ],
   "ubicacion": "Perímetro",
   "responsable": "Redes",
   "procedimiento": {
    "pasos": "1. Activar el appliance secundario.",
    "exito": "Un técnico entra por la VPN.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Configuración",
    "frecuenciaHoras": 24,
    "retencionDias": 90,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-04",
   "datos": false,
   "nombre": "Servidor de aplicaciones APP01",
   "tipo": "Servidor",
   "estrategia": "warm",
   "tiempoRecuperacion": 3,
   "dependeDe": [
    "A-05"
   ],
   "ubicacion": "CPD, VLAN 20",
   "responsable": "Sistemas",
   "procedimiento": {
    "pasos": "1. Restaurar la VM.",
    "exito": "La API responde.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Imagen",
    "frecuenciaHoras": 24,
    "retencionDias": 14,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-05",
   "datos": true,
   "nombre": "ERP y base de datos financiera",
   "tipo": "Base de datos",
   "estrategia": "warm",
   "tiempoRecuperacion": 6,
   "dependeDe": [
    "A-06"
   ],
   "ubicacion": "CPD, VLAN 30",
   "responsable": "Finanzas TI",
   "procedimiento": {
    "pasos": "1. Restaurar la última copia completa.\\n2. Aplicar los registros de transacciones.",
    "exito": "Cuadre de saldos con el día anterior.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Base de datos",
    "frecuenciaHoras": 1,
    "retencionDias": 35,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-06",
   "datos": false,
   "nombre": "Controlador de dominio DC01 (Active Directory)",
   "tipo": "Identidad",
   "estrategia": "hot",
   "tiempoRecuperacion": 1,
   "dependeDe": [],
   "ubicacion": "CPD, Tier 0",
   "responsable": "Identidad",
   "procedimiento": {
    "pasos": "1. Comprobar la réplica DC02.\\n2. Transferir roles FSMO si hace falta.",
    "exito": "Inicio de sesión correcto en tres segmentos.",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": true,
    "tipo": "Estado del sistema",
    "frecuenciaHoras": 24,
    "retencionDias": 30,
    "offsite": true,
    "cifrado": true,
    "inmutable": false,
    "ultimaRestauracion": "2026-08-28",
    "resultado": "OK"
   }
  },
  {
   "id": "A-07",
   "datos": false,
   "nombre": "Laboratorio de pruebas",
   "tipo": "Servidor",
   "estrategia": "ninguna",
   "tiempoRecuperacion": 72,
   "dependeDe": [],
   "ubicacion": "Laboratorio",
   "responsable": "I+D",
   "procedimiento": {
    "pasos": "",
    "exito": "",
    "credenciales": "Bóveda: «DR Meridiano»"
   },
   "backup": {
    "aplica": false
   }
  }
 ],
 "proveedores": [],
 "bcp": {
  "equipo": [
   {
    "rol": "Responsable de crisis",
    "titular": "Director de Operaciones",
    "suplente": "Responsable de Seguridad",
    "telefono": "600 000 101",
    "responsabilidades": "Activa el plan, decide y responde ante las consejerías."
   },
   {
    "rol": "Responsable de recuperación técnica",
    "titular": "Responsable de Sistemas",
    "suplente": "",
    "telefono": "600 000 102",
    "responsabilidades": "Coordina el DRP y el sitio alternativo."
   },
   {
    "rol": "Responsable de comunicación",
    "titular": "Responsable de Comunicación",
    "suplente": "Jefa de Atención al Cliente",
    "telefono": "600 000 103",
    "responsabilidades": "Comunicados a las consejerías, a la ciudadanía y a los medios."
   }
  ],
  "activacion": {
   "umbralHoras": 2,
   "autorizado": "Responsable de crisis o su suplente",
   "escenarios": "1. Caída de la sede electrónica más de 2 h sin solución a la vista.\\n2. Desastre físico en el CPD (incendio, inundación, corte eléctrico de más de 4 h).\\n3. Fallo de un proveedor crítico sin plazo de resolución.\\n4. Incidente de seguridad con impacto en la disponibilidad."
  },
  "comunicacion": {
   "primario": "Microsoft Teams (canal del comité)",
   "secundario": "Telefonía móvil y lista de contactos impresa",
   "externo": "Web corporativa y correo a las consejerías",
   "plantilla": "ASUNTO: [INCIDENTE] Servicios de TechServ — [FECHA] [HORA]\\n\\nSe ha detectado un incidente que afecta a [SERVICIOS].\\nEstado: [EN INVESTIGACIÓN / EN RECUPERACIÓN / RESTABLECIDO PARCIALMENTE]\\nVuelta estimada del servicio: [HORA]\\nAlternativa disponible: [SÍ / NO — cuál]\\nPróxima actualización: [HORA]\\nUrgencias: [TELÉFONO]"
  },
  "sitio": {
   "tipo": "warm",
   "ubicacion": "CPD secundario en Zaragoza (ficticio)",
   "distanciaKm": 300,
   "rtoActivacion": 4,
   "capacidad": "DR-01 VMware 32 núcleos / 256 GB; DR-02 SQL Server 16 núcleos / 128 GB; NAS 20 TB; cortafuegos en alta disponibilidad; fibra 1 Gbps y respaldo 4G."
  }
 },
 "pruebas": [],
 "revision": {
  "version": "1.2",
  "fecha": "2026-09-01",
  "proxima": "2027-03-01",
  "aprobadoPor": "Comité de Dirección (acta 2026/02)",
  "disparadores": "Cambio de CPD, alta de un servicio crítico, incidente que active el plan, cambio normativo.",
  "historial": [
   {
    "version": "1.0",
    "fecha": "2025-01-15",
    "motivo": "Versión inicial",
    "responsable": "Responsable de continuidad",
    "aprobado": "Comité de Dirección"
   },
   {
    "version": "1.2",
    "fecha": "2026-02-01",
    "motivo": "Nuevo sitio alternativo",
    "responsable": "Responsable de continuidad",
    "aprobado": "Comité de Dirección"
   }
  ]
 },
 "acciones": {},
 "historial": []
}
`,Z=`{
 "version": 1,
 "proyecto": {
  "organizacion": "Industrias Meridiano S.A. (ficticia)",
  "nombre": "Plataforma de pedidos de la Administración",
  "descripcion": "Meridiano suministra a organismos públicos y su plataforma de pedidos está en el alcance del ENS. Ejemplo para CTEM-Nexus."
 },
 "portada": {},
 "categorizacion": [
  {
   "tipo": "Información",
   "id": "I-01",
   "nombre": "Pedidos y contratos con la Administración",
   "responsable": "Directora Comercial",
   "D": "",
   "I": "MEDIO",
   "C": "MEDIO",
   "A": "MEDIO",
   "T": "BAJO",
   "justificacion": "Datos contractuales: un fallo causaría un perjuicio grave pero reparable."
  },
  {
   "tipo": "Servicio",
   "id": "S-01",
   "nombre": "Plataforma de pedidos",
   "responsable": "Responsable de Sistemas",
   "D": "MEDIO",
   "I": "",
   "C": "",
   "A": "",
   "T": "",
   "justificacion": "Tolera hasta 24 h de parada sin perjuicio muy grave."
  }
 ],
 "soa": {},
 "refuerzos": {},
 "compensatorias": {},
 "apetito": {},
 "activos": [
  {
   "id": "ACT-001",
   "nombre": "Portal web de clientes",
   "tipo": "[SW]",
   "soporta": [
    "S-01"
   ],
   "descripcion": "Portal de pedidos",
   "valoracion": {
    "D": 6,
    "I": 6,
    "C": 5,
    "A": 6,
    "T": 3
   }
  },
  {
   "id": "CTEM",
   "nombre": "Infraestructura analizada por CTEM-Nexus",
   "tipo": "[HW]",
   "soporta": [
    "S-01"
   ],
   "descripcion": "Destino de la evidencia técnica que exporta CTEM-Nexus",
   "valoracion": {
    "D": 6,
    "I": 6,
    "C": 6,
    "A": 6,
    "T": 3
   }
  }
 ],
 "amenazas": [],
 "salvaguardas": [],
 "hallazgos": [],
 "tratamiento": {}
}
`,re=`{
 "generated_at": "2026-09-16T09:00:00Z",
 "is_sample": true,
 "scanned": true,
 "total_alerts": 6,
 "counts_by_risk": {
  "Critico": 2,
  "Alto": 2,
  "Medio": 2,
  "Bajo": 0
 },
 "alerts": [
  {
   "rule_id": "ENS-ACC-KRB-01",
   "risk": "Alto",
   "impact": 4,
   "likelihood": 4,
   "score": 16,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseña de servicio crackeable fuera de línea.",
   "remediation": "gMSA o contraseña de 30+ caracteres y AES.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "kerberoasting",
    "title": "Cuenta de servicio con SPN y cifrado RC4",
    "target": "svc_sql",
    "detail": "La cuenta svc_sql tiene SPN MSSQLSvc/app01 y admite RC4.",
    "evidence": "servicePrincipalName=MSSQLSvc/app01.meridiano.local",
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-PKI-01",
   "risk": "Critico",
   "impact": 5,
   "likelihood": 4,
   "score": 20,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    },
    {
     "id": "op.acc.4",
     "name": "Proceso de gestión de derechos de acceso",
     "is_primary": false
    }
   ],
   "non_compliance": "Cualquier usuario puede pedir un certificado de administrador.",
   "remediation": "Desactivar ENROLLEE_SUPPLIES_SUBJECT y exigir aprobación.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "adcs_esc",
    "title": "Plantilla ADCS vulnerable (ESC1)",
    "target": "Plantilla UserAuth",
    "detail": "El solicitante proporciona el sujeto y la plantilla tiene EKU de autenticación.",
    "evidence": "certipy: ESC1 en UserAuth",
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-SMB-01",
   "risk": "Alto",
   "impact": 4,
   "likelihood": 3,
   "score": 12,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Permite retransmitir autenticaciones NTLM.",
   "remediation": "Exigir la firma SMB por GPO.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "smb_signing_disabled",
    "title": "Firma SMB no obligatoria en los controladores",
    "target": "DC01",
    "detail": "RequireSecuritySignature = 0.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-LAPS-01",
   "risk": "Medio",
   "impact": 3,
   "likelihood": 3,
   "score": 9,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.6",
     "name": "Mecanismo de autenticación (usuarios externos)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseña de administrador local común.",
   "remediation": "Desplegar Windows LAPS.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "laps_not_deployed",
    "title": "LAPS no desplegado en los puestos",
    "target": "OU=Puestos",
    "detail": "El esquema no tiene ms-LAPS-Password.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-ACL-01",
   "risk": "Critico",
   "impact": 5,
   "likelihood": 4,
   "score": 20,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.4",
     "name": "Proceso de gestión de derechos de acceso",
     "is_primary": true
    }
   ],
   "non_compliance": "Cualquier miembro puede extraer los hashes del dominio.",
   "remediation": "Retirar el permiso y revisar quién lo concedió.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "acl_control_path",
    "title": "Permisos de replicación (DCSync) a un grupo no privilegiado",
    "target": "Grupo Soporte-N2",
    "detail": "El grupo tiene DS-Replication-Get-Changes-All sobre el dominio.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-PWD-01",
   "risk": "Medio",
   "impact": 3,
   "likelihood": 3,
   "score": 9,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseñas vulnerables a rociado.",
   "remediation": "Longitud 14+, historial 24 y bloqueo.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "weak_password_policy",
    "title": "Política de contraseñas del dominio débil",
    "target": "meridiano.local",
    "detail": "Longitud mínima 8 y sin historial.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  }
 ],
 "domain": "meridiano.local",
 "dc_host": "dc01.meridiano.local",
 "errors": [],
 "matrix": {
  "empty": false,
  "cells": []
 },
 "summary": {
  "highest_risk": "Critico",
  "controls_hit": 3,
  "da_path": true,
  "da_path_count": 3,
  "total_alerts": 6
 }
}
`,ie=`activo,responsable,rol\r
Portal web de clientes,Lucía Romero,Product Owner web\r
10.10.10.5,Javier Ortiz,Responsable de Identidad\r
ERP y base de datos financiera,Marta Gil,Responsable de Finanzas TI\r
Servidor inexistente,Nadie,—\r
`,ae=`{
 "format": "yrd-ecosistema",
 "version": 1,
 "origen": {
  "herramienta": "kairos",
  "version": "1.1.0",
  "generado": "2026-10-10T09:00:00Z"
 },
 "tipo": "bia",
 "proyecto": "Industrias Meridiano S.A. (ficticia)",
 "datos": [
  {
   "activo": "A-01",
   "nombre": "Portal web de clientes",
   "tipo": "Aplicación",
   "responsable": "Equipo Web",
   "dependeDe": [
    "A-04",
    "A-06"
   ],
   "funciones": [
    {
     "id": "F-01",
     "nombre": "Ventas en línea y atención a clientes",
     "rto": 4,
     "rpo": 1,
     "mtpd": 24,
     "costeHora": 9000,
     "criticidad": "ALTA"
    }
   ]
  },
  {
   "activo": "A-02",
   "nombre": "Exchange OWA (correo)",
   "tipo": "Servidor",
   "responsable": "Sistemas",
   "dependeDe": [
    "A-06"
   ],
   "funciones": [
    {
     "id": "F-03",
     "nombre": "Correo corporativo",
     "rto": 24,
     "rpo": 24,
     "mtpd": 72,
     "costeHora": 600,
     "criticidad": "MEDIA"
    }
   ]
  },
  {
   "activo": "A-03",
   "nombre": "Citrix NetScaler Gateway",
   "tipo": "Red",
   "responsable": "Redes",
   "dependeDe": [
    "A-06"
   ],
   "funciones": [
    {
     "id": "F-04",
     "nombre": "Acceso remoto de técnicos y proveedores",
     "rto": 24,
     "rpo": 24,
     "mtpd": 72,
     "costeHora": 500,
     "criticidad": "MEDIA"
    }
   ]
  },
  {
   "activo": "A-04",
   "nombre": "Servidor de aplicaciones APP01",
   "tipo": "Servidor",
   "responsable": "Sistemas",
   "dependeDe": [
    "A-05"
   ],
   "funciones": [
    {
     "id": "F-01",
     "nombre": "Ventas en línea y atención a clientes",
     "rto": 4,
     "rpo": 1,
     "mtpd": 24,
     "costeHora": 9000,
     "criticidad": "ALTA"
    }
   ]
  },
  {
   "activo": "A-05",
   "nombre": "ERP y base de datos financiera",
   "tipo": "Base de datos",
   "responsable": "Finanzas TI",
   "dependeDe": [
    "A-06"
   ],
   "funciones": [
    {
     "id": "F-01",
     "nombre": "Ventas en línea y atención a clientes",
     "rto": 4,
     "rpo": 1,
     "mtpd": 24,
     "costeHora": 9000,
     "criticidad": "ALTA"
    },
    {
     "id": "F-02",
     "nombre": "Facturación y tesorería",
     "rto": 8,
     "rpo": 0,
     "mtpd": 48,
     "costeHora": 4000,
     "criticidad": "MEDIA"
    }
   ]
  },
  {
   "activo": "A-06",
   "nombre": "Controlador de dominio DC01 (Active Directory)",
   "tipo": "Identidad",
   "responsable": "Identidad",
   "dependeDe": [],
   "funciones": [
    {
     "id": "F-01",
     "nombre": "Ventas en línea y atención a clientes",
     "rto": 4,
     "rpo": 1,
     "mtpd": 24,
     "costeHora": 9000,
     "criticidad": "ALTA"
    },
    {
     "id": "F-02",
     "nombre": "Facturación y tesorería",
     "rto": 8,
     "rpo": 0,
     "mtpd": 48,
     "costeHora": 4000,
     "criticidad": "MEDIA"
    },
    {
     "id": "F-03",
     "nombre": "Correo corporativo",
     "rto": 24,
     "rpo": 24,
     "mtpd": 72,
     "costeHora": 600,
     "criticidad": "MEDIA"
    },
    {
     "id": "F-04",
     "nombre": "Acceso remoto de técnicos y proveedores",
     "rto": 24,
     "rpo": 24,
     "mtpd": 72,
     "costeHora": 500,
     "criticidad": "MEDIA"
    }
   ]
  },
  {
   "activo": "A-07",
   "nombre": "Laboratorio de pruebas",
   "tipo": "Servidor",
   "responsable": "I+D",
   "dependeDe": [],
   "funciones": []
  }
 ]
}
`,oe=`{
 "format": "yrd-ecosistema",
 "version": 1,
 "origen": {
  "herramienta": "compliance-studio",
  "version": "2.2.0",
  "generado": "2026-10-10T09:00:00Z"
 },
 "tipo": "soa",
 "proyecto": "Industrias Meridiano S.A. (ficticia)",
 "datos": [
  {
   "medida": "org.1",
   "nombre": "Política de seguridad",
   "familia": "Marco organizativo",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "org.2",
   "nombre": "Normativa de seguridad",
   "familia": "Marco organizativo",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "org.3",
   "nombre": "Procedimientos de seguridad",
   "familia": "Marco organizativo",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "org.4",
   "nombre": "Proceso de autorización",
   "familia": "Marco organizativo",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.pl.1",
   "nombre": "Análisis de riesgos",
   "familia": "Planificación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.pl.2",
   "nombre": "Arquitectura de Seguridad",
   "familia": "Planificación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.pl.3",
   "nombre": "Adquisición de nuevos componentes",
   "familia": "Planificación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.pl.4",
   "nombre": "Dimensionamiento/gestión de la capacidad",
   "familia": "Planificación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.pl.5",
   "nombre": "Componentes certificados",
   "familia": "Planificación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.1",
   "nombre": "Identificación",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.2",
   "nombre": "Requisitos de acceso",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.3",
   "nombre": "Segregación de funciones y tareas",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.4",
   "nombre": "Proceso de gestión de derechos de acceso",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.5",
   "nombre": "Mecanismo de autenticación (usuarios externos)",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.acc.6",
   "nombre": "Mecanismo de autenticación (usuarios de la organización)",
   "familia": "Control de acceso",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.ext.1",
   "nombre": "Contratación y acuerdos de nivel de servicio",
   "familia": "Recursos externos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.ext.2",
   "nombre": "Gestión diaria",
   "familia": "Recursos externos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.ext.3",
   "nombre": "Protección de la cadena de suministro",
   "familia": "Recursos externos",
   "nivel": "MEDIO",
   "aplica": false,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.ext.4",
   "nombre": "Interconexión de sistemas",
   "familia": "Recursos externos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.nub.1",
   "nombre": "Protección de servicios en la nube",
   "familia": "Servicios en la nube",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.1",
   "nombre": "Inventario de activos",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.2",
   "nombre": "Configuración de seguridad",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.3",
   "nombre": "Gestión de la configuración de seguridad",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.4",
   "nombre": "Mantenimiento y actualizaciones de seguridad",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.5",
   "nombre": "Gestión de cambios",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.6",
   "nombre": "Protección frente a código dañino",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.7",
   "nombre": "Gestión de incidentes",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.8",
   "nombre": "Registro de la actividad",
   "familia": "Explotación",
   "nivel": "BAJO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.9",
   "nombre": "Registro de la gestión de incidentes",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.exp.10",
   "nombre": "Protección de claves criptográficas",
   "familia": "Explotación",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.cont.1",
   "nombre": "Análisis de impacto",
   "familia": "Continuidad del servicio",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.cont.2",
   "nombre": "Plan de continuidad",
   "familia": "Continuidad del servicio",
   "nivel": "MEDIO",
   "aplica": false,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.cont.3",
   "nombre": "Pruebas periódicas",
   "familia": "Continuidad del servicio",
   "nivel": "MEDIO",
   "aplica": false,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.cont.4",
   "nombre": "Medios alternativos",
   "familia": "Continuidad del servicio",
   "nivel": "MEDIO",
   "aplica": false,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.mon.1",
   "nombre": "Detección de intrusión",
   "familia": "Monitorización del sistema",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.mon.2",
   "nombre": "Sistema de métricas",
   "familia": "Monitorización del sistema",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "op.mon.3",
   "nombre": "Vigilancia",
   "familia": "Monitorización del sistema",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.1",
   "nombre": "Áreas separadas y con control de acceso",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.2",
   "nombre": "Identificación de las personas",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.3",
   "nombre": "Acondicionamiento de los locales",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.4",
   "nombre": "Energía eléctrica",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.5",
   "nombre": "Protección frente a incendios",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.6",
   "nombre": "Protección frente a inundaciones",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.if.7",
   "nombre": "Registro de entrada y salida de equipamiento",
   "familia": "Protección de las instalaciones e infraestructuras",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.per.1",
   "nombre": "Caracterización del puesto de trabajo",
   "familia": "Gestión del personal",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.per.2",
   "nombre": "Deberes y obligaciones",
   "familia": "Gestión del personal",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.per.3",
   "nombre": "Concienciación",
   "familia": "Gestión del personal",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.per.4",
   "nombre": "Formación",
   "familia": "Gestión del personal",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.eq.1",
   "nombre": "Puesto de trabajo despejado",
   "familia": "Protección de los equipos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.eq.2",
   "nombre": "Bloqueo de puesto de trabajo",
   "familia": "Protección de los equipos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.eq.3",
   "nombre": "Protección de dispositivos portátiles",
   "familia": "Protección de los equipos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.eq.4",
   "nombre": "Otros dispositivos conectados a la red",
   "familia": "Protección de los equipos",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.com.1",
   "nombre": "Perímetro seguro",
   "familia": "Protección de las comunicaciones",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.com.2",
   "nombre": "Protección de la confidencialidad",
   "familia": "Protección de las comunicaciones",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.com.3",
   "nombre": "Protección de la integridad y de la autenticidad",
   "familia": "Protección de las comunicaciones",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.com.4",
   "nombre": "Separación de flujos de información en la red",
   "familia": "Protección de las comunicaciones",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.si.1",
   "nombre": "Marcado de soportes",
   "familia": "Protección de los soportes de información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.si.2",
   "nombre": "Criptografía",
   "familia": "Protección de los soportes de información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.si.3",
   "nombre": "Custodia",
   "familia": "Protección de los soportes de información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.si.4",
   "nombre": "Transporte",
   "familia": "Protección de los soportes de información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.si.5",
   "nombre": "Borrado y destrucción",
   "familia": "Protección de los soportes de información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.sw.1",
   "nombre": "Desarrollo de aplicaciones",
   "familia": "Protección de las aplicaciones informáticas",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.sw.2",
   "nombre": "Aceptación y puesta en servicio",
   "familia": "Protección de las aplicaciones informáticas",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.1",
   "nombre": "Datos personales",
   "familia": "Protección de la información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.2",
   "nombre": "Calificación de la información",
   "familia": "Protección de la información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.3",
   "nombre": "Firma electrónica",
   "familia": "Protección de la información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.4",
   "nombre": "Sellos de tiempo",
   "familia": "Protección de la información",
   "nivel": "BAJO",
   "aplica": false,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.5",
   "nombre": "Limpieza de documentos",
   "familia": "Protección de la información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.info.6",
   "nombre": "Copias de seguridad",
   "familia": "Protección de la información",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.s.1",
   "nombre": "Protección del correo electrónico",
   "familia": "Protección de los servicios",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.s.2",
   "nombre": "Protección de servicios y aplicaciones web",
   "familia": "Protección de los servicios",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.s.3",
   "nombre": "Protección de la navegación web",
   "familia": "Protección de los servicios",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  },
  {
   "medida": "mp.s.4",
   "nombre": "Protección frente a denegación de servicio",
   "familia": "Protección de los servicios",
   "nivel": "MEDIO",
   "aplica": true,
   "estado": "",
   "implantacion": 0,
   "responsable": "",
   "riesgos": 0,
   "hallazgosAbiertos": 0
  }
 ],
 "resumen": {
  "categoria": "MEDIA",
  "niveles": {
   "D": "MEDIO",
   "I": "MEDIO",
   "C": "MEDIO",
   "A": "MEDIO",
   "T": "BAJO"
  },
  "grado": 0,
  "medidas": 73,
  "aplicables": 68,
  "implantadas": 0,
  "pendientes": 68,
  "activos": [
   {
    "id": "ACT-001",
    "nombre": "Portal web de clientes"
   },
   {
    "id": "CTEM",
    "nombre": "Infraestructura analizada por CTEM-Nexus"
   }
  ]
 }
}
`,se=`{
 "format": "yrd-ecosistema",
 "version": 1,
 "origen": {
  "herramienta": "ens-ad-auditor",
  "version": "0.4.0",
  "generado": "2026-10-10T09:00:00Z"
 },
 "tipo": "hallazgos",
 "proyecto": "meridiano.local",
 "datos": [
  {
   "rule_id": "ENS-ACC-KRB-01",
   "risk": "Alto",
   "impact": 4,
   "likelihood": 4,
   "score": 16,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseña de servicio crackeable fuera de línea.",
   "remediation": "gMSA o contraseña de 30+ caracteres y AES.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "kerberoasting",
    "title": "Cuenta de servicio con SPN y cifrado RC4",
    "target": "svc_sql",
    "detail": "La cuenta svc_sql tiene SPN MSSQLSvc/app01 y admite RC4.",
    "evidence": "servicePrincipalName=MSSQLSvc/app01.meridiano.local",
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-PKI-01",
   "risk": "Critico",
   "impact": 5,
   "likelihood": 4,
   "score": 20,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    },
    {
     "id": "op.acc.4",
     "name": "Proceso de gestión de derechos de acceso",
     "is_primary": false
    }
   ],
   "non_compliance": "Cualquier usuario puede pedir un certificado de administrador.",
   "remediation": "Desactivar ENROLLEE_SUPPLIES_SUBJECT y exigir aprobación.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "adcs_esc",
    "title": "Plantilla ADCS vulnerable (ESC1)",
    "target": "Plantilla UserAuth",
    "detail": "El solicitante proporciona el sujeto y la plantilla tiene EKU de autenticación.",
    "evidence": "certipy: ESC1 en UserAuth",
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-SMB-01",
   "risk": "Alto",
   "impact": 4,
   "likelihood": 3,
   "score": 12,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Permite retransmitir autenticaciones NTLM.",
   "remediation": "Exigir la firma SMB por GPO.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "smb_signing_disabled",
    "title": "Firma SMB no obligatoria en los controladores",
    "target": "DC01",
    "detail": "RequireSecuritySignature = 0.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-LAPS-01",
   "risk": "Medio",
   "impact": 3,
   "likelihood": 3,
   "score": 9,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.6",
     "name": "Mecanismo de autenticación (usuarios externos)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseña de administrador local común.",
   "remediation": "Desplegar Windows LAPS.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "laps_not_deployed",
    "title": "LAPS no desplegado en los puestos",
    "target": "OU=Puestos",
    "detail": "El esquema no tiene ms-LAPS-Password.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-ACL-01",
   "risk": "Critico",
   "impact": 5,
   "likelihood": 4,
   "score": 20,
   "da_path": true,
   "ens_controls": [
    {
     "id": "op.acc.4",
     "name": "Proceso de gestión de derechos de acceso",
     "is_primary": true
    }
   ],
   "non_compliance": "Cualquier miembro puede extraer los hashes del dominio.",
   "remediation": "Retirar el permiso y revisar quién lo concedió.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "acl_control_path",
    "title": "Permisos de replicación (DCSync) a un grupo no privilegiado",
    "target": "Grupo Soporte-N2",
    "detail": "El grupo tiene DS-Replication-Get-Changes-All sobre el dominio.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  },
  {
   "rule_id": "ENS-ACC-PWD-01",
   "risk": "Medio",
   "impact": 3,
   "likelihood": 3,
   "score": 9,
   "da_path": false,
   "ens_controls": [
    {
     "id": "op.acc.5",
     "name": "Mecanismo de autenticación (usuarios de la organización)",
     "is_primary": true
    }
   ],
   "non_compliance": "Contraseñas vulnerables a rociado.",
   "remediation": "Longitud 14+, historial 24 y bloqueo.",
   "references": [],
   "rationale": null,
   "finding": {
    "finding_type": "weak_password_policy",
    "title": "Política de contraseñas del dominio débil",
    "target": "meridiano.local",
    "detail": "Longitud mínima 8 y sin historial.",
    "evidence": null,
    "source_module": "ldap",
    "subtype": null,
    "is_sample": true
   }
  }
 ],
 "resumen": {
  "domain": "meridiano.local",
  "is_sample": true,
  "total_alerts": 6,
  "counts_by_risk": {
   "Critico": 2,
   "Alto": 2,
   "Medio": 2,
   "Bajo": 0
  },
  "da_path": 3
 }
}
`,Q=_(),ce=[{file:`nmap-ejemplo.xml`,tool:`Nmap`,where:[`Alcance → Importar Nmap XML`,`Scope → Import Nmap XML`],text:R,mime:`text/xml`},{file:`bloodhound-ejemplo.json`,tool:`BloodHound`,where:[`Priorización → Importar BloodHound`,`Prioritization → Import BloodHound`],text:z,mime:`application/json`},{file:`nessus-ejemplo.nessus`,tool:`Nessus`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:B,mime:`text/xml`},{file:`openvas-ejemplo.xml`,tool:`OpenVAS`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:V,mime:`text/xml`},{file:`nuclei-ejemplo.jsonl`,tool:`Nuclei`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:ne,mime:`application/x-ndjson`},{file:`trivy-ejemplo.json`,tool:`Trivy`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:H,mime:`application/json`},{file:`sarif-ejemplo.sarif`,tool:`SARIF`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:U,mime:`application/json`},{file:`kev-ejemplo.json`,tool:`CISA KEV`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:W,mime:`application/json`},{file:`epss-ejemplo.csv`,tool:`FIRST EPSS`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:G,mime:`text/csv`},{file:`zap-ejemplo.json`,tool:`OWASP ZAP`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:K,mime:`application/json`},{file:`burp-ejemplo.xml`,tool:`Burp Suite`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:q,mime:`text/xml`},{file:`pingcastle-ejemplo.xml`,tool:`PingCastle`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:J,mime:`text/xml`},{file:`certipy-ejemplo.json`,tool:`Certipy`,where:[`Priorización → Importar escáner`,`Prioritization → Import scanner`],text:Y,mime:`application/json`},{file:`kairos-meridiano.json`,tool:`KAIROS`,where:[`Ecosistema`,`Ecosystem`],text:X,mime:`application/json`},{file:`studio-meridiano.json`,tool:`Compliance Studio`,where:[`Ecosistema`,`Ecosystem`],text:Z,mime:`application/json`},{file:`ens-ad-auditor-meridiano.json`,tool:`ENS AD Auditor`,where:[`Ecosistema`,`Ecosystem`],text:re,mime:`application/json`},{file:`responsables-norvik.csv`,tool:`Norvik`,where:[`Ecosistema`,`Ecosystem`],text:ie,mime:`text/csv`},{file:`kairos-bia-meridiano.json`,tool:`KAIROS · sobre «bia»`,where:[`Ecosistema`,`Ecosystem`],text:ae,mime:`application/json`},{file:`studio-soa-meridiano.json`,tool:`Compliance Studio · sobre «soa»`,where:[`Ecosistema`,`Ecosystem`],text:oe,mime:`application/json`},{file:`ens-ad-auditor-hallazgos-meridiano.json`,tool:`ENS AD Auditor · sobre «hallazgos»`,where:[`Ecosistema`,`Ecosystem`],text:se,mime:`application/json`}];function le(){let e=g();return(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,"data-testid":`ficheros-ejemplo`,children:[(0,Q.jsx)(`h4`,{className:`font-medium text-ink`,children:e(`Ficheros de ejemplo`,`Sample files`)}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:e(`Ficticios y coherentes con la demo (Industrias Meridiano). Descárgalos y pruébalos en la vista indicada; son los mismos que usan las pruebas automáticas.`,`Fictitious and consistent with the demo (Industrias Meridiano). Download them and try them in the view shown; they are the same files the automated tests use.`)}),(0,Q.jsx)(`ul`,{className:`mt-3 grid gap-1.5 sm:grid-cols-2`,children:ce.map(t=>(0,Q.jsx)(`li`,{children:(0,Q.jsxs)(`button`,{type:`button`,className:`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-ink-2 transition hover:bg-surface-2 hover:text-ink active:scale-[0.97]`,onClick:()=>S(t.file,t.text,`${t.mime};charset=utf-8`),"aria-label":e(`Descargar el ejemplo de ${t.tool} (${t.file})`,`Download the ${t.tool} sample (${t.file})`),children:[(0,Q.jsx)(b,{className:`size-3.5 shrink-0 text-accent`,"aria-hidden":!0}),(0,Q.jsxs)(`span`,{className:`min-w-0`,children:[(0,Q.jsx)(`span`,{className:`font-medium text-ink`,children:t.tool}),` `,(0,Q.jsxs)(`span`,{className:`text-ink-3`,children:[`· `,e(t.where[0],t.where[1])]})]})]})},t.file))})]})}function $(){let e=s(e=>e.helpOpen),t=s(e=>e.setHelpOpen),i=o[s(e=>e.lang)],a=g(),_=s(e=>e.project.profile??`defecto`),b=p[_],[S,C]=(0,I.useState)(`ciclo`),T=(0,I.useRef)(null);return(0,I.useEffect)(()=>{if(!e)return;let n=document.activeElement;requestAnimationFrame(()=>T.current?.focus({preventScroll:!0}));let r=e=>{e.key===`Escape`&&t(!1)};return window.addEventListener(`keydown`,r),()=>{window.removeEventListener(`keydown`,r),n?.focus?.({preventScroll:!0})}},[e,t]),typeof document>`u`?null:(0,L.createPortal)((0,Q.jsx)(r,{children:e&&(0,Q.jsxs)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10`,children:[(0,Q.jsx)(l.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2},onClick:()=>t(!1),className:`fixed inset-0 bg-black/55 backdrop-blur-md`}),(0,Q.jsxs)(l.div,{ref:T,tabIndex:-1,role:`dialog`,"aria-modal":`true`,"aria-labelledby":`ayuda-titulo`,initial:{opacity:0,scale:.95,y:14},animate:{opacity:1,scale:1,y:0},exit:{opacity:0,scale:.95,y:14},transition:m,className:`glass-thick glass-edge relative z-10 flex h-full max-h-[85vh] w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] border border-hairline bg-surface shadow-2xl outline-none`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center justify-between border-b border-hairline px-6 py-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,Q.jsx)(`div`,{className:`flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent`,children:(0,Q.jsx)(d,{className:`size-5`})}),(0,Q.jsxs)(`div`,{children:[(0,Q.jsx)(`h2`,{id:`ayuda-titulo`,className:`text-base font-semibold text-ink`,children:i.helpTitle}),(0,Q.jsx)(`p`,{className:`text-xs text-ink-3`,children:i.helpSub})]})]}),(0,Q.jsx)(`button`,{type:`button`,onClick:()=>t(!1),className:`btn btn-ghost btn-sm btn-icon rounded-full`,"aria-label":i.closeHelp,children:(0,Q.jsx)(n,{className:`size-4`})})]}),(0,Q.jsx)(`div`,{className:`flex border-b border-hairline bg-surface-2/40 px-6 py-2 overflow-x-auto`,children:(0,Q.jsx)(`div`,{className:`flex gap-1.5 text-xs font-medium`,role:`tablist`,"aria-label":i.helpTitle,children:[{id:`ciclo`,label:i.helpTabs.ciclo,icon:(0,Q.jsx)(ee,{className:`size-3.5`})},{id:`calculo`,label:i.helpTabs.calculo,icon:(0,Q.jsx)(D,{className:`size-3.5`})},{id:`ingesta`,label:i.helpTabs.ingesta,icon:(0,Q.jsx)(x,{className:`size-3.5`})},{id:`atajos`,label:i.helpTabs.atajos,icon:(0,Q.jsx)(j,{className:`size-3.5`})},{id:`glosario`,label:i.helpTabs.glosario,icon:(0,Q.jsx)(w,{className:`size-3.5`})},{id:`acerca`,label:i.helpTabs.acerca,icon:(0,Q.jsx)(y,{className:`size-3.5`})}].map(e=>{let t=S===e.id;return(0,Q.jsxs)(`button`,{type:`button`,role:`tab`,id:`ayuda-tab-${e.id}`,"aria-selected":t,"aria-controls":`ayuda-panel`,tabIndex:t?0:-1,onKeyDown:t=>{if(t.key!==`ArrowRight`&&t.key!==`ArrowLeft`)return;let n=[`ciclo`,`calculo`,`ingesta`,`atajos`,`glosario`,`acerca`],r=n[(n.indexOf(e.id)+(t.key===`ArrowRight`?1:n.length-1))%n.length];C(r),document.getElementById(`ayuda-tab-${r}`)?.focus()},onClick:()=>C(e.id),className:`relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 transition-[color,transform] active:scale-[0.97] ${t?`bg-surface text-ink shadow-sm`:`text-ink-2 hover:text-ink`}`,children:[e.icon,(0,Q.jsx)(`span`,{children:e.label})]},e.id)})})}),(0,Q.jsxs)(`div`,{id:`ayuda-panel`,role:`tabpanel`,"aria-labelledby":`ayuda-tab-${S}`,tabIndex:0,className:`flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed text-ink-2`,children:[S===`ciclo`&&(0,Q.jsxs)(`div`,{className:`space-y-6`,children:[(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface-2/30 p-4`,children:[(0,Q.jsx)(`h3`,{className:`text-sm font-semibold text-ink`,children:a(`¿Qué es CTEM?`,`What is CTEM?`)}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Continuous Threat Exposure Management (CTEM) es el marco de Gartner para gestionar la exposición de forma continua, en cinco fases que se repiten. En lugar de tratar todas las vulnerabilidades por igual, prioriza las que tienen explotación real y un camino hacia los activos que más importan.`,`Continuous Threat Exposure Management (CTEM) is Gartner’s framework for managing exposure continuously, in five repeating stages. Instead of treating every vulnerability alike, it prioritizes those with real-world exploitation and a path to the assets that matter most.`)})]}),(0,Q.jsx)(`ol`,{className:`grid gap-3 sm:grid-cols-2`,children:[[a(`Alcance`,`Scoping`),a(`Registra los activos, su responsable, su criticidad de negocio (1–5) y si están expuestos a Internet, y los rangos de red autorizados. Los activos de criticidad 5 son los activos críticos.`,`Record the assets, their owner, business criticality (1–5) and whether they face the Internet, plus the authorized network ranges. Criticality-5 assets are the critical assets.`)],[a(`Descubrimiento`,`Discovery`),a(`Importa escaneos de Nmap (XML), exportaciones de BloodHound (JSON), CSV o JSON de hallazgos, o añádelos a mano.`,`Import Nmap scans (XML), BloodHound exports (JSON), findings in CSV or JSON, or add them by hand.`)],[a(`Priorización`,`Prioritization`),a(`Cada hallazgo recibe una puntuación de 0 a 100 explicable: severidad, explotación real (CISA KEV, exploit público, EPSS), criticidad, exposición y cercanía a un activo crítico.`,`Each finding gets an explainable 0–100 score: severity, real exploitation (CISA KEV, public exploit, EPSS), criticality, exposure and closeness to a critical asset.`)],[a(`Validación`,`Validation`),a(`El grafo muestra las rutas de ataque desde Internet hasta los activos críticos y los puntos de estrangulamiento. Marca cada hallazgo como validado o no explotable tras probarlo. El Mapa ATT&CK resume qué técnicas quedan al alcance de un atacante.`,`The graph shows attack paths from the Internet to the critical assets and the choke points. Mark each finding as validated or not exploitable after testing it. The ATT&CK map sums up which techniques remain within an attacker’s reach.`)],[a(`Movilización`,`Mobilization`),a(`Informe ejecutivo imprimible y tickets con responsable, pasos, comando de verificación y fecha límite según el SLA de su banda.`,`A printable executive report and tickets with owner, steps, a verification command and a due date from their band’s SLA.`)]].map(([e,t],n)=>(0,Q.jsxs)(`li`,{className:`rounded-2xl border border-hairline bg-surface p-4 ${n===4?`sm:col-span-2`:``}`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-semibold text-ink`,children:[(0,Q.jsx)(`span`,{className:`flex size-6 items-center justify-center rounded-lg bg-surface-2 text-xs text-ink`,children:n+1}),(0,Q.jsx)(`span`,{children:e})]}),(0,Q.jsx)(`p`,{className:`mt-2 text-xs text-ink-3`,children:t})]},e))})]}),S===`calculo`&&(0,Q.jsxs)(`div`,{className:`space-y-5`,children:[(0,Q.jsx)(`h3`,{className:`text-sm font-semibold text-ink`,children:a(`Puntuación de exposición (0–100)`,`Exposure score (0–100)`)}),(0,Q.jsx)(`p`,{className:`text-xs text-ink-3`,children:a(`El cálculo es determinista y abierto: la misma fórmula en el navegador y en la API (paridad comprobada con un fichero dorado). Cada hallazgo suma cinco factores:`,`The calculation is deterministic and open: the same formula in the browser and in the API (parity checked against a golden file). Each finding adds up five factors:`)}),(0,Q.jsx)(`div`,{className:`overflow-x-auto rounded-2xl border border-hairline bg-surface-2/40 p-4 font-mono text-xs text-ink`,"data-testid":`formula`,children:`${a(`Puntuación`,`Score`)} (${a(`perfil`,`profile`)} ${{defecto:a(`general`,`general`),ot:`OT`,banca:a(`banca`,`banking`)}[_]}) = CVSS/10 × ${b.severidad} + max(KEV, ${`0.6`.replace(`.`,a(`,`,`.`))} × exploit, EPSS) × ${b.explotabilidad} + (${a(`criticidad`,`criticality`)} − 1)/4 × ${b.criticidad} + ${a(`expuesto`,`exposed`)} × ${b.exposicion} + max(0, 1 − ${a(`saltos`,`hops`)}/4) × ${b.proximidad}`}),(0,Q.jsxs)(`ul`,{className:`space-y-1.5 text-xs text-ink-3`,children:[(0,Q.jsx)(`li`,{children:a(`Validado como explotable: +5 puntos (máximo 100).`,`Validated as exploitable: +5 points (capped at 100).`)}),(0,Q.jsx)(`li`,{children:a(`Validado como no explotable: la puntuación se multiplica por 0,25 y su arista sale del grafo.`,`Validated as not exploitable: the score is multiplied by 0.25 and its edge leaves the graph.`)}),(0,Q.jsx)(`li`,{children:a(`«Saltos» es la distancia en el grafo hasta el activo crítico más cercano.`,`“Hops” is the graph distance to the nearest critical asset.`)})]}),(0,Q.jsx)(`div`,{className:`space-y-2 text-xs`,children:h.map(([e,t],n)=>(0,Q.jsxs)(`div`,{className:`flex items-start gap-3 rounded-xl border border-hairline p-3`,children:[(0,Q.jsxs)(`div`,{className:`w-28 shrink-0 font-semibold`,style:{color:`var(--color-${e})`},children:[i.band[e],` (`,t,`–`,n?u(h[n-1][1]-.1):`100`,`)`]}),(0,Q.jsx)(`div`,{className:`text-ink-3`,children:a(`SLA de remediación: ${c[e]} días.`,`Remediation SLA: ${c[e]} days.`)})]},e))})]}),S===`ingesta`&&(0,Q.jsxs)(`div`,{className:`space-y-5`,children:[(0,Q.jsx)(`h3`,{className:`text-sm font-semibold text-ink`,children:a(`Ingesta local, sin servidor`,`Local intake, no server`)}),(0,Q.jsx)(`p`,{className:`text-xs text-ink-3`,children:a(`Los ficheros se analizan en la memoria de tu navegador (o en la API FastAPI local si la activas). Todo lo importado se trata como no confiable: XML sin entidades ni DTD, JSON sin claves de prototipo y un tamaño máximo por fichero (60 MB en escáneres).`,`Files are parsed in your browser’s memory (or in the local FastAPI API if you enable it). Everything imported is treated as untrusted: XML without entities or DTD, JSON without prototype keys and a per-file size limit (60 MB for scanners).`)}),(0,Q.jsxs)(`div`,{className:`space-y-3`,children:[(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:`Nmap XML`})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Exporta el escaneo en XML:`,`Export the scan as XML:`)}),(0,Q.jsx)(`pre`,{className:`code mt-2`,children:`nmap -sV -sC -oX escaneo.xml 192.168.1.0/24`})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:`BloodHound / SharpHound JSON`})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Ficheros de SharpHound o BloodHound CE (computers.json, users.json). Detecta controladores de dominio, cuentas con SPN (Kerberoasting), cuentas sin preautenticación (AS-REP roasting) y delegación sin restricciones.`,`SharpHound or BloodHound CE files (computers.json, users.json). Detects domain controllers, accounts with SPNs (Kerberoasting), accounts without pre-authentication (AS-REP roasting) and unconstrained delegation.`)})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:`Nessus · OpenVAS · Nuclei · Trivy · SARIF`})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`«Importar escáner» en Priorización detecta el formato, enseña qué se crea, qué se actualiza y qué se reabre, y solo entonces lo aplica. Un hallazgo que ya existe se reconoce por activo y CVE o por la misma guía, así que importar dos veces no duplica.`,`“Import scanner” in Prioritization detects the format, shows what will be created, updated and reopened, and only then applies it. An existing finding is recognised by asset and CVE or by the same guide, so importing twice does not duplicate.`)}),(0,Q.jsxs)(`pre`,{className:`code mt-2`,children:[`nuclei -l objetivos.txt -jsonl -o nuclei.jsonl`,`
`,`trivy image --format json -o trivy.json registro/app:1.0`,`
`,`semgrep --sarif -o semgrep.sarif`]})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:`CISA KEV · FIRST EPSS`})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Descarga tú los catálogos oficiales (known_exploited_vulnerabilities.json y epss_scores-AAAA-MM-DD.csv.gz) e impórtalos igual que un escáner. La app nunca los pide por red; su versión queda en el proyecto y en el informe.`,`Download the official catalogs yourself (known_exploited_vulnerabilities.json and epss_scores-YYYY-MM-DD.csv.gz) and import them like a scanner. The app never fetches them; their version is stored in the project and the report.`)})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:a(`Tickets en Jira y GitHub`,`Tickets in Jira and GitHub`)})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Jira: Ajustes del sistema → Importación externa → CSV, con formato de fecha «yyyy-MM-dd». GitHub: el JSON trae un issue por ticket; se envía sin pasar los textos por la shell:`,`Jira: System settings → External system import → CSV, with date format “yyyy-MM-dd”. GitHub: the JSON has one issue per ticket; send it without passing the texts through the shell:`)}),(0,Q.jsx)(`pre`,{className:`code mt-2`,children:`jq -c '.[]' github-issues.json | while read -r i; do
  printf '%s' "$i" | gh api --method POST repos/ORG/REPO/issues --input -
done`})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,"data-testid":`ayuda-ofensiva`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:a(`Validación ofensiva: ZAP · Burp · PingCastle · Certipy`,`Offensive validation: ZAP · Burp · PingCastle · Certipy`)})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Se importan igual que un escáner. De Burp nunca se guardan la petición ni la respuesta (pueden llevar cookies); de ZAP, tampoco la carga del ataque. En cada hallazgo, «Validar» registra quién lo probó, cuándo, con qué técnica y el resultado; al mitigarlo queda pendiente de verificar hasta que un escaneo de la misma herramienta deja de verlo.`,`They are imported like a scanner. Burp requests and responses are never stored (they may carry cookies), nor is the ZAP attack payload. On each finding, “Validate” records who tested it, when, with which technique and the result; once mitigated it stays pending verification until a scan by the same tool no longer sees it.`)}),(0,Q.jsx)(`pre`,{className:`code mt-2`,children:`zap.sh -cmd -quickurl https://app -quickout zap.json
certipy find -u auditor@dominio -dc-ip 10.0.0.5 -json -output certipy
PingCastle.exe --healthcheck --server dominio.local`})]}),(0,Q.jsx)(le,{}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,"data-testid":`ayuda-ecosistema`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:a(`Ecosistema: KAIROS, Compliance Studio, ENS AD Auditor, Rosetta y Norvik`,`Ecosystem: KAIROS, Compliance Studio, ENS AD Auditor, Rosetta and Norvik`)})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`En la vista Ecosistema, arrastra el fichero de la otra herramienta: el proyecto o la copia de KAIROS (criticidad desde el BIA), el de Compliance Studio (categoría ENS y plazos), el informe JSON de ENS AD Auditor (hallazgos de directorio activo con su técnica ATT&CK), el proyecto o el sobre de Rosetta (estado de los controles) o un CSV de responsables. Se enseña qué cambiará antes de aplicarlo. Las exportaciones usan el sobre común «yrd-ecosistema» (docs/ECOSISTEMA.md).`,`In the Ecosystem view, drop the other tool’s file: the KAIROS project or backup (criticality from the BIA), the Compliance Studio one (ENS category and deadlines), the ENS AD Auditor JSON report (Active Directory findings with their ATT&CK technique), the Rosetta project or envelope (control states) or an owners CSV. The changes are shown before applying them. Exports use the common “yrd-ecosistema” envelope (docs/ECOSISTEMA.md).`)})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-medium text-ink`,children:[(0,Q.jsx)(F,{className:`size-4 text-accent`}),(0,Q.jsx)(`span`,{children:`CSV / JSON`})]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`Descarga la plantilla CSV desde Priorización. Las celdas que empiezan por = + − @ se neutralizan al exportar.`,`Download the CSV template from Prioritization. Cells starting with = + − @ are neutralized on export.`)})]})]})]}),S===`atajos`&&(0,Q.jsxs)(`div`,{className:`space-y-4`,children:[(0,Q.jsx)(`h3`,{className:`text-sm font-semibold text-ink`,children:i.helpTabs.atajos}),(0,Q.jsx)(`div`,{className:`grid gap-2 sm:grid-cols-2`,children:[[a(`Búsqueda global`,`Global search`),`Ctrl + K`],[a(`Cerrar diálogos, paneles y menús`,`Close dialogs, panels and menus`),`Escape`],[a(`Recorrer las pestañas de la ayuda`,`Move through help tabs`),`← →`],[a(`Imprimir o guardar el informe en PDF`,`Print or save the report as PDF`),`Ctrl + P`]].map(([e,t])=>(0,Q.jsxs)(`div`,{className:`flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-3`,children:[(0,Q.jsx)(`span`,{className:`text-xs text-ink-2`,children:e}),(0,Q.jsx)(`kbd`,{className:`kbd`,children:t})]},e))})]}),S===`glosario`&&(0,Q.jsx)(`dl`,{className:`space-y-3 text-xs`,children:[[a(`Activo crítico`,`Critical asset`),a(`Activo de criticidad 5: aquel cuyo compromiso pararía el negocio o expondría su información más sensible (p. ej. el controlador de dominio, el ERP o la base de datos de clientes). Es el destino final de las rutas de ataque; cuanto más cerca de uno está un hallazgo, más sube su prioridad. En la jerga del sector a veces se llama «joya de la corona».`,`A criticality-5 asset: one whose compromise would stop the business or expose its most sensitive information (e.g. the domain controller, the ERP or the customer database). It is the final target of attack paths; the closer a finding is to one, the higher its priority. Industry jargon sometimes calls it a “crown jewel”.`)],[a(`Punto de estrangulamiento`,`Choke point`),a(`Nodo o arista presente en al menos el 40 % de las rutas hacia los activos críticos. Corregirlo corta la mayoría de caminos a la vez.`,`A node or edge present in at least 40 % of the paths to the critical assets. Fixing it cuts most routes at once.`)],[`CISA KEV`,a(`Catálogo de la CISA (EE. UU.) de vulnerabilidades con explotación activa confirmada.`,`CISA’s (US) catalog of vulnerabilities with confirmed active exploitation.`)],[`EPSS`,a(`Probabilidad, publicada por FIRST, de que una vulnerabilidad se explote en los próximos 30 días.`,`Probability, published by FIRST, that a vulnerability will be exploited in the next 30 days.`)],[`MITRE ATT&CK`,a(`Catálogo público de tácticas y técnicas de adversarios reales que mantiene MITRE. CTEM-Nexus asigna a cada hallazgo las técnicas que habilita (inferidas de la guía, el título y el CVE, o fijadas por el analista) y las muestra en el Mapa ATT&CK.`,`Public catalog of real-world adversary tactics and techniques maintained by MITRE. CTEM-Nexus maps each finding to the techniques it enables (inferred from the guide, title and CVE, or pinned by the analyst) and shows them on the ATT&CK map.`)],[`ATT&CK Navigator`,a(`Herramienta web de MITRE para ver capas de técnicas. El Mapa ATT&CK exporta una capa JSON (formato 4.5) que se abre con «Open Existing Layer».`,`MITRE’s web tool for viewing technique layers. The ATT&CK map exports a JSON layer (format 4.5) you open with “Open Existing Layer”.`)],[`MTTR`,a(`Tiempo medio de remediación: días entre la detección y la mitigación de los hallazgos cerrados.`,`Mean time to remediate: days between detection and mitigation of closed findings.`)]].map(([e,t])=>(0,Q.jsxs)(`div`,{className:`rounded-xl border border-hairline bg-surface p-3`,children:[(0,Q.jsx)(`dt`,{className:`font-semibold text-ink`,children:e}),(0,Q.jsx)(`dd`,{className:`mt-1 text-ink-3`,children:t})]},e))}),S===`acerca`&&(0,Q.jsxs)(`div`,{className:`space-y-5`,children:[(0,Q.jsx)(`h3`,{className:`text-base font-semibold text-ink`,children:i.helpTabs.acerca}),(0,Q.jsx)(`div`,{className:`rounded-2xl border border-hairline bg-surface p-5`,children:(0,Q.jsxs)(`div`,{className:`flex flex-col gap-4 sm:flex-row sm:items-start`,children:[(0,Q.jsx)(`div`,{className:`flex size-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-[var(--color-accent-ink)]`,children:`YR`}),(0,Q.jsxs)(`div`,{className:`min-w-0`,children:[(0,Q.jsx)(`div`,{className:`text-lg font-bold text-ink`,children:`Yoandy Ramírez Delgado`}),(0,Q.jsx)(`div`,{className:`text-sm text-ink-2`,children:a(`Diseño y desarrollo de CTEM-Nexus`,`Design and development of CTEM-Nexus`)}),(0,Q.jsx)(`div`,{className:`mt-0.5 text-xs text-ink-3`,children:`Junior Pentester · eJPTv2 · AI Governance (ISO 42001) · SysAdmin`}),(0,Q.jsxs)(`div`,{className:`mt-3 flex flex-wrap gap-2`,children:[(0,Q.jsxs)(`a`,{href:`https://github.com/heindall92`,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-surface active:scale-[0.97]`,children:[(0,Q.jsx)(k,{className:`size-3.5`}),` GitHub`]}),(0,Q.jsxs)(`a`,{href:`mailto:yoandyramirezdelgado@gmail.com`,className:`inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-3 text-xs font-semibold text-ink active:scale-[0.97]`,children:[(0,Q.jsx)(N,{className:`size-3.5`}),` yoandyramirezdelgado@gmail.com`]})]})]})]})}),(0,Q.jsxs)(`section`,{className:`space-y-2 text-xs text-ink-2`,children:[(0,Q.jsx)(`h4`,{className:`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3`,children:a(`Sobre la herramienta`,`About the tool`)}),(0,Q.jsxs)(`p`,{children:[(0,Q.jsxs)(`strong`,{className:`text-ink`,children:[`CTEM-Nexus `,`1.2.0`]}),` · `,a(`Gestión continua de la exposición a amenazas, en las cinco fases de Gartner: alcance, descubrimiento con Nmap y BloodHound, priorización explicable, rutas de ataque y movilización.`,`Continuous threat exposure management in Gartner’s five stages: scoping, discovery with Nmap and BloodHound, explainable prioritization, attack paths and mobilization.`)]}),(0,Q.jsx)(`p`,{children:a(`Herramienta de apoyo a la priorización. No sustituye a un test de intrusión ni a una auditoría. El caso de ejemplo es ficticio.`,`A prioritization aid. It does not replace a penetration test or an audit. The sample case is fictional.`)}),(0,Q.jsx)(`p`,{children:a(`Proyecto independiente: no está afiliado a Gartner, MITRE, CISA, FIRST, ISO, el CCN ni a ninguna entidad de certificación. Iconos Lucide. El cálculo corre en el navegador; la API FastAPI es opcional y solo habla con localhost. Código bajo licencia GPLv2.`,`Independent project: not affiliated with Gartner, MITRE, CISA, FIRST, ISO, CCN or any certification body. Lucide icons. Scoring runs in the browser; the FastAPI API is optional and only talks to localhost. Code under the GPLv2 license.`)}),(0,Q.jsxs)(`a`,{href:`https://github.com/heindall92/ctem-nexus`,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex items-center gap-1.5 font-medium text-accent`,children:[(0,Q.jsx)(k,{className:`size-3.5`}),` github.com/heindall92/ctem-nexus`]})]}),(0,Q.jsxs)(`section`,{children:[(0,Q.jsx)(`h4`,{className:`text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3`,children:a(`Herramientas del ecosistema`,`Ecosystem tools`)}),(0,Q.jsx)(`p`,{className:`mt-2 text-xs text-ink-3`,children:a(`Compliance Studio prepara la declaración de aplicabilidad y Rosetta la cruza con otras normas. KAIROS cubre la continuidad. CTEM-Nexus prioriza la exposición técnica. ENS AD Auditor revisa el directorio. ARGOS es el laboratorio de práctica y Norvik, la gobernanza.`,`Compliance Studio prepares the statement of applicability and Rosetta maps it to other standards. KAIROS covers continuity. CTEM-Nexus prioritizes technical exposure. ENS AD Auditor reviews the directory. ARGOS is the practice lab and Norvik, governance.`)}),(0,Q.jsx)(`ul`,{className:`mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3`,children:f.map(e=>(0,Q.jsxs)(`li`,{className:`flex flex-col rounded-2xl border bg-surface p-4 ${e.here?`border-accent/50`:`border-hairline`}`,children:[(0,Q.jsxs)(`div`,{className:`flex items-start justify-between gap-2`,children:[(0,Q.jsx)(`div`,{className:`font-semibold text-ink`,children:e.name}),e.here&&(0,Q.jsx)(`span`,{className:`rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink`,children:a(`Estás aquí`,`You are here`)})]}),(0,Q.jsx)(`p`,{className:`mt-2 flex-1 text-xs text-ink-3`,children:a(e.note,e.noteEn)}),(0,Q.jsxs)(`div`,{className:`mt-4 flex flex-wrap gap-2`,children:[e.web&&!e.here&&(0,Q.jsxs)(`a`,{href:e.web,target:`_blank`,rel:`noopener noreferrer`,"aria-label":a(`Abrir ${e.name}`,`Open ${e.name}`),className:`inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]`,children:[(0,Q.jsx)(v,{className:`size-3.5`}),` `,a(`Abrir`,`Open`)]}),(0,Q.jsxs)(`a`,{href:e.code,target:`_blank`,rel:`noopener noreferrer`,"aria-label":a(`Código de ${e.name}`,`${e.name} source code`),className:`inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-ink hover:bg-surface-2 active:scale-[0.97]`,children:[(0,Q.jsx)(k,{className:`size-3.5`}),` `,a(`Código`,`Code`)]})]})]},e.code))})]}),(0,Q.jsxs)(`div`,{className:`rounded-2xl bg-surface-2 p-4`,children:[(0,Q.jsxs)(`div`,{className:`flex items-center gap-2 font-semibold text-ink`,children:[(0,Q.jsx)(d,{className:`size-4 text-accent`}),` `,a(`¿Sigues con dudas?`,`Still have questions?`)]}),(0,Q.jsx)(`p`,{className:`mt-1 text-xs text-ink-3`,children:a(`CTEM-Nexus no tiene soporte en directo. Puedes abrir una incidencia en el repositorio o escribir al autor.`,`CTEM-Nexus has no live support. You can open an issue in the repository or write to the author.`)}),(0,Q.jsxs)(`div`,{className:`mt-3 flex flex-wrap gap-2`,children:[(0,Q.jsxs)(`a`,{href:`https://github.com/heindall92/ctem-nexus/issues/new`,target:`_blank`,rel:`noopener noreferrer`,className:`inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-[var(--color-accent-ink)] active:scale-[0.97]`,children:[(0,Q.jsx)(te,{className:`size-3.5`}),` `,a(`Abrir una incidencia`,`Open an issue`)]}),(0,Q.jsxs)(`a`,{href:`mailto:yoandyramirezdelgado@gmail.com`,className:`inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-xs font-semibold text-ink active:scale-[0.97]`,children:[(0,Q.jsx)(N,{className:`size-3.5`}),` `,a(`Escribir al autor`,`Write to the author`)]})]})]})]})]}),(0,Q.jsxs)(`div`,{className:`flex items-center justify-between border-t border-hairline bg-surface-2/40 px-6 py-3 text-xs text-ink-3`,children:[(0,Q.jsx)(`span`,{children:`CTEM-Nexus · Yoandy Ramírez Delgado`}),(0,Q.jsx)(`button`,{type:`button`,onClick:()=>t(!1),className:`btn btn-primary btn-sm rounded-full px-4`,children:a(`Entendido`,`Got it`)})]})]})]})}),document.body)}export{$ as HelpModal};