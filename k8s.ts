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
}

export const createIngress = async (config: IngressConfig) => {
  await networkApi.createIngress(
    createIngressFactory({ ...config, namespace })(),
  );
};

export interface DeploymentConfig {
  image: string;
  name: string;
  host: string;
}

export const createDeployment = async (config: DeploymentConfig) => {
  await appApi.createDeployment(
    createDeploymentFactory({ ...config, namespace })(),
  );
};

export interface ServiceConfig {
  name: string;
}

export const createService = async (config: ServiceConfig) => {
  await coreApi.createService(createServiceFactory({ ...config, namespace })());
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
    await deleteApp(name);
    throw e;
  }
};

export const deleteApp = async (name: string) => {
  await Promise.allSettled([
    await networkApi.deleteIngress(name),
    await coreApi.deleteService(name).catch(() => "TODO: handle wrong server response"),
    await appApi.deleteDeployment(name),
  ]);
};
