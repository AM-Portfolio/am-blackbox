export const kubernetesConfig = {
  kubeconfigPath: process.env.KUBECONFIG_PATH,
  inCluster: process.env.KUBERNETES_IN_CLUSTER === 'true'
};
