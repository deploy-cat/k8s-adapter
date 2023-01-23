import { Application, Router } from "oak";
import { validate } from "./helpers.ts";
import { AppConfig, coreApi, deleteApp, deployApp } from "./k8s.ts";

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
  .post("/app/:name", async (ctx) => {
    const app = {
      ...await ctx.request.body().value,
      name: ctx.params.name,
    };
    validate(app, {
      name: (v) => v?.length > 3 || "too short",
      image: (v) => v?.length > 3 || "too short",
      host: (v) => v?.length > 10 || "too short",
    });
    await deployApp(app as AppConfig);
    ctx.response.status = 201;
    ctx.response.body = { status: "created", app };
  })
  .delete("/app/:name", async (ctx) => {
    await deleteApp(ctx.params.name);
    ctx.response.status = 200;
    ctx.response.body = { status: "deleted" };
  });

app.use(router.routes());
app.use(router.allowedMethods());

console.log("start app");
await app.listen({ port: 3000 });
