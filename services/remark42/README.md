# Comments (Remark42)

Comments under the blog posts, using [Remark42](https://remark42.com) (self-hosted, no tracking, no
ads) on the home Kubernetes cluster, exposed to the internet with Tailscale Funnel. This folder isn't
published with the site (only `public/` is).

- `kustomization.yaml` + `k8s/`: namespace, PVC (BoltDB, plus daily backups in `/srv/var/backup`),
  Deployment pinned to `umputun/remark42:v1.18.0`, Service and a Tailscale Funnel Ingress.
- Posts load the comments from `public/blog/blog.js`, only once the reader scrolls near them. Each
  thread is keyed by `https://www.kianmayne.co.uk` + the post's path, so www, the apex and local
  previews share one thread.

Readers can comment anonymously with just a name (`AUTH_ANON`). To moderate (delete, block, pin) you
need to sign in through a provider and be listed as an admin; GitHub is set up below.

## Deploy

Needs the Tailscale Kubernetes operator with Funnel allowed for its nodes (see
`services/poll/README.md`).

1. Create the secret. `SECRET` signs sessions; generate it, never commit it:

   ```sh
   kubectl create namespace comments
   kubectl -n comments create secret generic remark42 \
     --from-literal=SECRET="$(openssl rand -hex 32)"
   ```

2. Apply, then find the public URL:

   ```sh
   kubectl apply -k services/remark42
   kubectl -n comments get ingress remark42   # ADDRESS: comments.<tailnet>.ts.net
   curl https://comments.<tailnet>.ts.net/ping   # pong
   ```

3. Put that URL in two places and re-apply/redeploy:
   - `REMARK_URL` in `k8s/remark42.yaml`
   - `commentsHost` at the top of `public/blog/blog.js`

## Become the admin (GitHub sign-in)

1. Create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps):
   - Homepage URL: `https://www.kianmayne.co.uk`
   - Callback URL: `https://comments.<tailnet>.ts.net/auth/github/callback`
2. Add its client ID and a client secret to the Kubernetes secret, and restart:

   ```sh
   kubectl -n comments patch secret remark42 --type merge -p \
     '{"stringData":{"AUTH_GITHUB_CID":"<client id>","AUTH_GITHUB_CSEC":"<client secret>"}}'
   kubectl -n comments rollout restart deploy/remark42
   ```

3. Sign in with GitHub under a post, click your name, and copy your user ID (`github_…`).
4. Make yourself admin:

   ```sh
   kubectl -n comments patch secret remark42 --type merge -p \
     '{"stringData":{"ADMIN_SHARED_ID":"github_<id>"}}'
   kubectl -n comments rollout restart deploy/remark42
   ```

Readers can sign in with GitHub too, as well as commenting anonymously.

## If spam shows up

Anonymous comments have no captcha. If spam becomes a problem, set `AUTH_ANON` to `"false"` in
`k8s/remark42.yaml` and re-apply: readers then sign in with GitHub to comment.

## Optional: get told about new comments

Remark42 can notify admins by email or Telegram (`NOTIFY_ADMINS`, plus `SMTP_*` or
`TELEGRAM_TOKEN`). See the [Remark42 docs](https://remark42.com/docs/configuration/parameters/).
Tokens go in the secret, not the manifest.

## Run locally

```sh
docker run -d --name remark42 -p 8090:8080 -v /tmp/remark42:/srv/var \
  -e REMARK_URL=http://localhost:8090 -e SITE=kianmayne -e SECRET=local-only \
  -e AUTH_ANON=true -e ALLOWED_HOSTS="'self',http://localhost:8080" \
  umputun/remark42:v1.18.0
```

With the site served on `localhost:8080`, `blog.js` uses `localhost:8090` automatically.
