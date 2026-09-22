import { z } from 'zod';
import { getPodStatus } from '../../integrations/kubernetes/pods.js';
import { getDeploymentStatus } from '../../integrations/kubernetes/deployments.js';

export function registerKubernetesTools(mcp) {
  mcp.tool('get_pod_status',
    {
      namespace: z.string().describe('Kubernetes namespace'),
      podName: z.string().describe('Pod name')
    },
    async ({ namespace, podName }) => {
      try {
        const status = await getPodStatus(namespace, podName);
        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );

  mcp.tool('get_deployment_status',
    {
      namespace: z.string().describe('Kubernetes namespace'),
      deploymentName: z.string().describe('Deployment name')
    },
    async ({ namespace, deploymentName }) => {
      try {
        const status = await getDeploymentStatus(namespace, deploymentName);
        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }]
        };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }] };
      }
    }
  );
}
