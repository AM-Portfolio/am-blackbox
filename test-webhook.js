const payload = {
  alerts: [
    {
      status: 'firing',
      labels: {
        alertname: 'HighMemoryUsage',
        severity: 'critical',
        environment: 'production',
        service: 'payment-service',
        pod: 'payment-service-abcd-1234',
        node: 'worker-node-1'
      },
      annotations: {
        description: 'Memory usage exceeds 90%'
      }
    }
  ]
};

fetch('http://localhost:3000/webhooks/grafana', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log('Webhook Response:', data))
  .catch(err => console.error('Error:', err));
