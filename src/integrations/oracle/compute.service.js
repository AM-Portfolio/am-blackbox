import { getOciClient, safeOciCall } from './oci.client.js';

/**
 * Always Free Ampere A1 limit names (OCI Limits service).
 */
export const A1_LIMITS = {
  cores: 'standard-a1-core-count',
  memory: 'standard-a1-memory-count'
};

export async function listAvailabilityDomains(compartmentId) {
  const client = getOciClient();
  const items = await client.request({
    service: 'identity',
    path: '/20160918/availabilityDomains',
    query: { compartmentId: compartmentId || client.tenancy }
  });
  return Array.isArray(items) ? items : items?.items || [];
}

export async function getResourceAvailability({
  serviceName = 'compute',
  limitName,
  compartmentId,
  availabilityDomain
}) {
  const client = getOciClient();
  return client.request({
    service: 'limits',
    path: `/20181025/resourceAvailability/${encodeURIComponent(serviceName)}/${encodeURIComponent(limitName)}`,
    query: {
      compartmentId: compartmentId || client.tenancy,
      availabilityDomain
    }
  });
}

export async function listInstances(compartmentId) {
  const client = getOciClient();
  const items = await client.request({
    service: 'iaas',
    path: '/20160918/instances',
    query: {
      compartmentId: compartmentId || client.tenancy,
      limit: '100'
    }
  });
  return Array.isArray(items) ? items : items?.items || [];
}

/**
 * Ampere A1 Flex availability across all ADs in the home region.
 */
export async function getAmpereA1Capacity(compartmentId) {
  const client = getOciClient();
  const compartment = compartmentId || client.tenancy;
  const adsResult = await safeOciCall('listAvailabilityDomains', () =>
    listAvailabilityDomains(compartment)
  );

  if (!adsResult.ok) {
    return { ok: false, error: adsResult.error, region: client.region, availabilityDomains: [] };
  }

  const ads = adsResult.data;
  const availabilityDomains = [];

  for (const ad of ads) {
    const adName = ad.name;
    const cores = await safeOciCall(`A1 cores ${adName}`, () =>
      getResourceAvailability({
        limitName: A1_LIMITS.cores,
        compartmentId: compartment,
        availabilityDomain: adName
      })
    );
    const memory = await safeOciCall(`A1 memory ${adName}`, () =>
      getResourceAvailability({
        limitName: A1_LIMITS.memory,
        compartmentId: compartment,
        availabilityDomain: adName
      })
    );

    availabilityDomains.push({
      name: adName,
      id: ad.id,
      cores: cores.ok
        ? {
            available: cores.data.available,
            used: cores.data.used,
            effectiveAvailable: cores.data.effectiveAvailable ?? cores.data.available,
            fractionalAvailability: cores.data.fractionalAvailability
          }
        : { error: cores.error },
      memoryGb: memory.ok
        ? {
            available: memory.data.available,
            used: memory.data.used,
            effectiveAvailable: memory.data.effectiveAvailable ?? memory.data.available,
            fractionalAvailability: memory.data.fractionalAvailability
          }
        : { error: memory.error }
    });
  }

  const instancesResult = await safeOciCall('listInstances', () => listInstances(compartment));
  const instances = instancesResult.ok
    ? instancesResult.data.map((i) => ({
        id: i.id,
        displayName: i.displayName,
        shape: i.shape,
        lifecycleState: i.lifecycleState,
        availabilityDomain: i.availabilityDomain,
        timeCreated: i.timeCreated
      }))
    : [];

  return {
    ok: true,
    region: client.region,
    shape: 'VM.Standard.A1.Flex',
    compartmentId: compartment,
    availabilityDomains,
    instances,
    instancesError: instancesResult.ok ? undefined : instancesResult.error
  };
}
