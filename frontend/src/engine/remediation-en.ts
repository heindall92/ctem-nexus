/* Remediation guides in English. Same keys, steps and verification commands as remediation.ts (Spanish, canonical). */
import type { RemediationGuide } from './remediation';

type Text = Pick<RemediationGuide, 'title' | 'owner' | 'steps' | 'verify'>;

export const GUIDES_EN: Record<string, Text> = {
  web_injection: {
    title: 'Close the injection in the web application', owner: 'Application development team',
    steps: [
      'Reproduce the finding in pre-production with the scanner request (no real data).',
      'Use parameterised queries or an ORM; never concatenate user input into SQL, commands, templates or paths.',
      'Validate input on the server with allow-lists and strict types.',
      'Run the application and its database account with least privilege.',
      'As containment while fixing, add a specific WAF rule for the affected parameter.',
      'Add an automated test (SAST or DAST in CI) that fails if it comes back.',
    ],
    verify: 'Re-run the ZAP or Burp active scan on the affected URL and parameter and attach the clean result.',
  },
  web_xss: {
    title: 'Fix the cross-site scripting', owner: 'Application development team',
    steps: [
      'Encode output for its context (HTML, attribute, JavaScript, URL) with the framework function.',
      'Avoid inserting unsanitised HTML (innerHTML, dangerouslySetInnerHTML, |safe); if unavoidable, sanitise with a maintained library.',
      'Publish a Content-Security-Policy without unsafe-inline, using nonces or hashes.',
      'Mark session cookies HttpOnly, Secure and SameSite.',
    ],
    verify: 'Re-run the ZAP or Burp scan on the affected URL and check the Content-Security-Policy header in the response.',
  },
  web_hardening: {
    title: 'Harden the web application', owner: 'Development team / Systems',
    steps: [
      'Add the missing security headers (Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, frame-ancestors).',
      'Set cookies with HttpOnly, Secure and SameSite.',
      'Remove version banners, verbose error pages and published sample or backup files.',
      'Review the TLS configuration and redirect all traffic to HTTPS.',
    ],
    verify: 'curl -sI https://app.example | grep -iE "strict-transport|content-security|x-content-type|set-cookie"',
  },
  ad_hygiene: {
    title: 'Fix the Active Directory hygiene rule', owner: 'Identity / Active Directory',
    steps: [
      'Read the rule detail in the PingCastle report and the affected object.',
      'Apply the recommended fix in a test environment and then in production, through change management.',
      'Document the exception if the rule cannot be fixed and add monitoring.',
    ],
    verify: 'PingCastle.exe --healthcheck --server corp.example   # the rule no longer appears and the score drops',
  },
  log4shell: {
    title: 'Remove Log4Shell (Log4j 2)', owner: 'Application development team',
    steps: [
      'Inventory every log4j-core dependency (including transitive ones and shaded JARs).',
      'Upgrade log4j-core to 2.17.1 or later and rebuild the artifact.',
      'As immediate containment, remove the JndiLookup class from the JAR or block ${jndi: patterns at the WAF.',
      'Restrict outbound Internet traffic (LDAP/RMI/DNS) from the application server.',
      'Review logs since the exposure date for ${jndi: strings and unusual outbound connections.',
    ],
    verify: 'find / -name "log4j-core-*.jar" 2>/dev/null | xargs -I{} unzip -l {} | grep -c JndiLookup.class',
  },
  proxyshell: {
    title: 'Fix ProxyShell and reduce Exchange permissions in AD', owner: 'Systems / Messaging',
    steps: [
      'Install the latest Exchange cumulative update (CU) and security update (SU).',
      'Run the Exchange Health Checker and Microsoft’s IoC detection script.',
      'Look for web shells in IIS folders and in the OWA/ECP virtual directories.',
      'Apply Split Permissions to remove WriteDACL on the domain.',
      'Publish OWA only through a reverse proxy with pre-authentication.',
    ],
    verify: 'Get-ExchangeServer | Format-List Name,AdminDisplayVersion   # compare with the latest published SU',
  },
  citrix_bleed: {
    title: 'Update NetScaler and revoke active sessions', owner: 'Network / Perimeter',
    steps: [
      'Update NetScaler ADC/Gateway to the fixed build stated by the vendor.',
      'After updating, kill every session: kill aaa session -all, kill icaconnection -all, kill pcoipConnection -all.',
      'Rotate the credentials of users who signed in during the exposure window.',
      'Review appliance logs for session reuse from unusual IP addresses.',
    ],
    verify: 'show ns version   # on the appliance CLI; check that the build is the fixed one',
  },
  kerberoast: {
    title: 'Protect service accounts against Kerberoasting', owner: 'Identity / Active Directory',
    steps: [
      'Replace the account with a gMSA or, if not possible, set a random password of 30+ characters.',
      'Disable RC4 for the account (msDS-SupportedEncryptionTypes = AES128/AES256).',
      'Remove unnecessary privileges and membership of groups with access to critical data.',
      'Alert on TGS requests with RC4 encryption (event 4769, type 0x17).',
    ],
    verify: 'Get-ADUser -Filter {ServicePrincipalName -like "*"} -Properties PasswordLastSet,msDS-SupportedEncryptionTypes | ft Name,PasswordLastSet,msDS-SupportedEncryptionTypes',
  },
  unconstrained_delegation: {
    title: 'Remove unconstrained delegation', owner: 'Identity / Active Directory',
    steps: [
      'Replace unconstrained delegation with constrained or resource-based delegation.',
      'Mark privileged accounts as “Account is sensitive and cannot be delegated” and add them to Protected Users.',
      'Disable the Print Spooler service on domain controllers to prevent coercion.',
    ],
    verify: 'Get-ADComputer -Filter {TrustedForDelegation -eq $true -and PrimaryGroupID -ne 516} | Select Name',
  },
  adcs_esc1: {
    title: 'Fix vulnerable ADCS templates and services', owner: 'Identity / PKI',
    steps: [
      'Turn off “Supply in the request” (CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT) on the template.',
      'Require CA manager approval or authorized signatures for templates with an authentication EKU.',
      'Limit enrollment rights to the groups that strictly need them.',
      'Disable HTTP web enrollment or require HTTPS with EPA.',
      'Review certificates issued from the template and revoke suspicious ones.',
    ],
    verify: 'certipy find -u auditor@dominio.local -p *** -dc-ip 10.10.10.5 -vulnerable -stdout',
  },
  smb_signing: {
    title: 'Require SMB signing', owner: 'Systems',
    steps: [
      'Enable by GPO “Microsoft network server: Digitally sign communications (always)”.',
      'Apply the same policy on clients and check compatibility with legacy devices.',
      'Disable SMBv1 across the estate.',
    ],
    verify: 'nxc smb 10.10.20.0/24 --gen-relay-list sin_firma.txt   # the list must be empty',
  },
  laps: {
    title: 'Deploy Windows LAPS', owner: 'Endpoint',
    steps: [
      'Deploy Windows LAPS by GPO or Intune on every device.',
      'Rotate the local administrator password across the estate immediately.',
      'Deny network logon to local accounts (S-1-5-114) by GPO.',
    ],
    verify: 'Get-LapsADPassword -Identity PC-0001 -AsPlainText | Select ComputerName,ExpirationTimestamp',
  },
  weak_credentials: {
    title: 'Remove weak or default credentials', owner: 'Service owner',
    steps: [
      'Disable the default account, or rename it and set a strong password kept in the secrets manager.',
      'Use integrated authentication or named accounts with least privilege.',
      'Restrict with the firewall which hosts can connect to the service.',
    ],
    verify: 'nxc mssql 10.10.30.12 -u sa -p diccionario.txt --local-auth   # must not authenticate',
  },
  llmnr: {
    title: 'Disable LLMNR and NBT-NS', owner: 'Endpoint',
    steps: [
      'GPO: Computer Configuration › Administrative Templates › Network › DNS Client › Turn off multicast name resolution.',
      'Disable NetBIOS over TCP/IP through DHCP or a script on every interface.',
    ],
    verify: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient" -Name EnableMulticast',
  },
  print_spooler: {
    title: 'Disable the Print Spooler on critical servers', owner: 'Identity / Active Directory',
    steps: ['Stop and disable the Spooler service on domain controllers and servers that do not print.', 'Enforce it by GPO so it is not re-enabled.'],
    verify: 'Get-Service -ComputerName DC01 -Name Spooler | Select Status,StartType',
  },
  asrep_roast: {
    title: 'Require Kerberos pre-authentication', owner: 'Identity / Active Directory',
    steps: ['Remove the DONT_REQ_PREAUTH flag from the affected accounts.', 'Rotate their passwords with a minimum length of 20 characters.'],
    verify: 'Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} | Select SamAccountName',
  },
  tls_hardening: {
    title: 'Harden the TLS configuration', owner: 'Web team',
    steps: ['Disable TLS 1.0 and 1.1.', 'Limit ciphers to AEAD suites with forward secrecy.', 'Enable HSTS.'],
    verify: 'nmap --script ssl-enum-ciphers -p 443 203.0.113.10',
  },
  patch_cve: {
    title: 'Apply the vendor patch', owner: 'Asset owner',
    steps: [
      'Identify the fixed version in the vendor advisory.',
      'Apply the update (or the published temporary mitigation) in a change window.',
      'Restart the service if needed and confirm that the exposed version is the fixed one.',
    ],
    verify: 'Repeat the authenticated scan of the asset and confirm that the CVE no longer appears.',
  },
  weak_config: {
    title: 'Fix the insecure configuration', owner: 'Asset owner',
    steps: ['Apply the matching hardening baseline (CIS / CCN-STIC guides).', 'Document the exception if it cannot be fixed and add a compensating control.'],
    verify: 'Repeat the configuration check and attach the evidence to the ticket.',
  },
  identity_generic: {
    title: 'Fix the identity issue', owner: 'Identity / Active Directory',
    steps: ['Apply least privilege to the affected account or group.', 'Rotate the exposed credentials.', 'Add monitoring of its use.'],
    verify: 'Review the path again with BloodHound or PingCastle and confirm it is gone.',
  },
};
