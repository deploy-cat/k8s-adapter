import { Application, Router } from "oak";
import { validate } from "./helpers.ts";
import { createDeployment, DeploymentConfig } from "./k8s.ts";

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

const router = new Router({
  prefix: "/api/v1",
});
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
  })
  .post("/deployment", async (ctx) => {
    const config = await ctx.request.body().value;
    validate(config, {
      name: (v) => v?.length > 3 || "to short",
      image: (v) => v?.length > 3 || "to short",
      host: (v) => v?.length > 10 || "to short",
    });
    await createDeployment(config as DeploymentConfig);
    ctx.response.status = 201;
    ctx.response.body = { status: "done", config };
  });

app.use(router.routes());
app.use(router.allowedMethods());

console.log("start app");
await app.listen({ port: 3000 });
