import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
import { autoDetectClient } from 'https://deno.land/x/kubernetes_client@v0.3.2/mod.ts';
import { CoreV1Api } from 'https://deno.land/x/kubernetes_apis/builtin/core@v1/mod.ts';

const kubernetes = await autoDetectClient();
const coreApi = new CoreV1Api(kubernetes).namespace("default");

const app = new Application();

// Logger
app.use(async (ctx, next) => {
  await next();
  console.log(`${ ctx.request.method } ${ ctx.request.url } - ${ ctx.response.headers.get("X-Response-Time") }`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ ms }ms`);
});


const books = new Map<string, any>();
books.set("1", {
  id: "1",
  title: "The Hound of the Baskervilles",
  author: "Conan Doyle, Arthur",
});

const router = new Router();
router
  .get("/", (ctx) => {
    ctx.response.body = "Hello world!";
  })
  .get("/pods", async (ctx) => {
    ctx.response.body = await coreApi.getPodList();
  })
  .get("/pods/:id", async (ctx) => {
    try {
      ctx.response.body = await coreApi.getPod(ctx.params.id);
    } catch (e) {
      ctx.response.status = 404;
      ctx.response.body = { status: 'pod not found' };
    }
  });

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
