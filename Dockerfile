
FROM denoland/deno:alpine

RUN pkg add kubectl

EXPOSE 3000
WORKDIR /app

ADD . .
RUN deno cache main.ts

CMD ["deno", "task", "start"]
