import { autoDetectClient } from 'https://deno.land/x/kubernetes_client@v0.3.2/mod.ts';
import { CoreV1Api } from 'https://deno.land/x/kubernetes_apis/builtin/core@v1/mod.ts';

const kubernetes = await autoDetectClient();
const coreApi = new CoreV1Api(kubernetes).namespace("default");

const podList = await coreApi.getPodList();
console.log(podList);
