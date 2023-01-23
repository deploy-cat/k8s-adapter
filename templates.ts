import { ObjectMeta } from "kubernetes_apis/builtin/meta";
import { Ingress, IngressSpec } from "kubernetes_apis/builtin/networking";
import { Deployment, DeploymentSpec } from "kubernetes_apis/builtin/apps";
import { Container, Service, ServiceSpec } from "kubernetes_apis/builtin/core";

import { Quantity } from "https://deno.land/x/kubernetes_apis@v0.3.2/common.ts";

export const createIngressFactory = (
  { name, host, namespace }: { name: string; host: string; namespace: string },
) =>
() => (
  {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace: namespace,
    } as ObjectMeta,
    spec: {
      rules: [{
        host,
        http: {
          paths: [{
            path: "/",
            pathType: "Prefix",
            backend: {
              service: {
                name,
                port: { number: 80 },
              },
            },
          }],
        },
      }],
      tls: [{
        secretName: "deploy-cat-wildcard-cert",
      }],
    } as IngressSpec,
  } as Ingress
);

export const createDeploymentFactory = (
  { image, name, host, namespace }: {
    image: string;
    name: string;
    host: string;
    namespace: string;
  },
) =>
() => (
  {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace,
      labels: { name, host },
    } as ObjectMeta,
    spec: {
      selector: {
        matchLabels: { name, host },
      },
      replicas: 1,
      template: {
        metadata: {
          labels: { name, host },
        },
        spec: {
          containers: [{
            image,
            name: `${name}-1`,
            ports: [{
              containerPort: 80,
            }],
            resources: {
              limits: {
                cpu: new Quantity(100, "m"),
                memory: new Quantity(100, "Mi"),
              },
              requests: {
                cpu: new Quantity(50, "m"),
                memory: new Quantity(50, "Mi"),
              },
            },
          } as Container],
        },
      },
    } as DeploymentSpec,
  } as Deployment
);

export const createServiceFactory = (
  { name, namespace }: { name: string; namespace: string },
) =>
() => (
  {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace,
    },
    spec: {
      selector: { name },
      type: "ClusterIP",
      ports: [{ name: "http", port: 80 }],
    } as ServiceSpec,
  } as Service
);
