 {
        apiVersion: 'monitoring.coreos.com/v1',
        kind: 'ServiceMonitor',
        metadata: {
          name: 'monitoring-mongodb',
          labels: {
            'app.kubernetes.io/name': 'mongodb-exporter',
            'app.kubernetes.io/component': 'exporter',
            'app.kubernetes.io/scope': 'external',
          },
        },
        spec: {
          namespaceSelector: {
            any: true,
          },
          endpoints: [
            {
              interval: '1m',
              port: 'metrics',
              // metricRelabelings: [
              //   {
              //     sourceLabels: ['namespace'],
              //     action: 'labeldrop',
              //   },

              // ],

            },
          ],
          selector: {
            matchLabels: {
              'app.kubernetes.io/name': 'mongodb-exporter',
              'app.kubernetes.io/component': 'exporter',
              'app.kubernetes.io/scope': 'external1',
            },
          },
          targetLabels: [
            'db_env',
            'db_group',
            'db_id',
            'db_ip',
            'db_region',
            'node_id',
          ],
        },
      }