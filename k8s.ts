import { autoDetectClient } from "kubernetes_client";
import { CoreV1Api } from "kubernetes_apis/builtin/core";
import { NetworkingV1Api } from "kubernetes_apis/builtin/networking";
import { AppsV1Api } from "kubernetes_apis/builtin/apps";
import {
  createDeploymentFactory,
  createIngressFactory,
  createServiceFactory,
} from "./templates.ts";

const namespace = "deploy-cat-user-deployments";

export const k8s = await autoDetectClient();
export const coreApi = new CoreV1Api(k8s).namespace(namespace);
export const networkApi = new NetworkingV1Api(k8s).namespace(namespace);
export const appApi = new AppsV1Api(k8s).namespace(namespace);

export interface IngressConfig {
  name: string;
  host: string;
  user: string;
  port: number;
}

export const createIngress = async (
  { name, host, user, port }: IngressConfig,
) => {
  await networkApi.createIngress(
    createIngressFactory({
      name,
      host,
      port,
      namespace,
      labels: { name, host, user },
    })(),
  );
};

export interface DeploymentConfig {
  image: string;
  name: string;
  host: string;
  user: string;
  port: number;
}

export const createDeployment = async (
  { image, name, host, user, port }: DeploymentConfig,
) => {
  await appApi.createDeployment(
    createDeploymentFactory({
      image,
      name,
      port,
      namespace,
      labels: { name, host, user },
    })(),
  );
};

export interface ServiceConfig {
  name: string;
  user: string;
  port: number;
}

export const createService = async ({ name, user, port }: ServiceConfig) => {
  await coreApi.createService(
    createServiceFactory({ name, port, namespace, labels: { name, user } })(),
  );
};

export interface AppConfig {
  name: string;
  host: string;
  image: string;
  user: string;
  port: number;
}

export const createApp = async (
  { name, image, host, user, port }: AppConfig,
) => {
  try {
    await createDeployment({ name, image, host, user, port });
    await createService({ name, user, port });
    await createIngress({ name, host, user, port });
  } catch (e) {
    console.error(e);
    await deleteApp(name);
    throw e;
  }
};

export const deleteApp = async (name: string) => {
  await Promise.allSettled([
    networkApi.deleteIngress(name),
    coreApi.deleteService(name).catch(() =>
      "TODO: handle wrong server response"
    ),
    appApi.deleteDeployment(name),
  ]);
};

export const getApp = async (name: string) => {
  const [deployment, service, ingress] = await Promise.all([
    appApi.getDeployment(name),
    coreApi.getService(name),
    networkApi.getIngress(name),
  ]);
  return {
    name,
    image: deployment.spec?.template.spec?.containers[0].image,
    status: deployment.status?.conditions?.[0].type,
    host: ingress.spec?.rules?.[0].host,
    creationTimestamp: service.metadata?.creationTimestamp,
  };
};

export const getAppsfromUser = async (user: string) => {
  const labelSelector = `user=${user}`;
  const [deployments, services, ingresses] = await Promise.all([
    (await appApi.getDeploymentList({ labelSelector })).items,
    (await coreApi.getServiceList({ labelSelector })).items,
    (await networkApi.getIngressList({ labelSelector })).items,
  ]);
  return services.map((service) => {
    const deployment = deployments.find((el) =>
      el.metadata?.name === service.metadata?.name
    );
    const ingress = ingresses.find((el) =>
      el.metadata?.name === service.metadata?.name
    );
    return {
      name: service.metadata?.name,
      image: deployment?.spec?.template.spec?.containers[0].image,
      status: deployment?.status?.conditions?.[0].type,
      host: ingress?.spec?.rules?.[0].host,
      creationTimestamp: service.metadata?.creationTimestamp,
    };
  });
};
