/**
 * Robust IPv4 and IPv6 Address Validator for SSRF Protection
 */

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0);
}

function inIpv4Range(ipInt, subnetStr, prefixLength) {
  const subnetInt = ipv4ToInt(subnetStr);
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

export function isPrivateIpv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p === '' || parseInt(p, 10) < 0 || parseInt(p, 10) > 255)) {
    return true; // Malformed IPv4 treated as unsafe
  }

  const ipInt = ipv4ToInt(ip);

  // Private / Reserved IPv4 Subnets (RFC 1918, RFC 3927, RFC 6598, etc.)
  const blockedRanges = [
    { subnet: '0.0.0.0', prefix: 8 },      // "This" network
    { subnet: '10.0.0.0', prefix: 8 },     // RFC 1918 Private
    { subnet: '100.64.0.0', prefix: 10 },  // RFC 6598 Shared Address (CGNAT)
    { subnet: '127.0.0.0', prefix: 8 },    // Loopback
    { subnet: '169.254.0.0', prefix: 16 }, // Link-local / Cloud Metadata (169.254.169.254)
    { subnet: '172.16.0.0', prefix: 12 },  // RFC 1918 Private
    { subnet: '192.0.0.0', prefix: 24 },   // IETF Protocol Assignments
    { subnet: '192.0.2.0', prefix: 24 },   // TEST-NET-1
    { subnet: '192.168.0.0', prefix: 16 }, // RFC 1918 Private
    { subnet: '198.18.0.0', prefix: 15 },  // Network benchmark tests
    { subnet: '198.51.100.0', prefix: 24 },// TEST-NET-2
    { subnet: '203.0.113.0', prefix: 24 }, // TEST-NET-3
    { subnet: '224.0.0.0', prefix: 4 },    // Multicast
    { subnet: '240.0.0.0', prefix: 4 },    // Reserved / Future use
    { subnet: '255.255.255.255', prefix: 32 } // Broadcast
  ];

  return blockedRanges.some(r => inIpv4Range(ipInt, r.subnet, r.prefix));
}

export function isPrivateIpv6(ip) {
  let normalized = ip.toLowerCase().trim();

  // IPv4-mapped IPv6 check: ::ffff:192.168.1.1 or ::ffff:c0a8:0101
  if (normalized.startsWith('::ffff:')) {
    const rest = normalized.slice(7);
    if (rest.includes('.')) {
      return isPrivateIpv4(rest);
    }
    // Hex IPv4 mapped
    const hexParts = rest.split(':');
    if (hexParts.length === 2) {
      const part1 = parseInt(hexParts[0], 16);
      const part2 = parseInt(hexParts[1], 16);
      if (!isNaN(part1) && !isNaN(part2)) {
        const v4 = `${(part1 >> 8) & 0xff}.${part1 & 0xff}.${(part2 >> 8) & 0xff}.${part2 & 0xff}`;
        return isPrivateIpv4(v4);
      }
    }
    return true;
  }

  // Loopback / Unspecified
  if (normalized === '::1' || normalized === '::') {
    return true;
  }

  // Link-local: fe80::/10
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Unique local / Private ULA: fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Multicast: ff00::/8
  if (normalized.startsWith('ff')) {
    return true;
  }

  return false;
}

export function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const trimmed = ip.trim();
  if (trimmed.includes(':')) {
    return isPrivateIpv6(trimmed);
  }
  return isPrivateIpv4(trimmed);
}
