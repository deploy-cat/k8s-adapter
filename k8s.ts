import { autoDetectClient } from "https://deno.land/x/kubernetes_client@v0.3.2/mod.ts";
import {
  CoreV1Api,
  CoreV1NamespacedApi,
} from "https://deno.land/x/kubernetes_apis/builtin/core@v1/mod.ts";
import { AppsV1Api } from "https://deno.land/x/kubernetes_apis/builtin/apps@v1/mod.ts";
import {
  Container,
  Pod,
  PodSpec,
  PodStatus,
} from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/core@v1/structs.ts";
import { ObjectMeta } from "https://deno.land/x/kubernetes_apis@v0.3.2/builtin/meta@v1/structs.ts";
import { PutOpts } from "https://deno.land/x/kubernetes_apis@v0.3.2/operations.ts";

const k8s = await autoDetectClient();
const coreApi = new CoreV1Api(k8s).namespace("default");
const defaultNamespace = new CoreV1NamespacedApi(k8s, "default");

await defaultNamespace.createPod(
  {
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name: "test",
      namespace: "default",
    } as ObjectMeta,
    spec: {
      containers: [
        {
          image: "traefik/whoami",
          name: "whoami",
        } as Container,
      ],
    } as PodSpec,
    status: {} as PodStatus,
  } as Pod,
  {} as PutOpts,
);

const podList = await coreApi.getPodList();
console.log("podList", podList);
