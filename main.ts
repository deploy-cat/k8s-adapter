import { Application, Router } from "oak";
import { ValidateError } from "./helpers.ts";
import {
  AppConfig,
  createApp,
  deleteApp,
  getApp,
  getAppsfromUser,
} from "./k8s.ts";
import { ObjectRule, Rule } from "hoyams";

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

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    if (e instanceof ValidateError) {
      ctx.response.body = { status: "error", message: e.message, map: e.map };
      ctx.response.status = 400;
    } else if (e instanceof Error) {
      ctx.response.body = { status: "error", message: e.message };
      ctx.response.status = 500;
    } else {
      ctx.response.body = { status: "error" };
      ctx.response.status = 500;
    }
  }
});

const router = new Router({
  prefix: "/api/v1",
});
router
  .get("/apps", async (ctx) => {
    const user = new Rule((v) =>
      typeof v === "string" && !!v?.match(/[\w_-]{3,}/) || "invalid"
    ).validate(ctx.request.headers.get("user"));
    try {
      ctx.response.body = { apps: await getAppsfromUser(user as string) };
    } catch (e) {
      ctx.response.status = 404;
      ctx.response.body = { status: "app not found" };
    }
  })
  .get("/app/:name", async (ctx) => {
    try {
      ctx.response.body = { app: await getApp(ctx.params.name) };
    } catch (e) {
      ctx.response.status = 404;
      ctx.response.body = { status: "app not found" };
    }
  })
  .post("/app/:name", async (ctx) => {
    const app = {
      ...await ctx.request.body().value,
      name: ctx.params.name,
    };
    new ObjectRule({
      name: new Rule((v) =>
        typeof v === "string" && v?.length > 3 || "too short"
      ),
      image: new Rule((v) =>
        typeof v === "string" && v?.length > 3 || "too short"
      ),
      host: new Rule((v) =>
        typeof v === "string" && v?.length > 10 || "too short"
      ),
      user: new Rule((v) =>
        typeof v === "string" && !!v?.match(/^[\w_-]{3,}$/) || "invalid"
      ),
      port: new Rule((v) => typeof v === "number" || "invalid type"),
    });
    await createApp(app as AppConfig);
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
