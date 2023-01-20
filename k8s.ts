import { autoDetectClient } from "https://deno.land/x/kubernetes_client@v0.3.2/mod.ts";
import {
  CoreV1Api,
  Service,
  ServiceSpec,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/core@v1/mod.ts";
import {
  Container,
  Pod,
  PodSpec,
  PodStatus,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/core@v1/structs.ts";
import { ObjectMeta } from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/meta@v1/structs.ts";
import { PutOpts } from "https://deno.land/x/kubernetes_apis@v0.3.2/operations.ts";
import { NetworkingV1Api } from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/networking.k8s.io@v1/mod.ts";
import {
  Ingress,
  IngressSpec,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/networking.k8s.io@v1/structs.ts";
import {
  AppsV1Api,
  Deployment,
  DeploymentSpec,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/apps@v1/mod.ts";
import { Quantity } from "https://deno.land/x/kubernetes_apis@v0.3.2/common.ts";

const userNamespace = "deploy-cat-user-deployments";

export const k8s = await autoDetectClient();
export const coreApi = new CoreV1Api(k8s).namespace(userNamespace);
export const networkApi = new NetworkingV1Api(k8s).namespace(userNamespace);
export const appApi = new AppsV1Api(k8s).namespace(userNamespace);

export interface PodConfig {
  image: string;
  name: string;
}

export const createPod = async ({ image, name }: PodConfig) => {
  await coreApi.createPod(
    {
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        name,
        namespace: userNamespace,
      } as ObjectMeta,
      spec: {
        containers: [{
          image,
          name: `${name}-1`,
          resources: {
            limits: {
              cpu: "100m",
              memory: "100Mi",
            },
            requests: {
              cpu: "50m",
              memory: "50Mi",
            },
          },
        } as Container],
      } as PodSpec,
      status: {} as PodStatus,
    } as Pod,
    {} as PutOpts,
  );
};

export interface IngressConfig {
  name: string;
  host: string;
}

export const createIngress = async ({ name, host }: IngressConfig) => {
  await networkApi.createIngress({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace: userNamespace,
      annotations: {},
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
    } as IngressSpec,
  } as Ingress);
};

export interface DeploymentConfig {
  image: string;
  name: string;
  host: string;
}

export const createDeployment = async ({
  image,
  name,
  host,
}: DeploymentConfig) => {
  await appApi.createDeployment({
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace: userNamespace,
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
  } as Deployment);
};

export interface ServiceConfig {
  name: string;
}

export const createService = async ({ name }: ServiceConfig) => {
  await coreApi.createService({
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace: userNamespace,
    },
    spec: {
      selector: { name },
      type: "ClusterIP",
      ports: [{ name: "http", port: 80 }],
    } as ServiceSpec,
  } as Service);
};

export interface AppConfig {
  name: string;
  host: string;
  image: string;
}

export const deployApp = async ({ name, image, host }: AppConfig) => {
  try {
    await createDeployment({ name, image, host });
    await createService({ name });
    await createIngress({ name, host });
  } catch (e) {
    console.error(e);
    await deleteApp(name)
    throw e;
  }
};

export const deleteApp = async (name: string) => {
  await networkApi.deleteIngress(name);
  await coreApi.deleteService(name);
  await appApi.deleteDeployment(name);
};
