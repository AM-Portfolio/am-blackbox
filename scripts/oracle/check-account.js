#!/usr/bin/env node
/**
 * Oracle Cloud account status — Free Tier credits (best-effort) + Ampere A1 capacity.
 * Usage: npm run oracle:status   OR   node scripts/oracle/check-account.js [--json]
 */
import { getAccountStatus } from '../../src/integrations/oracle/account.service.js';

function printHuman(status) {
  const lines = [];
  lines.push('=== AM Blackbox — Oracle Cloud status ===');
  lines.push(`Checked: ${status.checkedAt}`);
  if (status.configured === false) {
    lines.push('Configured: NO');
    lines.push(`Error: ${status.error}`);
    lines.push('');
    lines.push('Create an OCI API key and secrets/oci.config — see secrets/README.md');
    console.log(lines.join('\n'));
    return;
  }
  lines.push(`Region:  ${status.config.region}`);
  lines.push(`Tenancy: ${status.config.tenancy}`);
  lines.push('');

  if (status.tenancy?.name) {
    lines.push(`Tenancy name: ${status.tenancy.name}`);
    lines.push(`Home region:  ${status.tenancy.homeRegionKey || 'n/a'}`);
  } else if (status.tenancy?.error) {
    lines.push(`Tenancy error: ${status.tenancy.error}`);
  }
  lines.push('');

  lines.push('--- Credits / subscription ---');
  lines.push(`Status:   ${status.credits.status}`);
  lines.push(`Plan:     ${status.credits.planType || 'n/a'}`);
  lines.push(
    `Balance:  ${
      status.credits.balance != null
        ? `${status.credits.balance} ${status.credits.currency || ''}`.trim()
        : 'n/a (often Console-only on Free Tier)'
    }`
  );
  if (status.credits.daysRemaining != null) {
    lines.push(`Days left: ${status.credits.daysRemaining}`);
  }
  if (status.credits.usageLast30Days) {
    const u = status.credits.usageLast30Days;
    lines.push(
      `Usage 30d: ${u.computedAmountSum} ${u.currency || ''} (${u.rowCount} rows)`.trim()
    );
  }
  for (const n of status.credits.notes || []) {
    lines.push(`  note: ${n}`);
  }
  lines.push('');

  lines.push('--- Ampere A1 Flex capacity ---');
  if (!status.compute?.ok) {
    lines.push(`Error: ${status.compute?.error || 'unknown'}`);
  } else {
    lines.push(`Shape: ${status.compute.shape} @ ${status.compute.region}`);
    for (const ad of status.compute.availabilityDomains || []) {
      const c = ad.cores?.error
        ? `cores=ERR(${ad.cores.error})`
        : `cores avail=${ad.cores?.effectiveAvailable ?? ad.cores?.available} used=${ad.cores?.used}`;
      const m = ad.memoryGb?.error
        ? `mem=ERR(${ad.memoryGb.error})`
        : `memGB avail=${ad.memoryGb?.effectiveAvailable ?? ad.memoryGb?.available} used=${ad.memoryGb?.used}`;
      lines.push(`  ${ad.name}: ${c}; ${m}`);
    }
    lines.push('');
    lines.push(`Instances (${(status.compute.instances || []).length}):`);
    if (!(status.compute.instances || []).length) {
      lines.push('  (none in root compartment)');
    } else {
      for (const i of status.compute.instances) {
        lines.push(`  - ${i.displayName} [${i.lifecycleState}] ${i.shape} @ ${i.availabilityDomain}`);
      }
    }
  }

  console.log(lines.join('\n'));
}

async function main() {
  const jsonOnly = process.argv.includes('--json');
  try {
    const status = await getAccountStatus();
    if (jsonOnly) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      printHuman(status);
      console.log('\n--- JSON ---\n');
      console.log(JSON.stringify(status, null, 2));
    }
    process.exit(status.configured === false ? 2 : 0);
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  }
}

main();
