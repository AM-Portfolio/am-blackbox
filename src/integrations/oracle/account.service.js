import { getOciClient, safeOciCall } from './oci.client.js';
import { getAmpereA1Capacity } from './compute.service.js';
import { loadOracleConfig, assertOracleConfig } from '../../config/oracle.js';

export async function getTenancy() {
  const client = getOciClient();
  return client.request({
    service: 'identity',
    path: `/20160918/tenancies/${encodeURIComponent(client.tenancy)}`
  });
}

/**
 * Best-effort Free Tier / promotional credit discovery.
 * Many Free Tier tenancies do not expose Metering via API keys — then credits.status = unavailable.
 */
export async function getCreditsAndSubscription() {
  const client = getOciClient();
  const credits = {
    status: 'unavailable',
    planType: null,
    balance: null,
    currency: null,
    daysRemaining: null,
    source: null,
    details: null,
    notes: []
  };

  // Organizations subscriptions (paid / some trial tenancies)
  const orgSubs = await safeOciCall('organizations listSubscriptions', () =>
    client.request({
      service: 'organizations',
      path: '/20180912/subscriptions',
      query: { compartmentId: client.tenancy }
    })
  );

  if (orgSubs.ok) {
    const items = Array.isArray(orgSubs.data) ? orgSubs.data : orgSubs.data?.items || [];
    if (items.length) {
      credits.status = 'ok';
      credits.source = 'organizations.subscriptions';
      credits.details = items.map((s) => ({
        id: s.id,
        serviceName: s.serviceName,
        lifecycleState: s.lifecycleState,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
        currency: s.currencyCode || s.currency
      }));
      credits.planType = items[0].serviceName || items[0].planType || 'subscription';
      credits.notes.push('Subscription list from Organizations API (credit balance may be Console-only).');
    }
  } else {
    credits.notes.push(`Organizations API: ${orgSubs.error}`);
  }

  // Usage API — recent spend (implies trial/paid activity; not remaining promo balance)
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const usage = await safeOciCall('usageapi requestSummarizedUsages', () =>
    client.request({
      service: 'usageapi',
      method: 'POST',
      path: '/20190111/usage',
      body: {
        tenantId: client.tenancy,
        timeUsageStarted: start.toISOString(),
        timeUsageEnded: end.toISOString(),
        granularity: 'DAILY',
        queryType: 'COST',
        groupBy: ['service'],
        compartmentDepth: 1
      }
    })
  );

  if (usage.ok) {
    const items = usage.data?.items || usage.data || [];
    let total = 0;
    for (const row of items) {
      const c = Number(row.computedAmount ?? row.cost ?? row.amount ?? 0);
      if (!Number.isNaN(c)) total += c;
    }
    credits.usageLast30Days = {
      currency: items[0]?.currency || items[0]?.currencyCode || null,
      computedAmountSum: total,
      rowCount: Array.isArray(items) ? items.length : 0
    };
    credits.notes.push('Usage API returned last-30-day cost summary (not remaining Free Trial credits).');
  } else {
    credits.notes.push(`Usage API: ${usage.error}`);
  }

  if (credits.status === 'unavailable') {
    credits.planType = credits.planType || 'likely_always_free_or_trial';
    credits.notes.push(
      'Promotional credit balance is often Console-only for Free Tier. Use Limits + instances for Always Free capacity.'
    );
  }

  return credits;
}

/**
 * Aggregate account status for CLI / MCP.
 */
export async function getAccountStatus() {
  const cfg = loadOracleConfig();
  try {
    assertOracleConfig(cfg);
  } catch (e) {
    return {
      checkedAt: new Date().toISOString(),
      configured: false,
      error: e.message,
      config: {
        region: cfg.region || null,
        tenancy: cfg.tenancy || null,
        user: cfg.user || null,
        configPath: cfg.configPath,
        keyFile: cfg.keyFile || null
      },
      tenancy: null,
      credits: {
        status: 'unavailable',
        balance: null,
        notes: [e.message, 'Add secrets/oci.config + secrets/oci_api_key.pem (see secrets/README.md).']
      },
      compute: { ok: false, error: e.message, availabilityDomains: [], instances: [] }
    };
  }

  const tenancyResult = await safeOciCall('getTenancy', getTenancy);
  const credits = await getCreditsAndSubscription();
  const capacity = await getAmpereA1Capacity();

  const tenancy = tenancyResult.ok
    ? {
        id: tenancyResult.data.id,
        name: tenancyResult.data.name,
        homeRegionKey: tenancyResult.data.homeRegionKey,
        description: tenancyResult.data.description
      }
    : { error: tenancyResult.error };

  return {
    checkedAt: new Date().toISOString(),
    configured: true,
    config: {
      region: cfg.region,
      tenancy: cfg.tenancy,
      user: cfg.user,
      configPath: cfg.configPath,
      keyFile: cfg.keyFile ? '(set)' : null
    },
    tenancy,
    credits,
    compute: capacity
  };
}
