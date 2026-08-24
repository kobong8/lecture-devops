```dockerfile
# Stage 1: Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# Stage 2: Production Stage
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```.dockerignore
node_modules
dist
.git
.gitignore
.vscode
npm-debug.log*
README.md
```

```
[devops@localhost multi-stage]$ docker build -t vue-multistage:1.0 .
[+] Building 1.6s (15/15) FINISHED                                                               docker:default
 => [internal] load build definition from Dockerfile                                                       0.0s
 => => transferring dockerfile: 454B                                                                       0.0s
 => [internal] load metadata for docker.io/library/nginx:alpine                                            1.1s
 => [internal] load metadata for docker.io/library/node:22-alpine                                          1.1s
 => [internal] load .dockerignore                                                                          0.0s
 => => transferring context: 167B                                                                          0.0s
 => [builder 1/6] FROM docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647  0.1s
 => => resolve docker.io/library/node:22-alpine@sha256:8ea2348b068a9544dae7317b4f3aafcdc032df1647bb7d768a  0.1s
 => [internal] load build context                                                                          0.0s
 => => transferring context: 3.41kB                                                                        0.0s
 => [production 1/3] FROM docker.io/library/nginx:alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb4  0.1s
 => => resolve docker.io/library/nginx:alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904  0.1s
 => CACHED [production 2/3] COPY nginx.conf /etc/nginx/conf.d/default.conf                                 0.0s
 => CACHED [builder 2/6] WORKDIR /app                                                                      0.0s
 => CACHED [builder 3/6] COPY package*.json ./                                                             0.0s
 => CACHED [builder 4/6] RUN npm ci                                                                        0.0s
 => CACHED [builder 5/6] COPY . .                                                                          0.0s
 => CACHED [builder 6/6] RUN npm run build                                                                 0.0s
 => CACHED [production 3/3] COPY --from=builder /app/dist /usr/share/nginx/html                            0.0s
 => exporting to image                                                                                     0.1s
 => => exporting layers                                                                                    0.0s
 => => exporting manifest sha256:cb8fcb75a49a85db2b4d5cb660147f896421ee4cf83046616252d3315ec959be          0.0s
 => => exporting config sha256:1ffa71002093fe515f912ccc2d2362cc336360cb0702c6fc7d529ed354b63301            0.0s
 => => exporting attestation manifest sha256:0497f1fa9339513878ee7a91cd1c0327a4b2fb0cd2348ef7edfcbeb7305b  0.0s
 => => exporting manifest list sha256:d396442cd561301c964262d86482cf4b68d24cf6c76b4ebe3a088e2578a9a8aa     0.0s
 => => naming to docker.io/library/vue-multistage:1.0                                                      0.0s
 => => unpacking to docker.io/library/vue-multistage:1.0   
```

```
[devops@localhost multi-stage]$ docker images
IMAGE                   ID             DISK USAGE   CONTENT SIZE   EXTRA
vue-multistage:1.0      d396442cd561       91.2MB           26MB    U
```

```
[devops@localhost multi-stage]$ docker run -d -p 8000:80 --name=multistage-container vue-multistage:1.0
```

```
[devops@localhost multi-stage]$ docker ps
CONTAINER ID   IMAGE                COMMAND                  CREATED          STATUS          PORTS                                     NAMES
155b60a86034   vue-multistage:1.0   "/docker-entrypoint.…"   30 seconds ago   Up 30 seconds   0.0.0.0:8000->80/tcp, [::]:8000->80/tcp   multistage-container
```