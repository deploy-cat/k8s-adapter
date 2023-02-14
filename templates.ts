import { ObjectMeta } from "kubernetes_apis/builtin/meta";
import { Ingress, IngressSpec } from "kubernetes_apis/builtin/networking";
import { Deployment, DeploymentSpec } from "kubernetes_apis/builtin/apps";
import { Container, Service, ServiceSpec } from "kubernetes_apis/builtin/core";
import { Quantity } from "https://deno.land/x/kubernetes_apis@v0.3.2/common.ts";
import { getCert } from "./mappings.ts";

export type Lables = { [key: string]: string };

export const createIngressFactory = (
  { name, host, port, namespace, labels }: {
    name: string;
    host: string;
    port: number;
    namespace: string;
    labels: Lables;
  },
) =>
() => (
  {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace: namespace,
      labels,
      annotations: {
        "cert-manager.io/cluster-issuer": "letsencrypt-issuer",
      },
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
                port: { number: port },
              },
            },
          }],
        },
      }],
      tls: [
        getCert(host) ?? {
          "secretName": `${name}-cert`,
          hosts: [host],
        },
      ],
    } as IngressSpec,
  } as Ingress
);

export const createDeploymentFactory = (
  { image, name, port, namespace, labels }: {
    image: string;
    name: string;
    port: number;
    namespace: string;
    labels: Lables;
  },
) =>
() => (
  {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace,
      labels,
    } as ObjectMeta,
    spec: {
      selector: {
        matchLabels: labels,
      },
      replicas: 1,
      template: {
        metadata: {
          labels,
        },
        spec: {
          containers: [{
            image,
            imagePullPolicy: "Always",
            name: `${name}-1`,
            ports: [{
              containerPort: port,
            }],
            resources: {
              limits: {
                cpu: new Quantity(50, "m"),
                memory: new Quantity(50, "Mi"),
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
  { name, port, namespace, labels }: {
    name: string;
    port: number;
    namespace: string;
    labels: Lables;
  },
) =>
() => (
  {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace,
      labels,
    },
    spec: {
      selector: { name },
      type: "ClusterIP",
      ports: [{ name: "http", port: port }],
    } as ServiceSpec,
  } as Service
);
