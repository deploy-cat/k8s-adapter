import { Application, Router } from "oak";
import { autoDetectClient } from "kubernetes_client";
import { CoreV1Api } from "kubernetes_apis";

const k8s = await autoDetectClient();
const coreApi = new CoreV1Api(k8s).namespace("default");

const app = new Application();

// Logger
app.use(async (ctx, next) => {
  await next();
  console.log(
    ctx.request.method,
    ctx.request.url.href,
    ctx.response.status,
    ctx.response.headers.get("X-Response-Time"),
  );
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

const router = new Router();
router
  .get("/", (ctx) => {
    ctx.response.body = "Hello world!\n";
  })
  .get("/pods", async (ctx) => {
    ctx.response.body = await coreApi.getPodList();
  })
  .get("/pods/:id", async (ctx) => {
    try {
      ctx.response.body = await coreApi.getPod(ctx.params.id);
    } catch (e) {
      ctx.response.status = 404;
      ctx.response.body = { status: "pod not found" };
    }
  });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 3000 });
